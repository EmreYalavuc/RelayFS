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
