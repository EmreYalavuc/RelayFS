mod commands;
mod watcher;

use commands::WatcherState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WatcherState(Mutex::new(None)))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::start_watching,
            commands::stop_watching,
            commands::get_project_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
