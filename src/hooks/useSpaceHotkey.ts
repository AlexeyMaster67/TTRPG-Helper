import { useEffect } from 'react';
import { useCombatStore } from '../store/combatStore';

/**
 * Custom hook that listens for the Space key to advance turns.
 * Strictly isolated: Space key triggers nextTurn ONLY when keyboard focus
 * is NOT inside input, textarea, select, or any contenteditable element.
 */
export function useSpaceHotkey(): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space') return;

      const activeElement = document.activeElement as HTMLElement | null;
      if (!activeElement) return;

      const tagName = activeElement.tagName.toUpperCase();
      const isInputOrControl =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT';
      
      const isContentEditable =
        activeElement.isContentEditable ||
        activeElement.getAttribute('contenteditable') === 'true';

      if (isInputOrControl || isContentEditable) {
        // Allow normal typing inside input fields
        return;
      }

      // Prevent default page scroll down and advance the combat turn
      event.preventDefault();
      useCombatStore.getState().nextTurn();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
