import React from 'react';
import { usePartyStore } from '../../store/partyStore';
import { Sparkles, X } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const toastMessage = usePartyStore((s) => s.toastNotification);
  const clearToast = usePartyStore((s) => s.clearToast);

  if (!toastMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[92%] sm:w-auto flex items-center gap-3 px-4 py-3 rounded-glass-xl bg-[rgba(18,22,30,0.92)] backdrop-blur-xl border border-[#f5b920]/40 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_20px_rgba(245,185,32,0.2)] text-gray-100 animate-in fade-in slide-in-from-top-4 duration-250 select-none"
    >
      <div className="p-1.5 rounded-full bg-[#f5b920]/20 text-[#f5b920] border border-[#f5b920]/50 shadow-[0_0_12px_rgba(245,185,32,0.35)] shrink-0">
        <Sparkles className="w-4 h-4 animate-pulse" />
      </div>
      <div className="flex-1 text-xs sm:text-sm font-medium text-gray-100 font-sans leading-snug">
        {toastMessage}
      </div>
      <button
        type="button"
        onClick={clearToast}
        aria-label="Закрыть уведомление"
        className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
