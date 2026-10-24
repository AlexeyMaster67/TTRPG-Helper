import { WBNote } from '../types/wbmd';
import { broadcastService } from './broadcastService';
import { sanitizeForPlayerBroadcast } from '../utils/wbMarkdownParser';
import { HandoutData } from '../types/broadcast';

class WBBroadcastBridge {
  /**
   * Broadcasts a note to the player display window.
   * Strips all GM secrets (:::secret ... :::) and reveals no spoilers.
   */
  broadcastNoteToPlayerDisplay(note: WBNote): {
    success: boolean;
    removedSecretsCount: number;
    title: string;
  } {
    const { sanitizedBody, removedSecretsCount } = sanitizeForPlayerBroadcast(note.body);

    let handoutType: HandoutData['type'] = 'scroll';
    if (note.meta.type === 'npc') handoutType = 'portrait';
    else if (note.meta.type === 'location') handoutType = 'map';
    else if (note.meta.type === 'quest') handoutType = 'decree';
    else if (note.meta.type === 'item') handoutType = 'custom';

    const payload: HandoutData = {
      id: `wbmd-${Date.now()}-${note.id}`,
      title: note.title,
      content: sanitizedBody,
      imageUrl: note.meta.avatar,
      type: handoutType,
      timestamp: Date.now(),
    };

    broadcastService.send({
      type: 'BROADCAST_HANDOUT',
      payload,
    });

    return {
      success: true,
      removedSecretsCount,
      title: note.title,
    };
  }

  /**
   * Hides active handout on player display
   */
  dismissPlayerDisplay(): void {
    broadcastService.send({
      type: 'DISMISS_HANDOUT',
    });
  }
}

export const wbBroadcastBridge = new WBBroadcastBridge();
