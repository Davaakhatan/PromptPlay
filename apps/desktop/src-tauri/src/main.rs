// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_client;
mod commands;
mod file_watcher;
mod watcher_commands;

use ai_client::AIClientState;
use file_watcher::FileWatcherState;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(FileWatcherState::default()))
        .manage(AIClientState::default())
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::write_file,
            commands::list_directory,
            commands::load_game_spec,
            commands::path_exists,
            commands::create_directory,
            commands::export_game_html,
            watcher_commands::start_file_watcher,
            watcher_commands::stop_file_watcher,
            watcher_commands::get_watched_path,
            ai_client::ai_send_message,
            ai_client::ai_set_api_key,
            ai_client::ai_check_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
