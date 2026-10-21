/**
 * TTRPG Helper - Pathfinder 2e Rule Engine Module
 * Exports engine adapter, bestiary creatures, and registers with multi-system registry.
 */

import { registerRuleEngine } from '../registry';
import { pathfinder2eEngine } from './pathfinder2e';

// Register Pathfinder 2e engine with central registry
registerRuleEngine(pathfinder2eEngine);

export * from './types';
export * from './pathfinder2e';
export * from './creatures';
