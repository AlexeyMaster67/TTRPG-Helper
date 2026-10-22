/**
 * Opens an external URL in the default browser.
 * Works across Tauri desktop windows (using Rust Tauri command) and regular browsers.
 */
export async function openExternal(url: string): Promise<void> {
  if (!url) return;

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_external_url', { url });
    return;
  } catch (err) {
    // If not in Tauri or command fails, fallback to window.open
    console.warn('[openExternal] Tauri command not available or failed, falling back to window.open:', err);
  }

  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.error('[openExternal] Failed to open URL:', e);
  }
}
