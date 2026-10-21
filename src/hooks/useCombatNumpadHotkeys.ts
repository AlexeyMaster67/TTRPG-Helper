import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCombatStore } from '../store/combatStore';
import { cleanRussianText } from '../utils/textUtils';
import { Combatant } from '../types/combat';

export interface QuickInputFeedback {
  text: string;
  type: 'damage' | 'heal' | 'temp_hp' | 'knockout' | 'undo' | 'redo' | 'info';
  timestamp: number;
}

// Global buffer state store for cross-component subscription (hook + HUD)
type Listener = () => void;
let globalBuffer = '';
let globalFeedback: QuickInputFeedback | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function setQuickBuffer(val: string) {
  globalBuffer = val;
  notify();
}

export function setQuickFeedback(fb: QuickInputFeedback | null) {
  globalFeedback = fb;
  notify();
}

export function useCombatNumpadState() {
  const [buffer, setBuffer] = useState(globalBuffer);
  const [feedback, setFeedback] = useState<QuickInputFeedback | null>(globalFeedback);

  useEffect(() => {
    const l = () => {
      setBuffer(globalBuffer);
      setFeedback(globalFeedback);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return { buffer, feedback };
}

/**
 * Hook that listens to Numpad and Keyboard shortcuts for rapid combat actions without mouse:
 * - ArrowUp / ArrowDown: cycle selected combatant
 * - Digits 0-9 & Numpad 0-9: quick number buffer
 * - Minus (-) / NumpadSubtract: Damage operation
 * - Plus (+) / NumpadAdd: Healing operation
 * - Slash (/) / NumpadDivide: Temp HP operation
 * - Enter / NumpadEnter: Execute operation on selected combatant
 * - Delete / X: Knockout (0 HP) / Death toggle
 * - Backspace: Delete character from buffer
 * - Escape: Clear buffer
 * - Ctrl+Z: Undo action
 * - Ctrl+Y / Ctrl+Shift+Z: Redo action
 */
export function useCombatNumpadHotkeys() {
  const {
    combatants,
    currentTurnIndex,
    inspectedCombatantId,
    setInspectedCombatantId,
    applyDamage,
    applyHealing,
    applyTempHp,
    updateCombatant,
    undoLastAction,
    redoLastAction,
  } = useCombatStore();

  const activeTarget: Combatant | null = useMemo(() => {
    if (combatants.length === 0) return null;
    if (inspectedCombatantId) {
      const found = combatants.find((c) => c.id === inspectedCombatantId);
      if (found) return found;
    }
    return combatants[currentTurnIndex] || combatants[0] || null;
  }, [combatants, inspectedCombatantId, currentTurnIndex]);

  const showFeedback = useCallback((text: string, type: QuickInputFeedback['type']) => {
    setQuickFeedback({ text, type, timestamp: Date.now() });
    setTimeout(() => {
      if (globalFeedback?.text === text) {
        setQuickFeedback(null);
      }
    }, 2800);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // 1. Strict input isolation: do not intercept inside inputs, textareas, selects or contenteditable
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl) {
        const tag = activeEl.tagName.toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || activeEl.isContentEditable) {
          return;
        }
      }

      // 2. Undo / Redo engine (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
      if (e.ctrlKey || e.metaKey) {
        if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
          e.preventDefault();
          undoLastAction();
          showFeedback('↩️ Действие отменено (Ctrl+Z)', 'undo');
          return;
        }
        if (((e.key === 'z' || e.key === 'Z') && e.shiftKey) || e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redoLastAction();
          showFeedback('↪️ Действие возвращено (Ctrl+Y)', 'redo');
          return;
        }
      }

      if (combatants.length === 0) return;

      // Current index in queue
      const currentIdx = activeTarget ? combatants.findIndex((c) => c.id === activeTarget.id) : currentTurnIndex;

      // 3. Arrow Up / Down navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIdx = currentIdx <= 0 ? combatants.length - 1 : currentIdx - 1;
        const nextTarget = combatants[nextIdx];
        if (nextTarget) {
          setInspectedCombatantId(nextTarget.id);
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = currentIdx >= combatants.length - 1 ? 0 : currentIdx + 1;
        const nextTarget = combatants[nextIdx];
        if (nextTarget) {
          setInspectedCombatantId(nextTarget.id);
        }
        return;
      }

      // 4. Knockout / Death Toggle (Delete or X)
      if (e.key === 'Delete' || e.key === 'x' || e.key === 'X' || e.key === 'ч' || e.key === 'Ч') {
        // If buffer is currently being typed with numbers, don't trigger knockout unless empty
        if (globalBuffer.trim().length === 0 && activeTarget) {
          e.preventDefault();
          const targetName = cleanRussianText(activeTarget.nameRu || activeTarget.name);

          if (activeTarget.hp > 0) {
            // Knockout -> 0 HP & dying
            updateCombatant(activeTarget.id, {
              hp: 0,
              isDying: true,
              isDead: false,
            });
            showFeedback(`💀 ${targetName} без сознания (0 ОЗ)`, 'knockout');
          } else if (!activeTarget.isDead) {
            // Already 0 HP -> Mark Dead
            updateCombatant(activeTarget.id, {
              hp: 0,
              isDying: false,
              isDead: true,
            });
            showFeedback(`☠️ ${targetName} погиб!`, 'knockout');
          } else {
            // Revive with 1 HP
            updateCombatant(activeTarget.id, {
              hp: 1,
              isDying: false,
              isDead: false,
            });
            showFeedback(`✨ ${targetName} возвращён в строй (1 ОЗ)`, 'heal');
          }
          return;
        }
      }

      // 5. Escape clears buffer
      if (e.key === 'Escape') {
        if (globalBuffer.length > 0) {
          e.preventDefault();
          setQuickBuffer('');
        }
        return;
      }

      // 6. Backspace removes last character
      if (e.key === 'Backspace') {
        if (globalBuffer.length > 0) {
          e.preventDefault();
          setQuickBuffer(globalBuffer.slice(0, -1));
        }
        return;
      }

      // 7. Operations input: +, -, /
      const isMinus = e.key === '-' || e.code === 'NumpadSubtract' || e.key === 'Subtract';
      const isPlus = e.key === '+' || e.code === 'NumpadAdd' || e.key === 'Add';
      const isSlash = e.key === '/' || e.code === 'NumpadDivide' || e.key === 'Divide';

      if (isMinus) {
        e.preventDefault();
        // If buffer already has a sign, toggle or replace
        const cleaned = globalBuffer.replace(/[+\-/]/g, '');
        setQuickBuffer(`-${cleaned}`);
        return;
      }

      if (isPlus) {
        e.preventDefault();
        const cleaned = globalBuffer.replace(/[+\-/]/g, '');
        setQuickBuffer(`+${cleaned}`);
        return;
      }

      if (isSlash) {
        e.preventDefault();
        const cleaned = globalBuffer.replace(/[+\-/]/g, '');
        setQuickBuffer(`/${cleaned}`);
        return;
      }

      // 8. Digits: 0-9 and Numpad0-Numpad9
      if (/^[0-9]$/.test(e.key) || /^Numpad[0-9]$/.test(e.code)) {
        e.preventDefault();
        const digit = e.key.replace(/^Numpad/, '');
        if (globalBuffer.length < 5) {
          setQuickBuffer(`${globalBuffer}${digit}`);
        }
        return;
      }

      // 9. Enter or NumpadEnter: Execute operation
      if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        if (!activeTarget || globalBuffer.trim().length === 0) return;
        e.preventDefault();

        const currentBuf = globalBuffer.trim();
        const targetName = cleanRussianText(activeTarget.nameRu || activeTarget.name);

        // Check operation type
        let op: 'damage' | 'heal' | 'temp_hp' = 'damage'; // default to damage
        if (currentBuf.includes('+')) op = 'heal';
        else if (currentBuf.includes('/')) op = 'temp_hp';
        else if (currentBuf.includes('-')) op = 'damage';

        const digitsMatch = currentBuf.match(/\d+/);
        const amount = digitsMatch ? parseInt(digitsMatch[0], 10) : 0;

        if (amount > 0) {
          if (op === 'damage') {
            applyDamage(activeTarget.id, amount);
            showFeedback(`💥 -${amount} ОЗ урона по ${targetName}`, 'damage');
          } else if (op === 'heal') {
            applyHealing(activeTarget.id, amount);
            showFeedback(`💚 +${amount} ОЗ исцеления для ${targetName}`, 'heal');
          } else if (op === 'temp_hp') {
            applyTempHp(activeTarget.id, amount);
            showFeedback(`🛡️ +${amount} врем. ОЗ для ${targetName}`, 'temp_hp');
          }
        }

        setQuickBuffer('');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTarget,
    combatants,
    currentTurnIndex,
    setInspectedCombatantId,
    applyDamage,
    applyHealing,
    applyTempHp,
    updateCombatant,
    undoLastAction,
    redoLastAction,
    showFeedback,
  ]);

  return { activeTarget };
}
