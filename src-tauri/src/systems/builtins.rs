use std::collections::BTreeMap;
use crate::systems::definition::*;
use crate::systems::system_trait::*;

pub fn create_dnd_common_stats() -> Vec<StatDefinition> {
    vec![
        StatDefinition { id: "ac".into(), name: "Класс доспеха".into(), short_name: "КД".into(), default_value: 10, min: Some(1), max: Some(40), is_derived: false, formula: None },
        StatDefinition { id: "init_bonus".into(), name: "Бонус инициативы".into(), short_name: "Иниц".into(), default_value: 0, min: Some(-10), max: Some(20), is_derived: false, formula: None },
        StatDefinition { id: "speed".into(), name: "Скорость".into(), short_name: "Скор".into(), default_value: 30, min: Some(0), max: Some(200), is_derived: false, formula: None },
        StatDefinition { id: "passive_perception".into(), name: "Пассивное восприятие".into(), short_name: "П.Воспр".into(), default_value: 10, min: Some(1), max: Some(40), is_derived: false, formula: None },
        StatDefinition { id: "str".into(), name: "Сила".into(), short_name: "СИЛ".into(), default_value: 10, min: Some(1), max: Some(30), is_derived: false, formula: None },
        StatDefinition { id: "dex".into(), name: "Ловкость".into(), short_name: "ЛОВ".into(), default_value: 10, min: Some(1), max: Some(30), is_derived: false, formula: None },
        StatDefinition { id: "con".into(), name: "Телосложение".into(), short_name: "ТЕЛ".into(), default_value: 10, min: Some(1), max: Some(30), is_derived: false, formula: None },
        StatDefinition { id: "int".into(), name: "Интеллект".into(), short_name: "ИНТ".into(), default_value: 10, min: Some(1), max: Some(30), is_derived: false, formula: None },
        StatDefinition { id: "wis".into(), name: "Мудрость".into(), short_name: "МУД".into(), default_value: 10, min: Some(1), max: Some(30), is_derived: false, formula: None },
        StatDefinition { id: "cha".into(), name: "Харизма".into(), short_name: "ХАР".into(), default_value: 10, min: Some(1), max: Some(30), is_derived: false, formula: None },
    ]
}

pub fn create_dnd_common_resources() -> Vec<ResourceDefinition> {
    vec![
        ResourceDefinition { id: "hp".into(), name: "Хиты (HP)".into(), default_max: 10, reset_on: Some("long".into()), display_color: Some("#E53935".into()) },
        ResourceDefinition { id: "temp_hp".into(), name: "Временные хиты".into(), default_max: 0, reset_on: Some("long".into()), display_color: Some("#3B82F6".into()) },
        ResourceDefinition { id: "spell_slot_1".into(), name: "Ячейки 1 круга".into(), default_max: 0, reset_on: Some("long".into()), display_color: Some("#8B5CF6".into()) },
        ResourceDefinition { id: "spell_slot_2".into(), name: "Ячейки 2 круга".into(), default_max: 0, reset_on: Some("long".into()), display_color: Some("#8B5CF6".into()) },
        ResourceDefinition { id: "spell_slot_3".into(), name: "Ячейки 3 круга".into(), default_max: 0, reset_on: Some("long".into()), display_color: Some("#8B5CF6".into()) },
    ]
}

pub fn create_dnd_common_tracks() -> Vec<TrackDefinition> {
    vec![
        TrackDefinition {
            id: "death_saves".into(),
            name: "Спасброски от смерти".into(),
            max: 3,
            steps: vec!["0".into(), "1".into(), "2".into(), "3".into()],
        },
        TrackDefinition {
            id: "exhaustion".into(),
            name: "Истощение".into(),
            max: 6,
            steps: vec!["0".into(), "1".into(), "2".into(), "3".into(), "4".into(), "5".into(), "6 (Смерть)".into()],
        },
    ]
}

pub fn create_dnd_common_conditions() -> Vec<ConditionDefinition> {
    let conds = [
        ("blinded", "Ослеплён", "Существо не видит и автоматически проваливает проверки на зрение."),
        ("charmed", "Очарован", "Существо не может атаковать пленителя."),
        ("deafened", "Оглушён", "Существо ничего не слышит."),
        ("dazed", "Ошеломлён (2024)", "Существо может делать либо Действие, либо Бонусное действие, но не оба."),
        ("frightened", "Испуган", "Помеха на проверки и атаки, пока видит источник страха."),
        ("grappled", "Схвачен", "Скорость существа равна 0."),
        ("incapacitated", "Недееспособен", "Существо не может совершать действия и реакции."),
        ("invisible", "Невидимый", "Невозможно увидеть без магии или особого чувства."),
        ("paralyzed", "Парализован", "Недееспособен и не может двигаться или говорить. Криты в упор."),
        ("petrified", "Окаменевший", "Существо превращено в твёрдый камень."),
        ("poisoned", "Отравлен", "Помеха на броски атаки и проверки характеристик."),
        ("prone", "Сбит с ног", "Существо лежит. Скорость тратится на подъём."),
        ("restrained", "Опутан", "Скорость 0, помеха на броски атаки, преимущество по существу."),
        ("stunned", "Оглушённый", "Недееспособен, проваливает спасброски Силы и Ловкости."),
        ("unconscious", "Бессознательный", "Недееспособен, роняет предметы, падает ничком."),
    ];

    conds.iter().map(|(id, name, desc)| ConditionDefinition {
        id: id.to_string(),
        name: name.to_string(),
        description: desc.to_string(),
        has_levels: false,
        max_level: None,
        badge_color: "#E53935".into(),
        default_modifiers: BTreeMap::new(),
    }).collect()
}

pub fn create_dnd_card_layout() -> CreatureCardLayout {
    CreatureCardLayout {
        primary_stats: vec![
            CardStatSlot { key: "ac".into(), label: "КД".into(), short_label: "AC".into(), show_modifier: false },
            CardStatSlot { key: "init_bonus".into(), label: "Инициатива".into(), short_label: "INIT".into(), show_modifier: true },
            CardStatSlot { key: "speed".into(), label: "Скорость".into(), short_label: "SPD".into(), show_modifier: false },
        ],
        secondary_stats: vec![
            CardStatSlot { key: "str".into(), label: "Сила".into(), short_label: "STR".into(), show_modifier: true },
            CardStatSlot { key: "dex".into(), label: "Ловкость".into(), short_label: "DEX".into(), show_modifier: true },
            CardStatSlot { key: "con".into(), label: "Телосложение".into(), short_label: "CON".into(), show_modifier: true },
            CardStatSlot { key: "int".into(), label: "Интеллект".into(), short_label: "INT".into(), show_modifier: true },
            CardStatSlot { key: "wis".into(), label: "Мудрость".into(), short_label: "WIS".into(), show_modifier: true },
            CardStatSlot { key: "cha".into(), label: "Харизма".into(), short_label: "CHA".into(), show_modifier: true },
        ],
        resource_keys: vec!["hp".into(), "temp_hp".into(), "spell_slot_1".into()],
        track_keys: vec!["death_saves".into(), "exhaustion".into()],
        sections: vec![
            CardSection { id: "stats".into(), title: "Характеристики".into(), section_type: "stats_grid".into(), slots: vec![] },
            CardSection { id: "actions".into(), title: "Действия и Атаки".into(), section_type: "actions".into(), slots: vec![] },
            CardSection { id: "spells".into(), title: "Заклинания".into(), section_type: "spells".into(), slots: vec![] },
        ],
        default_badges: vec![
            CardBadge { key: "cr".into(), label: "CR".into(), color: "#f5b920".into(), icon: None },
            CardBadge { key: "size".into(), label: "Размер".into(), color: "#a0a0b0".into(), icon: None },
        ],
    }
}

pub fn builtin_dnd5e_2024() -> SystemDefinition {
    SystemDefinition {
        metadata: SystemMetadata {
            id: "dnd5e_2024".into(),
            name: "D&D 5e (2024)".into(),
            family: SystemFamily::Dnd5e,
            edition: "2024".into(),
            version: "1.0.0".into(),
            status: SystemStatus::Beta,
            theme_id: "dnd-gold".into(),
            description: "Обновлённые правила редакции 2024, свойства мастерства оружия (Weapon Mastery).".into(),
            author: Some("Wizards of the Coast / DnD AIT".into()),
            supported_features: SystemFeatures {
                spell_slots: true,
                weapon_mastery: true,
                armor_ablation: false,
                degrees_of_success: false,
                death_save_track: true,
                humanity_track: false,
                action_economy: ActionEconomyType::ActionBonusReaction,
            },
        },
        stats: create_dnd_common_stats(),
        resources: create_dnd_common_resources(),
        tracks: create_dnd_common_tracks(),
        conditions: create_dnd_common_conditions(),
        damage_types: vec![],
        rules: SystemRuleFormulas {
            dice_type: DiceRollType::D20,
            initiative_stat: "init_bonus".into(),
            attack_defense_stat: "ac".into(),
            armor_behavior: ArmorBehavior::ArmorClass,
            crit_natural_value: 20,
            fumble_natural_value: 1,
            use_degrees_of_success: false,
        },
        card_layout: create_dnd_card_layout(),
    }
}

pub fn builtin_dnd5e_2014() -> SystemDefinition {
    SystemDefinition {
        metadata: SystemMetadata {
            id: "dnd5e_2014".into(),
            name: "D&D 5e (2014)".into(),
            family: SystemFamily::Dnd5e,
            edition: "2014".into(),
            version: "1.0.0".into(),
            status: SystemStatus::Stable,
            theme_id: "dnd-gold".into(),
            description: "Классическая редакция и бестиарий 2014 года.".into(),
            author: Some("Wizards of the Coast".into()),
            supported_features: SystemFeatures {
                spell_slots: true,
                weapon_mastery: false,
                armor_ablation: false,
                degrees_of_success: false,
                death_save_track: true,
                humanity_track: false,
                action_economy: ActionEconomyType::ActionBonusReaction,
            },
        },
        stats: create_dnd_common_stats(),
        resources: create_dnd_common_resources(),
        tracks: create_dnd_common_tracks(),
        conditions: create_dnd_common_conditions(),
        damage_types: vec![],
        rules: SystemRuleFormulas {
            dice_type: DiceRollType::D20,
            initiative_stat: "init_bonus".into(),
            attack_defense_stat: "ac".into(),
            armor_behavior: ArmorBehavior::ArmorClass,
            crit_natural_value: 20,
            fumble_natural_value: 1,
            use_degrees_of_success: false,
        },
        card_layout: create_dnd_card_layout(),
    }
}

pub fn builtin_srd521() -> SystemDefinition {
    SystemDefinition {
        metadata: SystemMetadata {
            id: "srd521".into(),
            name: "SRD 5.2.1".into(),
            family: SystemFamily::Dnd5e,
            edition: "5.2.1".into(),
            version: "1.0.0".into(),
            status: SystemStatus::Stable,
            theme_id: "dnd-gold".into(),
            description: "Открытый контент (Creative Commons), правила редакции 2024.".into(),
            author: Some("Wizards of the Coast".into()),
            supported_features: SystemFeatures {
                spell_slots: true,
                weapon_mastery: true,
                armor_ablation: false,
                degrees_of_success: false,
                death_save_track: true,
                humanity_track: false,
                action_economy: ActionEconomyType::ActionBonusReaction,
            },
        },
        stats: create_dnd_common_stats(),
        resources: create_dnd_common_resources(),
        tracks: create_dnd_common_tracks(),
        conditions: create_dnd_common_conditions(),
        damage_types: vec![],
        rules: SystemRuleFormulas {
            dice_type: DiceRollType::D20,
            initiative_stat: "init_bonus".into(),
            attack_defense_stat: "ac".into(),
            armor_behavior: ArmorBehavior::ArmorClass,
            crit_natural_value: 20,
            fumble_natural_value: 1,
            use_degrees_of_success: false,
        },
        card_layout: create_dnd_card_layout(),
    }
}

pub fn builtin_pf2e() -> SystemDefinition {
    SystemDefinition {
        metadata: SystemMetadata {
            id: "pf2e".into(),
            name: "Pathfinder 2e".into(),
            family: SystemFamily::Pathfinder,
            edition: "2e".into(),
            version: "1.0.0".into(),
            status: SystemStatus::Beta,
            theme_id: "pathfinder-crimson".into(),
            description: "Три действия за ход, четыре степени успеха (+/-10 от КС), спасброски Стойкости/Рефлексов/Воли.".into(),
            author: Some("Paizo Inc.".into()),
            supported_features: SystemFeatures {
                spell_slots: true,
                weapon_mastery: false,
                armor_ablation: false,
                degrees_of_success: true,
                death_save_track: false,
                humanity_track: false,
                action_economy: ActionEconomyType::ThreeAction,
            },
        },
        stats: vec![
            StatDefinition { id: "ac".into(), name: "Класс брони".into(), short_name: "КБ".into(), default_value: 15, min: Some(1), max: Some(60), is_derived: false, formula: None },
            StatDefinition { id: "perception".into(), name: "Внимательность (Инициатива)".into(), short_name: "Вним".into(), default_value: 5, min: Some(-5), max: Some(40), is_derived: false, formula: None },
            StatDefinition { id: "fortitude".into(), name: "Стойкость".into(), short_name: "Стойк".into(), default_value: 6, min: Some(-5), max: Some(40), is_derived: false, formula: None },
            StatDefinition { id: "reflex".into(), name: "Рефлексы".into(), short_name: "Рефл".into(), default_value: 6, min: Some(-5), max: Some(40), is_derived: false, formula: None },
            StatDefinition { id: "will".into(), name: "Воля".into(), short_name: "Воля".into(), default_value: 6, min: Some(-5), max: Some(40), is_derived: false, formula: None },
            StatDefinition { id: "speed".into(), name: "Скорость".into(), short_name: "Скор".into(), default_value: 25, min: Some(0), max: Some(120), is_derived: false, formula: None },
            StatDefinition { id: "level".into(), name: "Уровень".into(), short_name: "Ур".into(), default_value: 1, min: Some(-1), max: Some(25), is_derived: false, formula: None },
        ],
        resources: vec![
            ResourceDefinition { id: "hp".into(), name: "Очки здоровья".into(), default_max: 20, reset_on: Some("long".into()), display_color: "#E53935".into() },
            ResourceDefinition { id: "focus_points".into(), name: "Фокус-очки".into(), default_max: 1, reset_on: Some("short".into()), display_color: "#3B82F6".into() },
            ResourceDefinition { id: "shield_hp".into(), name: "Прочность щита".into(), default_max: 0, reset_on: None, display_color: "#6B7280".into() },
        ],
        tracks: vec![
            TrackDefinition { id: "dying".into(), name: "Умирающий".into(), max: 4, steps: vec!["0".into(), "1".into(), "2".into(), "3".into(), "4 (Смерть)".into()] },
            TrackDefinition { id: "wounded".into(), name: "Раненый".into(), max: 3, steps: vec!["0".into(), "1".into(), "2".into(), "3".into()] },
            TrackDefinition { id: "doomed".into(), name: "Обречённый".into(), max: 3, steps: vec!["0".into(), "1".into(), "2".into(), "3".into()] },
        ],
        conditions: vec![
            ConditionDefinition { id: "clumsy".into(), name: "Неловкий".into(), description: "Штраф к проверкам на Ловкости и КБ.".into(), has_levels: true, max_level: Some(4), badge_color: "#F59E0B".into(), default_modifiers: BTreeMap::new() },
            ConditionDefinition { id: "drained".into(), name: "Истощённый".into(), description: "Штраф к проверкам Телосложения и спасброскам Стойкости.".into(), has_levels: true, max_level: Some(4), badge_color: "#8B5CF6".into(), default_modifiers: BTreeMap::new() },
            ConditionDefinition { id: "enfeebled".into(), name: "Ослабленный".into(), description: "Штраф к проверкам Силы и урону.".into(), has_levels: true, max_level: Some(4), badge_color: "#EF4444".into(), default_modifiers: BTreeMap::new() },
            ConditionDefinition { id: "frightened".into(), name: "Испуганный".into(), description: "Штраф ко всем проверкам и СЛ, уменьшается на 1 в конце хода.".into(), has_levels: true, max_level: Some(4), badge_color: "#EC4899".into(), default_modifiers: BTreeMap::new() },
            ConditionDefinition { id: "off_guard".into(), name: "Застигнутый врасплох".into(), description: "-2 к КБ против всех атак.".into(), has_levels: false, max_level: None, badge_color: "#10B981".into(), default_modifiers: BTreeMap::new() },
        ],
        damage_types: vec![],
        rules: SystemRuleFormulas {
            dice_type: DiceRollType::D20,
            initiative_stat: "perception".into(),
            attack_defense_stat: "ac".into(),
            armor_behavior: ArmorBehavior::ArmorClass,
            crit_natural_value: 20,
            fumble_natural_value: 1,
            use_degrees_of_success: true,
        },
        card_layout: CreatureCardLayout {
            primary_stats: vec![
                CardStatSlot { key: "ac".into(), label: "КБ".into(), short_label: "AC".into(), show_modifier: false },
                CardStatSlot { key: "perception".into(), label: "Внимательность".into(), short_label: "PER".into(), show_modifier: true },
                CardStatSlot { key: "speed".into(), label: "Скорость".into(), short_label: "SPD".into(), show_modifier: false },
            ],
            secondary_stats: vec![
                CardStatSlot { key: "fortitude".into(), label: "Стойкость".into(), short_label: "FORT".into(), show_modifier: true },
                CardStatSlot { key: "reflex".into(), label: "Рефлексы".into(), short_label: "REF".into(), show_modifier: true },
                CardStatSlot { key: "will".into(), label: "Воля".into(), short_label: "WILL".into(), show_modifier: true },
            ],
            resource_keys: vec!["hp".into(), "focus_points".into(), "shield_hp".into()],
            track_keys: vec!["dying".into(), "wounded".into(), "doomed".into()],
            sections: vec![
                CardSection { id: "stats".into(), title: "Спасброски и Атрибуты".into(), section_type: "stats_grid".into(), slots: vec![] },
                CardSection { id: "actions".into(), title: "Действия (3 за ход)".into(), section_type: "actions".into(), slots: vec![] },
            ],
            default_badges: vec![
                CardBadge { key: "level".into(), label: "Уровень".into(), color: "#f5b920".into(), icon: None },
            ],
        },
    }
}

pub fn builtin_cyberpunk_red() -> SystemDefinition {
    SystemDefinition {
        metadata: SystemMetadata {
            id: "cyberpunk_red".into(),
            name: "Cyberpunk RED".into(),
            family: SystemFamily::Cyberpunk,
            edition: "RED".into(),
            version: "1.0.0".into(),
            status: SystemStatus::Wip,
            theme_id: "cyberpunk-neon".into(),
            description: "REF+1d10, броня SP по зонам (голова/тело) с абляцией при пробитии, Humanity и киберпсихоз.".into(),
            author: Some("R. Talsorian Games".into()),
            supported_features: SystemFeatures {
                spell_slots: false,
                weapon_mastery: false,
                armor_ablation: true,
                degrees_of_success: false,
                death_save_track: false,
                humanity_track: true,
                action_economy: ActionEconomyType::MoveAndAction,
            },
        },
        stats: vec![
            StatDefinition { id: "int".into(), name: "Интеллект".into(), short_name: "INT".into(), default_value: 5, min: Some(1), max: Some(10), is_derived: false, formula: None },
            StatDefinition { id: "ref".into(), name: "Реакция".into(), short_name: "REF".into(), default_value: 6, min: Some(1), max: Some(10), is_derived: false, formula: None },
            StatDefinition { id: "dex".into(), name: "Ловкость".into(), short_name: "DEX".into(), default_value: 6, min: Some(1), max: Some(10), is_derived: false, formula: None },
            StatDefinition { id: "tech".into(), name: "Техника".into(), short_name: "TECH".into(), default_value: 4, min: Some(1), max: Some(10), is_derived: false, formula: None },
            StatDefinition { id: "cool".into(), name: "Крутость".into(), short_name: "COOL".into(), default_value: 5, min: Some(1), max: Some(10), is_derived: false, formula: None },
            StatDefinition { id: "will".into(), name: "Воля".into(), short_name: "WILL".into(), default_value: 5, min: Some(1), max: Some(10), is_derived: false, formula: None },
            StatDefinition { id: "luck".into(), name: "Удача".into(), short_name: "LUCK".into(), default_value: 5, min: Some(1), max: Some(10), is_derived: false, formula: None },
            StatDefinition { id: "move".into(), name: "Движение".into(), short_name: "MOVE".into(), default_value: 5, min: Some(1), max: Some(10), is_derived: false, formula: None },
            StatDefinition { id: "body".into(), name: "Тело".into(), short_name: "BODY".into(), default_value: 6, min: Some(1), max: Some(10), is_derived: false, formula: None },
            StatDefinition { id: "emp".into(), name: "Эмпатия".into(), short_name: "EMP".into(), default_value: 5, min: Some(1), max: Some(10), is_derived: false, formula: None },
        ],
        resources: vec![
            ResourceDefinition { id: "hp".into(), name: "Хиты".into(), default_max: 35, reset_on: Some("sleep".into()), display_color: "#E53935".into() },
            ResourceDefinition { id: "sp_head".into(), name: "Броня головы (SP)".into(), default_max: 11, reset_on: None, display_color: "#3B82F6".into() },
            ResourceDefinition { id: "sp_body".into(), name: "Броня тела (SP)".into(), default_max: 11, reset_on: None, display_color: "#3B82F6".into() },
            ResourceDefinition { id: "sp_shield".into(), name: "Щит (SP)".into(), default_max: 0, reset_on: None, display_color: "#6B7280".into() },
            ResourceDefinition { id: "luck".into(), name: "Очки удачи".into(), default_max: 5, reset_on: Some("session".into()), display_color: "#10B981".into() },
        ],
        tracks: vec![
            TrackDefinition { id: "humanity".into(), name: "Человечность".into(), max: 50, steps: vec![] },
            TrackDefinition { id: "wound_state".into(), name: "Тяжесть ранений".into(), max: 3, steps: vec!["Легкие".into(), "Тяжелые (-2)".into(), "Смертельные (-4)".into(), "Смерть".into()] },
        ],
        conditions: vec![
            ConditionDefinition { id: "crit_concussion".into(), name: "Сотрясение мозга".into(), description: "-2 к проверкам, связанным с интеллектом и восприятием.".into(), has_levels: false, max_level: None, badge_color: "#EF4444".into(), default_modifiers: BTreeMap::new() },
            ConditionDefinition { id: "crit_broken_arm".into(), name: "Сломанная рука".into(), description: "Рука выведена из строя.".into(), has_levels: false, max_level: None, badge_color: "#EF4444".into(), default_modifiers: BTreeMap::new() },
            ConditionDefinition { id: "ablated_armor".into(), name: "Повреждённая броня".into(), description: "Броня потеряла 1 или более SP.".into(), has_levels: true, max_level: Some(20), badge_color: "#3B82F6".into(), default_modifiers: BTreeMap::new() },
        ],
        damage_types: vec![],
        rules: SystemRuleFormulas {
            dice_type: DiceRollType::D10Exploding,
            initiative_stat: "ref".into(),
            attack_defense_stat: "ref".into(),
            armor_behavior: ArmorBehavior::Ablation,
            crit_natural_value: 10,
            fumble_natural_value: 1,
            use_degrees_of_success: false,
        },
        card_layout: CreatureCardLayout {
            primary_stats: vec![
                CardStatSlot { key: "ref".into(), label: "Реакция (REF)".into(), short_label: "REF".into(), show_modifier: false },
                CardStatSlot { key: "dex".into(), label: "Ловкость (DEX)".into(), short_label: "DEX".into(), show_modifier: false },
                CardStatSlot { key: "body".into(), label: "Тело (BODY)".into(), short_label: "BOD".into(), show_modifier: false },
                CardStatSlot { key: "move".into(), label: "Движение (MOVE)".into(), short_label: "MOV".into(), show_modifier: false },
            ],
            secondary_stats: vec![
                CardStatSlot { key: "int".into(), label: "Интеллект".into(), short_label: "INT".into(), show_modifier: false },
                CardStatSlot { key: "tech".into(), label: "Техника".into(), short_label: "TECH".into(), show_modifier: false },
                CardStatSlot { key: "cool".into(), label: "Крутость".into(), short_label: "COOL".into(), show_modifier: false },
                CardStatSlot { key: "will".into(), label: "Воля".into(), short_label: "WILL".into(), show_modifier: false },
                CardStatSlot { key: "emp".into(), label: "Эмпатия".into(), short_label: "EMP".into(), show_modifier: false },
            ],
            resource_keys: vec!["hp".into(), "sp_head".into(), "sp_body".into(), "luck".into()],
            track_keys: vec!["humanity".into(), "wound_state".into()],
            sections: vec![
                CardSection { id: "stats".into(), title: "Характеристики (STATS)".into(), section_type: "stats_grid".into(), slots: vec![] },
                CardSection { id: "cyberware".into(), title: "Киберимпланты и Снаряжение".into(), section_type: "items".into(), slots: vec![] },
                CardSection { id: "actions".into(), title: "Оружие и Атаки".into(), section_type: "actions".into(), slots: vec![] },
            ],
            default_badges: vec![
                CardBadge { key: "handle".into(), label: "Позывной".into(), color: "#6aa9ff".into(), icon: None },
            ],
        },
    }
}
