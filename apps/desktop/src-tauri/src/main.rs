// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod file_watcher;
mod watcher_commands;

use file_watcher::FileWatcherState;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(FileWatcherState::default()))
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::write_file,
            commands::list_directory,
            commands::load_game_spec,
            commands::path_exists,
            watcher_commands::start_file_watcher,
            watcher_commands::stop_file_watcher,
            watcher_commands::get_watched_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
