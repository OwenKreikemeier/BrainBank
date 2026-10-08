#[cfg(windows)]
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// The window corner icon and the taskbar icon are separate on Windows.
/// Tauri sets the small (title-bar) icon from the bundle, which is why the
/// window menu already matches the logo. The taskbar reads the big icon,
/// which was never assigned, so it kept showing the old one. Load the icon
/// embedded in the executable — the same artwork as the Start menu shortcut —
/// and assign it as the taskbar icon.
#[cfg(windows)]
fn apply_taskbar_icon(window: &tauri::WebviewWindow) {
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{HINSTANCE, LPARAM, WPARAM};
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::UI::WindowsAndMessaging::{
        LoadImageW, SendMessageW, ICON_BIG, IMAGE_FLAGS, IMAGE_ICON, LR_DEFAULTSIZE, WM_SETICON,
    };

    let Ok(hwnd) = window.hwnd() else {
        return;
    };

    unsafe {
        let module = GetModuleHandleW(PCWSTR::null())
            .ok()
            .map(|module| HINSTANCE(module.0));
        // 32512 is the numeric id tauri-build uses for the embedded app icon.
        let name = PCWSTR::from_raw(32512usize as *const u16);
        let icon = LoadImageW(module, name, IMAGE_ICON, 256, 256, IMAGE_FLAGS(0))
            .or_else(|_| LoadImageW(module, name, IMAGE_ICON, 0, 0, LR_DEFAULTSIZE));
        let Ok(icon) = icon else {
            return;
        };
        SendMessageW(
            hwnd,
            WM_SETICON,
            Some(WPARAM(ICON_BIG as usize)),
            Some(LPARAM(icon.0 as isize)),
        );
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(windows)]
            if let Some(window) = app.get_webview_window("main") {
                apply_taskbar_icon(&window);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
