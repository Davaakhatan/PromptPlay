// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_client;
mod commands;
mod file_watcher;
mod watcher_commands;

use ai_client::AIClientState;
use file_watcher::FileWatcherState;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(FileWatcherState::default()))
        .manage(AIClientState::default())
        .setup(|app| {
            // Create File menu
            let new_project = MenuItem::with_id(app, "new_project", "New Project", true, Some("CmdOrCtrl+Shift+N"))?;
            let open_project = MenuItem::with_id(app, "open_project", "Open Project...", true, Some("CmdOrCtrl+O"))?;
            let save = MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?;
            let export = MenuItem::with_id(app, "export", "Export as HTML...", true, Some("CmdOrCtrl+E"))?;

            let file_menu = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &new_project,
                    &open_project,
                    &PredefinedMenuItem::separator(app)?,
                    &save,
                    &PredefinedMenuItem::separator(app)?,
                    &export,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, Some("Close Window"))?,
                ],
            )?;

            // Create Edit menu
            let undo = MenuItem::with_id(app, "undo", "Undo", true, Some("CmdOrCtrl+Z"))?;
            let redo = MenuItem::with_id(app, "redo", "Redo", true, Some("CmdOrCtrl+Shift+Z"))?;
            let duplicate = MenuItem::with_id(app, "duplicate", "Duplicate Entity", true, Some("CmdOrCtrl+D"))?;
            let delete = MenuItem::with_id(app, "delete", "Delete Entity", true, Some("Backspace"))?;

            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &undo,
                    &redo,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, Some("Cut"))?,
                    &PredefinedMenuItem::copy(app, Some("Copy"))?,
                    &PredefinedMenuItem::paste(app, Some("Paste"))?,
                    &PredefinedMenuItem::select_all(app, Some("Select All"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &duplicate,
                    &delete,
                ],
            )?;

            // Create View menu
            let toggle_grid = MenuItem::with_id(app, "toggle_grid", "Toggle Grid", true, Some("G"))?;
            let toggle_debug = MenuItem::with_id(app, "toggle_debug", "Toggle Debug Mode", true, Some("D"))?;
            let zoom_in = MenuItem::with_id(app, "zoom_in", "Zoom In", true, Some("CmdOrCtrl+="))?;
            let zoom_out = MenuItem::with_id(app, "zoom_out", "Zoom Out", true, Some("CmdOrCtrl+-"))?;
            let zoom_reset = MenuItem::with_id(app, "zoom_reset", "Reset Zoom", true, Some("CmdOrCtrl+0"))?;
            let fit_view = MenuItem::with_id(app, "fit_view", "Fit All in View", true, Some("F"))?;

            let view_menu = Submenu::with_items(
                app,
                "View",
                true,
                &[
                    &toggle_grid,
                    &toggle_debug,
                    &PredefinedMenuItem::separator(app)?,
                    &zoom_in,
                    &zoom_out,
                    &zoom_reset,
                    &fit_view,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::fullscreen(app, Some("Toggle Fullscreen"))?,
                ],
            )?;

            // Create Window menu
            let window_menu = Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, Some("Minimize"))?,
                    &PredefinedMenuItem::maximize(app, Some("Zoom"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, Some("Close"))?,
                ],
            )?;

            // Create Help menu
            let keyboard_shortcuts = MenuItem::with_id(app, "keyboard_shortcuts", "Keyboard Shortcuts", true, Some("?"))?;
            let about = MenuItem::with_id(app, "about", "About PromptPlay", true, None::<&str>)?;

            let help_menu = Submenu::with_items(
                app,
                "Help",
                true,
                &[
                    &keyboard_shortcuts,
                    &PredefinedMenuItem::separator(app)?,
                    &about,
                ],
            )?;

            // Build the menu
            let menu = Menu::with_items(
                app,
                &[
                    &Submenu::with_items(
                        app,
                        "PromptPlay",
                        true,
                        &[
                            &PredefinedMenuItem::about(app, Some("About PromptPlay"), None)?,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::services(app, Some("Services"))?,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::hide(app, Some("Hide PromptPlay"))?,
                            &PredefinedMenuItem::hide_others(app, Some("Hide Others"))?,
                            &PredefinedMenuItem::show_all(app, Some("Show All"))?,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::quit(app, Some("Quit PromptPlay"))?,
                        ],
                    )?,
                    &file_menu,
                    &edit_menu,
                    &view_menu,
                    &window_menu,
                    &help_menu,
                ],
            )?;

            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(|app, event| {
                let window = app.get_webview_window("main").unwrap();
                match event.id().as_ref() {
                    "new_project" => { let _ = window.emit("menu-event", "new_project"); }
                    "open_project" => { let _ = window.emit("menu-event", "open_project"); }
                    "save" => { let _ = window.emit("menu-event", "save"); }
                    "export" => { let _ = window.emit("menu-event", "export"); }
                    "undo" => { let _ = window.emit("menu-event", "undo"); }
                    "redo" => { let _ = window.emit("menu-event", "redo"); }
                    "duplicate" => { let _ = window.emit("menu-event", "duplicate"); }
                    "delete" => { let _ = window.emit("menu-event", "delete"); }
                    "toggle_grid" => { let _ = window.emit("menu-event", "toggle_grid"); }
                    "toggle_debug" => { let _ = window.emit("menu-event", "toggle_debug"); }
                    "zoom_in" => { let _ = window.emit("menu-event", "zoom_in"); }
                    "zoom_out" => { let _ = window.emit("menu-event", "zoom_out"); }
                    "zoom_reset" => { let _ = window.emit("menu-event", "zoom_reset"); }
                    "fit_view" => { let _ = window.emit("menu-event", "fit_view"); }
                    "keyboard_shortcuts" => { let _ = window.emit("menu-event", "keyboard_shortcuts"); }
                    "about" => { let _ = window.emit("menu-event", "about"); }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::write_file,
            commands::list_directory,
            commands::load_game_spec,
            commands::path_exists,
            commands::create_directory,
            commands::export_game_html,
            commands::read_binary_file,
            commands::write_binary_file,
            commands::delete_path,
            commands::get_file_info,
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
