use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcePool {
    pub current: i64,
    pub max: i64,
    pub temp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reset_on: Option<String>,
}

impl ResourcePool {
    pub fn new(current: i64, max: i64) -> Self {
        Self {
            current,
            max,
            temp: 0,
            reset_on: None,
        }
    }

    pub fn with_reset(mut self, reset_on: impl Into<String>) -> Self {
        self.reset_on = Some(reset_on.into());
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackStep {
    pub index: i32,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub name: String,
    pub current: i64,
    pub max: i64,
    #[serde(default)]
    pub steps: Vec<TrackStep>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_label: Option<String>,
}

impl Track {
    pub fn new(name: impl Into<String>, current: i64, max: i64) -> Self {
        Self {
            name: name.into(),
            current,
            max,
            steps: Vec::new(),
            current_label: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionInstance {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub level: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_rounds: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expiry_round: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trigger_on: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CreatureDefenses {
    #[serde(default)]
    pub damage_immunities: Vec<String>,
    #[serde(default)]
    pub damage_resistances: Vec<String>,
    #[serde(default)]
    pub damage_vulnerabilities: Vec<String>,
    #[serde(default)]
    pub condition_immunities: Vec<String>,
    #[serde(default)]
    pub damage_reductions: BTreeMap<String, i32>, // flat DR per type
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatureAction {
    pub id: String,
    pub name: String,
    pub action_type: String, // "action", "bonus", "reaction", "free", "passive"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attack_bonus: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub damage_formula: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub damage_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub save_dc: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub save_stat: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub range_reach: Option<String>,
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatureItem {
    pub id: String,
    pub name: String,
    pub quantity: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weight: Option<f64>,
    pub equipped: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Universal Creature Model.
///
/// Designed to store state for any tabletop RPG system:
/// - Stats are kept in a flexible key-value store (e.g. "str", "ac", "reflex")
/// - Resources are tracked with Current/Max/Temp (e.g. HP, SP, Spell Slots, Action Surge)
/// - Tracks track stepped scales (e.g. Death Saves, Exhaustion, Wound Severity, Humanity)
/// - Conditions, Defenses, and Actions provide standard mechanics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UniversalCreature {
    pub id: String,
    pub system_id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name_secondary: Option<String>,
    pub creature_type: String,
    pub size: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_url: Option<String>,
    pub token_scale: f64,
    pub color: String,
    pub is_player: bool,

    // Core dynamic containers
    #[serde(default)]
    pub stats: BTreeMap<String, Value>,
    #[serde(default)]
    pub resources: BTreeMap<String, ResourcePool>,
    #[serde(default)]
    pub tracks: BTreeMap<String, Track>,
    #[serde(default)]
    pub conditions: Vec<ConditionInstance>,

    // Dynamic actions, defenses, items
    #[serde(default)]
    pub defenses: CreatureDefenses,
    #[serde(default)]
    pub actions: Vec<CreatureAction>,
    #[serde(default)]
    pub items: Vec<CreatureItem>,

    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub custom_fields: BTreeMap<String, Value>,
}

impl UniversalCreature {
    pub fn new(id: impl Into<String>, system_id: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            system_id: system_id.into(),
            name: name.into(),
            name_secondary: None,
            creature_type: "Humanoid".into(),
            size: "Medium".into(),
            avatar_url: None,
            token_url: None,
            token_scale: 1.0,
            color: "#C5A059".into(),
            is_player: false,
            stats: BTreeMap::new(),
            resources: BTreeMap::new(),
            tracks: BTreeMap::new(),
            conditions: Vec::new(),
            defenses: CreatureDefenses::default(),
            actions: Vec::new(),
            items: Vec::new(),
            notes: String::new(),
            custom_fields: BTreeMap::new(),
        }
    }

    pub fn get_stat_i64(&self, key: &str) -> Option<i64> {
        self.stats.get(key).and_then(|v| {
            if let Some(i) = v.as_i64() {
                Some(i)
            } else if let Some(s) = v.as_str() {
                s.parse::<i64>().ok()
            } else {
                None
            }
        })
    }

    pub fn get_stat_f64(&self, key: &str) -> Option<f64> {
        self.stats.get(key).and_then(|v| {
            if let Some(f) = v.as_f64() {
                Some(f)
            } else if let Some(i) = v.as_i64() {
                Some(i as f64)
            } else if let Some(s) = v.as_str() {
                s.parse::<f64>().ok()
            } else {
                None
            }
        })
    }

    pub fn set_stat(&mut self, key: impl Into<String>, val: impl Into<Value>) {
        self.stats.insert(key.into(), val.into());
    }

    pub fn get_resource(&self, key: &str) -> Option<&ResourcePool> {
        self.resources.get(key)
    }

    pub fn get_resource_mut(&mut self, key: &str) -> Option<&mut ResourcePool> {
        self.resources.get_mut(key)
    }

    pub fn set_resource(&mut self, key: impl Into<String>, pool: ResourcePool) {
        self.resources.insert(key.into(), pool);
    }

    pub fn get_track(&self, key: &str) -> Option<&Track> {
        self.tracks.get(key)
    }

    pub fn get_track_mut(&mut self, key: &str) -> Option<&mut Track> {
        self.tracks.get_mut(key)
    }

    pub fn set_track(&mut self, key: impl Into<String>, track: Track) {
        self.tracks.insert(key.into(), track);
    }

    pub fn has_condition(&self, condition_id: &str) -> bool {
        self.conditions.iter().any(|c| c.id.eq_ignore_ascii_case(condition_id))
    }

    pub fn add_condition(&mut self, condition: ConditionInstance) {
        if let Some(existing) = self.conditions.iter_mut().find(|c| c.id == condition.id) {
            *existing = condition;
        } else {
            self.conditions.push(condition);
        }
    }

    pub fn remove_condition(&mut self, condition_id: &str) -> bool {
        let initial_len = self.conditions.len();
        self.conditions.retain(|c| !c.id.eq_ignore_ascii_case(condition_id));
        self.conditions.len() < initial_len
    }

    // =========================================================================
    // D&D 5e / 2024 Adapter View
    // =========================================================================

    pub fn to_dnd5e(&self) -> Dnd5eCreatureView {
        let hp_pool = self.resources.get("hp").cloned().unwrap_or(ResourcePool::new(10, 10));
        let death_save_track = self.tracks.get("death_saves");

        let death_successes = death_save_track
            .map(|t| (t.current >> 8) as i32)
            .unwrap_or(0);
        let death_failures = death_save_track
            .map(|t| (t.current & 0xFF) as i32)
            .unwrap_or(0);

        let exhaustion_level = self.tracks.get("exhaustion").map(|t| t.current as i32).unwrap_or(0);

        let mut spell_slots = BTreeMap::new();
        for level in 1..=9 {
            let key = format!("spell_slot_{}", level);
            if let Some(pool) = self.resources.get(&key) {
                spell_slots.insert(level, (pool.max as i32, (pool.max - pool.current) as i32));
            }
        }

        Dnd5eCreatureView {
            id: self.id.clone(),
            name: self.name.clone(),
            name_ru: self.name_secondary.clone(),
            creature_type: self.creature_type.clone(),
            size: self.size.clone(),
            ac: self.get_stat_i64("ac").unwrap_or(10) as i32,
            hp: hp_pool.current as i32,
            max_hp: hp_pool.max as i32,
            temp_hp: hp_pool.temp as i32,
            init_bonus: self.get_stat_i64("init_bonus").unwrap_or(0) as i32,
            passive_perception: self.get_stat_i64("passive_perception").unwrap_or(10) as i32,
            speed: self.stats.get("speed").and_then(|v| v.as_str()).unwrap_or("30 ft.").to_string(),
            str: self.get_stat_i64("str").unwrap_or(10) as i32,
            dex: self.get_stat_i64("dex").unwrap_or(10) as i32,
            con: self.get_stat_i64("con").unwrap_or(10) as i32,
            int: self.get_stat_i64("int").unwrap_or(10) as i32,
            wis: self.get_stat_i64("wis").unwrap_or(10) as i32,
            cha: self.get_stat_i64("cha").unwrap_or(10) as i32,
            cr: self.stats.get("cr").and_then(|v| v.as_str()).map(ToString::to_string),
            level: self.get_stat_i64("level").map(|l| l as i32),
            proficiency_bonus: self.get_stat_i64("proficiency_bonus").map(|p| p as i32),
            death_saves: DeathSaveState {
                successes: death_successes,
                failures: death_failures,
            },
            exhaustion: exhaustion_level,
            spell_slots,
            damage_immunities: self.defenses.damage_immunities.clone(),
            damage_resistances: self.defenses.damage_resistances.clone(),
            damage_vulnerabilities: self.defenses.damage_vulnerabilities.clone(),
            condition_immunities: self.defenses.condition_immunities.clone(),
            is_player: self.is_player,
        }
    }

    pub fn from_dnd5e(view: &Dnd5eCreatureView, system_id: &str) -> Self {
        let mut creature = Self::new(&view.id, system_id, &view.name);
        creature.name_secondary = view.name_ru.clone();
        creature.creature_type = view.creature_type.clone();
        creature.size = view.size.clone();
        creature.is_player = view.is_player;

        // Stats
        creature.set_stat("ac", json!(view.ac));
        creature.set_stat("init_bonus", json!(view.init_bonus));
        creature.set_stat("passive_perception", json!(view.passive_perception));
        creature.set_stat("speed", json!(view.speed));
        creature.set_stat("str", json!(view.str));
        creature.set_stat("dex", json!(view.dex));
        creature.set_stat("con", json!(view.con));
        creature.set_stat("int", json!(view.int));
        creature.set_stat("wis", json!(view.wis));
        creature.set_stat("cha", json!(view.cha));
        if let Some(ref cr) = view.cr {
            creature.set_stat("cr", json!(cr));
        }
        if let Some(lvl) = view.level {
            creature.set_stat("level", json!(lvl));
        }
        if let Some(pb) = view.proficiency_bonus {
            creature.set_stat("proficiency_bonus", json!(pb));
        }

        // HP Resource
        let mut hp_pool = ResourcePool::new(view.hp as i64, view.max_hp as i64);
        hp_pool.temp = view.temp_hp as i64;
        hp_pool.reset_on = Some("long".into());
        creature.set_resource("hp", hp_pool);

        // Spell Slots Resources
        for (level, (max, used)) in &view.spell_slots {
            let key = format!("spell_slot_{}", level);
            let pool = ResourcePool {
                current: (*max - *used).max(0) as i64,
                max: *max as i64,
                temp: 0,
                reset_on: Some("long".into()),
            };
            creature.set_resource(key, pool);
        }

        // Death Saves Track (encoded: high byte = successes, low byte = failures)
        let death_encoded = ((view.death_saves.successes as i64) << 8) | (view.death_saves.failures as i64);
        creature.set_track("death_saves", Track::new("Death Saves", death_encoded, 6));

        // Exhaustion Track
        let mut exhaust_track = Track::new("Exhaustion", view.exhaustion as i64, 6);
        exhaust_track.steps = (1..=6)
            .map(|i| TrackStep {
                index: i,
                label: format!("Уровень {}", i),
                description: Some(format!("-{} к броскам d20, -{} футов к скорости", i * 2, i * 5)),
            })
            .collect();
        creature.set_track("exhaustion", exhaust_track);

        // Defenses
        creature.defenses.damage_immunities = view.damage_immunities.clone();
        creature.defenses.damage_resistances = view.damage_resistances.clone();
        creature.defenses.damage_vulnerabilities = view.damage_vulnerabilities.clone();
        creature.defenses.condition_immunities = view.condition_immunities.clone();

        creature
    }

    // =========================================================================
    // Cyberpunk RED Adapter View
    // =========================================================================

    pub fn to_cyberpunk(&self) -> CyberpunkCreatureView {
        let hp_pool = self.resources.get("hp").cloned().unwrap_or(ResourcePool::new(35, 35));
        let sp_head = self.resources.get("sp_head").map(|r| r.current as i32).unwrap_or(0);
        let sp_body = self.resources.get("sp_body").map(|r| r.current as i32).unwrap_or(0);
        let sp_shield = self.resources.get("sp_shield").map(|r| r.current as i32).unwrap_or(0);
        let luck_pool = self.resources.get("luck").cloned().unwrap_or(ResourcePool::new(4, 4));

        let body = self.get_stat_i64("body").unwrap_or(6) as i32;
        let seriously_wounded_thresh = (hp_pool.max as f64 / 2.0).ceil() as i32;

        let wound_state = if hp_pool.current <= 0 {
            "Mortally Wounded".to_string()
        } else if (hp_pool.current as i32) <= seriously_wounded_thresh {
            "Seriously Wounded".to_string()
        } else {
            "Light".to_string()
        };

        let critical_injuries = self.conditions.iter()
            .filter(|c| c.id.starts_with("crit_") || c.source.as_deref() == Some("critical_injury"))
            .map(|c| c.name.clone())
            .collect();

        CyberpunkCreatureView {
            id: self.id.clone(),
            name: self.name.clone(),
            handle: self.name_secondary.clone(),
            hp: hp_pool.current as i32,
            max_hp: hp_pool.max as i32,
            sp_head,
            sp_body,
            sp_shield,
            luck_current: luck_pool.current as i32,
            luck_max: luck_pool.max as i32,
            int: self.get_stat_i64("int").unwrap_or(5) as i32,
            ref_stat: self.get_stat_i64("ref").unwrap_or(6) as i32,
            dex: self.get_stat_i64("dex").unwrap_or(6) as i32,
            tech: self.get_stat_i64("tech").unwrap_or(4) as i32,
            cool: self.get_stat_i64("cool").unwrap_or(5) as i32,
            will: self.get_stat_i64("will").unwrap_or(5) as i32,
            move_stat: self.get_stat_i64("move").unwrap_or(5) as i32,
            body,
            emp: self.get_stat_i64("emp").unwrap_or(5) as i32,
            humanity: self.tracks.get("humanity").map(|t| t.current as i32).unwrap_or(50),
            wound_state,
            death_save_dv: body,
            critical_injuries,
            is_player: self.is_player,
        }
    }

    pub fn from_cyberpunk(view: &CyberpunkCreatureView, system_id: &str) -> Self {
        let mut creature = Self::new(&view.id, system_id, &view.name);
        creature.name_secondary = view.handle.clone();
        creature.creature_type = "Edgerunner".into();
        creature.is_player = view.is_player;

        // Stats
        creature.set_stat("int", json!(view.int));
        creature.set_stat("ref", json!(view.ref_stat));
        creature.set_stat("dex", json!(view.dex));
        creature.set_stat("tech", json!(view.tech));
        creature.set_stat("cool", json!(view.cool));
        creature.set_stat("will", json!(view.will));
        creature.set_stat("move", json!(view.move_stat));
        creature.set_stat("body", json!(view.body));
        creature.set_stat("emp", json!(view.emp));

        // Resources
        creature.set_resource("hp", ResourcePool::new(view.hp as i64, view.max_hp as i64));
        creature.set_resource("sp_head", ResourcePool::new(view.sp_head as i64, view.sp_head as i64));
        creature.set_resource("sp_body", ResourcePool::new(view.sp_body as i64, view.sp_body as i64));
        if view.sp_shield > 0 {
            creature.set_resource("sp_shield", ResourcePool::new(view.sp_shield as i64, view.sp_shield as i64));
        }
        creature.set_resource("luck", ResourcePool::new(view.luck_current as i64, view.luck_max as i64));

        // Humanity Track
        creature.set_track("humanity", Track::new("Humanity", view.humanity as i64, (view.emp * 10) as i64));

        // Critical Injuries as conditions
        for injury in &view.critical_injuries {
            let safe_id = format!("crit_{}", injury.to_lowercase().replace(' ', "_"));
            creature.add_condition(ConditionInstance {
                id: safe_id,
                name: injury.clone(),
                level: None,
                source: Some("critical_injury".into()),
                duration_rounds: None,
                expiry_round: None,
                trigger_on: None,
                notes: None,
            });
        }

        creature
    }

    // =========================================================================
    // Pathfinder 2e Adapter View
    // =========================================================================

    pub fn to_pf2e(&self) -> Pf2eCreatureView {
        let hp_pool = self.resources.get("hp").cloned().unwrap_or(ResourcePool::new(20, 20));
        let focus_pool = self.resources.get("focus_points").cloned().unwrap_or(ResourcePool::new(1, 1));
        let shield_pool = self.resources.get("shield_hp").cloned().unwrap_or(ResourcePool::new(0, 0));

        let dying = self.tracks.get("dying").map(|t| t.current as i32).unwrap_or(0);
        let wounded = self.tracks.get("wounded").map(|t| t.current as i32).unwrap_or(0);
        let doomed = self.tracks.get("doomed").map(|t| t.current as i32).unwrap_or(0);

        Pf2eCreatureView {
            id: self.id.clone(),
            name: self.name.clone(),
            level: self.get_stat_i64("level").unwrap_or(1) as i32,
            ac: self.get_stat_i64("ac").unwrap_or(15) as i32,
            hp: hp_pool.current as i32,
            max_hp: hp_pool.max as i32,
            temp_hp: hp_pool.temp as i32,
            perception: self.get_stat_i64("perception").unwrap_or(5) as i32,
            speed: self.stats.get("speed").and_then(|v| v.as_str()).unwrap_or("25 ft.").to_string(),
            fortitude_save: self.get_stat_i64("fortitude").unwrap_or(6) as i32,
            reflex_save: self.get_stat_i64("reflex").unwrap_or(6) as i32,
            will_save: self.get_stat_i64("will").unwrap_or(6) as i32,
            str: self.get_stat_i64("str").unwrap_or(14) as i32,
            dex: self.get_stat_i64("dex").unwrap_or(14) as i32,
            con: self.get_stat_i64("con").unwrap_or(12) as i32,
            int: self.get_stat_i64("int").unwrap_or(10) as i32,
            wis: self.get_stat_i64("wis").unwrap_or(12) as i32,
            cha: self.get_stat_i64("cha").unwrap_or(10) as i32,
            dying,
            wounded,
            doomed,
            focus_points: focus_pool.current as i32,
            max_focus_points: focus_pool.max as i32,
            shield_hardness: self.get_stat_i64("shield_hardness").unwrap_or(0) as i32,
            shield_hp: shield_pool.current as i32,
            shield_max_hp: shield_pool.max as i32,
            is_player: self.is_player,
        }
    }

    pub fn from_pf2e(view: &Pf2eCreatureView, system_id: &str) -> Self {
        let mut creature = Self::new(&view.id, system_id, &view.name);
        creature.is_player = view.is_player;

        // Stats
        creature.set_stat("level", json!(view.level));
        creature.set_stat("ac", json!(view.ac));
        creature.set_stat("perception", json!(view.perception));
        creature.set_stat("speed", json!(view.speed));
        creature.set_stat("fortitude", json!(view.fortitude_save));
        creature.set_stat("reflex", json!(view.reflex_save));
        creature.set_stat("will", json!(view.will_save));
        creature.set_stat("str", json!(view.str));
        creature.set_stat("dex", json!(view.dex));
        creature.set_stat("con", json!(view.con));
        creature.set_stat("int", json!(view.int));
        creature.set_stat("wis", json!(view.wis));
        creature.set_stat("cha", json!(view.cha));
        if view.shield_hardness > 0 {
            creature.set_stat("shield_hardness", json!(view.shield_hardness));
        }

        // Resources
        let mut hp_pool = ResourcePool::new(view.hp as i64, view.max_hp as i64);
        hp_pool.temp = view.temp_hp as i64;
        creature.set_resource("hp", hp_pool);
        creature.set_resource(
            "focus_points",
            ResourcePool::new(view.focus_points as i64, view.max_focus_points as i64),
        );
        if view.shield_max_hp > 0 {
            creature.set_resource(
                "shield_hp",
                ResourcePool::new(view.shield_hp as i64, view.shield_max_hp as i64),
            );
        }

        // Tracks
        creature.set_track("dying", Track::new("Dying", view.dying as i64, 4));
        creature.set_track("wounded", Track::new("Wounded", view.wounded as i64, 3));
        creature.set_track("doomed", Track::new("Doomed", view.doomed as i64, 3));

        creature
    }
}

// =============================================================================
// Specialized View Structs for Type Safety and Direct Consumer Ease
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeathSaveState {
    pub successes: i32,
    pub failures: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dnd5eCreatureView {
    pub id: String,
    pub name: String,
    pub name_ru: Option<String>,
    pub creature_type: String,
    pub size: String,
    pub ac: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub temp_hp: i32,
    pub init_bonus: i32,
    pub passive_perception: i32,
    pub speed: String,
    pub str: i32,
    pub dex: i32,
    pub con: i32,
    pub int: i32,
    pub wis: i32,
    pub cha: i32,
    pub cr: Option<String>,
    pub level: Option<i32>,
    pub proficiency_bonus: Option<i32>,
    pub death_saves: DeathSaveState,
    pub exhaustion: i32,
    pub spell_slots: BTreeMap<u8, (i32, i32)>, // level -> (max, used)
    pub damage_immunities: Vec<String>,
    pub damage_resistances: Vec<String>,
    pub damage_vulnerabilities: Vec<String>,
    pub condition_immunities: Vec<String>,
    pub is_player: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CyberpunkCreatureView {
    pub id: String,
    pub name: String,
    pub handle: Option<String>,
    pub hp: i32,
    pub max_hp: i32,
    pub sp_head: i32,
    pub sp_body: i32,
    pub sp_shield: i32,
    pub luck_current: i32,
    pub luck_max: i32,
    pub int: i32,
    pub ref_stat: i32,
    pub dex: i32,
    pub tech: i32,
    pub cool: i32,
    pub will: i32,
    pub move_stat: i32,
    pub body: i32,
    pub emp: i32,
    pub humanity: i32,
    pub wound_state: String,
    pub death_save_dv: i32,
    pub critical_injuries: Vec<String>,
    pub is_player: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pf2eCreatureView {
    pub id: String,
    pub name: String,
    pub level: i32,
    pub ac: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub temp_hp: i32,
    pub perception: i32,
    pub speed: String,
    pub fortitude_save: i32,
    pub reflex_save: i32,
    pub will_save: i32,
    pub str: i32,
    pub dex: i32,
    pub con: i32,
    pub int: i32,
    pub wis: i32,
    pub cha: i32,
    pub dying: i32,
    pub wounded: i32,
    pub doomed: i32,
    pub focus_points: i32,
    pub max_focus_points: i32,
    pub shield_hardness: i32,
    pub shield_hp: i32,
    pub shield_max_hp: i32,
    pub is_player: bool,
}
