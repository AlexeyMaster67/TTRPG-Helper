import { BroadcastMessage } from '../types/broadcast';

type Listener = (message: BroadcastMessage) => void;

interface Envelope {
  id: string;
  senderTimestamp: number;
  message: BroadcastMessage;
}

class BroadcastService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<Listener> = new Set();
  private recentMessageIds: Set<string> = new Set();
  private isTauri: boolean = false;

  constructor() {
    // 1. Detect Tauri environment
    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      this.isTauri = true;
      this.initTauriEvents();
    }

    // 2. BroadcastChannel for browser contexts
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('dnd_ait_channel');
        this.channel.onmessage = (event: MessageEvent<Envelope | BroadcastMessage>) => {
          this.handleIncoming(event.data);
        };
      } catch (e) {
        console.warn('[BroadcastService] BroadcastChannel init error:', e);
      }
    }

    // 3. LocalStorage storage event fallback (across tabs & windows of same origin)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'dnd_ait_ipc_packet' && e.newValue) {
          try {
            const envelope: Envelope = JSON.parse(e.newValue);
            this.handleIncoming(envelope);
          } catch (err) {
            // Ignore parse errors
          }
        }
      });
    }
  }

  private async initTauriEvents() {
    try {
      const { listen } = await import('@tauri-apps/api/event');
      await listen<Envelope>('dnd_broadcast', (event) => {
        this.handleIncoming(event.payload);
      });
    } catch (e) {
      console.warn('[BroadcastService] Tauri event listen setup failed:', e);
    }
  }

  private handleIncoming(data: Envelope | BroadcastMessage | null) {
    if (!data) return;

    let message: BroadcastMessage;
    let msgId = '';

    if ('id' in data && 'message' in data) {
      msgId = data.id;
      message = data.message;
    } else {
      message = data as BroadcastMessage;
      msgId = `${message.type}_${JSON.stringify(message).length}_${Date.now()}`;
    }

    // Deduplicate within short window (1000ms)
    if (msgId && this.recentMessageIds.has(msgId)) {
      return;
    }

    if (msgId) {
      this.recentMessageIds.add(msgId);
      // Prune after 1.5s
      setTimeout(() => {
        this.recentMessageIds.delete(msgId);
      }, 1500);
    }

    this.notify(message);
  }

  public send(message: BroadcastMessage): void {
    const envelope: Envelope = {
      id: `${message.type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      senderTimestamp: Date.now(),
      message,
    };

    // Mark as seen immediately so sender window ignores its own reflected broadcast
    this.recentMessageIds.add(envelope.id);
    setTimeout(() => {
      this.recentMessageIds.delete(envelope.id);
    }, 1500);

    // 1. Send via Tauri IPC event (crosses all Tauri windows)
    if (this.isTauri) {
      import('@tauri-apps/api/event')
        .then(({ emit }) => {
          emit('dnd_broadcast', envelope).catch(() => {});
        })
        .catch(() => {});
    }

    // 2. Send via BroadcastChannel (for browser tabs)
    if (this.channel) {
      try {
        this.channel.postMessage(envelope);
      } catch (e) {
        // ignore
      }
    }

    // 3. Send via localStorage storage-event trigger
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('dnd_ait_ipc_packet', JSON.stringify(envelope));
      } catch (e) {
        // ignore
      }
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(message: BroadcastMessage): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (e) {
        console.error('[BroadcastService] Listener error:', e);
      }
    });
  }
}

export const broadcastService = new BroadcastService();
