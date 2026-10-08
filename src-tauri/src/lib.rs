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
            commands::list_project_files,
            commands::read_file,
            commands::write_file_atomic,
            commands::delete_file,
            commands::reveal_in_explorer,
            commands::ensure_dir,
            commands::open_in_vscode,
            commands::open_file_default,
            commands::get_file_meta,
            commands::get_local_info,
            commands::load_history,
            commands::append_history,
            commands::clear_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
