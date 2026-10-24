use std::fs;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Automatically perform app data migration from legacy dnd-ait directory
            let _ = perform_app_migration(app.handle());

            if let Ok(config_dir) = app.path().app_config_dir() {
                let _ = fs::create_dir_all(&config_dir);
                let target_db = config_dir.join("ttrpghelper.db");
                let legacy_target_db = config_dir.join("dnd2024.db");

                // Backward-compatibility: if target ttrpghelper.db does not exist (or is 0 bytes),
                // but legacy dnd2024.db exists in config_dir, copy/rename it to ttrpghelper.db
                if (!target_db.exists() || target_db.metadata().map(|m| m.len()).unwrap_or(0) == 0)
                    && legacy_target_db.exists()
                    && legacy_target_db.metadata().map(|m| m.len()).unwrap_or(0) > 0
                {
                    if let Err(e) = fs::copy(&legacy_target_db, &target_db) {
                        eprintln!("Failed to copy legacy database {:?} to {:?}: {}", legacy_target_db, target_db, e);
                    } else {
                        println!("Successfully migrated legacy database from {:?} to {:?}", legacy_target_db, target_db);
                    }
                }

                let need_copy = !target_db.exists()
                    || target_db.metadata().map(|m| m.len()).unwrap_or(0) == 0;

                if need_copy {
                    let mut found_src = None;

                    // 1. Try resource_dir (look for ttrpghelper.db, then legacy dnd2024.db)
                    if let Ok(resource_dir) = app.path().resource_dir() {
                        let candidates = [
                            resource_dir.join("databases").join("ttrpghelper.db"),
                            resource_dir.join("ttrpghelper.db"),
                            resource_dir.join("databases").join("dnd2024.db"),
                            resource_dir.join("dnd2024.db"),
                        ];
                        for c in &candidates {
                            if c.exists() && c.metadata().map(|m| m.len()).unwrap_or(0) > 0 {
                                found_src = Some(c.clone());
                                break;
                            }
                        }
                    }

                    // 2. Try relative to current executable
                    if found_src.is_none() {
                        if let Ok(exe_path) = std::env::current_exe() {
                            if let Some(exe_dir) = exe_path.parent() {
                                let candidates = [
                                    exe_dir.join("databases").join("ttrpghelper.db"),
                                    exe_dir.join("ttrpghelper.db"),
                                    exe_dir.join("resources").join("databases").join("ttrpghelper.db"),
                                    exe_dir.join("databases").join("dnd2024.db"),
                                    exe_dir.join("dnd2024.db"),
                                    exe_dir.join("resources").join("databases").join("dnd2024.db"),
                                ];
                                for c in &candidates {
                                    if c.exists() && c.metadata().map(|m| m.len()).unwrap_or(0) > 0 {
                                        found_src = Some(c.clone());
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // 3. Try current working directory (dev mode)
                    if found_src.is_none() {
                        let dev_candidates = [
                            std::path::PathBuf::from("src-tauri/databases/ttrpghelper.db"),
                            std::path::PathBuf::from("databases/ttrpghelper.db"),
                            std::path::PathBuf::from("src-tauri/databases/dnd2024.db"),
                            std::path::PathBuf::from("databases/dnd2024.db"),
                        ];
                        for c in &dev_candidates {
                            if c.exists() && c.metadata().map(|m| m.len()).unwrap_or(0) > 0 {
                                found_src = Some(c.clone());
                                break;
                            }
                        }
                    }

                    if let Some(src) = found_src {
                        if let Err(e) = fs::copy(&src, &target_db) {
                            eprintln!("Failed to copy initial database from {:?} to {:?}: {}", src, target_db, e);
                        } else {
                            println!("Successfully seeded database to {:?}", target_db);
                        }
                    } else {
                        eprintln!("Warning: Initial database ttrpghelper.db not found in resources!");
                    }
                }
            }
            Ok(())
        })
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_player_window,
            create_database_backup,
            list_database_backups,
            run_app_migration,
            open_external_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running TTRPG Helper tauri application");
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct BackupEntry {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub modified_ms: u64,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct BackupResult {
    pub success: bool,
    pub created: bool,
    pub filename: String,
    pub path: String,
    pub total_backups: usize,
    pub message: String,
}

#[tauri::command]
async fn open_player_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window("player-display") {
        let _ = existing.show();
        let _ = existing.set_focus();
        return Ok(());
    }

    let _window = tauri::WebviewWindowBuilder::new(
        &app,
        "player-display",
        tauri::WebviewUrl::App("index.html?view=player".into()),
    )
    .title("TTRPG Helper — Экран игроков")
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn create_database_backup(
    app: tauri::AppHandle,
    date_str: Option<String>,
    force: Option<bool>,
) -> Result<BackupResult, String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let _ = fs::create_dir_all(&config_dir);

    let mut target_db = config_dir.join("ttrpghelper.db");
    if !target_db.exists() || target_db.metadata().map(|m| m.len()).unwrap_or(0) == 0 {
        let legacy_db = config_dir.join("dnd2024.db");
        if legacy_db.exists() && legacy_db.metadata().map(|m| m.len()).unwrap_or(0) > 0 {
            let _ = fs::copy(&legacy_db, &target_db);
        }
    }
    if !target_db.exists() || target_db.metadata().map(|m| m.len()).unwrap_or(0) == 0 {
        let dev_candidates = [
            std::path::PathBuf::from("src-tauri/databases/ttrpghelper.db"),
            std::path::PathBuf::from("databases/ttrpghelper.db"),
            std::path::PathBuf::from("src-tauri/databases/dnd2024.db"),
            std::path::PathBuf::from("databases/dnd2024.db"),
        ];
        for c in &dev_candidates {
            if c.exists() && c.metadata().map(|m| m.len()).unwrap_or(0) > 0 {
                target_db = c.clone();
                break;
            }
        }
    }

    if !target_db.exists() {
        return Err("База данных ttrpghelper.db не найдена для создания копии".into());
    }

    let backup_dir = config_dir.join("backups");
    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let today = date_str.unwrap_or_else(|| {
        let now = std::time::SystemTime::now();
        let duration = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
        let secs = duration.as_secs();
        let days = secs / 86400;
        format!("day-{}", days)
    });

    let filename = format!("ttrpghelper_backup_{}.db", today);
    let dest_path = backup_dir.join(&filename);

    let already_exists = dest_path.exists();
    let force_backup = force.unwrap_or(false);

    let created = if !already_exists || force_backup {
        fs::copy(&target_db, &dest_path).map_err(|e| e.to_string())?;
        true
    } else {
        false
    };

    // Rotation: keep up to 7 latest copies
    let mut backups: Vec<(std::path::PathBuf, std::time::SystemTime)> = Vec::new();
    if let Ok(entries) = fs::read_dir(&backup_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                if (name.starts_with("ttrpghelper_backup_") || name.starts_with("dnd2024_backup_")) && name.ends_with(".db") {
                    let mtime = entry
                        .metadata()
                        .and_then(|m| m.modified())
                        .unwrap_or(std::time::UNIX_EPOCH);
                    backups.push((p, mtime));
                }
            }
        }
    }

    // Sort descending by modification time (most recent first)
    backups.sort_by(|a, b| b.1.cmp(&a.1));

    // Remove older backups exceeding 7
    if backups.len() > 7 {
        for (old_path, _) in &backups[7..] {
            let _ = fs::remove_file(old_path);
        }
    }

    let remaining_count = backups.len().min(7);

    Ok(BackupResult {
        success: true,
        created,
        filename,
        path: dest_path.to_string_lossy().to_string(),
        total_backups: remaining_count,
        message: if created {
            "Резервная копия успешно создана".into()
        } else {
            "Резервная копия за сегодня уже существует".into()
        },
    })
}

#[tauri::command]
async fn list_database_backups(app: tauri::AppHandle) -> Result<Vec<BackupEntry>, String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let backup_dir = config_dir.join("backups");
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut result = Vec::new();
    if let Ok(entries) = fs::read_dir(&backup_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                if (name.starts_with("ttrpghelper_backup_") || name.starts_with("dnd2024_backup_")) && name.ends_with(".db") {
                    if let Ok(meta) = entry.metadata() {
                        let modified_ms = meta
                            .modified()
                            .ok()
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_millis() as u64)
                            .unwrap_or(0);

                        result.push(BackupEntry {
                            name: name.to_string(),
                            path: p.to_string_lossy().to_string(),
                            size_bytes: meta.len(),
                            modified_ms,
                        });
                    }
                }
            }
        }
    }

    result.sort_by(|a, b| b.modified_ms.cmp(&a.modified_ms));
    Ok(result)
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct MigrationReport {
    pub attempted: bool,
    pub migrated: bool,
    pub source_dir: Option<String>,
    pub target_dirs: Vec<String>,
    pub copied_files: Vec<String>,
    pub skipped_reason: Option<String>,
    pub error: Option<String>,
    pub timestamp_ms: u64,
}

pub fn perform_app_migration(app: &tauri::AppHandle) -> MigrationReport {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    // 1. Determine APPDATA root directory
    let appdata_root = if let Ok(val) = std::env::var("APPDATA") {
        std::path::PathBuf::from(val)
    } else if let Ok(dir) = app.path().config_dir() {
        dir
    } else {
        return MigrationReport {
            attempted: false,
            migrated: false,
            source_dir: None,
            target_dirs: vec![],
            copied_files: vec![],
            skipped_reason: Some("Could not determine AppData or Config directory".into()),
            error: None,
            timestamp_ms: now,
        };
    };

    // Candidate source legacy directories (checked in order of priority)
    let candidate_sources = [
        appdata_root.join("dnd-ait"),
        appdata_root.join("com.thezavo.dndait"),
        appdata_root.join("DnD_AIT"),
    ];

    let found_source = candidate_sources.iter().find(|p| p.exists() && p.is_dir());
    let source_dir = match found_source {
        Some(s) => s.clone(),
        None => {
            return MigrationReport {
                attempted: true,
                migrated: false,
                source_dir: None,
                target_dirs: vec![],
                copied_files: vec![],
                skipped_reason: Some("No existing dnd-ait legacy directory found in AppData".into()),
                error: None,
                timestamp_ms: now,
            };
        }
    };

    // Target directories:
    // 1) %APPDATA%/ttrpg-helper (explicit requirement)
    // 2) Tauri app_config_dir (e.g. %APPDATA%/com.thezavo.ttrpghelper)
    let explicit_target = appdata_root.join("ttrpg-helper");
    let mut targets = vec![explicit_target];

    if let Ok(config_dir) = app.path().app_config_dir() {
        if !targets.contains(&config_dir) {
            targets.push(config_dir);
        }
    }

    // Check if target directory already has databases or completed migration
    let primary_target = &targets[0];
    let primary_db = primary_target.join("ttrpghelper.db");
    let legacy_primary_db = primary_target.join("dnd2024.db");
    let migration_marker = primary_target.join("migration_log.json");

    if migration_marker.exists()
        || (primary_db.exists() && primary_db.metadata().map(|m| m.len()).unwrap_or(0) > 0)
        || (legacy_primary_db.exists() && legacy_primary_db.metadata().map(|m| m.len()).unwrap_or(0) > 0)
    {
        return MigrationReport {
            attempted: true,
            migrated: false,
            source_dir: Some(source_dir.to_string_lossy().to_string()),
            target_dirs: targets.iter().map(|p| p.to_string_lossy().to_string()).collect(),
            copied_files: vec![],
            skipped_reason: Some(
                "Target directory already contains database or was previously migrated".into(),
            ),
            error: None,
            timestamp_ms: now,
        };
    }

    // Ensure all target folders and backup subfolders exist
    for target in &targets {
        let _ = fs::create_dir_all(target);
        let _ = fs::create_dir_all(target.join("backups"));
    }

    let mut copied_files = Vec::new();

    // Copy root files (.json, dnd2024.db, SQLite temp files)
    if let Ok(entries) = fs::read_dir(&source_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    let is_target = file_name.ends_with(".json")
                        || file_name == "ttrpghelper.db"
                        || file_name.starts_with("ttrpghelper.db-")
                        || file_name == "dnd2024.db"
                        || file_name.starts_with("dnd2024.db-");

                    if is_target {
                        for target in &targets {
                            let dest = target.join(file_name);
                            if fs::copy(&path, &dest).is_ok() {
                                let label = format!("{} -> {}", file_name, dest.to_string_lossy());
                                if !copied_files.contains(&label) {
                                    copied_files.push(label);
                                }
                            }
                        }
                    }
                }
            } else if path.is_dir() {
                // If backups subdirectory, copy all backups
                if let Some(dir_name) = path.file_name().and_then(|n| n.to_str()) {
                    if dir_name == "backups" {
                        if let Ok(backup_entries) = fs::read_dir(&path) {
                            for b_entry in backup_entries.flatten() {
                                let b_path = b_entry.path();
                                if b_path.is_file() {
                                    if let Some(b_name) = b_path.file_name().and_then(|n| n.to_str()) {
                                        for target in &targets {
                                            let dest = target.join("backups").join(b_name);
                                            if fs::copy(&b_path, &dest).is_ok() {
                                                let label = format!("backups/{} -> {}", b_name, dest.to_string_lossy());
                                                if !copied_files.contains(&label) {
                                                    copied_files.push(label);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let report = MigrationReport {
        attempted: true,
        migrated: !copied_files.is_empty(),
        source_dir: Some(source_dir.to_string_lossy().to_string()),
        target_dirs: targets.iter().map(|p| p.to_string_lossy().to_string()).collect(),
        copied_files: copied_files.clone(),
        skipped_reason: if copied_files.is_empty() {
            Some("No eligible files (.json, ttrpghelper.db, dnd2024.db, backups) found in source".into())
        } else {
            None
        },
        error: None,
        timestamp_ms: now,
    };

    if let Ok(log_json) = serde_json::to_string_pretty(&report) {
        for target in &targets {
            let log_path = target.join("migration_log.json");
            let _ = fs::write(&log_path, &log_json);
        }
    }

    println!(
        "[Migration] TTRPG Helper AppData migration: {} files copied",
        copied_files.len()
    );
    report
}

#[tauri::command]
async fn run_app_migration(app: tauri::AppHandle) -> Result<MigrationReport, String> {
    Ok(perform_app_migration(&app))
}


#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg(&url)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("xdg-open")
                .arg(&url)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
