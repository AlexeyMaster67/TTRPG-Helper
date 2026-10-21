use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};

use crate::systems::system_trait::*;
use crate::systems::universal_creature::{ConditionInstance, ResourcePool, UniversalCreature};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatDefinition {
    pub id: String,
    pub name: String,
    pub short_name: String,
    pub default_value: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<i64>,
    pub is_derived: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub formula: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceDefinition {
    pub id: String,
    pub name: String,
    pub default_max: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reset_on: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackDefinition {
    pub id: String,
    pub name: String,
    pub max: i64,
    #[serde(default)]
    pub steps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DamageTypeDefinition {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ArmorBehavior {
    ArmorClass,       // Classic D&D AC: roll vs AC, hit or miss
    DamageReduction,  // Reduces incoming damage by armor value (e.g. flat DR)
    Ablation,         // Cyberpunk SP: armor absorbs up to SP, penetrates if > SP, ablates SP by 1
    ShieldAbsorption, // Shield HP takes damage before body HP
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiceRollType {
    D20,
    D10Exploding,
    ThreeD6,
    PoolD6,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemRuleFormulas {
    pub dice_type: DiceRollType,
    pub initiative_stat: String,
    pub attack_defense_stat: String,
    pub armor_behavior: ArmorBehavior,
    pub crit_natural_value: i32,
    pub fumble_natural_value: i32,
    #[serde(default)]
    pub use_degrees_of_success: bool,
}

/// Declarative schema for data-driven systems loaded from JSON or TOML.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemDefinition {
    pub metadata: SystemMetadata,
    #[serde(default)]
    pub stats: Vec<StatDefinition>,
    #[serde(default)]
    pub resources: Vec<ResourceDefinition>,
    #[serde(default)]
    pub tracks: Vec<TrackDefinition>,
    #[serde(default)]
    pub conditions: Vec<ConditionDefinition>,
    #[serde(default)]
    pub damage_types: Vec<DamageTypeDefinition>,
    pub rules: SystemRuleFormulas,
    pub card_layout: CreatureCardLayout,
}

/// Concrete RuleSystem implementation driven completely by a SystemDefinition data structure.
pub struct DynamicRuleSystem {
    definition: SystemDefinition,
}

impl DynamicRuleSystem {
    pub fn new(definition: SystemDefinition) -> Self {
        Self { definition }
    }

    pub fn definition(&self) -> &SystemDefinition {
        &self.definition
    }
}

impl RuleSystem for DynamicRuleSystem {
    fn metadata(&self) -> &SystemMetadata {
        &self.definition.metadata
    }

    fn roll_initiative(&self, creature: &UniversalCreature, context: &RollContext) -> InitiativeResult {
        let stat_key = &self.definition.rules.initiative_stat;
        let bonus = creature.get_stat_i64(stat_key).unwrap_or(0) as i32
            + context.situational_bonus.unwrap_or(0);

        // Fixed baseline simulation or hook formula
        let dice_roll = match context.roll_mode {
            RollMode::Advantage => 15,
            RollMode::Disadvantage => 6,
            RollMode::Normal => 10,
        };

        let tie_breaker = (bonus.max(-10) as f64) * 0.01;
        let total = (dice_roll + bonus) as f64 + tie_breaker;

        InitiativeResult {
            total,
            rolled_value: dice_roll,
            modifier: bonus,
            tie_breaker,
            formula: format!("1d{:?} + {}", self.definition.rules.dice_type, bonus),
            breakdown: format!("{} [d{:?}] + {} [mod] = {:.2}", dice_roll, self.definition.rules.dice_type, bonus, total),
        }
    }

    fn resolve_check(&self, request: &CheckRequest, creature: &UniversalCreature) -> CheckResult {
        let stat_val = creature.get_stat_i64(&request.stat_key).unwrap_or(0) as i32;
        let modifier = stat_val + request.bonus;
        let rolled = match request.roll_mode {
            RollMode::Advantage => 16,
            RollMode::Disadvantage => 5,
            RollMode::Normal => 11,
        };
        let total = rolled + modifier;

        let is_natural_max = rolled == self.definition.rules.crit_natural_value;
        let is_natural_min = rolled == self.definition.rules.fumble_natural_value;

        let degree = if let Some(dc) = request.dc {
            if self.definition.rules.use_degrees_of_success {
                if total >= dc + 10 || (total >= dc && is_natural_max) {
                    DegreeOfSuccess::CriticalSuccess
                } else if total >= dc {
                    DegreeOfSuccess::Success
                } else if total <= dc - 10 || is_natural_min {
                    DegreeOfSuccess::CriticalFailure
                } else {
                    DegreeOfSuccess::Failure
                }
            } else if is_natural_max || total >= dc {
                DegreeOfSuccess::Success
            } else {
                DegreeOfSuccess::Failure
            }
        } else if is_natural_max {
            DegreeOfSuccess::CriticalSuccess
        } else if is_natural_min {
            DegreeOfSuccess::CriticalFailure
        } else {
            DegreeOfSuccess::Success
        };

        CheckResult {
            total,
            dice_rolls: vec![rolled],
            modifier,
            degree,
            is_natural_max,
            is_natural_min,
            formula: format!("1d{:?} + {}", self.definition.rules.dice_type, modifier),
            breakdown: format!("{} + {} = {}", rolled, modifier, total),
        }
    }

    fn resolve_attack(
        &self,
        request: &AttackRequest,
        attacker: &UniversalCreature,
        target: Option<&UniversalCreature>,
    ) -> AttackResult {
        let rolled = match request.roll_mode {
            RollMode::Advantage => 17,
            RollMode::Disadvantage => 4,
            RollMode::Normal => 12,
        };
        let total = rolled + request.attack_bonus;
        let is_critical_hit = rolled == self.definition.rules.crit_natural_value;
        let is_fumble = rolled == self.definition.rules.fumble_natural_value;

        let target_defense_key = request.target_defense_key.as_deref()
            .unwrap_or(&self.definition.rules.attack_defense_stat);

        let target_defense = target
            .and_then(|t| t.get_stat_i64(target_defense_key))
            .unwrap_or(10) as i32;

        let is_hit = if is_critical_hit {
            true
        } else if is_fumble {
            false
        } else {
            total >= target_defense
        };

        let degree = if is_critical_hit || (self.definition.rules.use_degrees_of_success && total >= target_defense + 10) {
            DegreeOfSuccess::CriticalSuccess
        } else if is_hit {
            DegreeOfSuccess::Success
        } else if is_fumble || (self.definition.rules.use_degrees_of_success && total <= target_defense - 10) {
            DegreeOfSuccess::CriticalFailure
        } else {
            DegreeOfSuccess::Failure
        };

        AttackResult {
            total,
            dice_rolls: vec![rolled],
            target_defense,
            is_hit,
            is_critical_hit,
            is_fumble,
            degree,
            formula: format!("1d{:?} + {}", self.definition.rules.dice_type, request.attack_bonus),
            breakdown: format!("Rolled {} + {} = {} vs Def {}", rolled, request.attack_bonus, total, target_defense),
        }
    }

    fn resolve_damage(
        &self,
        request: &DamageResolutionRequest,
        target: &UniversalCreature,
    ) -> DamageResolutionResult {
        let raw_damage: i32 = request.components.iter().map(|c| c.amount).sum();
        let mut effective_damage = raw_damage;
        let mut absorbed_armor = 0;
        let mut absorbed_temp = 0;
        let mut ablation = None;

        let hp_pool = target.resources.get("hp").cloned().unwrap_or(ResourcePool::new(10, 10));
        let previous_value = hp_pool.current;

        match self.definition.rules.armor_behavior {
            ArmorBehavior::Ablation => {
                // Cyberpunk RED: Check hit location SP (head or body)
                let location_key = if request.hit_location.as_deref() == Some("head") {
                    "sp_head"
                } else {
                    "sp_body"
                };
                let current_sp = target.resources.get(location_key).map(|r| r.current as i32).unwrap_or(0);

                if !request.bypass_armor && current_sp > 0 {
                    if effective_damage > current_sp {
                        absorbed_armor = current_sp;
                        effective_damage -= current_sp;
                        ablation = Some(AblationResult {
                            armor_key: location_key.into(),
                            initial_sp: current_sp,
                            remaining_sp: (current_sp - 1).max(0),
                            ablated_amount: 1,
                        });
                    } else {
                        // Armor stops all damage, no ablation
                        absorbed_armor = effective_damage;
                        effective_damage = 0;
                    }
                }
            }
            ArmorBehavior::DamageReduction => {
                let dr = target.get_stat_i64("damage_reduction").unwrap_or(0) as i32;
                if !request.bypass_armor && dr > 0 {
                    absorbed_armor = dr.min(effective_damage);
                    effective_damage -= absorbed_armor;
                }
            }
            ArmorBehavior::ShieldAbsorption => {
                let shield_hp = target.resources.get("shield_hp").map(|r| r.current as i32).unwrap_or(0);
                if shield_hp > 0 {
                    let absorbed = shield_hp.min(effective_damage);
                    effective_damage -= absorbed;
                    absorbed_armor += absorbed;
                }
            }
            ArmorBehavior::ArmorClass => {
                // Check resistances / vulnerabilities / temp HP (D&D 5e style)
                for comp in &request.components {
                    if target.defenses.damage_immunities.iter().any(|d| d.eq_ignore_ascii_case(&comp.damage_type)) {
                        effective_damage -= comp.amount;
                    } else if target.defenses.damage_resistances.iter().any(|d| d.eq_ignore_ascii_case(&comp.damage_type)) {
                        effective_damage -= comp.amount / 2;
                    } else if target.defenses.damage_vulnerabilities.iter().any(|d| d.eq_ignore_ascii_case(&comp.damage_type)) {
                        effective_damage += comp.amount;
                    }
                }

                if hp_pool.temp > 0 {
                    absorbed_temp = (hp_pool.temp as i32).min(effective_damage);
                    effective_damage -= absorbed_temp;
                }
            }
        }

        let remaining_hp = (previous_value - effective_damage as i64).max(0);
        let is_unconscious = remaining_hp == 0;
        let is_dying = remaining_hp == 0;
        let is_dead = previous_value + hp_pool.max <= effective_damage as i64;

        DamageResolutionResult {
            raw_damage,
            effective_damage,
            absorbed_by_armor: absorbed_armor,
            absorbed_by_temp_hp: absorbed_temp,
            resource_deducted: "hp".into(),
            previous_value,
            remaining_value: remaining_hp,
            armor_ablation: ablation,
            is_unconscious,
            is_dying,
            is_dead,
            new_wounds: Vec::new(),
            log_summary: format!(
                "Raw {} dmg -> {} effective (absorbed: armor={}, temp={}). HP: {} -> {}",
                raw_damage, effective_damage, absorbed_armor, absorbed_temp, previous_value, remaining_hp
            ),
        }
    }

    fn available_conditions(&self) -> Vec<ConditionDefinition> {
        self.definition.conditions.clone()
    }

    fn apply_condition(
        &self,
        creature: &mut UniversalCreature,
        condition: &ConditionInstance,
    ) -> Result<(), String> {
        if creature.defenses.condition_immunities.iter().any(|imm| imm.eq_ignore_ascii_case(&condition.id)) {
            return Err(format!("Существо иммунно к состоянию '{}'", condition.name));
        }
        creature.add_condition(condition.clone());
        Ok(())
    }

    fn remove_condition(
        &self,
        creature: &mut UniversalCreature,
        condition_id: &str,
    ) -> Result<(), String> {
        creature.remove_condition(condition_id);
        Ok(())
    }

    fn resolve_rest(&self, creature: &mut UniversalCreature, rest_type: &RestType) -> RestResult {
        let mut restored = BTreeMap::new();
        let mut healed = 0;

        match rest_type {
            RestType::LongRest => {
                if let Some(hp) = creature.resources.get_mut("hp") {
                    healed = hp.max - hp.current;
                    hp.current = hp.max;
                    hp.temp = 0;
                    restored.insert("hp".into(), healed);
                }
                for (key, pool) in creature.resources.iter_mut() {
                    if pool.reset_on.as_deref() == Some("long") || pool.reset_on.as_deref() == Some("short") {
                        let diff = pool.max - pool.current;
                        pool.current = pool.max;
                        restored.insert(key.clone(), diff);
                    }
                }
            }
            RestType::ShortRest { hit_dice_spent: _ } => {
                for (key, pool) in creature.resources.iter_mut() {
                    if pool.reset_on.as_deref() == Some("short") {
                        let diff = pool.max - pool.current;
                        pool.current = pool.max;
                        restored.insert(key.clone(), diff);
                    }
                }
            }
            RestType::CyberpunkSleep => {
                // Heals Body + Will per day
                let body = creature.get_stat_i64("body").unwrap_or(6);
                let will = creature.get_stat_i64("will").unwrap_or(6);
                let heal_amount = body + will;
                if let Some(hp) = creature.resources.get_mut("hp") {
                    let old_val = hp.current;
                    hp.current = (hp.current + heal_amount).min(hp.max);
                    healed = hp.current - old_val;
                    restored.insert("hp".into(), healed);
                }
            }
            RestType::Custom(_) => {}
        }

        RestResult {
            healed_hp: healed,
            resources_restored: restored,
            conditions_removed: Vec::new(),
            summary: format!("Rest applied: restored {} HP", healed),
        }
    }

    fn card_layout(&self) -> CreatureCardLayout {
        self.definition.card_layout.clone()
    }
}
