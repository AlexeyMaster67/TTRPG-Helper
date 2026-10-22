/**
 * types.ts
 * Type definitions for TTRPG-Helper production-grade internationalization (i18n).
 */

export type SupportedLanguage = 'en' | 'ru';

export interface HeaderNavTranslations {
  combat: string;
  map: string;
  split: string;
  tokens: string;
  party: string;
  masterTools: string;
  settings: string;
  playerDisplay: string;
  broadcasting: string;
  off: string;
  searchPlaceholder: string;
  title: string;
  splitDescription: string;
}

export interface MasterToolsTranslations {
  sectionPlot: string;
  sectionBattle: string;
  sectionData: string;
  lootGenerator: string;
  handouts: string;
  encounters: string;
  soundboard: string;
  tokenForge: string;
  proceduralMap: string;
  npcGenerator: string;
  rulesCheatSheet: string;
  exportSession: string;
  importSession: string;
}

export interface CombatTranslations {
  initiative: string;
  round: string;
  roundNumber: string;
  nextTurn: string;
  prevTurn: string;
  addCombatant: string;
  rollAll: string;
  rollEnemies: string;
  sort: string;
  clear: string;
  clearConfirm: string;
  delay: string;
  reactions: string;
  reactionUsed: string;
  legendaryActions: string;
  hp: string;
  tempHp: string;
  maxHp: string;
  ac: string;
  deathSaves: string;
  deathSavesSuccesses: string;
  deathSavesFailures: string;
  concentration: string;
  concentrationAlert: string;
  concentrationDc: string;
  breakConcentration: string;
  keepConcentration: string;
  quickDamage: string;
  quickHeal: string;
  conditions: string;
  conditionsSelector: string;
  statusBadges: string;
  emptyRoster: string;
  emptyRosterHint: string;
  activeCombatant: string;
  passTurn: string;
  undo: string;
  redo: string;
}

export interface BestiaryTranslations {
  title: string;
  searchMonsters: string;
  filterCr: string;
  filterSize: string;
  filterType: string;
  addToCombat: string;
  previewStatblock: string;
  customMonsters: string;
  createCustom: string;
  lssImport: string;
  folders: string;
  allFolders: string;
  createFolder: string;
  noMonstersFound: string;
  sourceFilter: string;
  quantity: string;
}

export interface StatblockTranslations {
  stats: string;
  str: string;
  dex: string;
  con: string;
  int: string;
  wis: string;
  cha: string;
  strFull: string;
  dexFull: string;
  conFull: string;
  intFull: string;
  wisFull: string;
  chaFull: string;
  armorClass: string;
  hitPoints: string;
  speed: string;
  savingThrows: string;
  skills: string;
  damageResistances: string;
  damageImmunities: string;
  conditionImmunities: string;
  damageVulnerabilities: string;
  senses: string;
  languages: string;
  challengeRating: string;
  proficiencyBonus: string;
  traits: string;
  actions: string;
  bonusActions: string;
  reactions: string;
  legendaryActions: string;
  mythicActions: string;
  spells: string;
  spellSlots: string;
  rollAttack: string;
  rollDamage: string;
  noSelection: string;
}

export interface TargetedAttackTranslations {
  title: string;
  attacker: string;
  target: string;
  rollMode: string;
  advantage: string;
  disadvantage: string;
  normal: string;
  cover: string;
  coverNone: string;
  coverHalf: string;
  coverThreeQuarters: string;
  coverTotal: string;
  dcSaves: string;
  rollAttack: string;
  applyDamage: string;
  criticalHit: string;
  criticalMiss: string;
  hit: string;
  miss: string;
  attackRollResult: string;
  saveRollResult: string;
}

export interface MobCombatTranslations {
  title: string;
  subtitle: string;
  mobSize: string;
  targets: string;
  averageDamage: string;
  mobAttackBonus: string;
  targetAc: string;
  autoCalculate: string;
  totalHits: string;
  totalDamage: string;
  applyToTarget: string;
  hitThreshold: string;
}

export interface MapTranslations {
  controls: string;
  gridSize: string;
  gridToggle: string;
  gridSnap: string;
  fogOfWar: string;
  reveal: string;
  hide: string;
  resetFog: string;
  revealAll: string;
  aoeTemplates: string;
  circle: string;
  cone: string;
  line: string;
  cube: string;
  measurementTool: string;
  layers: string;
  layerTokens: string;
  layerFog: string;
  layerGrid: string;
  layerBackground: string;
  lightingVision: string;
  uploadMap: string;
  clearMap: string;
}

export interface PartyTranslations {
  title: string;
  partyMembers: string;
  addCharacter: string;
  edit: string;
  delete: string;
  level: string;
  class: string;
  species: string;
  ac: string;
  hp: string;
  stats: string;
  shortRest: string;
  longRest: string;
  exportTtrpgh: string;
  importTtrpgh: string;
  mobileCompanion: string;
  qrCode: string;
  deployToCombat: string;
  emptyParty: string;
}

export interface CharacterBuilderTranslations {
  builderTitle: string;
  sheetTitle: string;
  species: string;
  classes: string;
  backgrounds: string;
  abilityScoreMethod: string;
  standardArray: string;
  pointBuy: string;
  manual: string;
  equipment: string;
  spellSlots: string;
  feats: string;
  save: string;
  proficiencyBonus: string;
  inspiration: string;
  hitDice: string;
  deathSaves: string;
  features: string;
  spellcasting: string;
  currency: string;
}

export interface EncountersTranslations {
  title: string;
  savedEncounters: string;
  create: string;
  encounterName: string;
  difficulty: string;
  easy: string;
  medium: string;
  hard: string;
  deadly: string;
  xpBudget: string;
  totalXp: string;
  adjustedXp: string;
  addToActiveCombat: string;
  monstersList: string;
}

export interface LootTranslations {
  title: string;
  individualLoot: string;
  hoardLoot: string;
  crTier: string;
  coins: string;
  cp: string;
  sp: string;
  ep: string;
  gp: string;
  pp: string;
  magicItems: string;
  generate: string;
  copy: string;
}

export interface SoundboardTranslations {
  title: string;
  playlists: string;
  atmosphere: string;
  combat: string;
  sfx: string;
  volume: string;
  loop: string;
  uploadAudio: string;
  stopAll: string;
  noTracks: string;
}

export interface TokenForgeTranslations {
  title: string;
  borderFrame: string;
  colorTint: string;
  cropZoom: string;
  downloadToken: string;
  uploadImage: string;
  shapeRound: string;
  shapeHex: string;
  resetTransform: string;
}

export interface ProceduralMapTranslations {
  title: string;
  mapGenerator: string;
  rooms: string;
  corridors: string;
  seed: string;
  apply: string;
  randomSeed: string;
  dungeonSize: string;
}

export interface NpcGeneratorTranslations {
  title: string;
  name: string;
  alignment: string;
  background: string;
  quirk: string;
  secret: string;
  statblock: string;
  generate: string;
  saveToBestiary: string;
}

export interface RulesCheatSheetTranslations {
  title: string;
  actionsInCombat: string;
  conditionsList: string;
  coverRules: string;
  restingRules: string;
  movementRules: string;
}

export interface SettingsTranslations {
  title: string;
  systemTab: string;
  generalTab: string;
  interfaceTab: string;
  hotkeysTab: string;
  pluginsTab: string;
  themeSelector: string;
  themeBySystem: string;
  fallbackTheme: string;
  systemSelector: string;
  uiScale: string;
  autoBackup: string;
  databaseStatus: string;
  language: string;
  english: string;
  russian: string;
  campaignPack: string;
  createBackupNow: string;
  backupsOnDisk: string;
}

export interface ToastsTranslations {
  sessionExported: string;
  sessionImported: string;
  monsterAdded: string;
  turnAdvanced: string;
  error: string;
  copied: string;
  saved: string;
  deleted: string;
  backupCreated: string;
  restCompleted: string;
}

export interface CommonTranslations {
  save: string;
  cancel: string;
  close: string;
  delete: string;
  edit: string;
  add: string;
  apply: string;
  search: string;
  loading: string;
  confirm: string;
  yes: string;
  no: string;
  copy: string;
  download: string;
  upload: string;
  reset: string;
  none: string;
  levelShort: string;
  crShort: string;
  hpShort: string;
  acShort: string;
  dcShort: string;
}

export interface CyberpunkTranslations {
  stats: Record<string, string>;
  roles: Record<string, string>;
  skills: Record<string, string>;
  weapons: Record<string, string>;
  armor: Record<string, string>;
  criticalInjuries: Record<string, string>;
}

export interface TranslationDictionary {
  header: HeaderNavTranslations;
  masterTools: MasterToolsTranslations;
  combat: CombatTranslations;
  bestiary: BestiaryTranslations;
  statblock: StatblockTranslations;
  targetedAttack: TargetedAttackTranslations;
  mobCombat: MobCombatTranslations;
  map: MapTranslations;
  party: PartyTranslations;
  characterBuilder: CharacterBuilderTranslations;
  encounters: EncountersTranslations;
  loot: LootTranslations;
  soundboard: SoundboardTranslations;
  tokenForge: TokenForgeTranslations;
  proceduralMap: ProceduralMapTranslations;
  npcGenerator: NpcGeneratorTranslations;
  rulesCheatSheet: RulesCheatSheetTranslations;
  settings: SettingsTranslations;
  toasts: ToastsTranslations;
  common: CommonTranslations;
  cyberpunk: CyberpunkTranslations;
}

export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationDictionary>;

export interface UseTranslationReturn {
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  locale: TranslationDictionary;
}
