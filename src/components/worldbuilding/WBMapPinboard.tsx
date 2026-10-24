import React, { useState, useRef } from 'react';
import { useTranslation } from '../../i18n';
import { useWBStore } from '../../store/wbStore';
import { WBMapPin } from '../../types/wbmd';
import {
  MapPin as MapPinIcon,
  ArrowLeft,
  Upload,
  Trash2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
} from 'lucide-react';

export const WBMapPinboard: React.FC = () => {
  const { t } = useTranslation();
  const mapPins = useWBStore((s) => s.mapPins);
  const addMapPin = useWBStore((s) => s.addMapPin);
  const removeMapPin = useWBStore((s) => s.removeMapPin);
  const activeMapImage = useWBStore((s) => s.activeMapImage);
  const setActiveMapImage = useWBStore((s) => s.setActiveMapImage);
  const setViewMode = useWBStore((s) => s.setViewMode);
  const notes = useWBStore((s) => s.notes);
  const selectNote = useWBStore((s) => s.selectNote);

  const [zoom, setZoom] = useState(1);
  const [selectedPin, setSelectedPin] = useState<WBMapPin | null>(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const locationNotes = Object.values(notes).filter(
    (n) => n.meta.type === 'location' || n.id.toLowerCase().includes('локаци') || n.id.toLowerCase().includes('location')
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setActiveMapImage(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingPin) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const available = locationNotes.length > 0 ? locationNotes : Object.values(notes);
    const chosen = available[0];

    const newPin: WBMapPin = {
      id: `pin-${Date.now()}`,
      noteId: chosen ? chosen.id : '',
      title: chosen ? chosen.title : t('wb.newPinDefault'),
      x,
      y,
      color: '#10b981',
    };

    addMapPin(newPin);
    setIsPlacingPin(false);
    setSelectedPin(newPin);
  };

  return (
    <div className="relative w-full h-full bg-zinc-950 flex flex-col select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="p-2 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('workspace')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('wb.backToNotes')}</span>
          </button>

          <div className="w-[1px] h-4 bg-zinc-750 mx-1" />

          <button
            type="button"
            onClick={() => setIsPlacingPin(!isPlacingPin)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              isPlacingPin
                ? 'bg-amber-500 text-black font-bold animate-pulse'
                : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300'
            }`}
          >
            <MapPinIcon className="w-3.5 h-3.5" />
            <span>{isPlacingPin ? t('wb.clickOnMap') : t('wb.placePin')}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{activeMapImage ? t('wb.changeMap') : t('wb.selectMapImage')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-300"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-300"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-300"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Content Viewport */}
      <div className="flex-1 relative overflow-auto flex items-center justify-center p-4">
        {activeMapImage ? (
          <div
            onClick={handleMapClick}
            className={`relative max-w-full max-h-full transition-transform duration-100 ${
              isPlacingPin ? 'cursor-crosshair' : 'cursor-default'
            }`}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            <img
              src={activeMapImage}
              alt="Regional Map"
              className="max-w-none rounded-lg shadow-2xl border border-zinc-750"
            />

            {/* Render Pins */}
            {mapPins.map((pin) => (
              <div
                key={pin.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin(pin);
                }}
                className="absolute -translate-x-1/2 -translate-y-full cursor-pointer group hover:scale-125 transition-transform"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              >
                <div className="relative flex flex-col items-center">
                  <div className="px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white border border-zinc-700 shadow-md whitespace-nowrap mb-0.5">
                    {pin.title}
                  </div>
                  <MapPinIcon className="w-6 h-6 text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] fill-emerald-500/30" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-800 rounded-2xl max-w-md text-center bg-zinc-900/50">
            <Compass className="w-12 h-12 text-amber-500/60 mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-zinc-200 mb-1">
              {t('wb.noMapUploaded')}
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              {t('wb.uploadMapPrompt')}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>{t('wb.selectMapImage')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Selected Pin Modal / Card */}
      {selectedPin && (
        <div className="absolute right-4 bottom-4 z-30 w-72 p-3 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
            <div className="flex items-center gap-2 font-bold text-xs text-zinc-100">
              <MapPinIcon className="w-4 h-4 text-emerald-400" />
              <span>{selectedPin.title}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                removeMapPin(selectedPin.id);
                setSelectedPin(null);
              }}
              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-zinc-800"
              title={t('wb.deletePin')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 mb-3 text-xs">
            <label className="text-[11px] text-zinc-400 block">{t('wb.linkedNoteLabel')}</label>
            <select
              value={selectedPin.noteId}
              onChange={(e) => {
                const note = notes[e.target.value];
                setSelectedPin({
                  ...selectedPin,
                  noteId: e.target.value,
                  title: note ? note.title : selectedPin.title,
                });
                addMapPin({
                  ...selectedPin,
                  noteId: e.target.value,
                  title: note ? note.title : selectedPin.title,
                });
              }}
              className="w-full bg-zinc-950 border border-zinc-750 text-zinc-200 text-xs rounded p-1.5 focus:outline-none"
            >
              <option value="">{t('wb.selectNotePrompt')}</option>
              {Object.values(notes).map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (selectedPin.noteId) {
                  selectNote(selectedPin.noteId);
                  setViewMode('workspace');
                }
              }}
              disabled={!selectedPin.noteId}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors disabled:opacity-40"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('wb.navigateToNote', { target: '' }).replace(': ', '')}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPin(null)}
              className="px-2.5 py-1.5 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
            >
              {t('wb.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
