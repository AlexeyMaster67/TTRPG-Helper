import { create } from 'zustand';
import { Encounter, EncounterCombatantPreset } from '../types/encounter';
import {
  loadEncountersFromDisk,
  saveEncountersToDisk,
  calculateEncounterDifficulty,
} from '../services/encounterService';
import { useCombatStore } from './combatStore';
import { usePartyStore } from './partyStore';
import { rollDie } from '../engine/rolls';

interface EncounterState {
  encounters: Encounter[];
  selectedFolder: string;
  isModalOpen: boolean;
  searchQuery: string;

  // Actions
  openModal: () => void;
  closeModal: () => void;
  setSelectedFolder: (folder: string) => void;
  setSearchQuery: (q: string) => void;
  loadEncounters: () => Promise<void>;
  saveCurrentCombatAsEncounter: (name: string, folder: string, description?: string) => void;
  loadEncounterIntoCombat: (encounterId: string, mode: 'replace' | 'merge') => void;
  deleteEncounter: (id: string) => void;
  addEncounter: (encounter: Omit<Encounter, 'id' | 'createdAt'>) => void;
  exportEncountersJson: () => string;
  importEncountersJson: (json: string) => number;
}

export const useEncounterStore = create<EncounterState>((set, get) => ({
  encounters: [],
  selectedFolder: 'Все',
  isModalOpen: false,
  searchQuery: '',

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  loadEncounters: async () => {
    const loaded = await loadEncountersFromDisk();
    set({ encounters: loaded });
  },

  saveCurrentCombatAsEncounter: (name, folder, description) => {
    const combatStore = useCombatStore.getState();
    const partyStore = usePartyStore.getState();

    const enemyCombatants = combatStore.combatants.filter((c) => !c.isPlayer);
    if (enemyCombatants.length === 0) return;

    const presets: EncounterCombatantPreset[] = enemyCombatants.map((c) => ({
      name: c.name,
      nameRu: c.nameRu,
      cr: c.cr || '1/4',
      isPlayer: false,
      hp: c.maxHp,
      maxHp: c.maxHp,
      ac: c.ac,
      initBonus: c.initBonus,
      color: c.color,
      tokenX: c.tokenX,
      tokenY: c.tokenY,
      tokenScale: c.tokenScale,
      speed: c.speed,
      statblock: c.statblock,
    }));

    const partyCount = Math.max(1, partyStore.members.length || 4);
    const diffMetrics = calculateEncounterDifficulty(presets, partyCount, 3);

    const newEncounter: Encounter = {
      id: `enc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim() || 'Новый энкаунтер',
      folder: folder.trim() || 'Общие',
      description: description?.trim(),
      createdAt: Date.now(),
      combatants: presets,
      totalXp: diffMetrics.totalXp,
      adjustedXp: diffMetrics.adjustedXp,
      difficulty: diffMetrics.difficulty,
    };

    set((state) => {
      const updated = [newEncounter, ...state.encounters];
      saveEncountersToDisk(updated);
      return { encounters: updated };
    });
  },

  loadEncounterIntoCombat: (encounterId, mode) => {
    const { encounters } = get();
    const enc = encounters.find((e) => e.id === encounterId);
    if (!enc) return;

    const combatStore = useCombatStore.getState();

    if (mode === 'replace') {
      // Keep players in combat or reset
      const currentPlayers = combatStore.combatants.filter((c) => c.isPlayer);
      combatStore.resetCombat();

      // Restore players
      currentPlayers.forEach((p) => combatStore.addCombatant(p));
    }

    // Add monsters from preset with freshly rolled initiatives
    enc.combatants.forEach((preset, idx) => {
      const initRoll = rollDie(20) + (preset.initBonus || 0);
      combatStore.addCombatant({
        name: preset.name,
        nameRu: preset.nameRu || preset.name,
        cr: preset.cr || '1/4',
        isPlayer: false,
        hp: preset.maxHp,
        maxHp: preset.maxHp,
        ac: preset.ac,
        initiative: initRoll,
        initBonus: preset.initBonus || 0,
        passiveInit: 10 + (preset.initBonus || 0),
        speed: preset.speed || '30 фт.',
        color: preset.color || '#E01A22',
        tokenScale: preset.tokenScale || 1.0,
        tokenX: preset.tokenX || 200 + (idx % 3) * 70,
        tokenY: preset.tokenY || 150 + Math.floor(idx / 3) * 70,
        statblock: preset.statblock,
      });
    });

    combatStore.sortByInitiative();
    combatStore.autoArrangeCombatantsOnMap();
    set({ isModalOpen: false });
  },

  deleteEncounter: (id) => {
    set((state) => {
      const updated = state.encounters.filter((e) => e.id !== id);
      saveEncountersToDisk(updated);
      return { encounters: updated };
    });
  },

  addEncounter: (encData) => {
    const newEncounter: Encounter = {
      ...encData,
      id: `enc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
    };
    set((state) => {
      const updated = [newEncounter, ...state.encounters];
      saveEncountersToDisk(updated);
      return { encounters: updated };
    });
  },

  exportEncountersJson: () => {
    const { encounters } = get();
    return JSON.stringify(encounters, null, 2);
  },

  importEncountersJson: (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return 0;
      let count = 0;
      set((state) => {
        const merged = [...state.encounters];
        for (const item of parsed) {
          if (item && item.name && Array.isArray(item.combatants)) {
            const exists = merged.some((e) => e.id === item.id);
            if (!exists) {
              merged.push({
                ...item,
                id: item.id || `enc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                createdAt: item.createdAt || Date.now(),
              });
              count++;
            }
          }
        }
        saveEncountersToDisk(merged);
        return { encounters: merged };
      });
      return count;
    } catch {
      return 0;
    }
  },
}));
