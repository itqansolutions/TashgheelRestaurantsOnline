use tauri::{AppHandle, Manager, Runtime};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

fn get_data_dir<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    app.path().app_local_data_dir().expect("failed to get app data dir")
}

#[tauri::command]
fn get_machine_id<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let data_dir = get_data_dir(&app);
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }
    
    let id_file = data_dir.join("machine_id.txt");
    if id_file.exists() {
        fs::read_to_string(id_file).map_err(|e| e.to_string())
    } else {
        let new_id = Uuid::new_v4().to_string();
        fs::write(id_file, &new_id).map_err(|e| e.to_string())?;
        Ok(new_id)
    }
}

#[tauri::command]
fn ensure_data_dir<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let data_dir = get_data_dir(&app);
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }
    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_data<R: Runtime>(app: AppHandle<R>, key: String, value: String) -> Result<(), String> {
    let data_dir = get_data_dir(&app);
    let file_path = data_dir.join(format!("{}.json", key));
    fs::write(file_path, value).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_data<R: Runtime>(app: AppHandle<R>, key: String) -> Result<Option<String>, String> {
    let data_dir = get_data_dir(&app);
    let file_path = data_dir.join(format!("{}.json", key));
    if file_path.exists() {
        let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn list_data_files<R: Runtime>(app: AppHandle<R>) -> Result<Vec<String>, String> {
    let data_dir = get_data_dir(&app);
    if !data_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut files = Vec::new();
    let entries = fs::read_dir(data_dir).map_err(|e| e.to_string())?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                if ext == "json" {
                    if let Some(stem) = path.file_stem() {
                        files.push(stem.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    Ok(files)
}

#[tauri::command]
fn clear_all_data<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let data_dir = get_data_dir(&app);
    if data_dir.exists() {
         let entries = fs::read_dir(&data_dir).map_err(|e| e.to_string())?;
         for entry in entries {
             if let Ok(entry) = entry {
                 let path = entry.path();
                 if let Some(ext) = path.extension() {
                    if ext == "json" {
                        fs::remove_file(path).map_err(|e| e.to_string())?;
                    }
                 }
             }
         }
    }
    Ok(())
}

#[tauri::command]
fn check_file_exists(folder_path: String, filename: String) -> bool {
    let path = PathBuf::from(folder_path).join(filename);
    path.exists()
}

#[tauri::command]
async fn select_backup_folder<R: Runtime>(app: AppHandle<R>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let file_path = app.dialog().file().blocking_pick_folder();
    // blocking_pick_folder returns Option<FilePath>
    match file_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
fn save_backup_file(folder_path: String, filename: String, data: String) -> Result<(), String> {
    let path = PathBuf::from(folder_path).join(filename);
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_devtools<R: Runtime>(app: AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        window.open_devtools();
    }
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_machine_id,
            ensure_data_dir,
            save_data,
            read_data,
            list_data_files,
            clear_all_data,
            check_file_exists,
            select_backup_folder,
            save_backup_file,
            open_devtools
        ])
        .setup(|app| {
            #[cfg(debug_assertions)] // Only open in dev mode
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
