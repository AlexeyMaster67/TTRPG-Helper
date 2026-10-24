import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n';
import { useWBStore } from '../../store/wbStore';
import { WBFileTree } from './WBFileTree';
import { WBEditor } from './WBEditor';
import { WBPreview } from './WBPreview';
import { WBInfobox } from './WBInfobox';
import { WBGraphView } from './WBGraphView';
import { WBMapPinboard } from './WBMapPinboard';
import { WBTemplateModal } from './WBTemplateModal';
import { wbBroadcastBridge } from '../../services/wbBroadcastBridge';
import { usePartyStore } from '../../store/partyStore';
import {
  FileText,
  Network,
  Map,
  Columns,
  Eye,
  Edit3,
  Sparkles,
  Send,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
} from 'lucide-react';

export const WBWorkspace: React.FC = () => {
  const { t } = useTranslation();
  const initVault = useWBStore((s) => s.initVault);
  const vaultPath = useWBStore((s) => s.vaultPath);
  const viewMode = useWBStore((s) => s.viewMode);
  const setViewMode = useWBStore((s) => s.setViewMode);
  const editorMode = useWBStore((s) => s.editorMode);
  const setEditorMode = useWBStore((s) => s.setEditorMode);
  const activeNoteId = useWBStore((s) => s.activeNoteId);
  const notes = useWBStore((s) => s.notes);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // Initialize vault on mount if not already loaded
  useEffect(() => {
    if (!vaultPath) {
      initVault();
    }
  }, [vaultPath, initVault]);

  const activeNote = activeNoteId ? notes[activeNoteId] : null;

  const handleBroadcast = () => {
    if (!activeNote) return;
    const result = wbBroadcastBridge.broadcastNoteToPlayerDisplay(activeNote);
    if (result.success) {
      usePartyStore
        .getState()
        .showToast(
          t('wb.broadcastSuccess', {
            title: result.title,
            count: result.removedSecretsCount,
          })
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/90 shadow-sm z-20 gap-2">
        {/* Left Side: View Mode Tabs & Sidebar Toggle */}
        <div className="flex items-center gap-1.5">
          {viewMode === 'workspace' && (
            <button
              type="button"
              onClick={() => setShowLeftSidebar((v) => !v)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title={showLeftSidebar ? t('wb.hideFileList') : t('wb.showFileList')}
            >
              {showLeftSidebar ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </button>
          )}

          <div className="flex items-center rounded-lg bg-zinc-950 p-0.5 border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('workspace')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
                viewMode === 'workspace'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('wb.notes')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
                viewMode === 'graph'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>{t('wb.worldGraph')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pinboard')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
                viewMode === 'pinboard'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>{t('wb.regionMap')}</span>
            </button>
          </div>
        </div>

        {/* Center: Active Note Title / Breadcrumbs */}
        {viewMode === 'workspace' && activeNote && (
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400 font-medium truncate max-w-sm">
            <span className="text-zinc-500 truncate">{activeNote.id}</span>
            <span className="text-zinc-600">/</span>
            <span className="font-bold text-amber-300 truncate">{activeNote.title}</span>
          </div>
        )}

        {/* Right Side: Editor Mode, Templates, Broadcast */}
        <div className="flex items-center gap-2">
          {viewMode === 'workspace' && (
            <>
              {/* Editor Mode Toggles */}
              <div className="flex items-center rounded-lg bg-zinc-950 p-0.5 border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setEditorMode('edit')}
                  className={`p-1.5 rounded transition-colors ${
                    editorMode === 'edit'
                      ? 'bg-zinc-800 text-amber-300 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={t('wb.editorOnly')}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('split')}
                  className={`p-1.5 rounded transition-colors ${
                    editorMode === 'split'
                      ? 'bg-zinc-800 text-amber-300 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={t('wb.splitView')}
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('preview')}
                  className={`p-1.5 rounded transition-colors ${
                    editorMode === 'preview'
                      ? 'bg-zinc-800 text-amber-300 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={t('wb.previewOnly')}
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Template Modal Button */}
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{t('wb.templates')}</span>
              </button>

              {/* Broadcast Button */}
              <button
                type="button"
                onClick={handleBroadcast}
                disabled={!activeNote}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-40"
                title={t('wb.broadcastToPlayers')}
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{t('wb.toPlayers')}</span>
              </button>

              {/* Toggle Right Infobox */}
              <button
                type="button"
                onClick={() => setShowRightSidebar((v) => !v)}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                title={showRightSidebar ? t('wb.hideInfobox') : t('wb.showInfobox')}
              >
                {showRightSidebar ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRight className="w-4 h-4" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'graph' ? (
          <WBGraphView />
        ) : viewMode === 'pinboard' ? (
          <WBMapPinboard />
        ) : (
          <>
            {/* Left File Tree Sidebar */}
            {showLeftSidebar && <WBFileTree />}

            {/* Central Editor / Preview Area */}
            <div className="flex-1 flex overflow-hidden relative">
              {activeNote ? (
                <>
                  {editorMode === 'edit' && (
                    <div className="w-full h-full">
                      <WBEditor />
                    </div>
                  )}

                  {editorMode === 'preview' && (
                    <div className="w-full h-full overflow-y-auto p-6 md:p-8 bg-zinc-950/80">
                      <div className="max-w-3xl mx-auto">
                        <WBPreview />
                      </div>
                    </div>
                  )}

                  {editorMode === 'split' && (
                    <div className="flex w-full h-full divide-x divide-zinc-800">
                      <div className="w-1/2 h-full">
                        <WBEditor />
                      </div>
                      <div className="w-1/2 h-full overflow-y-auto p-6 bg-zinc-950/60">
                        <div className="max-w-2xl mx-auto">
                          <WBPreview />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-center p-8 text-zinc-500">
                  <FileText className="w-12 h-12 text-zinc-700 mb-2" />
                  <p className="text-sm">{t('wb.noNoteSelected')}</p>
                </div>
              )}
            </div>

            {/* Right Infobox Sidebar */}
            {showRightSidebar && activeNote && <WBInfobox />}
          </>
        )}
      </div>

      {/* Template Modal */}
      <WBTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />
    </div>
  );
};
