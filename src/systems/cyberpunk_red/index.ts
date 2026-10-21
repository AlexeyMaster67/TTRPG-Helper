/**
 * TTRPG Helper - Cyberpunk RED Rule Engine Module
 * Exports engine adapter, archetype templates, and registers with multi-system registry.
 */

import { registerRuleEngine } from '../registry';
import { cyberpunkRedEngine } from './cyberpunkRed';

// Register Cyberpunk RED engine with central registry
registerRuleEngine(cyberpunkRedEngine);

export * from './types';
export * from './cyberpunkRed';
export * from './templates';
