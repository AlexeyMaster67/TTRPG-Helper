import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Swords,
  Sparkles,
  Backpack,
  User,
  QrCode,
  FileUp,
  Volume2,
  VolumeX,
  ChevronDown,
  Plus,
  Moon,
  Flame,
  X,
} from 'lucide-react';
import { usePartyStore } from '../../store/partyStore';
import { audioService } from '../../services/audioService';
import { importCharacterFromTtrpgh } from '../../services/ttrpghFormat';
import { QrCharacterModal } from '../party/QrCharacterModal';
import { ShortRestModal } from '../party/ShortRestModal';
import { CharacterBuilderModal } from '../party/CharacterBuilderModal';
import { MobileFloatingDice } from './MobileFloatingDice';

// Tab components
import { MobileMainTab } from './tabs/MobileMainTab';
import { MobileCombatTab } from './tabs/MobileCombatTab';
import { MobileSpellsTab } from './tabs/MobileSpellsTab';
import { MobileEquipmentTab } from './tabs/MobileEquipmentTab';
import { MobileCharacterTab } from './tabs/MobileCharacterTab';

interface MobileCompanionViewProps {
  // Desktop mode switch removed as requested by user
}

export function MobileCompanionView({}: MobileCompanionViewProps = {}) {
  const {
    members,
    addMember,
    loadParty,
    openShortRestModal,
    openQrModal,
    openCharacterBuilder,
    longRest,
    showToast,
  } = usePartyStore();

  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'main' | 'combat' | 'spells' | 'equipment' | 'character'
  >('main');

  const [isCharacterPickerOpen, setIsCharacterPickerOpen] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => audioService.getIsMuted());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load party if empty
  useEffect(() => {
    if (members.length === 0) {
      loadParty();
    }
  }, [members.length, loadParty]);

  // Set default selected member
  useEffect(() => {
    if (members.length > 0 && (!selectedMemberId || !members.some((m) => m.id === selectedMemberId))) {
      setSelectedMemberId(members[0].id);
    }
  }, [members, selectedMemberId]);

  const member = members.find((m) => m.id === selectedMemberId) || members[0] || null;

  const toggleMute = () => {
    audioService.toggleMute();
    setIsMuted(audioService.getIsMuted());
  };

  const handleCreateDefaultCharacter = () => {
    addMember({
      name: 'Новый герой',
      characterClass: 'Воин',
      species: 'Человек',
      level: 1,
      ac: 16,
      maxHp: 12,
      currentHp: 12,
      tempHp: 0,
      initBonus: 1,
      speed: '30 фт.',
      stats: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 8 },
      weapons: [
        {
          id: `w-${Date.now()}`,
          name: 'Длинный меч',
          attackBonus: '+5',
          damage: '1d8+3',
          damageType: 'Рубящий',
          mastery: 'Задевание',
        },
      ],
    });
    showToast('Создан начальный персонаж');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importCharacterFromTtrpgh(content);
        addMember(imported);
        setSelectedMemberId(imported.id);
        showToast(`Персонаж ${imported.name} успешно импортирован!`);
      } catch {
        showToast('Ошибка при чтении файла .ttrpgh');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!member) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6 select-none font-sans text-center">
        <User className="w-16 h-16 text-stone-600 mb-4" />
        <h1 className="text-xl font-black text-stone-100 mb-2">Герои не найдены</h1>
        <p className="text-sm text-stone-400 max-w-sm mb-6">
          В отряде пока нет персонажей. Создайте нового героя через конструктор D&D 2024 или импортируйте файл .ttrpgh.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            onClick={openCharacterBuilder}
            className="w-full min-h-[48px] rounded-xl bg-gold hover:bg-gold-light text-canvas font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-gold/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Конструктор героя</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[48px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <FileUp className="w-4 h-4 text-emerald-400" />
            <span>Импорт .ttrpgh</span>
          </button>

          <button
            onClick={handleCreateDefaultCharacter}
            className="w-full min-h-[48px] rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800 font-medium text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Быстрый шаблон (Воин)</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ttrpgh,.json"
          onChange={handleFileImport}
          className="hidden"
        />

        <CharacterBuilderModal />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 h-[100dvh] w-full flex flex-col overflow-hidden bg-stone-950 text-stone-100 font-sans select-none antialiased">
      {/* ========================================================================= */}
      {/* TOP COMPANION HEADER (Sticky)                                             */}
      {/* ========================================================================= */}
      <header className="flex-shrink-0 z-30 bg-[#12161f]/95 backdrop-blur-md border-b border-[#2d3844] px-3 py-2 flex items-center justify-between shadow-lg">
        {/* Hero Selector & Identity */}
        <div
          onClick={() => setIsCharacterPickerOpen(!isCharacterPickerOpen)}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group pr-2"
        >
          <div
            className="w-9 h-9 rounded-full border-2 border-gold/70 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-gold-glow overflow-hidden bg-cover bg-center active:scale-95 transition-all"
            style={{
              backgroundColor: member.color || '#10B981',
              backgroundImage: member.avatarUrl ? `url(${member.avatarUrl})` : undefined,
            }}
          >
            {!member.avatarUrl && member.name.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="font-black text-sm text-white truncate tracking-tight group-hover:text-gold-light">
                {member.name}
              </h1>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gold shrink-0" />
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gold/15 text-gold-light border border-gold/30 shrink-0">
                {member.level || 1} ур.
              </span>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium truncate">
              {member.characterClass || 'Искатель'} • {member.species || 'Человек'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick QR Code Modal Action */}
          <button
            onClick={() => openQrModal(member.id)}
            className="h-8 px-2.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 active:scale-95 text-emerald-300 border border-emerald-600/70 text-xs font-bold flex items-center gap-1 transition-all touch-manipulation shadow-sm"
            title="Оффлайн QR-код персонажа"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px]">QR</span>
          </button>

          {/* Quick Rest Action */}
          <button
            onClick={() => openShortRestModal(member.id)}
            className="w-8 h-8 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 flex items-center justify-center border border-amber-600/60 transition-all active:scale-95 touch-manipulation"
            title="Короткий отдых (1ч)"
          >
            <Flame className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={() => {
              longRest();
              showToast('Долгий отдых завершен: полное исцеление и восстановление ячеек!');
            }}
            className="w-8 h-8 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 flex items-center justify-center border border-blue-600/60 transition-all active:scale-95 touch-manipulation"
            title="Долгий отдых (8ч)"
          >
            <Moon className="w-4 h-4 text-blue-400" />
          </button>

          {/* Mute Toggle */}
          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 flex items-center justify-center border border-stone-700 transition-all active:scale-95 touch-manipulation"
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Hero Switcher Dropdown */}
      {isCharacterPickerOpen && (
        <div className="bg-[#171c23] border-b border-[#2d3844] p-3 shadow-xl z-20 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Герои отряда
            </span>
            <button
              onClick={() => setIsCharacterPickerOpen(false)}
              className="text-xs text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {members.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedMemberId(m.id);
                  setIsCharacterPickerOpen(false);
                }}
                className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                  m.id === member.id
                    ? 'bg-gold/15 border-gold text-white font-bold'
                    : 'bg-[#101419] border-[#2b3540] text-gray-300 hover:border-gold/50'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full border border-gold/50 flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden bg-cover bg-center"
                  style={{
                    backgroundColor: m.color || '#10B981',
                    backgroundImage: m.avatarUrl ? `url(${m.avatarUrl})` : undefined,
                  }}
                >
                  {!m.avatarUrl && m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs truncate">{m.name}</span>
                    <span className="text-[10px] font-mono text-gold-light">{m.level} ур.</span>
                  </div>
                  <span className="text-[10px] text-gray-400 block truncate">
                    {m.characterClass || 'Искатель'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Character Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2d3844]">
            <button
              onClick={() => {
                setIsCharacterPickerOpen(false);
                openCharacterBuilder();
              }}
              className="min-h-[38px] px-3 rounded-xl bg-gold/20 hover:bg-gold/30 text-gold-light border border-gold/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Создать (Визард)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[38px] px-3 rounded-xl bg-[#101419] hover:bg-[#1f2732] text-gray-300 border border-[#2b3540] text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <FileUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Импорт .ttrpgh</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ttrpgh,.json"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* ACTIVE TAB RENDER                                                         */}
      {/* ========================================================================= */}
      <main
        className="flex-1 min-h-0 w-full max-w-2xl mx-auto overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 pb-36 overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {activeTab === 'main' && <MobileMainTab member={member} />}
        {activeTab === 'combat' && <MobileCombatTab member={member} />}
        {activeTab === 'spells' && <MobileSpellsTab member={member} />}
        {activeTab === 'equipment' && <MobileEquipmentTab member={member} />}
        {activeTab === 'character' && (
          <MobileCharacterTab
            member={member}
            onSelectMember={(id) => setSelectedMemberId(id)}
          />
        )}
      </main>

      {/* Floating D20 Button */}
      <MobileFloatingDice characterName={member.name} />

      {/* ========================================================================= */}
      {/* BOTTOM NAVIGATION BAR (Docked at bottom)                                  */}
      {/* ========================================================================= */}
      <nav className="flex-shrink-0 z-40 bg-[#12161f]/95 backdrop-blur-md border-t border-[#2d3844] flex items-center justify-around h-16 px-1 safe-area-pb shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('main')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all touch-manipulation min-h-[48px] ${
            activeTab === 'main'
              ? 'text-gold font-bold scale-105'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Heart className={`w-5 h-5 mb-0.5 ${activeTab === 'main' ? 'text-gold fill-gold/20' : ''}`} />
          <span className="text-[11px] tracking-tight">Главная</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('combat')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all touch-manipulation min-h-[48px] ${
            activeTab === 'combat'
              ? 'text-amber-400 font-bold scale-105'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Swords className={`w-5 h-5 mb-0.5 ${activeTab === 'combat' ? 'text-amber-400' : ''}`} />
          <span className="text-[11px] tracking-tight">Бой</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('spells')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all touch-manipulation min-h-[48px] ${
            activeTab === 'spells'
              ? 'text-purple-400 font-bold scale-105'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sparkles className={`w-5 h-5 mb-0.5 ${activeTab === 'spells' ? 'text-purple-400' : ''}`} />
          <span className="text-[11px] tracking-tight">Магия</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('equipment')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all touch-manipulation min-h-[48px] ${
            activeTab === 'equipment'
              ? 'text-blue-400 font-bold scale-105'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Backpack className={`w-5 h-5 mb-0.5 ${activeTab === 'equipment' ? 'text-blue-400' : ''}`} />
          <span className="text-[11px] tracking-tight">Снаряжение</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('character')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all touch-manipulation min-h-[48px] ${
            activeTab === 'character'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <User className={`w-5 h-5 mb-0.5 ${activeTab === 'character' ? 'text-emerald-400' : ''}`} />
          <span className="text-[11px] tracking-tight">Герой & QR</span>
        </button>
      </nav>

      {/* Global Modals for Mobile */}
      <QrCharacterModal />
      <ShortRestModal />
      <CharacterBuilderModal />
    </div>
  );
}

export default MobileCompanionView;
