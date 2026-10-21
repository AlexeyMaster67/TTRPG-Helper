use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use std::sync::{Arc, RwLock};
use serde::{Deserialize, Serialize};

use crate::systems::builtins::*;
use crate::systems::definition::*;
use crate::systems::system_trait::*;

/// Campaign versioning and system configuration.
/// Stored in every campaign file or database record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignSystemConfig {
    pub system_id: String,
    pub system_version: String,
    #[serde(default)]
    pub custom_rules: BTreeMap<String, bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub theme_override: Option<String>,
}

impl Default for CampaignSystemConfig {
    fn default() -> Self {
        Self {
            system_id: "dnd5e_2024".into(),
            system_version: "1.0.0".into(),
            custom_rules: BTreeMap::new(),
            theme_override: None,
        }
    }
}

/// Dynamic System Registry.
/// Holds all loaded rule systems, capable of dynamic loading from TOML/JSON files,
/// plugin discovery, and campaign version verification.
pub struct SystemRegistry {
    systems: RwLock<BTreeMap<String, Arc<dyn RuleSystem>>>,
    definitions: RwLock<BTreeMap<String, SystemDefinition>>,
}

impl Default for SystemRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl SystemRegistry {
    pub fn new() -> Self {
        let registry = Self {
            systems: RwLock::new(BTreeMap::new()),
            definitions: RwLock::new(BTreeMap::new()),
        };

        // Pre-register built-in systems
        registry.register_definition(builtin_dnd5e_2024());
        registry.register_definition(builtin_dnd5e_2014());
        registry.register_definition(builtin_srd521());
        registry.register_definition(builtin_pf2e());
        registry.register_definition(builtin_cyberpunk_red());

        registry
    }

    /// Register a custom native RuleSystem implementation
    pub fn register_system(&self, system: Arc<dyn RuleSystem>) {
        let id = system.metadata().id.clone();
        let mut map = self.systems.write().unwrap();
        map.insert(id, system);
    }

    /// Register a declarative SystemDefinition
    pub fn register_definition(&self, definition: SystemDefinition) {
        let id = definition.metadata.id.clone();
        let dynamic_system = Arc::new(DynamicRuleSystem::new(definition.clone()));

        {
            let mut defs = self.definitions.write().unwrap();
            defs.insert(id.clone(), definition);
        }
        {
            let mut sys = self.systems.write().unwrap();
            sys.insert(id, dynamic_system);
        }
    }

    /// Load a system definition from a JSON string
    pub fn load_from_json(&self, json_str: &str) -> Result<String, String> {
        let def: SystemDefinition = serde_json::from_str(json_str)
            .map_err(|e| format!("Failed to parse SystemDefinition JSON: {}", e))?;
        let id = def.metadata.id.clone();
        self.register_definition(def);
        Ok(id)
    }

    /// Load a system definition from a TOML string
    pub fn load_from_toml(&self, toml_str: &str) -> Result<String, String> {
        let def: SystemDefinition = toml::from_str(toml_str)
            .map_err(|e| format!("Failed to parse SystemDefinition TOML: {}", e))?;
        let id = def.metadata.id.clone();
        self.register_definition(def);
        Ok(id)
    }

    /// Load a single file (.json or .toml)
    pub fn load_file(&self, path: &Path) -> Result<String, String> {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read file {:?}: {}", path, e))?;

        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            match ext.to_lowercase().as_str() {
                "json" => self.load_from_json(&content),
                "toml" => self.load_from_toml(&content),
                other => Err(format!("Unsupported file extension: {}", other)),
            }
        } else {
            Err("File has no extension".into())
        }
    }

    /// Scan a directory and load all .json and .toml system definitions
    pub fn load_directory(&self, dir: &Path) -> Result<usize, String> {
        if !dir.exists() || !dir.is_dir() {
            return Ok(0);
        }

        let mut loaded = 0;
        let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if ext.eq_ignore_ascii_case("json") || ext.eq_ignore_ascii_case("toml") {
                        if self.load_file(&path).is_ok() {
                            loaded += 1;
                        }
                    }
                }
            }
        }

        Ok(loaded)
    }

    /// Retrieve an Arc reference to the requested RuleSystem
    pub fn get(&self, system_id: &str) -> Option<Arc<dyn RuleSystem>> {
        let map = self.systems.read().unwrap();
        map.get(system_id).cloned()
    }

    /// Retrieve the raw SystemDefinition if available
    pub fn get_definition(&self, system_id: &str) -> Option<SystemDefinition> {
        let map = self.definitions.read().unwrap();
        map.get(system_id).cloned()
    }

    /// List metadata for all registered systems
    pub fn list(&self) -> Vec<SystemMetadata> {
        let map = self.systems.read().unwrap();
        map.values().map(|s| s.metadata().clone()).collect()
    }

    /// Validate campaign compatibility against registered systems
    pub fn validate_campaign_compatibility(&self, config: &CampaignSystemConfig) -> Result<(), String> {
        let system = self.get(&config.system_id).ok_or_else(|| {
            format!(
                "Система с идентификатором '{}' не зарегистрирована в приложении.",
                config.system_id
            )
        })?;

        let registered_version = &system.metadata().version;

        // Verify major version matches
        let campaign_major = config.system_version.split('.').next().unwrap_or("1");
        let registered_major = registered_version.split('.').next().unwrap_or("1");

        if campaign_major != registered_major {
            return Err(format!(
                "Несовместимая мажорная версия системы '{}': кампания ожидает v{}, но установлена v{}.",
                config.system_id, config.system_version, registered_version
            ));
        }

        Ok(())
    }
}
