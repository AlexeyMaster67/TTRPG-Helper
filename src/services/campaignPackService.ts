import { usePartyStore } from '../store/partyStore';
import { useEncounterStore } from '../store/encounterStore';
import { useMapStore } from '../store/mapStore';
import { homebrewService } from './homebrewService';
import { savePartyToDisk } from './partyService';
import { saveEncountersToDisk } from './encounterService';
import { PartyMember } from '../types/party';
import { ParsedMonster } from '../types/database';
import { Encounter } from '../types/encounter';
import { MapPin, Wall, DrawingLine, AoeTemplate, WeatherEffect, GridType } from '../types/map';

export interface CampaignPackMapData {
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  gridCellSize: number;
  isGridVisible: boolean;
  gridType?: GridType;
  weatherEffect?: WeatherEffect;
  pins: MapPin[];
  walls?: Wall[];
  drawingLines?: DrawingLine[];
  aoeTemplates?: AoeTemplate[];
}

export interface CampaignPackMetadata {
  version: '2.0';
  app: 'TTRPG_Helper' | 'DnD_AIT';
  format: 'ait-pack';
  campaignName: string;
  createdAt: number;
  exportedAt: string;
  counts: {
    partyMembers: number;
    customMonsters: number;
    encounters: number;
    pins: number;
  };
}

export interface CampaignPack {
  metadata: CampaignPackMetadata;
  party: {
    members: PartyMember[];
    treasury: { gp: number; sp: number; cp: number };
  };
  homebrew: {
    monsters: ParsedMonster[];
  };
  encounters: Encounter[];
  map: CampaignPackMapData;
  notes?: string;
}

export interface CampaignImportSummary {
  success: boolean;
  mode: 'merge' | 'replace';
  partyCount: number;
  monsterCount: number;
  encounterCount: number;
  pinCount: number;
  campaignName: string;
  message: string;
}

export class CampaignPackService {
  private static instance: CampaignPackService;

  private constructor() {}

  public static getInstance(): CampaignPackService {
    if (!CampaignPackService.instance) {
      CampaignPackService.instance = new CampaignPackService();
    }
    return CampaignPackService.instance;
  }

  /**
   * Serializes the current campaign (party, homebrew, encounters, map & pins) into a unified JSON string (.ait-pack)
   */
  public async exportCampaignPack(campaignName = 'Кампания D&D'): Promise<string> {
    const partyStore = usePartyStore.getState();
    const encounterStore = useEncounterStore.getState();
    const mapStore = useMapStore.getState();
    const customMonsters = await homebrewService.getCustomMonsters();

    const mapData: CampaignPackMapData = {
      imageUrl: mapStore.imageUrl,
      imageWidth: mapStore.imageWidth || 1600,
      imageHeight: mapStore.imageHeight || 1200,
      gridCellSize: mapStore.gridCellSize || 50,
      isGridVisible: mapStore.isGridVisible !== false,
      gridType: mapStore.gridType || 'square',
      weatherEffect: mapStore.weatherEffect || 'none',
      pins: mapStore.pins || [],
      walls: mapStore.walls || [],
      drawingLines: mapStore.drawingLines || [],
      aoeTemplates: mapStore.aoeTemplates || [],
    };

    const pack: CampaignPack = {
      metadata: {
        version: '2.0',
        app: 'TTRPG_Helper',
        format: 'ait-pack',
        campaignName: campaignName.trim() || 'Кампания D&D',
        createdAt: Date.now(),
        exportedAt: new Date().toISOString(),
        counts: {
          partyMembers: partyStore.members.length,
          customMonsters: customMonsters.length,
          encounters: encounterStore.encounters.length,
          pins: mapData.pins.length,
        },
      },
      party: {
        members: partyStore.members,
        treasury: partyStore.treasury || { gp: 0, sp: 0, cp: 0 },
      },
      homebrew: {
        monsters: customMonsters,
      },
      encounters: encounterStore.encounters,
      map: mapData,
    };

    return JSON.stringify(pack, null, 2);
  }

  /**
   * Triggers download of the exported campaign pack (.ait-pack / JSON) to user's PC
   */
  public async downloadCampaignPack(campaignName = 'Кампания D&D'): Promise<void> {
    const jsonString = await this.exportCampaignPack(campaignName);
    const dateStr = new Date().toISOString().slice(0, 10);
    const sanitizedName = campaignName.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_').slice(0, 30) || 'campaign';
    const filename = `${sanitizedName}_${dateStr}.ait-pack`;

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Validates if a text string is a valid TTRPG Helper (or legacy DnD AIT) campaign pack or compatible structure
   */
  public validateCampaignPack(text: string): { valid: boolean; pack?: CampaignPack; error?: string } {
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Файл не содержит корректного JSON-объекта' };
      }

      // Check if it's an ait-pack structure
      const hasParty = data.party && Array.isArray(data.party.members || data.party);
      const hasHomebrew = data.homebrew && Array.isArray(data.homebrew.monsters || data.homebrew);
      const hasEncounters = Array.isArray(data.encounters);
      const hasMap = Boolean(data.map);

      if (!hasParty && !hasHomebrew && !hasEncounters && !hasMap) {
        return {
          valid: false,
          error: 'Файл не содержит данных кампании TTRPG Helper (отряд, бестиарий, энкаунтеры или карта)',
        };
      }

      // Normalize loose / older structures
      const normalizedPack: CampaignPack = {
        metadata: {
          version: '2.0',
          app: 'DnD_AIT',
          format: 'ait-pack',
          campaignName: data.metadata?.campaignName || data.campaignName || 'Импортированная кампания',
          createdAt: data.metadata?.createdAt || Date.now(),
          exportedAt: data.metadata?.exportedAt || new Date().toISOString(),
          counts: {
            partyMembers: Array.isArray(data.party?.members)
              ? data.party.members.length
              : Array.isArray(data.party)
              ? data.party.length
              : 0,
            customMonsters: Array.isArray(data.homebrew?.monsters)
              ? data.homebrew.monsters.length
              : Array.isArray(data.homebrew)
              ? data.homebrew.length
              : 0,
            encounters: Array.isArray(data.encounters) ? data.encounters.length : 0,
            pins: Array.isArray(data.map?.pins) ? data.map.pins.length : 0,
          },
        },
        party: {
          members: Array.isArray(data.party?.members)
            ? data.party.members
            : Array.isArray(data.party)
            ? data.party
            : [],
          treasury: data.party?.treasury || { gp: 0, sp: 0, cp: 0 },
        },
        homebrew: {
          monsters: Array.isArray(data.homebrew?.monsters)
            ? data.homebrew.monsters
            : Array.isArray(data.homebrew)
            ? data.homebrew
            : [],
        },
        encounters: Array.isArray(data.encounters) ? data.encounters : [],
        map: {
          imageUrl: data.map?.imageUrl || null,
          imageWidth: data.map?.imageWidth || 1600,
          imageHeight: data.map?.imageHeight || 1200,
          gridCellSize: data.map?.gridCellSize || 50,
          isGridVisible: data.map?.isGridVisible !== false,
          gridType: data.map?.gridType || 'square',
          weatherEffect: data.map?.weatherEffect || 'none',
          pins: Array.isArray(data.map?.pins) ? data.map.pins : [],
          walls: Array.isArray(data.map?.walls) ? data.map.walls : [],
          drawingLines: Array.isArray(data.map?.drawingLines) ? data.map.drawingLines : [],
          aoeTemplates: Array.isArray(data.map?.aoeTemplates) ? data.map.aoeTemplates : [],
        },
        notes: data.notes,
      };

      return { valid: true, pack: normalizedPack };
    } catch (err) {
      return {
        valid: false,
        error: `Ошибка синтаксиса JSON: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Imports a parsed CampaignPack with either 'merge' or 'replace' strategy
   */
  public async importCampaignPack(
    pack: CampaignPack,
    mode: 'merge' | 'replace'
  ): Promise<CampaignImportSummary> {
    const partyStore = usePartyStore.getState();
    const encounterStore = useEncounterStore.getState();
    const mapStore = useMapStore.getState();

    let finalParty: PartyMember[] = [];
    let finalTreasury = { gp: 0, sp: 0, cp: 0 };
    let finalMonsters: ParsedMonster[] = [];
    let finalEncounters: Encounter[] = [];
    let finalPins: MapPin[] = [];

    if (mode === 'replace') {
      // Complete replacement
      finalParty = pack.party.members;
      finalTreasury = pack.party.treasury;
      finalMonsters = pack.homebrew.monsters;
      finalEncounters = pack.encounters;
      finalPins = pack.map.pins;

      // Update stores and persist to disk
      usePartyStore.setState({ members: finalParty, treasury: finalTreasury });
      await savePartyToDisk(finalParty);

      await homebrewService.setCustomMonsters(finalMonsters);

      useEncounterStore.setState({ encounters: finalEncounters });
      await saveEncountersToDisk(finalEncounters);

      mapStore.importMapState({
        imageUrl: pack.map.imageUrl,
        imageWidth: pack.map.imageWidth,
        imageHeight: pack.map.imageHeight,
        gridCellSize: pack.map.gridCellSize,
        isGridVisible: pack.map.isGridVisible,
        gridType: pack.map.gridType || 'square',
        weatherEffect: pack.map.weatherEffect || 'none',
        pins: finalPins,
        walls: pack.map.walls || [],
        drawingLines: pack.map.drawingLines || [],
        aoeTemplates: pack.map.aoeTemplates || [],
      });
    } else {
      // Merge mode: preserve existing, add new avoiding ID collisions
      const existingMembers = partyStore.members;
      const existingMemberIds = new Set(existingMembers.map((m) => m.id));
      const incomingMembers = pack.party.members.map((m) => {
        if (existingMemberIds.has(m.id)) {
          // Re-generate ID if collision exists
          return { ...m, id: crypto.randomUUID() };
        }
        return m;
      });
      finalParty = [...existingMembers, ...incomingMembers];
      finalTreasury = {
        gp: (partyStore.treasury?.gp || 0) + (pack.party.treasury?.gp || 0),
        sp: (partyStore.treasury?.sp || 0) + (pack.party.treasury?.sp || 0),
        cp: (partyStore.treasury?.cp || 0) + (pack.party.treasury?.cp || 0),
      };
      usePartyStore.setState({ members: finalParty, treasury: finalTreasury });
      await savePartyToDisk(finalParty);

      // Homebrew Monsters merge
      const existingMonsters = await homebrewService.getCustomMonsters();
      const existingMonsterIds = new Set(existingMonsters.map((m) => m.id));
      const incomingMonsters = pack.homebrew.monsters.map((m) => {
        if (existingMonsterIds.has(m.id)) {
          return { ...m, id: crypto.randomUUID() };
        }
        return m;
      });
      finalMonsters = [...existingMonsters, ...incomingMonsters];
      await homebrewService.setCustomMonsters(finalMonsters);

      // Encounters merge
      const existingEncounters = encounterStore.encounters;
      const existingEncIds = new Set(existingEncounters.map((e) => e.id));
      const incomingEncounters = pack.encounters.map((e) => {
        if (existingEncIds.has(e.id)) {
          return { ...e, id: `enc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` };
        }
        return e;
      });
      finalEncounters = [...existingEncounters, ...incomingEncounters];
      useEncounterStore.setState({ encounters: finalEncounters });
      await saveEncountersToDisk(finalEncounters);

      // Map pins merge
      const existingPins = mapStore.pins || [];
      const existingPinIds = new Set(existingPins.map((p) => p.id));
      const incomingPins = pack.map.pins.map((p) => {
        if (existingPinIds.has(p.id)) {
          return { ...p, id: crypto.randomUUID() };
        }
        return p;
      });
      finalPins = [...existingPins, ...incomingPins];

      mapStore.importMapState({
        pins: finalPins,
        imageUrl: mapStore.imageUrl || pack.map.imageUrl,
        aoeTemplates: [...(mapStore.aoeTemplates || []), ...(pack.map.aoeTemplates || [])],
        drawingLines: [...(mapStore.drawingLines || []), ...(pack.map.drawingLines || [])],
        walls: [...(mapStore.walls || []), ...(pack.map.walls || [])],
      });
    }

    const summary: CampaignImportSummary = {
      success: true,
      mode,
      partyCount: pack.party.members.length,
      monsterCount: pack.homebrew.monsters.length,
      encounterCount: pack.encounters.length,
      pinCount: pack.map.pins.length,
      campaignName: pack.metadata.campaignName,
      message:
        mode === 'replace'
          ? `Кампания успешно заменена: ${pack.party.members.length} героев, ${pack.homebrew.monsters.length} монстров, ${pack.encounters.length} боёв, ${pack.map.pins.length} меток на карте.`
          : `Кампания объединена с текущими данными: добавлено +${pack.party.members.length} героев, +${pack.homebrew.monsters.length} монстров, +${pack.encounters.length} боёв, +${pack.map.pins.length} меток.`,
    };

    return summary;
  }
}

export const campaignPackService = CampaignPackService.getInstance();
