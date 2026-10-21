import { create } from 'zustand';
import { Dice2dRollData } from '../components/dice/Dice2dRollCard';
import { broadcastService } from '../services/broadcastService';
import { useDice3dStore } from './dice3dStore';

interface DiceAnimationState {
  activeRoll: Dice2dRollData | null;
  autoDismissMs: number;
  triggerRoll: (data: Dice2dRollData, shouldBroadcast?: boolean) => void;
  clearRoll: () => void;
}

export const useDiceAnimationStore = create<DiceAnimationState>((set) => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    activeRoll: null,
    autoDismissMs: 5000,

    triggerRoll: (data: Dice2dRollData, shouldBroadcast = true) => {
      const isSecret = useDice3dStore.getState().isSecretRoll;
      const rollWithId: Dice2dRollData = {
        ...data,
        id: data.id || crypto.randomUUID(),
      };

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      set({ activeRoll: rollWithId });

      // Auto-dismiss after 5 seconds
      timer = setTimeout(() => {
        set({ activeRoll: null });
        timer = null;
      }, 5000);

      // Broadcast to player screen if not a secret DM roll
      if (shouldBroadcast && !isSecret) {
        broadcastService.send({
          type: 'BROADCAST_ROLL',
          payload: {
            id: rollWithId.id!,
            title: rollWithId.title || (rollWithId.rollerName ? `${rollWithId.rollerName}: Бросок` : 'Бросок'),
            formula: rollWithId.subtitle || '',
            resultDisplay: String(rollWithId.total),
            total: rollWithId.total,
            damageType: rollWithId.damageType,
            isCritical: rollWithId.isNat20,
            isCriticalMiss: rollWithId.isNat1,
            timestamp: Date.now(),
            dice2d: rollWithId,
          },
        });
      }
    },

    clearRoll: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      set({ activeRoll: null });
    },
  };
});
