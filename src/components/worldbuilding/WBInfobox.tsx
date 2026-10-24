import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { useWBStore } from '../../store/wbStore';
import { WBEntityType } from '../../types/wbmd';
import {
  User,
  MapPin,
  Shield,
  Scroll,
  BookOpen,
  Link as LinkIcon,
  Plus,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';

export const WBInfobox: React.FC = () => {
  const { t } = useTranslation();
  const activeNoteId = useWBStore((s) => s.activeNoteId);
  const notes = useWBStore((s) => s.notes);
  const activeNoteMeta = useWBStore((s) => s.activeNoteMeta);
  const updateActiveMeta = useWBStore((s) => s.updateActiveMeta);
  const graphIndex = useWBStore((s) => s.graphIndex);
  const selectNote = useWBStore((s) => s.selectNote);
  const setActiveTagFilter = useWBStore((s) => s.setActiveTagFilter);

  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const activeNote = activeNoteId ? notes[activeNoteId] : null;
  if (!activeNote) return null;

  const backlinks = graphIndex?.backlinksMap[activeNote.id] || graphIndex?.backlinksMap[activeNote.title] || [];

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateActiveMeta({ type: e.target.value as WBEntityType });
  };

  const handleAddCustomField = () => {
    if (!newKey.trim()) return;
    const current = activeNoteMeta.custom_fields || {};
    updateActiveMeta({
      custom_fields: {
        ...current,
        [newKey.trim()]: newVal.trim(),
      },
    });
    setNewKey('');
    setNewVal('');
    setIsEditingCustom(false);
  };

  const handleRemoveCustomField = (key: string) => {
    const current = { ...(activeNoteMeta.custom_fields || {}) };
    delete current[key];
    updateActiveMeta({ custom_fields: current });
  };

  const getTypeIcon = (type?: WBEntityType) => {
    switch (type) {
      case 'npc':
        return <User className="w-4 h-4 text-purple-400" />;
      case 'location':
        return <MapPin className="w-4 h-4 text-emerald-400" />;
      case 'faction':
        return <Shield className="w-4 h-4 text-amber-400" />;
      case 'quest':
        return <Scroll className="w-4 h-4 text-blue-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 text-zinc-200 overflow-y-auto w-72 select-none">
      {/* Header Info Banner */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getTypeIcon(activeNoteMeta.type)}
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            {t('wb.infoboxTitle')}
          </span>
        </div>
        <select
          value={activeNoteMeta.type || 'lore'}
          onChange={handleTypeChange}
          className="bg-zinc-800 text-amber-400 text-xs px-2 py-0.5 rounded border border-zinc-700 focus:outline-none"
        >
          <option value="npc">{t('wb.entityNpc')}</option>
          <option value="location">{t('wb.entityLocation')}</option>
          <option value="faction">{t('wb.entityFaction')}</option>
          <option value="quest">{t('wb.entityQuest')}</option>
          <option value="item">{t('wb.entityItem')}</option>
          <option value="session">{t('wb.entitySession')}</option>
          <option value="lore">{t('wb.entityLore')}</option>
        </select>
      </div>

      <div className="p-3 space-y-4">
        {/* Avatar / Portrait */}
        {activeNoteMeta.avatar ? (
          <div className="relative group rounded-lg overflow-hidden border border-zinc-700 max-h-48">
            <img
              src={activeNoteMeta.avatar}
              alt={activeNoteMeta.title}
              className="w-full h-auto object-cover"
            />
            <button
              type="button"
              onClick={() => updateActiveMeta({ avatar: undefined })}
              className="absolute top-2 right-2 p-1 bg-black/70 rounded-md text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              title={t('wb.delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="p-3 border border-dashed border-zinc-750 rounded-lg text-center bg-zinc-950/30">
            <ImageIcon className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
            <input
              type="text"
              placeholder={t('wb.avatarPlaceholder')}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  updateActiveMeta({ avatar: e.target.value.trim() });
                }
              }}
              className="w-full text-[11px] bg-zinc-800/80 border border-zinc-700 rounded px-2 py-1 text-zinc-200 focus:outline-none"
            />
          </div>
        )}

        {/* Core Attributes */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-1">
            <span>{t('wb.infoboxTitle')}</span>
            <span className="font-semibold text-zinc-200">{activeNoteMeta.title}</span>
          </div>

          {activeNoteMeta.status !== undefined && (
            <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-1">
              <span>{t('wb.fieldStatus')}</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-mono text-[11px]">
                {activeNoteMeta.status}
              </span>
            </div>
          )}

          {activeNoteMeta.cr !== undefined && (
            <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-1">
              <span>{t('wb.fieldCr')}</span>
              <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 font-mono text-[11px] border border-red-800/40">
                CR {activeNoteMeta.cr}
              </span>
            </div>
          )}

          {activeNoteMeta.location && (
            <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-1">
              <span>{t('wb.fieldLocation')}</span>
              <span className="text-emerald-400 font-medium">{activeNoteMeta.location}</span>
            </div>
          )}

          {activeNoteMeta.faction && (
            <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-1">
              <span>{t('wb.fieldFaction')}</span>
              <span className="text-amber-400 font-medium">{activeNoteMeta.faction}</span>
            </div>
          )}
        </div>

        {/* Custom Fields */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {t('wb.propertiesHeader')}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingCustom((prev) => !prev)}
              className="text-amber-400 hover:text-amber-300 p-0.5 rounded hover:bg-zinc-800"
              title={t('wb.addProperty')}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isEditingCustom && (
            <div className="p-2 mb-2 bg-zinc-950 rounded border border-zinc-700 space-y-1.5 text-xs">
              <input
                type="text"
                placeholder={t('wb.propertyKeyPlaceholder')}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full bg-zinc-800 px-2 py-1 rounded text-zinc-200 border border-zinc-700 focus:outline-none"
              />
              <input
                type="text"
                placeholder={t('wb.propertyValuePlaceholder')}
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                className="w-full bg-zinc-800 px-2 py-1 rounded text-zinc-200 border border-zinc-700 focus:outline-none"
              />
              <div className="flex justify-end gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingCustom(false)}
                  className="px-2 py-0.5 rounded text-[11px] text-zinc-400 hover:bg-zinc-800"
                >
                  {t('wb.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="px-2 py-0.5 rounded text-[11px] bg-amber-600 text-white font-medium hover:bg-amber-500"
                >
                  {t('wb.add')}
                </button>
              </div>
            </div>
          )}

          {activeNoteMeta.custom_fields && Object.keys(activeNoteMeta.custom_fields).length > 0 ? (
            <div className="space-y-1.5 text-xs">
              {Object.entries(activeNoteMeta.custom_fields).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between p-1.5 bg-zinc-950/40 rounded border border-zinc-800/80 group"
                >
                  <span className="text-zinc-400">{k}:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-zinc-200">{String(v)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(k)}
                      className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800 p-0.5 rounded"
                      title={t('wb.deleteProperty')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 italic">{t('wb.noCustomProperties')}</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
            {t('wb.tagsHeader')}
          </span>
          <div className="flex flex-wrap gap-1">
            {activeNote.tags.length > 0 ? (
              activeNote.tags.map((tTag) => (
                <button
                  key={tTag}
                  type="button"
                  onClick={() => setActiveTagFilter(tTag)}
                  className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-zinc-800 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border border-zinc-700/60 transition-colors"
                >
                  #{tTag}
                </button>
              ))
            ) : (
              <span className="text-[11px] text-zinc-500 italic">{t('wb.noTags')}</span>
            )}
          </div>
        </div>

        {/* Backlinks */}
        <div className="border-t border-zinc-800 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              {t('wb.backlinksHeader', { count: backlinks.length })}
            </span>
          </div>

          {backlinks.length > 0 ? (
            <div className="space-y-1">
              {backlinks.map((srcId) => {
                const srcNote = notes[srcId];
                const title = srcNote ? srcNote.title : srcId;
                return (
                  <button
                    key={srcId}
                    type="button"
                    onClick={() => selectNote(srcId)}
                    className="w-full flex items-center justify-between text-left p-1.5 rounded bg-zinc-950/40 hover:bg-zinc-800 text-xs text-amber-300 hover:text-amber-200 transition-colors border border-zinc-800/80"
                  >
                    <span className="truncate">{title}</span>
                    <ExternalLink className="w-3 h-3 text-zinc-500 shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 italic">{t('wb.noBacklinks')}</p>
          )}
        </div>
      </div>
    </div>
  );
};
