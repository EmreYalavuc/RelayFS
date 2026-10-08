use crate::watcher::FileWatcher;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, State};

pub struct WatcherState(pub Mutex<Option<FileWatcher>>);

const SKIP_DIRS: &[&str] = &[
    ".git", ".vs", ".vscode", ".idea",
    "node_modules", "target", "dist", ".next", "out", "build",
    "__pycache__", ".venv", "venv", ".cache", ".parcel-cache",
];

const TEXT_EXT: &[&str] = &[
    "ts", "tsx", "js", "jsx", "mjs", "cjs",
    "json", "jsonc",
    "css", "scss", "sass", "less",
    "html", "htm", "svg", "xml",
    "md", "mdx", "txt",
    "rs", "toml",
    "py", "rb", "go", "java", "kt", "swift",
    "c", "cpp", "h", "hpp",
    "vue", "svelte", "astro",
    "yaml", "yml",
    "sh", "bash",
];

const MAX_FILE_BYTES: u64 = 512 * 1024;

// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub file_count: usize,
}

// ── watcher commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn start_watching(
    path: String,
    app_handle: AppHandle,
    state: State<'_, WatcherState>,
) -> Result<ProjectInfo, String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(format!("Path does not exist: {path}"));
    }

    let name = dir_name(&path_buf);
    let file_count = count_files(&path_buf);

    let watcher = FileWatcher::new(path_buf, app_handle).map_err(|e| e.to_string())?;
    *state.0.lock().unwrap() = Some(watcher);

    Ok(ProjectInfo { name, path, file_count })
}

#[tauri::command]
pub async fn stop_watching(state: State<'_, WatcherState>) -> Result<(), String> {
    *state.0.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub async fn get_project_info(path: String) -> Result<ProjectInfo, String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(format!("Path does not exist: {path}"));
    }
    Ok(ProjectInfo {
        file_count: count_files(&path_buf),
        name: dir_name(&path_buf),
        path,
    })
}

// ── file I/O commands ─────────────────────────────────────────────────────────

/// Lists all text files under `root`, respecting `.gitignore` and `.relayfsignore`.
#[tauri::command]
pub async fn list_project_files(root: String) -> Result<Vec<String>, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.is_dir() {
        return Err(format!("Not a directory: {root}"));
    }

    let files = tokio::task::spawn_blocking(move || -> Vec<String> {
        let mut results = Vec::new();

        let walker = ignore::WalkBuilder::new(&root_path)
            .hidden(true)                              // skip dotfiles/dotdirs
            .git_ignore(true)                          // respect .gitignore
            .git_global(false)
            .git_exclude(false)
            .add_custom_ignore_filename(".relayfsignore")
            .filter_entry(|e| {
                if e.depth() == 0 { return true; }
                let name = e.file_name().to_str().unwrap_or("");
                !SKIP_DIRS.contains(&name)
            })
            .build();

        for entry in walker.filter_map(|e| e.ok()) {
            let path = entry.path().to_path_buf();
            if path.is_dir() { continue; }

            if let Ok(meta) = path.metadata() {
                if meta.len() > MAX_FILE_BYTES { continue; }
            }

            let ext = path.extension()
                .and_then(|e| e.to_str())
                .map(|s| s.to_lowercase())
                .unwrap_or_default();

            if !TEXT_EXT.contains(&ext.as_str()) { continue; }

            if let Ok(rel) = path.strip_prefix(&root_path) {
                if let Some(s) = rel.to_str() {
                    results.push(s.replace('\\', "/"));
                }
            }
        }

        results.sort();
        results
    })
    .await
    .unwrap_or_default();

    Ok(files)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("read_file({path}): {e}"))
}

/// Writes content atomically: temp file → rename (same filesystem).
#[tauri::command]
pub async fn write_file_atomic(path: String, content: String) -> Result<(), String> {
    let dest = PathBuf::from(&path);

    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("create_dir_all: {e}"))?;
    }

    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    let tmp = dest
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(format!(".relayfs-{nonce:08x}.tmp"));

    std::fs::write(&tmp, content.as_bytes())
        .map_err(|e| format!("write tmp: {e}"))?;
    std::fs::rename(&tmp, &dest)
        .map_err(|e| {
            let _ = std::fs::remove_file(&tmp);
            format!("rename: {e}")
        })?;

    Ok(())
}

/// Deletes a single file from disk (called when a remote peer removes it from Yjs).
#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_file() {
        std::fs::remove_file(p).map_err(|e| format!("delete_file({path}): {e}"))
    } else {
        Ok(()) // already gone — treat as success
    }
}

/// Creates a directory (and all parents) if it doesn't already exist.
#[tauri::command]
pub async fn ensure_dir(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| format!("ensure_dir({path}): {e}"))
}

/// Opens a folder in the system file explorer (Windows Explorer).
#[tauri::command]
pub async fn reveal_in_explorer(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    let target = if p.is_file() {
        p.parent()
            .map(|d| d.to_string_lossy().into_owned())
            .unwrap_or(path)
    } else {
        path
    };
    std::process::Command::new("explorer")
        .arg(&target)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("reveal_in_explorer: {e}"))
}

// ── peer identity & history ───────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct LocalInfo {
    pub hostname: String,
    pub local_ip: String,
}

/// Returns the machine's hostname and primary local IP address.
#[tauri::command]
pub async fn get_local_info() -> LocalInfo {
    let hostname = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "unknown".to_string());

    let local_ip = get_primary_ip().unwrap_or_else(|| "unknown".to_string());
    LocalInfo { hostname, local_ip }
}

fn get_primary_ip() -> Option<String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    socket.local_addr().ok().map(|a| a.ip().to_string())
}

fn history_path() -> std::path::PathBuf {
    let base = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    std::path::PathBuf::from(base).join("RelayFS").join("history.jsonl")
}

/// Loads all history entries (one JSON string per line) from the persistent log.
#[tauri::command]
pub async fn load_history() -> Vec<String> {
    let path = history_path();
    if !path.exists() { return Vec::new(); }
    std::fs::read_to_string(&path)
        .unwrap_or_default()
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.to_string())
        .collect()
}

/// Appends a single serialized entry to the persistent history log.
#[tauri::command]
pub async fn append_history(entry: String) -> Result<(), String> {
    let path = history_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    use std::io::Write as _;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    writeln!(file, "{}", entry.trim()).map_err(|e| e.to_string())?;
    Ok(())
}

/// Clears the entire persistent history log.
#[tauri::command]
pub async fn clear_history() -> Result<(), String> {
    let path = history_path();
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Opens a path in VS Code (requires `code` on PATH).
#[tauri::command]
pub async fn open_in_vscode(path: String) -> Result<(), String> {
    std::process::Command::new("code")
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("VS Code bulunamadı: {e}"))
}

/// Opens a file with the system default application.
#[tauri::command]
pub async fn open_file_default(path: String) -> Result<(), String> {
    let result = if cfg!(target_os = "windows") {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
    } else if cfg!(target_os = "macos") {
        std::process::Command::new("open").arg(&path).spawn()
    } else {
        std::process::Command::new("xdg-open").arg(&path).spawn()
    };
    result.map(|_| ()).map_err(|e| format!("Dosya açılamadı: {e}"))
}

#[derive(Debug, Serialize)]
pub struct FileMetaInfo {
    pub size: u64,
    pub modified_ms: Option<u64>,
}

/// Returns size and last-modified timestamp (ms since epoch) for a file path.
#[tauri::command]
pub async fn get_file_meta(path: String) -> Result<FileMetaInfo, String> {
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let modified_ms = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64);
    Ok(FileMetaInfo { size: meta.len(), modified_ms })
}

// ── helpers ───────────────────────────────────────────────────────────────────

fn dir_name(p: &PathBuf) -> String {
    p.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string()
}

fn count_files(dir: &PathBuf) -> usize {
    if dir.is_file() { return 1; }
    std::fs::read_dir(dir)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| !e.file_name().to_str().unwrap_or("").starts_with('.'))
                .map(|e| count_files(&e.path()))
                .sum()
        })
        .unwrap_or(0)
}
