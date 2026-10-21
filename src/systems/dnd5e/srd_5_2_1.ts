/**
 * TTRPG Helper - SRD 5.2.1 Rule Engine Adapter
 * Implements SystemReferenceDocument 5.2.1 CC-BY rules.
 */

import { SYSTEM_REGISTRY } from '../registry';
import { BaseDndRuleEngine } from './dndBase';

export class Srd521Engine extends BaseDndRuleEngine {
  constructor() {
    super(SYSTEM_REGISTRY['srd_5_2_1']);
  }

  /**
   * SRD 5.2.1 features: supports weapon masteries and modern death saves
   */
  isWeaponMasterySupported(): boolean {
    return true;
  }
}

export const srd521Engine = new Srd521Engine();
