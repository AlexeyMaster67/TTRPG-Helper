import { PartyMember, DEFAULT_SAMPLE_PARTY } from '../types/party';

export async function loadPartyFromDisk(): Promise<PartyMember[]> {
  try {
    const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    const content = await readTextFile('party.json', { baseDir: BaseDirectory.AppData });
    if (content) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to localStorage in web mode
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('dnd_ait_party');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[PartyService] localStorage load error:', e);
    }
  }

  return DEFAULT_SAMPLE_PARTY;
}

export async function savePartyToDisk(members: PartyMember[]): Promise<void> {
  const jsonStr = JSON.stringify(members, null, 2);
  try {
    const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    await writeTextFile('party.json', jsonStr, { baseDir: BaseDirectory.AppData });
  } catch {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dnd_ait_party', jsonStr);
      }
    } catch (e) {
      console.warn('[PartyService] localStorage save error:', e);
    }
  }
}
