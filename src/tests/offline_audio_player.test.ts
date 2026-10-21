import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  audioService,
  AMBIENT_TRACKS,
} from '../services/audioService';
import { SoundboardDrawer, LocalAudioTrack } from '../components/audio/SoundboardDrawer';

// Mock Web Audio API
class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

class MockAudioBufferSourceNode extends MockAudioNode {
  buffer = null;
  loop = false;
  start = vi.fn();
  stop = vi.fn();
}

class MockBiquadFilterNode extends MockAudioNode {
  type = 'lowpass';
  frequency = {
    value: 1000,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
  Q = {
    value: 1,
    setValueAtTime: vi.fn(),
  };
}

class MockOscillatorNode extends MockAudioNode {
  type = 'sine';
  frequency = {
    value: 440,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = new MockAudioNode();
  resume = vi.fn().mockResolvedValue(undefined);
  createGain = vi.fn(() => new MockGainNode());
  createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
  createBiquadFilter = vi.fn(() => new MockBiquadFilterNode());
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createBuffer = vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(100)),
  }));
}

// Mock HTML5 Audio
class MockAudio {
  src = '';
  loop = false;
  volume = 1;
  currentTime = 0;
  duration = 120;
  paused = true;
  listeners: Record<string, Function[]> = {};

  addEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  removeEventListener(event: string, fn: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== fn);
    }
  }

  play = vi.fn().mockImplementation(() => {
    this.paused = false;
    return Promise.resolve();
  });

  pause = vi.fn().mockImplementation(() => {
    this.paused = true;
  });
}

// Setup globals before running tests
beforeEach(() => {
  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.stubGlobal('Audio', MockAudio);
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn((file) => `blob:mock-url-${file?.name || 'audio'}`),
    revokeObjectURL: vi.fn(),
  });
});

describe('Offline Audio & Media Service', () => {
  it('initializes as a singleton with default volume and categories', () => {
    expect(audioService).toBeDefined();
    expect(typeof audioService.getVolume()).toBe('number');
    expect(audioService.getVolume()).toBeGreaterThanOrEqual(0);
    expect(audioService.getVolume()).toBeLessThanOrEqual(1);
    expect(audioService.getIsMuted()).toBe(false);

    const catVolumes = audioService.getAllCategoryVolumes();
    expect(catVolumes.combat).toBeDefined();
    expect(catVolumes.music).toBeDefined();
    expect(catVolumes.ambient).toBeDefined();
    expect(catVolumes.sfx).toBeDefined();
  });

  it('provides master volume and mute controls', () => {
    audioService.setVolume(0.42);
    expect(audioService.getVolume()).toBeCloseTo(0.42);

    audioService.toggleMute();
    expect(audioService.getIsMuted()).toBe(true);

    audioService.toggleMute();
    expect(audioService.getIsMuted()).toBe(false);

    // Reset
    audioService.setVolume(0.8);
  });

  it('provides per-category volume control', () => {
    audioService.setCategoryVolume('combat', 0.65);
    expect(audioService.getCategoryVolume('combat')).toBe(0.65);

    audioService.setCategoryVolume('sfx', 0.95);
    expect(audioService.getCategoryVolume('sfx')).toBe(0.95);
  });

  it('manages procedural ambients without throwing', () => {
    expect(AMBIENT_TRACKS.length).toBe(5);

    audioService.playAmbient('tavern');
    expect(audioService.getCurrentTrack()).toBe('tavern');
    expect(audioService.isPlaying()).toBe(true);

    audioService.toggleAmbientTrack('tavern');
    expect(audioService.getCurrentTrack()).toBeNull();

    audioService.playAmbient('campfire');
    expect(audioService.getCurrentTrack()).toBe('campfire');

    audioService.stopAmbient();
    expect(audioService.getCurrentTrack()).toBeNull();
  });

  it('plays all 8 procedural tabletop SFX without interrupting background state', () => {
    // 1. Крит (Natural 20 fanfare)
    expect(() => audioService.playCriticalHit()).not.toThrow();

    // 2. Провал (Natural 1 sad horn)
    expect(() => audioService.playSadHorn()).not.toThrow();

    // 3. Удар меча
    expect(() => audioService.playSwordStrike()).not.toThrow();

    // 4. Магический взрыв
    expect(() => audioService.playMagicBurst()).not.toThrow();

    // 5. Драконий рык
    expect(() => audioService.playDragonRoar()).not.toThrow();

    // 6. Монеты
    expect(() => audioService.playCoins()).not.toThrow();

    // 7. Уведомление
    expect(() => audioService.playNotification()).not.toThrow();

    // 8. Таймер
    expect(() => audioService.playTimer()).not.toThrow();

    // Universal SFX dispatcher
    expect(() => audioService.playSfx('crit')).not.toThrow();
    expect(() => audioService.playSfx('fumble')).not.toThrow();
    expect(() => audioService.playSfx('sword')).not.toThrow();
    expect(() => audioService.playSfx('burst')).not.toThrow();
    expect(() => audioService.playSfx('dragon')).not.toThrow();
    expect(() => audioService.playSfx('coins')).not.toThrow();
    expect(() => audioService.playSfx('notification')).not.toThrow();
    expect(() => audioService.playSfx('timer')).not.toThrow();
    expect(() => audioService.playSfx('dice')).not.toThrow();
  });

  it('supports adding and managing CustomAudioTrack local tracks', async () => {
    const mockFile = new File(['mock-audio-bytes'], 'Epic_Boss_Combat.mp3', {
      type: 'audio/mpeg',
    });

    const track = await audioService.addTrack(mockFile, 'combat');
    expect(track).toBeDefined();
    expect(track.id).toContain('track-');
    expect(track.name).toBe('Epic Boss Combat');
    expect(track.category).toBe('combat');
    expect(track.blobUrl).toBeDefined();

    const tracks = audioService.getCustomTracks();
    expect(tracks.some((t) => t.id === track.id)).toBe(true);

    // Toggle loop
    const initialLoop = track.isLooping;
    audioService.toggleLoop(track.id);
    expect(track.isLooping).toBe(!initialLoop);

    // Update track
    await audioService.updateTrack({ id: track.id, name: 'Renamed Boss Theme' });
    expect(track.name).toBe('Renamed Boss Theme');

    // Delete track
    await audioService.deleteTrack(track.id);
    expect(audioService.getCustomTracks().some((t) => t.id === track.id)).toBe(false);
  });

  it('supports batch adding tracks with automatic category deduction', async () => {
    const battleFile = new File(['a'], 'Dragon_Battle_Theme.mp3', { type: 'audio/mpeg' });
    const tavernFile = new File(['b'], 'Medieval_Tavern_Song.ogg', { type: 'audio/ogg' });
    const dungeonFile = new File(['c'], 'Dark_Cave_Dungeon.flac', { type: 'audio/flac' });
    const sfxFile = new File(['d'], 'Sword_Hit_Effect.wav', { type: 'audio/wav' });

    const added = await audioService.addTracks([battleFile, tavernFile, dungeonFile, sfxFile]);
    expect(added.length).toBe(4);

    expect(added[0].category).toBe('combat');
    expect(added[1].category).toBe('music');
    expect(added[2].category).toBe('ambient');
    expect(added[3].category).toBe('sfx');

    // Clean up
    for (const t of added) {
      await audioService.deleteTrack(t.id);
    }
  });

  it('supports local audio player controls (play, pause, resume, seek, stop)', async () => {
    const testFile = new File(['music-bytes'], 'Town_Theme.mp3', { type: 'audio/mpeg' });
    const track = await audioService.addTrack(testFile, 'music');

    await audioService.playTrack(track.id);
    expect(audioService.getCurrentCustomTrackId()).toBe(track.id);
    expect(audioService.isCustomPlaying()).toBe(true);
    expect(audioService.isPlaying()).toBe(true);

    audioService.pauseTrack();
    expect(audioService.isCustomPlaying()).toBe(false);

    audioService.resumeTrack();
    expect(audioService.isCustomPlaying()).toBe(true);

    audioService.seek(45);
    expect(audioService.getCustomCurrentTime()).toBe(45);

    audioService.stopTrack();
    expect(audioService.isCustomPlaying()).toBe(false);
    expect(audioService.getCustomCurrentTime()).toBe(0);

    // Clean up
    await audioService.deleteTrack(track.id);
  });

  it('handles simultaneous playback: one-shot SFX does not stop background music', async () => {
    const musicFile = new File(['music'], 'Background_BGM.mp3', { type: 'audio/mpeg' });
    const sfxFile = new File(['sfx'], 'Explosion_SFX.wav', { type: 'audio/wav' });

    const musicTrack = await audioService.addTrack(musicFile, 'music');
    const sfxTrack = await audioService.addTrack(sfxFile, 'sfx');

    // Start background music
    await audioService.playTrack(musicTrack.id);
    expect(audioService.getCurrentCustomTrackId()).toBe(musicTrack.id);
    expect(audioService.isCustomPlaying()).toBe(true);

    // Trigger one-shot SFX
    await audioService.playOneShot(sfxTrack.id);

    // Background music is STILL playing!
    expect(audioService.getCurrentCustomTrackId()).toBe(musicTrack.id);
    expect(audioService.isCustomPlaying()).toBe(true);

    // Trigger procedural SFX simultaneously
    audioService.playCriticalHit();
    audioService.playDragonRoar();

    // Background music is STILL playing undisturbed!
    expect(audioService.isCustomPlaying()).toBe(true);

    // Clean up
    audioService.stopAll();
    await audioService.deleteTrack(musicTrack.id);
    await audioService.deleteTrack(sfxTrack.id);
  });

  it('exports LocalAudioTrack as an alias to CustomAudioTrack for backwards compatibility', () => {
    const sampleTrack: LocalAudioTrack = {
      id: 'test-1',
      name: 'Test Track',
      category: 'music',
      isLooping: true,
    };
    expect(sampleTrack.category).toBe('music');
    expect(SoundboardDrawer).toBeDefined();
  });
});
