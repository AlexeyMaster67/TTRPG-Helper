/**
 * TTRPG Helper - Content Pack Manager Service
 * Manages installed creature/content packs in %APPDATA%/ttrpg-helper/packs/
 * Supports installing (.ait-pack, .pack.json, .pack), removing, listing, and inspection.
 */

export interface ContentPackManifest {
  id: string;
  name: string;
  system_id: string;
  systemId?: string;
  edition: string;
  version: string;
  author: string;
  description: string;
  count: number;
  format?: string;
  created_at?: string;
  tags?: string[];
  license?: string;
}

export interface ContentPackBundle {
  manifest: ContentPackManifest;
  creatures: any[];
}

export interface InstalledPackSummary {
  id: string;
  name: string;
  system_id: string;
  edition: string;
  version: string;
  author: string;
  description: string;
  creatureCount: number;
  fileSizeBytes: number;
  fileName: string;
  filePath: string;
  installedAt: number;
  isBuiltIn?: boolean;
}

export interface PackValidationResult {
  valid: boolean;
  pack?: ContentPackBundle;
  error?: string;
}

export interface StarterPackCatalogEntry {
  id: string;
  name: string;
  system_id: string;
  edition: string;
  version: string;
  author: string;
  description: string;
  count: number;
  estimatedSizeBytes: number;
  tags: string[];
  license?: string;
}

export const STARTER_PACKS_CATALOG: StarterPackCatalogEntry[] = [
  {
    id: 'cyberpunk_red_starter',
    name: 'Cyberpunk RED: 25 Archetypes Starter Pack',
    system_id: 'cyberpunk_red',
    edition: 'Core Rulebook System',
    version: '1.0.0',
    author: 'R. Talsorian Games / Night City Community',
    description: '25 каноничных боевых архетипов Night City: Соло, Нетраннеры, Техники, Номады, Полиция, Мальстрём, Киберпсихопат, МаксТак, Арасака и Травма Тим со статистикой REF, броней SP головы/тела и арсеналом оружия.',
    count: 25,
    estimatedSizeBytes: 80280,
    tags: ['cyberpunk', 'cyberpunk_red', 'starter', 'archetypes'],
    license: 'Fan Content / Core Reference',
  },
  {
    id: 'pathfinder2e_starter',
    name: 'Pathfinder 2e (PF2e) Starter Bestiary',
    system_id: 'pathfinder2e',
    edition: 'Remastered (ORC License)',
    version: '1.0.0',
    author: 'Paizo Inc. / Open RPG Creative License (ORC)',
    description: '25 базовых существ тактической системы Pathfinder 2e с трехдейственной экономикой ([1-Действие], [2-Действия], [3-Действия], [Реакция]): Гоблины, Орки, Скелеты, Зомби, Лютоволки, Тролли, Драконы и Гаргульи.',
    count: 25,
    estimatedSizeBytes: 62870,
    tags: ['pathfinder', 'pf2e', 'starter', 'three_actions'],
    license: 'ORC License',
  },
  {
    id: 'srd_5_2_1',
    name: 'SRD 5.2.1 Monsters Bestiary',
    system_id: 'srd_5_2_1',
    edition: '5.2.1 (CC-BY)',
    version: '1.0.0',
    author: 'Wizards of the Coast / Open Gaming Foundation',
    description: 'Официальный открытый свод из 335 существ SRD 5.2.1 под свободной лицензией Creative Commons Attribution 4.0 International (CC-BY-4.0).',
    count: 335,
    estimatedSizeBytes: 914200,
    tags: ['dnd5e', 'srd', 'cc-by', 'srd_5_2_1'],
    license: 'CC-BY-4.0',
  },
  {
    id: 'dnd5e_2024',
    name: 'D&D 5e (2024) Complete Bestiary',
    system_id: 'dnd5e_2024',
    edition: '2024 Revised',
    version: '2.0.0',
    author: 'Wizards of the Coast',
    description: 'Полный бестиарий редакции D&D 2024 года (502 существа) с обновленными показателями спасбросков, бонусных действий и мастерства оружия.',
    count: 502,
    estimatedSizeBytes: 1530700,
    tags: ['dnd5e', 'dnd2024', 'complete', 'bestiary'],
    license: 'D&D 2024 Rules Reference',
  },
];

const PACKS_DIR = 'packs';
const LOCAL_STORAGE_INDEX_KEY = 'ttrpg_helper_installed_packs_index';
const LOCAL_STORAGE_PACK_PREFIX = 'ttrpg_helper_pack_';

class PackManagerService {
  private static instance: PackManagerService;
  private isTauri: boolean;
  private memoryCache: Map<string, ContentPackBundle> = new Map();

  private constructor() {
    this.isTauri =
      typeof window !== 'undefined' &&
      ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
  }

  public static getInstance(): PackManagerService {
    if (!PackManagerService.instance) {
      PackManagerService.instance = new PackManagerService();
    }
    return PackManagerService.instance;
  }

  /**
   * Validates raw pack string or parsed JSON object against ContentPack schema
   */
  public validatePack(raw: string | unknown): PackValidationResult {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Некорректный JSON объект пакета' };
      }

      // Check if campaign-pack format (.ait-pack from campaign export)
      if (data.metadata && data.metadata.format === 'ait-pack') {
        // Can convert campaign homebrew monsters into content pack format
        const manifest: ContentPackManifest = {
          id: `campaign_${data.metadata.campaignName || 'pack'}`.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          name: data.metadata.campaignName || 'Пакет кампании',
          system_id: 'dnd5e_2024',
          edition: 'Кастомная кампания',
          version: data.metadata.version || '1.0.0',
          author: 'Ведущий кампании',
          description: `Экспорт монстров из кампании «${data.metadata.campaignName}»`,
          count: Array.isArray(data.homebrew?.monsters) ? data.homebrew.monsters.length : 0,
        };
        const creatures = Array.isArray(data.homebrew?.monsters) ? data.homebrew.monsters : [];
        return { valid: true, pack: { manifest, creatures } };
      }

      // Standard ContentPack format
      const manifest = data.manifest;
      if (!manifest || typeof manifest !== 'object') {
        return { valid: false, error: 'Отсутствует секция manifest в пакете контента' };
      }

      const id = String(manifest.id || '').trim();
      const system_id = String(manifest.system_id || manifest.systemId || '').trim();

      if (!id) {
        return { valid: false, error: 'В manifest отсутствует обязательное поле id' };
      }
      if (!system_id) {
        return { valid: false, error: 'В manifest отсутствует обязательное поле system_id' };
      }

      const creatures = Array.isArray(data.creatures) ? data.creatures : [];

      const normalizedManifest: ContentPackManifest = {
        id,
        name: String(manifest.name || id),
        system_id,
        systemId: system_id,
        edition: String(manifest.edition || '1.0'),
        version: String(manifest.version || '1.0.0'),
        author: String(manifest.author || 'Неизвестный автор'),
        description: String(manifest.description || ''),
        count: creatures.length > 0 ? creatures.length : Number(manifest.count) || 0,
        created_at: manifest.created_at || new Date().toISOString(),
        tags: Array.isArray(manifest.tags) ? manifest.tags : [],
        license: manifest.license,
      };

      return {
        valid: true,
        pack: {
          manifest: normalizedManifest,
          creatures,
        },
      };
    } catch (e) {
      return {
        valid: false,
        error: `Синтаксическая ошибка JSON: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  /**
   * Lists all installed content packs in %APPDATA%/ttrpg-helper/packs/
   */
  public async listInstalledPacks(): Promise<InstalledPackSummary[]> {
    const list: InstalledPackSummary[] = [];

    // 1. Try Tauri FS AppData/packs/
    if (this.isTauri) {
      try {
        const { readDir, readTextFile, stat, mkdir, BaseDirectory } = await import('@tauri-apps/plugin-fs');

        try {
          await mkdir(PACKS_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
        } catch {
          // directory already exists
        }

        const entries = await readDir(PACKS_DIR, { baseDir: BaseDirectory.AppData });
        for (const entry of entries) {
          const name = entry.name;
          if (!name) continue;

          const isPackFile = name.endsWith('.pack.json') || name.endsWith('.pack') || name.endsWith('.ait-pack');
          if (!isPackFile) continue;

          try {
            const relPath = `${PACKS_DIR}/${name}`;
            const fileStat = await stat(relPath, { baseDir: BaseDirectory.AppData }).catch(() => null);
            const content = await readTextFile(relPath, { baseDir: BaseDirectory.AppData });
            const val = this.validatePack(content);

            if (val.valid && val.pack) {
              const m = val.pack.manifest;
              const sizeBytes = fileStat?.size ?? new Blob([content]).size;
              const mtime = fileStat?.mtime ? new Date(fileStat.mtime).getTime() : Date.now();

              list.push({
                id: m.id,
                name: m.name,
                system_id: m.system_id,
                edition: m.edition,
                version: m.version,
                author: m.author,
                description: m.description,
                creatureCount: val.pack.creatures.length || m.count,
                fileSizeBytes: sizeBytes,
                fileName: name,
                filePath: relPath,
                installedAt: mtime,
                isBuiltIn: STARTER_PACKS_CATALOG.some((s) => s.id === m.id),
              });

              // Cache bundle in memory
              this.memoryCache.set(m.id, val.pack);
            }
          } catch (e) {
            console.warn(`[PackManager] Error reading pack file ${name}:`, e);
          }
        }
      } catch (err) {
        console.warn('[PackManager] Native FS readDir failed, checking localStorage fallback:', err);
      }
    }

    // 2. LocalStorage Fallback (or Web mode / sync index)
    try {
      const storedIndex = localStorage.getItem(LOCAL_STORAGE_INDEX_KEY);
      if (storedIndex) {
        const parsed: InstalledPackSummary[] = JSON.parse(storedIndex);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!list.some((existing) => existing.id === item.id)) {
              list.push(item);
            }
          }
        }
      }
    } catch {
      // ignore storage error
    }

    // Sort: newest or alphabetical by name
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  /**
   * Installs a content pack from a File or text payload
   */
  public async installPack(
    packData: ContentPackBundle,
    customFileName?: string
  ): Promise<InstalledPackSummary> {
    const manifest = packData.manifest;
    const sanitizedId = manifest.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = customFileName || `${sanitizedId}.pack.json`;
    const relPath = `${PACKS_DIR}/${fileName}`;
    const jsonStr = JSON.stringify(packData, null, 2);
    const sizeBytes = new Blob([jsonStr]).size;
    const now = Date.now();

    const summary: InstalledPackSummary = {
      id: manifest.id,
      name: manifest.name,
      system_id: manifest.system_id,
      edition: manifest.edition,
      version: manifest.version,
      author: manifest.author,
      description: manifest.description,
      creatureCount: packData.creatures.length,
      fileSizeBytes: sizeBytes,
      fileName,
      filePath: relPath,
      installedAt: now,
      isBuiltIn: STARTER_PACKS_CATALOG.some((s) => s.id === manifest.id),
    };

    // 1. Write to Tauri AppData FS
    if (this.isTauri) {
      try {
        const { writeTextFile, mkdir, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        try {
          await mkdir(PACKS_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
        } catch {
          // ignore
        }
        await writeTextFile(relPath, jsonStr, { baseDir: BaseDirectory.AppData });
      } catch (err) {
        console.warn('[PackManager] Failed to write pack to native FS:', err);
      }
    }

    // 2. Persist in LocalStorage & memory cache
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PACK_PREFIX}${manifest.id}`, jsonStr);

      const currentList = await this.listInstalledPacks();
      const updatedList = currentList.filter((p) => p.id !== manifest.id);
      updatedList.push(summary);
      localStorage.setItem(LOCAL_STORAGE_INDEX_KEY, JSON.stringify(updatedList));
    } catch (err) {
      console.warn('[PackManager] Error updating localStorage index:', err);
    }

    this.memoryCache.set(manifest.id, packData);

    // Notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('content-packs-updated', { detail: { action: 'installed', pack: summary } })
      );
    }

    return summary;
  }

  /**
   * Installs pack directly from a DOM File object (drag-and-drop or file picker)
   */
  public async installPackFromFile(file: File): Promise<InstalledPackSummary> {
    const text = await file.text();
    const validation = this.validatePack(text);
    if (!validation.valid || !validation.pack) {
      throw new Error(validation.error || 'Неверный формат файла пакета');
    }

    const fileName = file.name.endsWith('.pack') || file.name.endsWith('.pack.json')
      ? file.name
      : `${validation.pack.manifest.id}.pack.json`;

    return await this.installPack(validation.pack, fileName);
  }

  /**
   * Removes an installed pack by packId
   */
  public async removePack(packId: string): Promise<boolean> {
    const list = await this.listInstalledPacks();
    const target = list.find((p) => p.id === packId);

    if (this.isTauri && target) {
      try {
        const { remove, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        await remove(target.filePath, { baseDir: BaseDirectory.AppData }).catch(() => null);
      } catch (err) {
        console.warn(`[PackManager] Error removing file ${target.filePath}:`, err);
      }
    }

    // Remove from localStorage
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_PACK_PREFIX}${packId}`);
      const updatedList = list.filter((p) => p.id !== packId);
      localStorage.setItem(LOCAL_STORAGE_INDEX_KEY, JSON.stringify(updatedList));
    } catch {
      // ignore
    }

    this.memoryCache.delete(packId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('content-packs-updated', { detail: { action: 'removed', packId } })
      );
    }

    return true;
  }

  /**
   * Loads the full creature list for an installed pack
   */
  public async getPackCreatures(packId: string): Promise<any[]> {
    if (this.memoryCache.has(packId)) {
      return this.memoryCache.get(packId)?.creatures || [];
    }

    // Try reading from Tauri FS
    if (this.isTauri) {
      try {
        const list = await this.listInstalledPacks();
        const found = list.find((p) => p.id === packId);
        if (found) {
          const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
          const content = await readTextFile(found.filePath, { baseDir: BaseDirectory.AppData });
          const val = this.validatePack(content);
          if (val.valid && val.pack) {
            this.memoryCache.set(packId, val.pack);
            return val.pack.creatures;
          }
        }
      } catch (err) {
        console.warn(`[PackManager] Error loading pack creatures from FS (${packId}):`, err);
      }
    }

    // Try localStorage
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_PACK_PREFIX}${packId}`);
      if (stored) {
        const val = this.validatePack(stored);
        if (val.valid && val.pack) {
          this.memoryCache.set(packId, val.pack);
          return val.pack.creatures;
        }
      }
    } catch {
      // ignore
    }

    return [];
  }

  /**
   * Installs one of the 4 bundled Starter Packs (Cyberpunk RED, PF2e, SRD 5.2.1, D&D 2024)
   */
  public async installStarterPack(starterId: string): Promise<InstalledPackSummary> {
    // 1. Try reading from project packs directory if running in local dev / Tauri
    if (this.isTauri) {
      try {
        const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const candidatePaths = [
          `packs/${starterId}.pack.json`,
          `${starterId}.pack.json`,
        ];

        for (const p of candidatePaths) {
          try {
            const content = await readTextFile(p, { baseDir: BaseDirectory.Resource });
            const val = this.validatePack(content);
            if (val.valid && val.pack) {
              return await this.installPack(val.pack, `${starterId}.pack.json`);
            }
          } catch {
            // try next
          }
        }
      } catch {
        // continue to network / fetch fallback
      }
    }

    // 2. Try fetching from public/bundled assets if served via Vite dev server
    try {
      const response = await fetch(`/packs/${starterId}.pack.json`);
      if (response.ok) {
        const json = await response.json();
        const val = this.validatePack(json);
        if (val.valid && val.pack) {
          return await this.installPack(val.pack, `${starterId}.pack.json`);
        }
      }
    } catch {
      // continue
    }

    // 3. Fallback: generate starter pack template dynamically if file not directly reachable
    const starterMeta = STARTER_PACKS_CATALOG.find((s) => s.id === starterId);
    if (!starterMeta) {
      throw new Error(`Неизвестный стартовый пакет: ${starterId}`);
    }

    const templateBundle: ContentPackBundle = {
      manifest: {
        id: starterMeta.id,
        name: starterMeta.name,
        system_id: starterMeta.system_id,
        edition: starterMeta.edition,
        version: starterMeta.version,
        author: starterMeta.author,
        description: starterMeta.description,
        count: starterMeta.count,
        created_at: new Date().toISOString(),
        tags: starterMeta.tags,
        license: starterMeta.license,
      },
      creatures: [],
    };

    return await this.installPack(templateBundle, `${starterId}.pack.json`);
  }

  /**
   * Exports an installed pack to a downloadable JSON file (.pack.json)
   */
  public async downloadPack(packId: string): Promise<void> {
    const list = await this.listInstalledPacks();
    const packSummary = list.find((p) => p.id === packId);
    if (!packSummary) throw new Error('Пакет не найден');

    let bundle = this.memoryCache.get(packId);
    if (!bundle) {
      const creatures = await this.getPackCreatures(packId);
      bundle = {
        manifest: {
          id: packSummary.id,
          name: packSummary.name,
          system_id: packSummary.system_id,
          edition: packSummary.edition,
          version: packSummary.version,
          author: packSummary.author,
          description: packSummary.description,
          count: packSummary.creatureCount,
        },
        creatures,
      };
    }

    const jsonStr = JSON.stringify(bundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packSummary.id}.pack.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const packManagerService = PackManagerService.getInstance();
