#[cfg(windows)]
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Windows draws the taskbar button from a snapshot taken when the button is
/// created. That snapshot stays on the old icon even after the window icon is
/// replaced. Load the brain embedded in the executable, assign it to the
/// window, then remove and re-add the taskbar button so it is drawn again.
#[cfg(windows)]
fn apply_taskbar_icon(window: &tauri::WebviewWindow) {
    use std::ffi::c_void;
    use std::time::Duration;

    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{HINSTANCE, HWND, LPARAM, WPARAM};
    use windows::Win32::System::Com::{CoInitializeEx, COINIT_APARTMENTTHREADED};
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::UI::WindowsAndMessaging::{
        LoadImageW, SendMessageW, SetClassLongPtrW, GCLP_HICON, GCLP_HICONSM, ICON_BIG,
        IMAGE_FLAGS, IMAGE_ICON, LR_DEFAULTSIZE, WM_SETICON,
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
        let bits = icon.0 as isize;
        SendMessageW(hwnd, WM_SETICON, Some(WPARAM(ICON_BIG as usize)), Some(LPARAM(bits)));
        SetClassLongPtrW(hwnd, GCLP_HICON, bits);
        SetClassLongPtrW(hwnd, GCLP_HICONSM, bits);
        refresh_taskbar_button(hwnd);
    }

    let raw = hwnd.0 as isize;
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(300));
        unsafe {
            let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
            refresh_taskbar_button(HWND(raw as *mut c_void));
        }
    });
}

#[cfg(windows)]
unsafe fn refresh_taskbar_button(hwnd: windows::Win32::Foundation::HWND) {
    use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_SERVER};
    use windows::Win32::UI::Shell::{ITaskbarList, TaskbarList};

    let Ok(taskbar) = CoCreateInstance::<_, ITaskbarList>(&TaskbarList, None, CLSCTX_SERVER) else {
        return;
    };
    if taskbar.HrInit().is_err() {
        return;
    }
    let _ = taskbar.DeleteTab(hwnd);
    let _ = taskbar.AddTab(hwnd);
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
