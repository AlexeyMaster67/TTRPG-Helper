/**
 * updateService.ts
 * Production-ready update checking service for TTRPG Helper.
 * Queries GitHub Releases API with strict timeouts, rate limiting, and offline tolerance.
 */

export const CURRENT_APP_VERSION = '2.1.1';
export const GITHUB_RELEASES_LATEST_URL =
  'https://api.github.com/repos/AlexeyMaster67/TTRPG-Helper/releases/latest';

const STORAGE_KEY_LAST_CHECK = 'ttrpg_last_update_check_ts';
const STORAGE_KEY_IGNORED_VERSION = 'ttrpg_ignored_update_version';
const STORAGE_KEY_AUTO_CHECK = 'ttrpg_auto_check_updates';

const AUTO_CHECK_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours
const REQUEST_TIMEOUT_MS = 4000; // 4 seconds

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  downloadUrl: string;
  publishedAt: string;
  assetSizeMb?: string;
}

export interface CheckUpdateResult {
  success: boolean;
  isOffline?: boolean;
  error?: string;
  info?: UpdateInfo;
}

/**
 * Compare two semver strings.
 * Strips leading 'v' and pre-release identifiers for numeric comparison.
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
 */
export function compareSemver(v1: string, v2: string): number {
  const clean = (v: string) => (v || '').replace(/^v/i, '').trim();
  const normalize = (v: string) =>
    clean(v)
      .split('-')[0]
      .split('.')
      .map((part) => {
        const num = parseInt(part, 10);
        return isNaN(num) ? 0 : num;
      });

  const p1 = normalize(v1);
  const p2 = normalize(v2);

  const len = Math.max(p1.length, p2.length, 3);
  for (let i = 0; i < len; i++) {
    const num1 = p1[i] !== undefined ? p1[i] : 0;
    const num2 = p2[i] !== undefined ? p2[i] : 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Check if the user has disabled automatic update checks.
 * Defaults to true.
 */
export function isAutoCheckEnabled(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    const val = localStorage.getItem(STORAGE_KEY_AUTO_CHECK);
    if (val === null) return true;
    return val === 'true';
  } catch {
    return true;
  }
}

/**
 * Update the auto-check preference.
 */
export function setAutoCheckEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_AUTO_CHECK, String(enabled));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a specific version has been marked as ignored.
 */
export function isVersionIgnored(version: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const ignored = localStorage.getItem(STORAGE_KEY_IGNORED_VERSION);
    if (!ignored) return false;
    return ignored.replace(/^v/i, '').trim() === version.replace(/^v/i, '').trim();
  } catch {
    return false;
  }
}

/**
 * Mark a version as ignored so the modal will not be shown again for it.
 */
export function ignoreVersion(version: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_IGNORED_VERSION, version.trim());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear the ignored version.
 */
export function clearIgnoredVersion(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY_IGNORED_VERSION);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if cooldown has elapsed since last auto-check.
 */
export function canRunAutoCheck(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    const raw = localStorage.getItem(STORAGE_KEY_LAST_CHECK);
    if (!raw) return true;
    const lastCheck = parseInt(raw, 10);
    if (isNaN(lastCheck)) return true;
    return Date.now() - lastCheck >= AUTO_CHECK_COOLDOWN_MS;
  } catch {
    return true;
  }
}

/**
 * Record timestamp of a successful or attempted check.
 */
export function recordCheckTimestamp(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_LAST_CHECK, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
}

/**
 * GitHub release response shape.
 */
interface GitHubReleaseResponse {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets?: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

/**
 * Core function to query GitHub Releases API with timeout and parse release info.
 */
export async function fetchLatestRelease(options?: {
  force?: boolean;
}): Promise<CheckUpdateResult> {
  const force = options?.force ?? false;

  // 1. Check network connectivity
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      success: false,
      isOffline: true,
      error: 'No internet connection',
    };
  }

  // 2. Cooldown check for automatic requests
  if (!force && !canRunAutoCheck()) {
    return {
      success: true,
      info: {
        hasUpdate: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        releaseName: '',
        releaseNotes: '',
        downloadUrl: '',
        publishedAt: '',
      },
    };
  }

  // Record timestamp
  recordCheckTimestamp();

  // 3. Setup fetch with abort controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GITHUB_RELEASES_LATEST_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `GitHub API error: ${response.status} ${response.statusText}`,
      };
    }

    const data: GitHubReleaseResponse = await response.json();
    const remoteTag = data.tag_name || '';
    const remoteVersion = remoteTag.replace(/^v/i, '').trim();

    if (!remoteVersion) {
      return {
        success: false,
        error: 'Invalid release payload from GitHub',
      };
    }

    // Find Windows installer asset (.exe)
    let downloadUrl = data.html_url;
    let assetSizeMb: string | undefined;

    if (Array.isArray(data.assets) && data.assets.length > 0) {
      const exeAsset = data.assets.find((asset) =>
        asset.name.toLowerCase().endsWith('.exe')
      );
      if (exeAsset) {
        // Enforce official repo download URL prefix
        if (
          exeAsset.browser_download_url.startsWith(
            'https://github.com/AlexeyMaster67/TTRPG-Helper/releases/'
          )
        ) {
          downloadUrl = exeAsset.browser_download_url;
        }
        if (typeof exeAsset.size === 'number' && exeAsset.size > 0) {
          assetSizeMb = `${(exeAsset.size / (1024 * 1024)).toFixed(1)} MB`;
        }
      }
    }

    const hasUpdate = compareSemver(remoteVersion, CURRENT_APP_VERSION) > 0;

    const info: UpdateInfo = {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: remoteVersion,
      releaseName: data.name || remoteTag,
      releaseNotes: data.body || '',
      downloadUrl,
      publishedAt: data.published_at || '',
      assetSizeMb,
    };

    return {
      success: true,
      info,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === 'AbortError') {
      return {
        success: false,
        error: 'Connection timed out',
      };
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
