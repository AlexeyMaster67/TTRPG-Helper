/**
 * TTRPG Helper - D&D 5e Family Rule Engines Module
 * Exports adapters and registers them with multi-system registry.
 */

import { registerRuleEngine } from '../registry';
import { srd521Engine } from './srd_5_2_1';
import { dnd5e2014Engine } from './dnd5e_2014';
import { dnd5e2024Engine } from './dnd5e_2024';

// Register D&D family engines with central registry
registerRuleEngine(srd521Engine);
registerRuleEngine(dnd5e2014Engine);
registerRuleEngine(dnd5e2024Engine);

export * from './dndBase';
export * from './srd_5_2_1';
export * from './dnd5e_2014';
export * from './dnd5e_2024';
