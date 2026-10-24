import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';

interface WBSecretBlockProps {
  title?: string;
  children: React.ReactNode;
}

export const WBSecretBlock: React.FC<WBSecretBlockProps> = ({ title, children }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const displayTitle = title || t('wb.gmSecretDefault');

  return (
    <div className="my-3 border border-amber-500/40 bg-amber-950/20 rounded-lg overflow-hidden shadow-sm">
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between px-3 py-1.5 bg-amber-900/30 border-b border-amber-500/30 cursor-pointer select-none text-xs font-semibold text-amber-300 hover:bg-amber-900/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>🔒 {displayTitle}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-amber-400/80">
          <span>{t('wb.hiddenFromPlayers')}</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </div>
      {isOpen && (
        <div className="p-3 text-sm text-zinc-300 bg-zinc-950/40 leading-relaxed font-sans">
          {children}
        </div>
      )}
    </div>
  );
};
