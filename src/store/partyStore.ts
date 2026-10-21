import { create } from 'zustand';
import { PartyMember, DEFAULT_SAMPLE_PARTY } from '../types/party';
import { loadPartyFromDisk, savePartyToDisk } from '../services/partyService';
import { useCombatStore } from './combatStore';
import { rollDie } from '../engine/rolls';

interface PartyState {
  members: PartyMember[];
  treasury: { gp: number; sp: number; cp: number };
  isModalOpen: boolean;
  
  // Character Sheet Modal state
  activeSheetMemberId: string | null;
  openCharacterSheet: (memberId: string) => void;
  closeCharacterSheet: () => void;

  // Short Rest Modal state
  isShortRestModalOpen: boolean;
  shortRestTargetId: string | null; // null means entire party
  openShortRestModal: (memberId?: string) => void;
  closeShortRestModal: () => void;

  // Character Builder 2024 Modal state
  isCharacterBuilderOpen: boolean;
  openCharacterBuilder: () => void;
  closeCharacterBuilder: () => void;

  // Offline QR Exchange Modal state
  isQrModalOpen: boolean;
  qrTargetMemberId: string | null;
  openQrModal: (memberId?: string) => void;
  closeQrModal: () => void;

  // Actions
  openModal: () => void;
  closeModal: () => void;
  loadParty: () => Promise<void>;
  addMember: (member: Omit<PartyMember, 'id'>) => void;
  updateMember: (id: string, updates: Partial<PartyMember>) => void;
  removeMember: (id: string) => void;
  deployPartyToCombat: (rollInitiative?: boolean) => void;
  addTreasury: (gp: number, sp: number, cp: number) => void;
  setTreasury: (gp: number, sp: number, cp: number) => void;

  // Rest Automation
  shortRest: (memberId?: string, hitDiceSpent?: number, hpRecovered?: number) => void;
  longRest: () => void;

  // Visual Toast Notifications
  toastNotification: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

let toastTimeoutRef: ReturnType<typeof setTimeout> | null = null;

export const usePartyStore = create<PartyState>((set, get, api) => {
  (api as any).getInitialState = () => get();
  return {
    members: DEFAULT_SAMPLE_PARTY,
    treasury: { gp: 120, sp: 45, cp: 80 },
  isModalOpen: false,

  activeSheetMemberId: null,
  openCharacterSheet: (memberId: string) => set({ activeSheetMemberId: memberId }),
  closeCharacterSheet: () => set({ activeSheetMemberId: null }),

  isShortRestModalOpen: false,
  shortRestTargetId: null,
  openShortRestModal: (memberId?: string) =>
    set({ isShortRestModalOpen: true, shortRestTargetId: memberId || null }),
  closeShortRestModal: () =>
    set({ isShortRestModalOpen: false, shortRestTargetId: null }),

  isCharacterBuilderOpen: false,
  openCharacterBuilder: () => set({ isCharacterBuilderOpen: true }),
  closeCharacterBuilder: () => set({ isCharacterBuilderOpen: false }),

  isQrModalOpen: false,
  qrTargetMemberId: null,
  openQrModal: (memberId?: string) =>
    set({ isQrModalOpen: true, qrTargetMemberId: memberId || null }),
  closeQrModal: () =>
    set({ isQrModalOpen: false, qrTargetMemberId: null }),

  toastNotification: null,
  showToast: (message: string) => {
    if (toastTimeoutRef) clearTimeout(toastTimeoutRef);
    set({ toastNotification: message });
    toastTimeoutRef = setTimeout(() => {
      set({ toastNotification: null });
      toastTimeoutRef = null;
    }, 4500);
  },
  clearToast: () => {
    if (toastTimeoutRef) clearTimeout(toastTimeoutRef);
    toastTimeoutRef = null;
    set({ toastNotification: null });
  },

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  loadParty: async () => {
    const loaded = await loadPartyFromDisk();
    if (loaded && loaded.length > 0) {
      // Normalize loaded members with defaults for character sheet compatibility
      const normalized = loaded.map((m) => ({
        ...m,
        currentHp: m.currentHp !== undefined ? m.currentHp : m.maxHp,
        tempHp: m.tempHp || 0,
        level: m.level || 5,
        hitDiceMax: m.hitDiceMax || m.level || 5,
        hitDiceCurrent: m.hitDiceCurrent !== undefined ? m.hitDiceCurrent : (m.hitDiceMax || m.level || 5),
        hitDiceType: m.hitDiceType || 'd8',
        exhaustion: m.exhaustion || 0,
        stats: m.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      }));
      set({ members: normalized });
    }
  },

  addMember: (member) => {
    const id = crypto.randomUUID();
    const newMember: PartyMember = {
      ...member,
      id,
      currentHp: member.currentHp !== undefined ? member.currentHp : member.maxHp,
      tempHp: member.tempHp || 0,
      level: member.level || 1,
      hitDiceMax: member.hitDiceMax || member.level || 1,
      hitDiceCurrent: member.hitDiceCurrent !== undefined ? member.hitDiceCurrent : (member.hitDiceMax || 1),
      hitDiceType: member.hitDiceType || 'd8',
      exhaustion: member.exhaustion || 0,
      stats: member.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    };
    set((state) => {
      const updated = [...state.members, newMember];
      savePartyToDisk(updated);
      return { members: updated };
    });
  },

  updateMember: (id, updates) => {
    set((state) => {
      const updated = state.members.map((m) => {
        if (m.id !== id) return m;
        const merged = { ...m, ...updates };

        // Sync HP / AC with combatant if in combat
        try {
          const combatStore = useCombatStore.getState();
          const matchedCombatant = combatStore.combatants.find(
            (c) => c.name.toLowerCase() === m.name.toLowerCase() && c.isPlayer
          );
          if (matchedCombatant) {
            const combatUpdates: any = {};
            if (updates.currentHp !== undefined) combatUpdates.hp = updates.currentHp;
            if (updates.maxHp !== undefined) combatUpdates.maxHp = updates.maxHp;
            if (updates.tempHp !== undefined) combatUpdates.tempHp = updates.tempHp;
            if (updates.ac !== undefined) combatUpdates.ac = updates.ac;
            if (Object.keys(combatUpdates).length > 0) {
              combatStore.updateCombatant(matchedCombatant.id, combatUpdates);
            }
          }
        } catch (e) {
          console.warn('[PartyStore] Could not sync combatant:', e);
        }

        return merged;
      });
      savePartyToDisk(updated);
      return { members: updated };
    });
  },

  removeMember: (id) => {
    set((state) => {
      const updated = state.members.filter((m) => m.id !== id);
      savePartyToDisk(updated);
      return { members: updated };
    });
  },

  deployPartyToCombat: (rollInitiative = true) => {
    const { members } = get();
    const combatStore = useCombatStore.getState();

    members.forEach((m, idx) => {
      // Check if player is already in combat roster
      const exists = combatStore.combatants.some(
        (c) => c.name.toLowerCase() === m.name.toLowerCase()
      );
      if (exists) return;

      const initRoll = rollInitiative ? rollDie(20) + m.initBonus : 10 + m.initBonus;
      const currentHp = m.currentHp !== undefined ? m.currentHp : m.maxHp;

      combatStore.addCombatant({
        name: m.name,
        nameRu: m.name,
        isPlayer: true,
        ac: m.ac,
        hp: currentHp,
        maxHp: m.maxHp,
        tempHp: m.tempHp || 0,
        initiative: initRoll,
        initBonus: m.initBonus,
        passiveInit: 10 + m.initBonus,
        speed: m.speed || '30 фт.',
        color: m.color || '#10B981',
        tokenScale: 1.0,
        tokenX: 150 + (idx % 2) * 80,
        tokenY: 150 + Math.floor(idx / 2) * 80,
        tokenUrl: m.avatarUrl,
        creatureType: m.characterClass || 'Персонаж игрока',
        statblock: {
          id: `player-${m.id}`,
          name_en: m.name,
          name_ru: m.name,
          size: 'Medium',
          size_ru: 'Средний',
          creature_type: 'humanoid',
          creature_type_ru: 'гуманоид',
          alignment: 'герой',
          ac: m.ac,
          hp_average: m.maxHp,
          hp_formula: '',
          speed: m.speed || '30 фт.',
          init_bonus: m.initBonus,
          passive_init: 10 + m.initBonus,
          cr: m.characterClass || 'Игрок',
          pb: m.proficiencyBonus || 2,
          str: m.stats?.str ?? 10,
          dex: m.stats?.dex ?? (10 + m.initBonus * 2),
          con: m.stats?.con ?? 12,
          intellect: m.stats?.int ?? 10,
          wis: m.stats?.wis ?? 10,
          cha: m.stats?.cha ?? 10,
          saves: {},
          skills: { Perception: m.passivePerception ? m.passivePerception - 10 : 2 },
          damage_vulnerabilities: '',
          damage_resistances: '',
          damage_immunities: '',
          condition_immunities: '',
          senses: `Пасс. Внимание ${m.passivePerception || 10}`,
          languages: 'Общий',
          source: 'Отряд',
          is_srd: true,
          spells: (m.preparedSpells || []).map((s) => s.name),
          traits: m.notes ? [{ name: 'Заметки игрока', desc: m.notes }] : [],
          actions: m.weapons && m.weapons.length > 0
            ? m.weapons.map((w) => ({
                name: w.name,
                attack_bonus: parseInt(w.attackBonus?.replace('+', '') || '5', 10),
                damage_dice: w.damage || '1d8+3',
                damage_type: w.damageType || 'Рубящий',
                desc: `${w.notes || ''} ${w.mastery ? `(Свойство: ${w.mastery})` : ''}`.trim(),
              }))
            : [
                {
                  name: 'Основная атака / заклинание',
                  attack_bonus: 5,
                  damage_dice: '1d8+3',
                  damage_type: 'Рубящий',
                  desc: 'Основная атака персонажа игрока.',
                },
              ],
          bonus_actions: [],
          reactions: [],
          legendary_actions: [],
        },
      });
    });

    combatStore.sortByInitiative();
    combatStore.autoArrangeCombatantsOnMap();
    set({ isModalOpen: false });
  },

  addTreasury: (gp, sp, cp) => {
    set((state) => ({
      treasury: {
        gp: Math.max(0, state.treasury.gp + gp),
        sp: Math.max(0, state.treasury.sp + sp),
        cp: Math.max(0, state.treasury.cp + cp),
      },
    }));
  },

  setTreasury: (gp, sp, cp) => {
    set({
      treasury: {
        gp: Math.max(0, Math.floor(gp)),
        sp: Math.max(0, Math.floor(sp)),
        cp: Math.max(0, Math.floor(cp)),
      },
    });
  },

  /**
   * Short Rest Automation:
   * - Resets short-rest class resources (Action Surge, Channel Divinity, Ki points, Warlock slots)
   * - Recovers HP based on hit dice spent
   * - Deducts hit dice spent
   */
  shortRest: (memberId?: string, hitDiceSpent = 0, hpRecovered = 0) => {
    set((state) => {
      const updated = state.members.map((m) => {
        if (memberId && m.id !== memberId) return m;

        // Reset short-rest resources
        const updatedResources = (m.resources || []).map((r) =>
          r.resetOn === 'short' ? { ...r, current: r.max } : r
        );

        // Reset spell slots if Warlock / pact magic
        let updatedSpellSlots = m.spellSlots;
        if ((m.characterClass?.toLowerCase().includes('колдун') || m.characterClass?.toLowerCase().includes('warlock')) && m.spellSlots) {
          updatedSpellSlots = { ...m.spellSlots };
          Object.keys(updatedSpellSlots).forEach((lvl) => {
            const numLvl = Number(lvl);
            if (updatedSpellSlots![numLvl]) {
              updatedSpellSlots![numLvl] = {
                ...updatedSpellSlots![numLvl],
                used: 0,
              };
            }
          });
        }

        // Apply Hit Dice and HP
        const currentDice = m.hitDiceCurrent ?? (m.hitDiceMax || m.level || 5);
        const newDice = Math.max(0, currentDice - hitDiceSpent);
        const currentHp = m.currentHp !== undefined ? m.currentHp : m.maxHp;
        const newHp = Math.min(m.maxHp, currentHp + hpRecovered);

        // Sync with combatant if in combat
        try {
          const combatStore = useCombatStore.getState();
          const matched = combatStore.combatants.find(
            (c) => c.name.toLowerCase() === m.name.toLowerCase() && c.isPlayer
          );
          if (matched) {
            combatStore.updateCombatant(matched.id, { hp: newHp });
          }
        } catch (e) {
          console.warn('[PartyStore] Sync short rest to combatant:', e);
        }

        return {
          ...m,
          currentHp: newHp,
          hitDiceCurrent: newDice,
          resources: updatedResources,
          spellSlots: updatedSpellSlots,
        };
      });

      savePartyToDisk(updated);
      return { members: updated };
    });
  },

  /**
   * Long Rest Automation:
   * - 100% HP restored
   * - Restores half maximum Hit Dice (min 1)
   * - Unchecks/resets all spell slots
   * - Resets short & long rest class resources
   * - Decrements exhaustion level by 1
   * - Syncs all active player combatants in combatStore
   */
  longRest: () => {
    // 1. Fully restore all partyStore members
    set((state) => {
      const updated = state.members.map((m) => {
        const newHp = m.maxHp;
        const newTempHp = 0;

        // Restore half max hit dice (min 1)
        const maxDice = m.hitDiceMax || m.level || 5;
        const diceToRestore = Math.max(1, Math.floor(maxDice / 2));
        const currentDice = m.hitDiceCurrent !== undefined ? m.hitDiceCurrent : maxDice;
        const newDice = Math.min(maxDice, currentDice + diceToRestore);

        // Reset all spell slots (used: 0)
        let newSpellSlots = m.spellSlots;
        if (m.spellSlots) {
          newSpellSlots = { ...m.spellSlots };
          Object.keys(newSpellSlots).forEach((lvl) => {
            const numLvl = Number(lvl);
            if (newSpellSlots![numLvl]) {
              newSpellSlots![numLvl] = {
                ...newSpellSlots![numLvl],
                used: 0,
              };
            }
          });
        }

        // Reset all short & long rest resources
        const newResources = (m.resources || []).map((r) => ({
          ...r,
          current: r.max,
        }));

        // Decrement exhaustion by 1 (min 0)
        const newExhaustion = Math.max(0, (m.exhaustion || 0) - 1);

        return {
          ...m,
          currentHp: newHp,
          tempHp: newTempHp,
          hitDiceCurrent: newDice,
          spellSlots: newSpellSlots,
          resources: newResources,
          exhaustion: newExhaustion,
        };
      });

      savePartyToDisk(updated);
      return { members: updated };
    });

    // 2. Fully restore HP, temp HP, spell slots, death saves & exhaustion for all player combatants in combatStore
    try {
      const combatStore = useCombatStore.getState();
      const playerCombatants = combatStore.combatants.filter((c) => c.isPlayer);
      playerCombatants.forEach((c) => {
        let resetCombatSlots = c.spellSlots;
        if (c.spellSlots) {
          resetCombatSlots = { ...c.spellSlots };
          Object.keys(resetCombatSlots).forEach((lvl) => {
            const numLvl = Number(lvl);
            if (resetCombatSlots![numLvl]) {
              resetCombatSlots![numLvl] = {
                ...resetCombatSlots![numLvl],
                used: 0,
              };
            }
          });
        }

        // Clear exhaustion and unconscious conditions
        const cleanConditions = (c.conditions || []).filter((cond) => {
          return cond.type !== 'Exhaustion' && cond.type !== 'Unconscious';
        });

        combatStore.updateCombatant(c.id, {
          hp: c.maxHp,
          tempHp: 0,
          deathSaves: { successes: 0, failures: 0 },
          isDying: false,
          isDead: false,
          spellSlots: resetCombatSlots,
          conditions: cleanConditions,
        });
      });
    } catch (e) {
      console.warn('[PartyStore] Sync long rest to combatStore:', e);
    }

    // 3. Trigger in-app visual notification toast
    get().showToast(
      'Долгий отдых (8ч) завершён: здоровье и ячейки заклинаний всех персонажей полностью восстановлены'
    );
  },
  };
});
