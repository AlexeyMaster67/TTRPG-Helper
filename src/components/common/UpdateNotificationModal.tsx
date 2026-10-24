import React, { useEffect } from 'react';
import { X, Download, ArrowRight, Calendar, HardDrive, Clock, EyeOff } from 'lucide-react';
import { UpdateInfo } from '../../services/updateService';
import { useTranslation } from '../../i18n';

export interface UpdateNotificationModalProps {
  isOpen: boolean;
  updateInfo: UpdateInfo | null;
  onClose: () => void;
  onDownload: () => void;
  onSkipVersion: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  isOpen,
  updateInfo,
  onClose,
  onDownload,
  onSkipVersion,
}) => {
  const { t, language } = useTranslation();
  const isRu = language === 'ru';

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !updateInfo) return null;

  const formattedDate = updateInfo.publishedAt
    ? new Date(updateInfo.publishedAt).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0f131b] border border-[#232c3d] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#232c3d] bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2
              id="update-modal-title"
              className="text-lg sm:text-xl font-bold text-white tracking-tight m-0"
            >
              {t('updates.availableTitle')}
            </h2>

            {/* Version comparison banner */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-mono px-2.5 py-1 rounded-md bg-white/[0.06] text-gray-300 border border-white/10 font-bold">
                {`v${updateInfo.currentVersion}`}
              </span>
              <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-mono px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                {`v${updateInfo.latestVersion}`}
              </span>

              {updateInfo.releaseName && updateInfo.releaseName !== `v${updateInfo.latestVersion}` && (
                <span className="text-gray-400 font-medium truncate max-w-xs">
                  ({updateInfo.releaseName})
                </span>
              )}
            </div>

            {/* Meta info: Date & Size */}
            <div className="flex items-center gap-4 text-xs text-gray-400 pt-0.5">
              {formattedDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{formattedDate}</span>
                </div>
              )}
              {updateInfo.assetSizeMb && (
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                  <span>{updateInfo.assetSizeMb}</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Changelog */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {t('updates.releaseNotes')}
          </div>

          {updateInfo.releaseNotes ? (
            <div className="p-4 rounded-xl bg-[#090c12] border border-[#1b2230] text-xs text-gray-300 leading-relaxed font-sans whitespace-pre-wrap max-h-64 overflow-y-auto select-text scrollbar-thin">
              {updateInfo.releaseNotes}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#090c12] border border-[#1b2230] text-xs text-gray-400 italic">
              {isRu ? 'Описание релиза отсутствует.' : 'No release notes provided.'}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-[#232c3d] bg-[#0c0f16] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkipVersion}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>{t('updates.btnSkip')}</span>
          </button>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-300 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('updates.btnLater')}</span>
            </button>

            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(16,185,129,0.3)] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{t('updates.btnDownload')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
