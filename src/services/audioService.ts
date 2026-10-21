/**
 * Procedural Web Audio API Soundboard & Offline Local Audio Player
 * 100% offline, zero external CDN / cloud streaming dependencies!
 */

export type AmbientTrackId = 'tavern' | 'dungeon' | 'rain' | 'campfire' | 'drums';
export type TrackCategory = 'ambient' | 'music' | 'combat' | 'sfx';

export interface AmbientTrackInfo {
  id: AmbientTrackId;
  name: string;
  nameEn: string;
  icon: string;
  desc: string;
}

export const AMBIENT_TRACKS: AmbientTrackInfo[] = [
  {
    id: 'tavern',
    name: 'Шумная таверна',
    nameEn: 'Tavern Ambience',
    icon: 'tavern',
    desc: 'Теплый гул голосов, звон кружек и треск очага',
  },
  {
    id: 'dungeon',
    name: 'Жуткое подземелье',
    nameEn: 'Dungeon Ambience',
    icon: 'dungeon',
    desc: 'Низкий мрачный гул, эхо и падающие капли',
  },
  {
    id: 'rain',
    name: 'Ливень и гроза',
    nameEn: 'Rain & Thunder',
    icon: 'rain',
    desc: 'Шум проливного дождя и периодические раскаты грома',
  },
  {
    id: 'campfire',
    name: 'Ночной костёр',
    nameEn: 'Campfire Night',
    icon: 'campfire',
    desc: 'Потрескивание углей, ночной шелест и сверчки',
  },
  {
    id: 'drums',
    name: 'Боевые барабаны',
    nameEn: 'Combat War-Drums',
    icon: 'drums',
    desc: 'Ритмичный пульс военных барабанов и напряжение',
  },
];

export interface CustomAudioTrack {
  id: string;
  name: string;
  category: 'ambient' | 'music' | 'combat' | 'sfx';
  subcategory?: string;
  blobUrl?: string;
  dataUrl?: string; // for persisting smaller sfx in IndexedDB / localStorage
  filePath?: string; // for Tauri
  duration?: number;
  isLooping: boolean;
  size?: number;
  createdAt?: number;
}

// ============================================================================
// Native Offline IndexedDB Database Engine (`dnd_ait_audio_db`)
// ============================================================================
const DB_NAME = 'dnd_ait_audio_db';
const DB_VERSION = 1;
const STORE_TRACKS = 'tracks';
const STORE_BLOBS = 'audio_blobs';

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in current environment'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllTracksFromDB(db: IDBDatabase): Promise<CustomAudioTrack[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function getTrackBlobFromDB(db: IDBDatabase, id: string): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const store = tx.objectStore(STORE_BLOBS);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result ? req.result.blob : null);
    req.onerror = () => reject(req.error);
  });
}

function saveTrackToDB(db: IDBDatabase, track: CustomAudioTrack, blob?: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS, STORE_BLOBS], 'readwrite');
    const trackStore = tx.objectStore(STORE_TRACKS);
    const blobStore = tx.objectStore(STORE_BLOBS);

    const record: CustomAudioTrack = {
      id: track.id,
      name: track.name,
      category: track.category,
      subcategory: track.subcategory,
      dataUrl: track.dataUrl,
      filePath: track.filePath,
      duration: track.duration,
      isLooping: track.isLooping,
      size: track.size,
      createdAt: track.createdAt || Date.now(),
    };

    trackStore.put(record);

    if (blob) {
      blobStore.put({ id: track.id, blob });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function deleteTrackFromDB(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_TRACKS).delete(id);
    tx.objectStore(STORE_BLOBS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function updateTrackMetadataInDB(db: IDBDatabase, track: CustomAudioTrack): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const getReq = store.get(track.id);
    getReq.onsuccess = () => {
      const existing = getReq.result || {};
      const updated = {
        ...existing,
        name: track.name,
        category: track.category,
        subcategory: track.subcategory,
        duration: track.duration,
        isLooping: track.isLooping,
      };
      store.put(updated);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function probeAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return resolve(0);
    }
    const tempAudio = new Audio();
    tempAudio.src = url;
    tempAudio.preload = 'metadata';
    const onLoaded = () => {
      cleanup();
      resolve(tempAudio.duration || 0);
    };
    const onError = () => {
      cleanup();
      resolve(0);
    };
    const cleanup = () => {
      tempAudio.removeEventListener('loadedmetadata', onLoaded);
      tempAudio.removeEventListener('error', onError);
    };
    tempAudio.addEventListener('loadedmetadata', onLoaded);
    tempAudio.addEventListener('error', onError);
    setTimeout(() => {
      cleanup();
      resolve(0);
    }, 3000);
  });
}

export class AudioService {
  private static instance: AudioService;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Active ambient cleanup function
  private stopActiveAmbient: (() => void) | null = null;
  private currentTrackId: AmbientTrackId | null = null;

  // Local tracks player state
  private customTracks: CustomAudioTrack[] = [];
  private currentCustomTrackId: string | null = null;
  private isCustomTrackPlaying: boolean = false;
  private customTrackCurrentTime: number = 0;
  private customTrackDuration: number = 0;
  private audioElement: HTMLAudioElement | null = null;

  // Volume state
  private volume: number = 0.7;
  private isMuted: boolean = false;
  private categoryVolumes: Record<string, number> = {
    ambient: 0.8,
    music: 0.8,
    combat: 0.8,
    sfx: 0.9,
  };

  private listeners: Set<() => void> = new Set();

  private constructor() {
    // Restore saved volumes and mute
    try {
      const savedVol = localStorage.getItem('dnd_ait_master_volume');
      if (savedVol !== null) this.volume = parseFloat(savedVol);
      const savedMute = localStorage.getItem('dnd_ait_is_muted');
      if (savedMute !== null) this.isMuted = savedMute === 'true';
      const savedCats = localStorage.getItem('dnd_ait_category_volumes');
      if (savedCats) {
        this.categoryVolumes = { ...this.categoryVolumes, ...JSON.parse(savedCats) };
      }
    } catch {
      // Fallback
    }

    // Initialize HTML5 Audio element for background music
    this.initAudioElement();

    // Asynchronously load saved tracks from IndexedDB
    this.initIndexedDB();
  }

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  /**
   * Initialize IndexedDB and hydrate blob URLs for offline playback
   */
  private async initIndexedDB(): Promise<void> {
    try {
      const db = await openAudioDB();
      const records = await getAllTracksFromDB(db);

      for (const track of records) {
        if (track.dataUrl) {
          track.blobUrl = track.dataUrl;
        } else if (track.filePath) {
          track.blobUrl = await this.resolvePlayableFilePath(track.filePath);
        } else {
          try {
            const blob = await getTrackBlobFromDB(db, track.id);
            if (blob) {
              track.blobUrl = URL.createObjectURL(blob);
            }
          } catch (e) {
            console.warn('[AudioService] Could not retrieve blob for track:', track.id, e);
          }
        }
      }

      this.customTracks = records;
      this.notify();
    } catch (err) {
      console.warn('[AudioService] IndexedDB unavailable or empty, continuing in-memory:', err);
    }
  }

  /**
   * Initializes HTML5 Audio element for background music
   */
  private initAudioElement(): HTMLAudioElement | null {
    const AudioConstructor =
      typeof Audio !== 'undefined'
        ? Audio
        : typeof window !== 'undefined' && (window as any).Audio
        ? (window as any).Audio
        : typeof globalThis !== 'undefined' && (globalThis as any).Audio
        ? (globalThis as any).Audio
        : null;

    if (!AudioConstructor) {
      return null;
    }
    if (!this.audioElement) {
      const el = new AudioConstructor();
      this.audioElement = el;
      el.preload = 'auto';

      el.addEventListener('timeupdate', () => {
        if (this.audioElement) {
          this.customTrackCurrentTime = this.audioElement.currentTime;
          this.notify();
        }
      });

      el.addEventListener('loadedmetadata', () => {
        if (this.audioElement) {
          const dur = this.audioElement.duration || 0;
          this.customTrackDuration = dur;
          if (this.currentCustomTrackId) {
            const track = this.customTracks.find((t) => t.id === this.currentCustomTrackId);
            if (track && (!track.duration || isNaN(track.duration))) {
              track.duration = dur;
              this.saveTrackMetadata(track);
            }
          }
          this.notify();
        }
      });

      el.addEventListener('ended', () => {
        const track = this.getCurrentCustomTrack();
        if (track?.isLooping) {
          if (this.audioElement) {
            this.audioElement.currentTime = 0;
            this.audioElement.play().catch(() => {});
          }
        } else {
          this.playNextTrack();
        }
      });

      el.addEventListener('error', (e: any) => {
        console.warn('[AudioService] Audio element error:', e);
        this.isCustomTrackPlaying = false;
        this.notify();
      });
    }
    return this.audioElement;
  }

  /**
   * Resolves a local file path into a playable src (Tauri asset protocol or file URL)
   */
  private async resolvePlayableFilePath(filePath: string): Promise<string> {
    try {
      const { convertFileSrc } = await import('@tauri-apps/api/core');
      return convertFileSrc(filePath);
    } catch {
      return filePath;
    }
  }

  private async getPlayableSrc(track: CustomAudioTrack): Promise<string | undefined> {
    if (track.blobUrl) return track.blobUrl;
    if (track.dataUrl) return track.dataUrl;
    if (track.filePath) {
      return this.resolvePlayableFilePath(track.filePath);
    }
    // Try to load blob from IndexedDB on demand
    try {
      const db = await openAudioDB();
      const blob = await getTrackBlobFromDB(db, track.id);
      if (blob) {
        track.blobUrl = URL.createObjectURL(blob);
        return track.blobUrl;
      }
    } catch {}
    return undefined;
  }

  /**
   * Initializes AudioContext upon user gesture
   */
  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        typeof AudioContext !== 'undefined'
          ? AudioContext
          : typeof window !== 'undefined'
          ? (window as any).AudioContext || (window as any).webkitAudioContext
          : typeof globalThis !== 'undefined'
          ? (globalThis as any).AudioContext
          : null;

      if (!AudioCtx) {
        throw new Error('AudioContext is not available in this environment');
      }

      const ctx = new AudioCtx();
      this.ctx = ctx;

      const masterGain = ctx.createGain();
      this.masterGain = masterGain;
      masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.volume,
        ctx.currentTime
      );
      masterGain.connect(ctx.destination);

      const ambientGain = ctx.createGain();
      this.ambientGain = ambientGain;
      const ambVol = this.categoryVolumes.ambient ?? 0.8;
      ambientGain.gain.setValueAtTime(ambVol, ctx.currentTime);
      ambientGain.connect(masterGain);

      const sfxGain = ctx.createGain();
      this.sfxGain = sfxGain;
      const sfxVol = this.categoryVolumes.sfx ?? 0.9;
      sfxGain.gain.setValueAtTime(sfxVol, ctx.currentTime);
      sfxGain.connect(masterGain);
    }

    const currentCtx = this.ctx;
    if (currentCtx && currentCtx.state === 'suspended') {
      currentCtx.resume();
    }

    if (!this.ctx) {
      throw new Error('Failed to initialize AudioContext');
    }

    return this.ctx;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  // =========================================================================
  // VOLUME & MUTE CONTROLS
  // =========================================================================
  public getVolume(): number {
    return this.volume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('dnd_ait_master_volume', String(this.volume));
    } catch {}

    this.updateGainAndAudioVolumes();
    this.notify();
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('dnd_ait_is_muted', String(this.isMuted));
    } catch {}

    this.updateGainAndAudioVolumes();
    this.notify();
  }

  public setCategoryVolume(category: TrackCategory | string, vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.categoryVolumes[category] = clamped;
    try {
      localStorage.setItem('dnd_ait_category_volumes', JSON.stringify(this.categoryVolumes));
    } catch {}

    this.updateGainAndAudioVolumes();
    this.notify();
  }

  public getCategoryVolume(category: TrackCategory | string): number {
    return this.categoryVolumes[category] ?? 0.8;
  }

  public getAllCategoryVolumes(): Record<string, number> {
    return { ...this.categoryVolumes };
  }

  private calculateEffectiveVolume(category?: TrackCategory | string): number {
    if (this.isMuted) return 0;
    const cat = category || this.getCurrentCustomTrack()?.category || 'music';
    const catVol = this.categoryVolumes[cat] ?? 0.8;
    return Math.max(0, Math.min(1, this.volume * catVol));
  }

  private updateGainAndAudioVolumes(): void {
    if (this.audioElement) {
      this.audioElement.volume = this.calculateEffectiveVolume();
    }
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    if (this.ambientGain && this.ctx) {
      const ambVol = this.categoryVolumes.ambient ?? 0.8;
      this.ambientGain.gain.setTargetAtTime(ambVol, this.ctx.currentTime, 0.05);
    }
    if (this.sfxGain && this.ctx) {
      const sfxVol = this.categoryVolumes.sfx ?? 0.9;
      this.sfxGain.gain.setTargetAtTime(sfxVol, this.ctx.currentTime, 0.05);
    }
  }

  // =========================================================================
  // LOCAL AUDIO TRACKS & PLAYLIST MANAGEMENT
  // =========================================================================
  public getCustomTracks(): CustomAudioTrack[] {
    return this.customTracks;
  }

  public getCurrentCustomTrack(): CustomAudioTrack | null {
    if (!this.currentCustomTrackId) return null;
    return this.customTracks.find((t) => t.id === this.currentCustomTrackId) || null;
  }

  public getCurrentCustomTrackId(): string | null {
    return this.currentCustomTrackId;
  }

  public isCustomPlaying(): boolean {
    return this.isCustomTrackPlaying;
  }

  public getCustomCurrentTime(): number {
    return this.customTrackCurrentTime;
  }

  public getCustomDuration(): number {
    return this.customTrackDuration;
  }

  public isPlaying(): boolean {
    return this.currentTrackId !== null || this.isCustomTrackPlaying;
  }

  public getCurrentTrack(): AmbientTrackId | null {
    return this.currentTrackId;
  }

  /**
   * Add a single track from HTML5 File
   */
  public async addTrack(
    file: File,
    category: TrackCategory = 'music',
    customName?: string
  ): Promise<CustomAudioTrack> {
    const id = `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const cleanName =
      customName || file.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
    const blobUrl = URL.createObjectURL(file);

    let dataUrl: string | undefined;
    // Persist small sfx / tracks (< 1MB) as data URL as well
    if (file.size < 1024 * 1024 || category === 'sfx') {
      try {
        dataUrl = await fileToDataUrl(file);
      } catch {}
    }

    const filePath = (file as any).path || undefined;

    const newTrack: CustomAudioTrack = {
      id,
      name: cleanName,
      category,
      blobUrl,
      dataUrl,
      filePath,
      isLooping: category !== 'sfx',
      size: file.size,
      createdAt: Date.now(),
    };

    try {
      newTrack.duration = await probeAudioDuration(blobUrl);
    } catch {}

    try {
      const db = await openAudioDB();
      await saveTrackToDB(db, newTrack, file);
    } catch (err) {
      console.warn('[AudioService] Could not persist track to IndexedDB:', err);
    }

    this.customTracks.push(newTrack);
    this.notify();
    return newTrack;
  }

  /**
   * Batch add multiple tracks with automatic category deduction
   */
  public async addTracks(
    files: FileList | File[],
    defaultCategory: TrackCategory = 'music'
  ): Promise<CustomAudioTrack[]> {
    const result: CustomAudioTrack[] = [];
    const list = Array.from(files);

    for (const file of list) {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!['.mp3', '.wav', '.ogg', '.webm', '.flac', '.m4a'].includes(ext)) {
        continue;
      }

      let cat = defaultCategory;
      const path = (file as any).webkitRelativePath || (file as any).path || file.name;
      const lower = path.toLowerCase();

      if (lower.includes('combat') || lower.includes('бой') || lower.includes('battle')) {
        cat = 'combat';
      } else if (
        lower.includes('sfx') ||
        lower.includes('эффект') ||
        lower.includes('effect') ||
        lower.includes('hit') ||
        lower.includes('shot')
      ) {
        cat = 'sfx';
      } else if (
        lower.includes('dungeon') ||
        lower.includes('подземелье') ||
        lower.includes('cave') ||
        lower.includes('пещера') ||
        lower.includes('ambient') ||
        lower.includes('эмбиент') ||
        lower.includes('nature') ||
        lower.includes('природа')
      ) {
        cat = 'ambient';
      } else if (
        lower.includes('tavern') ||
        lower.includes('таверна') ||
        lower.includes('город') ||
        lower.includes('town')
      ) {
        cat = 'music';
      }

      const track = await this.addTrack(file, cat);
      result.push(track);
    }

    return result;
  }

  /**
   * Add a local track from a filesystem path (Tauri support)
   */
  public async addTrackFromPath(
    filePath: string,
    name?: string,
    category: TrackCategory = 'music'
  ): Promise<CustomAudioTrack> {
    const id = `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fileName = filePath.replace(/\\/g, '/').split('/').pop() || filePath;
    const cleanName =
      name || fileName.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');

    const playableSrc = await this.resolvePlayableFilePath(filePath);

    const newTrack: CustomAudioTrack = {
      id,
      name: cleanName,
      category,
      filePath,
      blobUrl: playableSrc,
      isLooping: category !== 'sfx',
      createdAt: Date.now(),
    };

    try {
      newTrack.duration = await probeAudioDuration(playableSrc);
    } catch {}

    try {
      const db = await openAudioDB();
      await saveTrackToDB(db, newTrack);
    } catch (err) {
      console.warn('[AudioService] Could not persist Tauri track to IndexedDB:', err);
    }

    this.customTracks.push(newTrack);
    this.notify();
    return newTrack;
  }

  /**
   * Delete track from memory and IndexedDB
   */
  public async deleteTrack(trackId: string): Promise<void> {
    if (this.currentCustomTrackId === trackId) {
      this.stopTrack();
      this.currentCustomTrackId = null;
    }

    const index = this.customTracks.findIndex((t) => t.id === trackId);
    if (index !== -1) {
      const track = this.customTracks[index];
      if (track.blobUrl && track.blobUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(track.blobUrl);
        } catch {}
      }
      this.customTracks.splice(index, 1);
    }

    try {
      const db = await openAudioDB();
      await deleteTrackFromDB(db, trackId);
    } catch (err) {
      console.warn('[AudioService] Error deleting track from IndexedDB:', err);
    }

    this.notify();
  }

  /**
   * Update track metadata
   */
  public async updateTrack(
    trackUpdate: Partial<CustomAudioTrack> & { id: string }
  ): Promise<void> {
    const track = this.customTracks.find((t) => t.id === trackUpdate.id);
    if (!track) return;

    Object.assign(track, trackUpdate);

    if (this.currentCustomTrackId === track.id && this.audioElement) {
      if (trackUpdate.isLooping !== undefined) {
        this.audioElement.loop = track.isLooping;
      }
    }

    this.saveTrackMetadata(track);
    this.notify();
  }

  private async saveTrackMetadata(track: CustomAudioTrack): Promise<void> {
    try {
      const db = await openAudioDB();
      await updateTrackMetadataInDB(db, track);
    } catch {}
  }

  // =========================================================================
  // PLAYER PLAYBACK CONTROLS
  // =========================================================================

  /**
   * Play track by ID
   */
  public async playTrack(trackId: string): Promise<void> {
    const track = this.customTracks.find((t) => t.id === trackId);
    if (!track) return;

    // One-shot SFX: Play simultaneously without interrupting background music or ambient
    if (track.category === 'sfx') {
      await this.playOneShot(trackId);
      return;
    }

    const audio = this.initAudioElement();
    if (!audio) return;

    // If clicking on current track
    if (this.currentCustomTrackId === trackId && audio.src) {
      if (this.isCustomTrackPlaying) {
        this.pauseTrack();
      } else {
        this.resumeTrack();
      }
      return;
    }

    const src = await this.getPlayableSrc(track);
    if (!src) {
      console.warn('[AudioService] Could not find playable source for track:', track.name);
      return;
    }

    this.currentCustomTrackId = trackId;
    audio.src = src;
    audio.loop = track.isLooping;
    audio.currentTime = 0;
    audio.volume = this.calculateEffectiveVolume(track.category);

    try {
      await audio.play();
      this.isCustomTrackPlaying = true;
    } catch (err) {
      console.warn('[AudioService] Playback error:', err);
      this.isCustomTrackPlaying = false;
    }

    this.notify();
  }

  public pauseTrack(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isCustomTrackPlaying = false;
    this.notify();
  }

  public resumeTrack(): void {
    if (this.audioElement && this.currentCustomTrackId) {
      this.isCustomTrackPlaying = true;
      this.audioElement
        .play()
        .catch((err) => {
          console.warn('[AudioService] Resume error:', err);
          this.isCustomTrackPlaying = false;
          this.notify();
        });
      this.notify();
    } else if (this.customTracks.length > 0) {
      this.playTrack(this.customTracks[0].id);
    }
  }

  public stopTrack(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isCustomTrackPlaying = false;
    this.customTrackCurrentTime = 0;
    this.notify();
  }

  public seek(seconds: number): void {
    if (this.audioElement) {
      const valid = Math.max(0, Math.min(this.customTrackDuration || seconds, seconds));
      this.audioElement.currentTime = valid;
      this.customTrackCurrentTime = valid;
      this.notify();
    }
  }

  public toggleLoop(trackId: string): void {
    const track = this.customTracks.find((t) => t.id === trackId);
    if (!track) return;
    track.isLooping = !track.isLooping;

    if (this.currentCustomTrackId === trackId && this.audioElement) {
      this.audioElement.loop = track.isLooping;
    }

    this.saveTrackMetadata(track);
    this.notify();
  }

  public playNextTrack(): void {
    if (this.customTracks.length === 0) return;
    const currentIdx = this.customTracks.findIndex((t) => t.id === this.currentCustomTrackId);
    const nextIdx = (currentIdx + 1) % this.customTracks.length;
    this.playTrack(this.customTracks[nextIdx].id);
  }

  public playPrevTrack(): void {
    if (this.customTracks.length === 0) return;
    const currentIdx = this.customTracks.findIndex((t) => t.id === this.currentCustomTrackId);
    const prevIdx = (currentIdx - 1 + this.customTracks.length) % this.customTracks.length;
    this.playTrack(this.customTracks[prevIdx].id);
  }

  /**
   * One-shot simultaneous playback for SFX tracks (never interrupts ambient/music)
   */
  public async playOneShot(trackId: string): Promise<void> {
    const track = this.customTracks.find((t) => t.id === trackId);
    if (!track) return;

    const src = await this.getPlayableSrc(track);
    if (!src) return;

    const AudioConstructor =
      typeof Audio !== 'undefined'
        ? Audio
        : typeof window !== 'undefined' && (window as any).Audio
        ? (window as any).Audio
        : typeof globalThis !== 'undefined' && (globalThis as any).Audio
        ? (globalThis as any).Audio
        : null;

    if (AudioConstructor) {
      const sfxAudio = new AudioConstructor(src);
      sfxAudio.volume = this.calculateEffectiveVolume('sfx');
      sfxAudio.play().catch((err: any) => {
        console.warn('[AudioService] One-shot audio error:', err);
      });
    }
  }

  /**
   * Stop everything (both ambient synthesizer and local music track)
   */
  public stopAll(): void {
    this.stopAmbient();
    this.stopTrack();
  }

  // =========================================================================
  // PROCEDURAL AMBIENT GENERATOR
  // =========================================================================

  private createPinkNoiseBuffer(durationSeconds = 5): AudioBuffer {
    const ctx = this.initContext();
    const bufferSize = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  public toggleAmbientTrack(trackId: AmbientTrackId): void {
    if (this.currentTrackId === trackId) {
      this.stopAmbient();
      return;
    }
    this.playAmbient(trackId);
  }

  public playAmbient(trackId: AmbientTrackId): void {
    this.stopAmbient();

    const ctx = this.initContext();
    const dest = this.ambientGain!;

    this.currentTrackId = trackId;

    switch (trackId) {
      case 'tavern':
        this.stopActiveAmbient = this.generateTavern(ctx, dest);
        break;
      case 'dungeon':
        this.stopActiveAmbient = this.generateDungeon(ctx, dest);
        break;
      case 'rain':
        this.stopActiveAmbient = this.generateRain(ctx, dest);
        break;
      case 'campfire':
        this.stopActiveAmbient = this.generateCampfire(ctx, dest);
        break;
      case 'drums':
        this.stopActiveAmbient = this.generateWarDrums(ctx, dest);
        break;
    }

    this.notify();
  }

  public stopAmbient(): void {
    if (this.stopActiveAmbient) {
      try {
        this.stopActiveAmbient();
      } catch (e) {
        console.warn('Error stopping ambient:', e);
      }
      this.stopActiveAmbient = null;
    }
    this.currentTrackId = null;
    this.notify();
  }

  private generateTavern(ctx: AudioContext, dest: GainNode): () => void {
    const isRunning = { value: true };
    const nodesToStop: Array<{ stop?: () => void; disconnect: () => void }> = [];

    const noise = ctx.createBufferSource();
    noise.buffer = this.createPinkNoiseBuffer(6);
    noise.loop = true;

    const bpFilter1 = ctx.createBiquadFilter();
    bpFilter1.type = 'bandpass';
    bpFilter1.frequency.value = 650;
    bpFilter1.Q.value = 3.5;

    const lfo1 = ctx.createOscillator();
    lfo1.frequency.value = 0.35;
    const lfoGain1 = ctx.createGain();
    lfoGain1.gain.value = 180;
    lfo1.connect(lfoGain1);
    lfoGain1.connect(bpFilter1.frequency);

    const layerGain1 = ctx.createGain();
    layerGain1.gain.value = 0.55;

    noise.connect(bpFilter1);
    bpFilter1.connect(layerGain1);
    layerGain1.connect(dest);

    noise.start();
    lfo1.start();
    nodesToStop.push(noise, lfo1, bpFilter1, layerGain1);

    const crackleInterval = setInterval(() => {
      if (!isRunning.value || ctx.state === 'closed') return;
      if (Math.random() > 0.4) {
        const snap = ctx.createBufferSource();
        snap.buffer = this.createPinkNoiseBuffer(0.04);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2200;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12 + Math.random() * 0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        snap.connect(hp);
        hp.connect(g);
        g.connect(dest);
        snap.start();
      }
    }, 180);

    return () => {
      isRunning.value = false;
      clearInterval(crackleInterval);
      nodesToStop.forEach((n) => {
        try {
          if (n.stop) n.stop();
          n.disconnect();
        } catch {}
      });
    };
  }

  private generateDungeon(ctx: AudioContext, dest: GainNode): () => void {
    const isRunning = { value: true };
    const nodesToStop: Array<{ stop?: () => void; disconnect: () => void }> = [];

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 48;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 49.5;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 160;

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.45;

    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(droneGain);
    droneGain.connect(dest);

    osc1.start();
    osc2.start();
    nodesToStop.push(osc1, osc2, lp, droneGain);

    const dripInterval = setInterval(() => {
      if (!isRunning.value || ctx.state === 'closed') return;
      if (Math.random() > 0.35) {
        const now = ctx.currentTime;
        const freq = 1400 + Math.random() * 900;
        const drip = ctx.createOscillator();
        drip.type = 'sine';
        drip.frequency.setValueAtTime(freq, now);
        drip.frequency.exponentialRampToValueAtTime(freq * 0.75, now + 0.08);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

        drip.connect(g);
        g.connect(dest);
        drip.start(now);
        drip.stop(now + 0.28);
      }
    }, 1200);

    return () => {
      isRunning.value = false;
      clearInterval(dripInterval);
      nodesToStop.forEach((n) => {
        try {
          if (n.stop) n.stop();
          n.disconnect();
        } catch {}
      });
    };
  }

  private generateRain(ctx: AudioContext, dest: GainNode): () => void {
    const isRunning = { value: true };
    const nodesToStop: Array<{ stop?: () => void; disconnect: () => void }> = [];

    const rainSource = ctx.createBufferSource();
    rainSource.buffer = this.createPinkNoiseBuffer(6);
    rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 1400;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.55;

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(dest);

    rainSource.start();
    nodesToStop.push(rainSource, rainFilter, rainGain);

    const triggerThunder = () => {
      if (!isRunning.value || ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const thunderSource = ctx.createBufferSource();
      thunderSource.buffer = this.createPinkNoiseBuffer(3.5);

      const thunderFilter = ctx.createBiquadFilter();
      thunderFilter.type = 'lowpass';
      thunderFilter.frequency.setValueAtTime(140, now);
      thunderFilter.frequency.exponentialRampToValueAtTime(45, now + 2.5);

      const thunderGain = ctx.createGain();
      thunderGain.gain.setValueAtTime(0.01, now);
      thunderGain.gain.linearRampToValueAtTime(0.7, now + 0.3);
      thunderGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

      thunderSource.connect(thunderFilter);
      thunderFilter.connect(thunderGain);
      thunderGain.connect(dest);

      thunderSource.start(now);
      thunderSource.stop(now + 3.4);
    };

    const thunderTimer = setInterval(() => {
      if (Math.random() > 0.4) {
        triggerThunder();
      }
    }, 7000);

    return () => {
      isRunning.value = false;
      clearInterval(thunderTimer);
      nodesToStop.forEach((n) => {
        try {
          if (n.stop) n.stop();
          n.disconnect();
        } catch {}
      });
    };
  }

  private generateCampfire(ctx: AudioContext, dest: GainNode): () => void {
    const isRunning = { value: true };
    const nodesToStop: Array<{ stop?: () => void; disconnect: () => void }> = [];

    const windNoise = ctx.createBufferSource();
    windNoise.buffer = this.createPinkNoiseBuffer(6);
    windNoise.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 320;
    windFilter.Q.value = 1.2;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.35;

    windNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(dest);

    windNoise.start();
    nodesToStop.push(windNoise, windFilter, windGain);

    const crackleTimer = setInterval(() => {
      if (!isRunning.value || ctx.state === 'closed') return;
      const count = Math.floor(1 + Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const snap = ctx.createBufferSource();
        snap.buffer = this.createPinkNoiseBuffer(0.03);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1600 + Math.random() * 800;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.18 + Math.random() * 0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

        snap.connect(hp);
        hp.connect(g);
        g.connect(dest);
        snap.start();
      }
    }, 140);

    return () => {
      isRunning.value = false;
      clearInterval(crackleTimer);
      nodesToStop.forEach((n) => {
        try {
          if (n.stop) n.stop();
          n.disconnect();
        } catch {}
      });
    };
  }

  private generateWarDrums(ctx: AudioContext, dest: GainNode): () => void {
    const isRunning = { value: true };
    const nodesToStop: Array<{ stop?: () => void; disconnect: () => void }> = [];

    const drone = ctx.createOscillator();
    drone.type = 'sawtooth';
    drone.frequency.value = 55;
    const droneFilt = ctx.createBiquadFilter();
    droneFilt.type = 'lowpass';
    droneFilt.frequency.value = 180;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.3;

    drone.connect(droneFilt);
    droneFilt.connect(droneGain);
    droneGain.connect(dest);
    drone.start();
    nodesToStop.push(drone, droneFilt, droneGain);

    let beatIndex = 0;
    const drumInterval = setInterval(() => {
      if (!isRunning.value || ctx.state === 'closed') return;
      const now = ctx.currentTime;
      beatIndex = (beatIndex + 1) % 4;

      const isAccent = beatIndex === 0 || beatIndex === 2;
      const drumOsc = ctx.createOscillator();
      drumOsc.type = 'sine';
      drumOsc.frequency.setValueAtTime(isAccent ? 160 : 130, now);
      drumOsc.frequency.exponentialRampToValueAtTime(42, now + 0.12);

      const drumG = ctx.createGain();
      drumG.gain.setValueAtTime(isAccent ? 0.6 : 0.35, now);
      drumG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      drumOsc.connect(drumG);
      drumG.connect(dest);

      drumOsc.start(now);
      drumOsc.stop(now + 0.38);
    }, 570);

    return () => {
      isRunning.value = false;
      clearInterval(drumInterval);
      nodesToStop.forEach((n) => {
        try {
          if (n.stop) n.stop();
          n.disconnect();
        } catch {}
      });
    };
  }

  // =========================================================================
  // TABLETOP PROCEDURAL SOUND EFFECTS (SFX)
  // =========================================================================

  /**
   * 1. Крит (Natural 20 fanfare): Heroic fanfare brass + shimmer bells + gong
   */
  public playCriticalHit(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const dest = this.sfxGain!;

    // Heroic brass fanfare chords: C4, E4, G4, C5, E5
    const fanfareNotes = [
      { note: 261.63, start: 0.0, dur: 0.14 },
      { note: 329.63, start: 0.12, dur: 0.14 },
      { note: 392.0, start: 0.24, dur: 0.14 },
      { note: 523.25, start: 0.36, dur: 0.9 },
      { note: 659.25, start: 0.4, dur: 0.85 },
    ];

    fanfareNotes.forEach((n) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.note, now + n.start);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(n.note * 2, now + n.start);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.setValueAtTime(0.3, now + n.start);
      g.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

      osc.connect(g);
      osc2.connect(g);
      g.connect(dest);

      osc.start(now + n.start);
      osc2.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.05);
      osc2.stop(now + n.start + n.dur + 0.05);
    });

    // Shimmer Bells
    const shimmer = [1046.5, 1318.5, 1567.98, 2093.0];
    shimmer.forEach((freq, idx) => {
      const t = now + 0.38 + idx * 0.05;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.65);
    });

    // Metallic gong partials
    const freqs = [261.6, 392.0, 523.2, 830.6];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 1.85);
    });
  }

  /**
   * 2. Провал (Natural 1 sad horn): Comedic descending sad trombone wah-wah-wah-waaaah
   */
  public playSadHorn(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const dest = this.sfxGain!;

    const notes = [
      { freq: 311.13, start: 0.0, dur: 0.28 },
      { freq: 293.66, start: 0.32, dur: 0.28 },
      { freq: 277.18, start: 0.64, dur: 0.28 },
      { freq: 261.63, endFreq: 215.0, start: 0.96, dur: 1.1 },
    ];

    notes.forEach((n) => {
      const t = now + n.start;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.freq, t);
      if (n.endFreq) {
        osc.frequency.exponentialRampToValueAtTime(n.endFreq, t + n.dur);
      }

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(n.endFreq ? 5.5 : 4.0, t);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(6.0, t);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(680, t);
      filter.Q.setValueAtTime(3.0, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(t);
      lfo.start(t);
      osc.stop(t + n.dur + 0.05);
      lfo.stop(t + n.dur + 0.05);
    });
  }

  /**
   * 3. Удар меча: Sharp blade clash & ringing steel resonance
   */
  public playSwordStrike(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const dest = this.sfxGain!;

    const noise = ctx.createBufferSource();
    noise.buffer = this.createPinkNoiseBuffer(0.12);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2800, now);
    bp.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    bp.Q.value = 6;

    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.5, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(bp);
    bp.connect(ng);
    ng.connect(dest);
    noise.start(now);

    const ring = ctx.createOscillator();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(1850, now);
    ring.frequency.exponentialRampToValueAtTime(950, now + 0.2);

    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.25, now);
    rg.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    ring.connect(rg);
    rg.connect(dest);
    ring.start(now);
    ring.stop(now + 0.25);
  }

  /**
   * 4. Магический взрыв: Low rumble sub-bass punch, filtered blast & sparkling shockwave
   */
  public playMagicBurst(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const dest = this.sfxGain!;

    // Sub-bass dive
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(180, now);
    sub.frequency.exponentialRampToValueAtTime(35, now + 0.6);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(now);
    sub.stop(now + 0.85);

    // Filtered noise explosion
    const noise = ctx.createBufferSource();
    noise.buffer = this.createPinkNoiseBuffer(1.8);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(800, now);
    lp.frequency.exponentialRampToValueAtTime(60, now + 1.6);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.7, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 1.7);
    noise.connect(lp);
    lp.connect(ng);
    ng.connect(dest);
    noise.start(now);

    // High sparkling bells
    const freqs = [1174.66, 1760.0, 2349.32, 3520.0];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.04);
      osc.frequency.exponentialRampToValueAtTime(f * 0.5, now + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, now + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc.connect(g);
      g.connect(dest);
      osc.start(now + i * 0.04);
      osc.stop(now + 0.65);
    });
  }

  /**
   * 5. Драконий рык: Visceral detuned low sawtooth growl with guttural breath noise
   */
  public playDragonRoar(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const dest = this.sfxGain!;

    [65, 68].forEach((baseFreq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.35, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(32, now + 1.7);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(26, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(14, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, now);
      filter.frequency.linearRampToValueAtTime(750, now + 0.3);
      filter.frequency.exponentialRampToValueAtTime(120, now + 1.7);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.75);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(now);
      lfo.start(now);
      osc.stop(now + 1.8);
      lfo.stop(now + 1.8);
    });

    const noise = ctx.createBufferSource();
    noise.buffer = this.createPinkNoiseBuffer(1.8);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(450, now);
    bp.frequency.linearRampToValueAtTime(900, now + 0.35);
    bp.frequency.exponentialRampToValueAtTime(250, now + 1.6);
    bp.Q.value = 2.0;

    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.05, now);
    ng.gain.linearRampToValueAtTime(0.45, now + 0.3);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 1.75);

    noise.connect(bp);
    bp.connect(ng);
    ng.connect(dest);
    noise.start(now);
  }

  /**
   * 6. Монеты: Rapid cascade of gold coin clinks in pouch
   */
  public playCoins(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const dest = this.sfxGain!;

    const coinHits = [
      { delay: 0.0, freq: 3200, gain: 0.3 },
      { delay: 0.04, freq: 4100, gain: 0.26 },
      { delay: 0.09, freq: 2800, gain: 0.32 },
      { delay: 0.14, freq: 4800, gain: 0.24 },
      { delay: 0.2, freq: 3600, gain: 0.28 },
      { delay: 0.27, freq: 4400, gain: 0.22 },
    ];

    coinHits.forEach((hit) => {
      const t = now + hit.delay;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hit.freq, t);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(hit.freq * 1.58, t);

      const g = ctx.createGain();
      g.gain.setValueAtTime(hit.gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      osc.connect(g);
      osc2.connect(g);
      g.connect(dest);

      osc.start(t);
      osc2.start(t);
      osc.stop(t + 0.1);
      osc2.stop(t + 0.1);
    });
  }

  /**
   * 7. Уведомление: Pure crystalline two-tone alert chime (D5 -> A5)
   */
  public playNotification(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const dest = this.sfxGain!;

    const tones = [
      { freq: 587.33, start: 0.0, dur: 0.45 },
      { freq: 880.0, start: 0.1, dur: 0.75 },
    ];

    tones.forEach((tone) => {
      const t = now + tone.start;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, t);

      const harmonic = ctx.createOscillator();
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(tone.freq * 2.01, t);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + tone.dur);

      const hg = ctx.createGain();
      hg.gain.setValueAtTime(0.08, t);
      hg.gain.exponentialRampToValueAtTime(0.0001, t + tone.dur * 0.6);

      osc.connect(g);
      harmonic.connect(hg);
      g.connect(dest);
      hg.connect(dest);

      osc.start(t);
      harmonic.start(t);
      osc.stop(t + tone.dur + 0.05);
      harmonic.stop(t + tone.dur + 0.05);
    });
  }

  /**
   * 8. Таймер: Woodblock countdown ticks + focused temple gong
   */
  public playTimer(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const dest = this.sfxGain!;

    [0.0, 0.25, 0.5].forEach((offset, idx) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 2 ? 920 : 820, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.035);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.045);
    });

    const gongTime = now + 0.75;
    const gongFreqs = [440, 660, 880, 1100];
    gongFreqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, gongTime);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25 / (idx + 1), gongTime);
      g.gain.exponentialRampToValueAtTime(0.0001, gongTime + 1.8);

      osc.connect(g);
      g.connect(dest);
      osc.start(gongTime);
      osc.stop(gongTime + 1.85);
    });
  }

  /**
   * Dice Roll clatter
   */
  public playDiceRoll(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const dest = this.sfxGain!;

    const taps = [
      { time: 0.0, freq: 820, q: 8, gain: 0.28 },
      { time: 0.055, freq: 940, q: 7, gain: 0.32 },
      { time: 0.11, freq: 760, q: 9, gain: 0.35 },
      { time: 0.175, freq: 880, q: 6, gain: 0.4 },
    ];

    taps.forEach((tap) => {
      const tapTime = now + tap.time;

      const noise = ctx.createBufferSource();
      noise.buffer = this.createPinkNoiseBuffer(0.04);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(tap.freq * 2, tapTime);
      filter.Q.value = tap.q;

      const g = ctx.createGain();
      g.gain.setValueAtTime(tap.gain, tapTime);
      g.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.035);

      noise.connect(filter);
      filter.connect(g);
      g.connect(dest);
      noise.start(tapTime);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(tap.freq, tapTime);
      osc.frequency.exponentialRampToValueAtTime(tap.freq * 0.6, tapTime + 0.04);

      const oscG = ctx.createGain();
      oscG.gain.setValueAtTime(tap.gain * 0.5, tapTime);
      oscG.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.04);

      osc.connect(oscG);
      oscG.connect(dest);

      osc.start(tapTime);
      osc.stop(tapTime + 0.045);
    });
  }

  /**
   * Magic Cast chime
   */
  public playMagicCast(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const dest = this.sfxGain!;

    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      const delay = idx * 0.06;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.2, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.7);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + delay);
      osc.stop(now + delay + 0.75);
    });
  }

  /**
   * Victory Fanfare
   */
  public playVictoryFanfare(): void {
    this.playCriticalHit();
  }

  /**
   * Universal SFX dispatcher
   */
  public playSfx(
    type:
      | 'dice'
      | 'magic'
      | 'crit'
      | 'nat20'
      | 'fumble'
      | 'nat1'
      | 'sword'
      | 'burst'
      | 'dragon'
      | 'coins'
      | 'notification'
      | 'timer'
      | 'fanfare'
      | string
  ): void {
    switch (type) {
      case 'dice':
        this.playDiceRoll();
        break;
      case 'crit':
      case 'nat20':
      case 'fanfare':
        this.playCriticalHit();
        break;
      case 'fumble':
      case 'nat1':
      case 'sadhorn':
        this.playSadHorn();
        break;
      case 'sword':
      case 'strike':
        this.playSwordStrike();
        break;
      case 'burst':
      case 'explosion':
        this.playMagicBurst();
        break;
      case 'dragon':
      case 'roar':
        this.playDragonRoar();
        break;
      case 'coins':
      case 'gold':
        this.playCoins();
        break;
      case 'notification':
      case 'alert':
        this.playNotification();
        break;
      case 'timer':
      case 'clock':
        this.playTimer();
        break;
      case 'magic':
        this.playMagicCast();
        break;
      default:
        this.playMagicCast();
        break;
    }
  }
}

export const audioService = AudioService.getInstance();
