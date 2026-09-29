use crate::watcher::FileWatcher;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, State};

pub struct WatcherState(pub Mutex<Option<FileWatcher>>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub file_count: usize,
}

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

    let name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

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

    let name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    Ok(ProjectInfo {
        file_count: count_files(&path_buf),
        name,
        path,
    })
}

fn count_files(dir: &PathBuf) -> usize {
    if dir.is_file() {
        return 1;
    }
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
