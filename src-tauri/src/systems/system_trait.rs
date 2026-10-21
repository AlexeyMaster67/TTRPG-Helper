use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::systems::universal_creature::{ConditionInstance, UniversalCreature};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SystemFamily {
    Dnd5e,
    Pathfinder,
    Cyberpunk,
    Custom(String),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SystemStatus {
    Stable,
    Beta,
    Wip,
    Planned,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActionEconomyType {
    /// Classic Action + Bonus Action + Reaction + Movement (D&D 5e / 2024)
    ActionBonusReaction,
    /// 3 Actions + 1 Reaction per turn (PF2e)
    ThreeAction,
    /// 1 Move + 1 Action (Cyberpunk RED)
    MoveAndAction,
    /// Flexible pool of Action Points
    ActionPoints,
}

impl Default for ActionEconomyType {
    fn default() -> Self {
        Self::ActionBonusReaction
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SystemFeatures {
    pub spell_slots: bool,
    pub weapon_mastery: bool,
    pub armor_ablation: bool,
    pub degrees_of_success: bool,
    pub death_save_track: bool,
    pub humanity_track: bool,
    pub action_economy: ActionEconomyType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetadata {
    pub id: String,
    pub name: String,
    pub family: SystemFamily,
    pub edition: String,
    pub version: String,
    pub status: SystemStatus,
    pub theme_id: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    pub supported_features: SystemFeatures,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollContext {
    pub roll_mode: RollMode,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub situational_bonus: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

impl Default for RollContext {
    fn default() -> Self {
        Self {
            roll_mode: RollMode::Normal,
            situational_bonus: None,
            note: None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RollMode {
    Normal,
    Advantage,
    Disadvantage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitiativeResult {
    pub total: f64,
    pub rolled_value: i32,
    pub modifier: i32,
    pub tie_breaker: f64,
    pub formula: String,
    pub breakdown: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckRequest {
    pub stat_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skill_key: Option<String>,
    pub dc: Option<i32>,
    pub roll_mode: RollMode,
    pub bonus: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DegreeOfSuccess {
    CriticalSuccess,
    Success,
    Failure,
    CriticalFailure,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckResult {
    pub total: i32,
    pub dice_rolls: Vec<i32>,
    pub modifier: i32,
    pub degree: DegreeOfSuccess,
    pub is_natural_max: bool,
    pub is_natural_min: bool,
    pub formula: String,
    pub breakdown: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttackRequest {
    pub attack_name: String,
    pub attack_bonus: i32,
    pub target_defense_key: Option<String>, // e.g. "ac" or "ref"
    pub roll_mode: RollMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttackResult {
    pub total: i32,
    pub dice_rolls: Vec<i32>,
    pub target_defense: i32,
    pub is_hit: bool,
    pub is_critical_hit: bool,
    pub is_fumble: bool,
    pub degree: DegreeOfSuccess,
    pub formula: String,
    pub breakdown: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DamageComponent {
    pub amount: i32,
    pub damage_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DamageResolutionRequest {
    pub components: Vec<DamageComponent>,
    pub is_critical: bool,
    pub hit_location: Option<String>, // e.g. "head" | "body" for Cyberpunk
    pub bypass_armor: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AblationResult {
    pub armor_key: String,
    pub initial_sp: i32,
    pub remaining_sp: i32,
    pub ablated_amount: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DamageResolutionResult {
    pub raw_damage: i32,
    pub effective_damage: i32,
    pub absorbed_by_armor: i32,
    pub absorbed_by_temp_hp: i32,
    pub resource_deducted: String, // e.g. "hp"
    pub previous_value: i64,
    pub remaining_value: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub armor_ablation: Option<AblationResult>,
    pub is_unconscious: bool,
    pub is_dying: bool,
    pub is_dead: bool,
    pub new_wounds: Vec<String>,
    pub log_summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    pub has_levels: bool,
    pub max_level: Option<i32>,
    pub badge_color: String,
    #[serde(default)]
    pub default_modifiers: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RestType {
    ShortRest { hit_dice_spent: i32 },
    LongRest,
    CyberpunkSleep,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestResult {
    pub healed_hp: i64,
    pub resources_restored: BTreeMap<String, i64>,
    pub conditions_removed: Vec<String>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardBadge {
    pub key: String,
    pub label: String,
    pub color: String,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardStatSlot {
    pub key: String,
    pub label: String,
    pub short_label: String,
    pub show_modifier: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardSection {
    pub id: String,
    pub title: String,
    pub section_type: String, // "stats_grid" | "resource_bars" | "tracks" | "actions" | "spells" | "notes"
    #[serde(default)]
    pub slots: Vec<CardStatSlot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatureCardLayout {
    pub primary_stats: Vec<CardStatSlot>,
    pub secondary_stats: Vec<CardStatSlot>,
    pub resource_keys: Vec<String>,
    pub track_keys: Vec<String>,
    pub sections: Vec<CardSection>,
    pub default_badges: Vec<CardBadge>,
}

/// The core RuleSystem trait.
/// All tabletop RPG systems implement this trait either natively in Rust
/// or dynamically via declarative definitions.
pub trait RuleSystem: Send + Sync {
    /// System metadata (id, name, edition, supported features, etc.)
    fn metadata(&self) -> &SystemMetadata;

    /// Calculate and roll initiative for a creature
    fn roll_initiative(&self, creature: &UniversalCreature, context: &RollContext) -> InitiativeResult;

    /// Resolve an ability check or skill check
    fn resolve_check(&self, request: &CheckRequest, creature: &UniversalCreature) -> CheckResult;

    /// Resolve an attack roll vs target defense
    fn resolve_attack(
        &self,
        request: &AttackRequest,
        attacker: &UniversalCreature,
        target: Option<&UniversalCreature>,
    ) -> AttackResult;

    /// Calculate damage application with armor ablation, resistances, vulnerabilities, and temp HP
    fn resolve_damage(
        &self,
        request: &DamageResolutionRequest,
        target: &UniversalCreature,
    ) -> DamageResolutionResult;

    /// List standard conditions supported by this rule system
    fn available_conditions(&self) -> Vec<ConditionDefinition>;

    /// Apply a condition to a creature, updating tracks or resource caps if needed
    fn apply_condition(
        &self,
        creature: &mut UniversalCreature,
        condition: &ConditionInstance,
    ) -> Result<(), String>;

    /// Remove a condition from a creature
    fn remove_condition(
        &self,
        creature: &mut UniversalCreature,
        condition_id: &str,
    ) -> Result<(), String>;

    /// Resolve a short or long rest
    fn resolve_rest(&self, creature: &mut UniversalCreature, rest_type: &RestType) -> RestResult;

    /// UI layout specification for rendering creature cards in this system
    fn card_layout(&self) -> CreatureCardLayout;
}
