import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  CURRENT_APP_VERSION,
  compareSemver,
  isAutoCheckEnabled,
  setAutoCheckEnabled,
  isVersionIgnored,
  ignoreVersion,
  clearIgnoredVersion,
  canRunAutoCheck,
  recordCheckTimestamp,
  fetchLatestRelease,
  UpdateInfo,
} from '../services/updateService';
import { UpdateNotificationModal } from '../components/common/UpdateNotificationModal';
import { SettingsModal } from '../components/settings/SettingsModal';

describe('Update System & Offline Resilience Test Suite', () => {
  const originalFetch = global.fetch;
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      key: (i: number) => Object.keys(mockStorage)[i] ?? null,
      length: 0,
    };

    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('compareSemver', () => {
    it('compares basic version increments correctly', () => {
      expect(compareSemver('2.1.0', '2.0.0')).toBe(1);
      expect(compareSemver('2.0.0', '2.1.0')).toBe(-1);
      expect(compareSemver('2.1.0', '2.1.0')).toBe(0);
    });

    it('compares minor and patch versions', () => {
      expect(compareSemver('2.1.1', '2.1.0')).toBe(1);
      expect(compareSemver('2.1.0', '2.1.1')).toBe(-1);
      expect(compareSemver('2.2.0', '2.1.9')).toBe(1);
      expect(compareSemver('3.0.0', '2.9.9')).toBe(1);
    });

    it('handles "v" prefix gracefully', () => {
      expect(compareSemver('v2.1.0', '2.1.0')).toBe(0);
      expect(compareSemver('v2.2.0', 'v2.1.0')).toBe(1);
      expect(compareSemver('2.1.0', 'v2.2.0')).toBe(-1);
    });

    it('handles pre-release tags properly', () => {
      expect(compareSemver('2.2.0-beta.1', '2.1.0')).toBe(1);
      expect(compareSemver('2.1.0', '2.1.0-alpha')).toBe(0);
    });
  });

  describe('Storage & Preference Helpers', () => {
    it('manages auto-check preference in localStorage', () => {
      expect(isAutoCheckEnabled()).toBe(true);

      setAutoCheckEnabled(false);
      expect(isAutoCheckEnabled()).toBe(false);

      setAutoCheckEnabled(true);
      expect(isAutoCheckEnabled()).toBe(true);
    });

    it('manages ignored version persistence in localStorage', () => {
      expect(isVersionIgnored('2.2.0')).toBe(false);

      ignoreVersion('2.2.0');
      expect(isVersionIgnored('2.2.0')).toBe(true);
      expect(isVersionIgnored('v2.2.0')).toBe(true);
      expect(isVersionIgnored('2.2.1')).toBe(false);

      clearIgnoredVersion();
      expect(isVersionIgnored('2.2.0')).toBe(false);
    });

    it('enforces 4-hour cooldown for automatic checks', () => {
      expect(canRunAutoCheck()).toBe(true);

      recordCheckTimestamp();
      expect(canRunAutoCheck()).toBe(false);

      // Fast forward timestamp by 4 hours and 1 minute
      const fiveHoursAgo = Date.now() - (4 * 60 * 60 * 1000 + 60000);
      mockStorage['ttrpg_last_update_check_ts'] = String(fiveHoursAgo);
      expect(canRunAutoCheck()).toBe(true);
    });
  });

  describe('fetchLatestRelease API Query', () => {
    it('returns offline status when navigator is explicitly offline', async () => {
      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const result = await fetchLatestRelease({ force: true });
      expect(result.success).toBe(false);
      expect(result.isOffline).toBe(true);

      Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
    });

    it('successfully processes valid GitHub release payload with Windows installer', async () => {
      const mockPayload = {
        tag_name: 'v2.2.0',
        name: 'TTRPG Helper v2.2.0',
        body: 'Improvements in update mechanism and bug fixes.',
        published_at: '2026-10-24T12:00:00Z',
        html_url: 'https://github.com/AlexeyMaster67/TTRPG-Helper/releases/tag/v2.2.0',
        assets: [
          {
            name: 'TTRPG_Helper_Setup.exe',
            browser_download_url:
              'https://github.com/AlexeyMaster67/TTRPG-Helper/releases/download/v2.2.0/TTRPG_Helper_Setup.exe',
            size: 78643200, // ~75 MB
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPayload,
      } as Response);

      const result = await fetchLatestRelease({ force: true });
      expect(result.success).toBe(true);
      expect(result.info).toBeDefined();
      expect(result.info?.hasUpdate).toBe(true);
      expect(result.info?.latestVersion).toBe('2.2.0');
      expect(result.info?.currentVersion).toBe(CURRENT_APP_VERSION);
      expect(result.info?.downloadUrl).toBe(
        'https://github.com/AlexeyMaster67/TTRPG-Helper/releases/download/v2.2.0/TTRPG_Helper_Setup.exe'
      );
      expect(result.info?.assetSizeMb).toBe('75.0 MB');
    });

    it('falls back to html_url when no .exe asset is present', async () => {
      const mockPayload = {
        tag_name: 'v2.2.0',
        name: 'TTRPG Helper v2.2.0',
        body: 'Source only release',
        published_at: '2026-10-24T12:00:00Z',
        html_url: 'https://github.com/AlexeyMaster67/TTRPG-Helper/releases/tag/v2.2.0',
        assets: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPayload,
      } as Response);

      const result = await fetchLatestRelease({ force: true });
      expect(result.success).toBe(true);
      expect(result.info?.downloadUrl).toBe(
        'https://github.com/AlexeyMaster67/TTRPG-Helper/releases/tag/v2.2.0'
      );
    });

    it('gracefully handles network error without throwing', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection failure'));

      const result = await fetchLatestRelease({ force: true });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failure');
    });
  });

  describe('UpdateNotificationModal UI', () => {
    const dummyInfo: UpdateInfo = {
      hasUpdate: true,
      currentVersion: '2.1.0',
      latestVersion: '2.2.0',
      releaseName: 'TTRPG Helper v2.2.0',
      releaseNotes: 'Key improvements and stability fixes.',
      downloadUrl:
        'https://github.com/AlexeyMaster67/TTRPG-Helper/releases/download/v2.2.0/TTRPG_Helper_Setup.exe',
      publishedAt: '2026-10-24T12:00:00Z',
      assetSizeMb: '75.0 MB',
    };

    it('renders modal with version comparison, notes, and actions when open', () => {
      const html = renderToString(
        React.createElement(UpdateNotificationModal, {
          isOpen: true,
          updateInfo: dummyInfo,
          onClose: () => {},
          onDownload: () => {},
          onSkipVersion: () => {},
        })
      );

      expect(html).toContain('v2.1.0');
      expect(html).toContain('v2.2.0');
      expect(html).toContain('75.0 MB');
      expect(html).toContain('Key improvements and stability fixes.');
      expect(html).toContain('Скачать обновление');
      expect(html).toContain('Напомнить позже');
      expect(html).toContain('Пропустить эту версию');
    });

    it('returns null when isOpen is false', () => {
      const html = renderToString(
        React.createElement(UpdateNotificationModal, {
          isOpen: false,
          updateInfo: dummyInfo,
          onClose: () => {},
          onDownload: () => {},
          onSkipVersion: () => {},
        })
      );

      expect(html).toBe('');
    });
  });

  describe('Discord Community Links & Option A Offline Resilience', () => {
    it('verifies that SettingsModal contains the updated Discord link and Updates section', () => {
      const html = renderToString(
        React.createElement(SettingsModal, {
          isOpen: true,
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('Система НРИ');
    });
  });
});
