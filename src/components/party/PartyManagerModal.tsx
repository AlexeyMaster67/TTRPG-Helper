import React, { useState, useEffect } from 'react';
import { usePartyStore } from '../../store/partyStore';
import { PartyMember } from '../../types/party';
import {
  Users,
  Shield,
  Heart,
  Zap,
  Eye,
  Swords,
  Plus,
  Edit2,
  Trash2,
  X,
  Coins,
  CheckCircle,
  Check,
  Flame,
  Moon,
  BookOpen,
  Sparkles,
  FileDown,
  Download,
  QrCode,
} from 'lucide-react';
import { lssImportService } from '../../services/lssImportService';
import { importCharacterFromTtrpgh, downloadTtrpghFile } from '../../services/ttrpghFormat';

export const DND_CLASSES_RU = [
  'Варвар',
  'Бард',
  'Жрец',
  'Друид',
  'Воин',
  'Монах',
  'Паладин',
  'Следопыт',
  'Плут',
  'Чародей',
  'Колдун',
  'Волшебник',
  'Изобретатель',
];

export const DND_SPECIES_RU = [
  'Человек',
  'Эльф',
  'Дворф',
  'Полурослик',
  'Гном',
  'Драконорождённый',
  'Тифлинг',
  'Орк',
  'Голиаф',
  'Аасимар',
];

export const NOTE_TEMPLATES_RU = [
  'Тёмное зрение 60 фт.',
  'Сопротивление яду',
  'Стиль защиты (+1 КД)',
  'Вдохновение барда (d8)',
  'Скрытная атака (2d6)',
  'Божественная кара',
  'Всплеск действий (1/отдых)',
  'Ярость (3/день)',
  'Магическое чутьё',
];

export function PartyManagerModal() {
  const {
    members,
    treasury,
    isModalOpen,
    closeModal,
    addMember,
    updateMember,
    removeMember,
    deployPartyToCombat,
    setTreasury,
    openCharacterSheet,
    openShortRestModal,
    openCharacterBuilder,
    openQrModal,
    longRest,
  } = usePartyStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formClass, setFormClass] = useState('');
  const [formAc, setFormAc] = useState(15);
  const [formHp, setFormHp] = useState(30);
  const [formInit, setFormInit] = useState(2);
  const [formPerc, setFormPerc] = useState(13);
  const [formNotes, setFormNotes] = useState('');

  // Treasury quick editing
  const [isEditingTreasury, setIsEditingTreasury] = useState(false);
  const [editGp, setEditGp] = useState(treasury.gp);
  const [editSp, setEditSp] = useState(treasury.sp);
  const [editCp, setEditCp] = useState(treasury.cp);

  useEffect(() => {
    setEditGp(treasury.gp);
    setEditSp(treasury.sp);
    setEditCp(treasury.cp);
  }, [treasury]);

  const handleSaveTreasury = (e: React.FormEvent) => {
    e.preventDefault();
    setTreasury(editGp, editSp, editCp);
    setIsEditingTreasury(false);
  };

  const handleAddNoteTemplate = (template: string) => {
    setFormNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return template;
      if (trimmed.includes(template)) return trimmed;
      return `${trimmed}, ${template}`;
    });
  };

  const handleSelectClass = (className: string) => {
    setFormClass((prev) => {
      const match = prev.match(/\d+/);
      const level = match ? match[0] : '1';
      return `${className} ${level}`;
    });
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const processFiles = async (files: FileList | File[]) => {
    let lssCount = 0;
    let ttrpghCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const isTtrpgh =
          file.name.toLowerCase().endsWith('.ttrpgh') ||
          text.includes('"format": "ttrpgh"') ||
          text.includes('"format":"ttrpgh"');

        if (isTtrpgh) {
          const imported = importCharacterFromTtrpgh(text);
          addMember(imported);
          ttrpghCount++;
        } else {
          const fallbackName = file.name.replace(/\.json$/i, '');
          const parsed = lssImportService.parseLssJson(text, fallbackName);
          addMember(lssImportService.toPartyMember(parsed));
          lssCount++;
        }
      } catch (err) {
        console.error('Error importing character file:', err);
      }
    }

    if (ttrpghCount > 0 || lssCount > 0) {
      const msgs: string[] = [];
      if (ttrpghCount > 0) msgs.push(`Импортировано героев из .ttrpgh: ${ttrpghCount}`);
      if (lssCount > 0) msgs.push(`Импортировано из LSS: ${lssCount}`);
      setImportNotice(msgs.join(' • '));
      setTimeout(() => setImportNotice(null), 4000);
    }
  };

  const handleExportAllTtrpgh = () => {
    if (members.length === 0) return;
    for (const m of members) {
      downloadTtrpghFile(m, m.avatarUrl);
    }
    setImportNotice(`Экспортировано персонажей в .ttrpgh: ${members.length}`);
    setTimeout(() => setImportNotice(null), 3500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  if (!isModalOpen) return null;

  const startEdit = (m: PartyMember) => {
    setEditingId(m.id);
    setIsAddingNew(false);
    setFormName(m.name);
    setFormClass(m.characterClass || '');
    setFormAc(m.ac);
    setFormHp(m.maxHp);
    setFormInit(m.initBonus);
    setFormPerc(m.passivePerception || 10);
    setFormNotes(m.notes || '');
  };

  const startAdd = () => {
    setEditingId(null);
    setIsAddingNew(true);
    setFormName('');
    setFormClass('');
    setFormAc(14);
    setFormHp(28);
    setFormInit(1);
    setFormPerc(12);
    setFormNotes('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (isAddingNew) {
      addMember({
        name: formName.trim(),
        characterClass: formClass.trim(),
        ac: formAc,
        maxHp: formHp,
        initBonus: formInit,
        passivePerception: formPerc,
        speed: '30 фт.',
        color: '#10B981',
        notes: formNotes.trim(),
      });
    } else if (editingId) {
      updateMember(editingId, {
        name: formName.trim(),
        characterClass: formClass.trim(),
        ac: formAc,
        maxHp: formHp,
        initBonus: formInit,
        passivePerception: formPerc,
        notes: formNotes.trim(),
      });
    }

    setIsAddingNew(false);
    setEditingId(null);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 select-none font-sans overflow-y-auto"
    >
      <div className="w-full max-w-3xl bg-[rgba(18,22,30,0.88)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-glass-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-4 sm:p-6 text-gray-100 flex flex-col max-h-[90vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-glass bg-gold/10 border border-gold/30 text-gold shrink-0 shadow-[0_0_12px_rgba(245,185,32,0.2)]">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-100 flex items-center gap-2 flex-wrap">
                <span>Реестр отряда приключенцев</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 shrink-0">
                  {members.length} героев
                </span>
              </h2>
              <p className="text-xs text-gray-400 truncate sm:whitespace-normal">
                Постоянный состав отряда: автовысадка в бой за 1 клик с сохранением характеристик.
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-1.5 rounded-glass hover:bg-white/10 text-gray-400 hover:text-gray-100 text-sm transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Treasury & Action Banner */}
        <div className="flex items-center justify-between bg-[rgba(24,29,40,0.65)] p-3.5 rounded-glass-lg border border-[rgba(255,255,255,0.08)] flex-wrap gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-glass bg-gold/10 text-gold shrink-0 border border-gold/20">
              <Coins className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Казна отряда
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingTreasury(!isEditingTreasury)}
                  className="text-gray-400 hover:text-gold transition-colors p-0.5 cursor-pointer"
                  title="Изменить казну отряда"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>

              {isEditingTreasury ? (
                <form onSubmit={handleSaveTreasury} className="flex flex-wrap items-center gap-1.5 mt-1 text-xs font-mono">
                  <div className="flex items-center gap-1 bg-surface border border-gold rounded-glass px-2 py-0.5">
                    <input
                      type="number"
                      min="0"
                      value={editGp}
                      onChange={(e) => setEditGp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-16 min-w-[3.5rem] bg-transparent text-gold text-xs font-bold outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      title="Золотые монеты (зм)"
                    />
                    <span className="text-gold text-[10px] shrink-0 font-sans font-bold">зм</span>
                  </div>

                  <div className="flex items-center gap-1 bg-surface border border-gray-600 rounded-glass px-2 py-0.5">
                    <input
                      type="number"
                      min="0"
                      value={editSp}
                      onChange={(e) => setEditSp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-14 min-w-[3rem] bg-transparent text-gray-300 text-xs font-bold outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      title="Серебряные монеты (см)"
                    />
                    <span className="text-gray-300 text-[10px] shrink-0 font-sans font-bold">см</span>
                  </div>

                  <div className="flex items-center gap-1 bg-surface border border-amber-800 rounded-glass px-2 py-0.5">
                    <input
                      type="number"
                      min="0"
                      value={editCp}
                      onChange={(e) => setEditCp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-14 min-w-[3rem] bg-transparent text-amber-600 text-xs font-bold outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      title="Медные монеты (мм)"
                    />
                    <span className="text-amber-600 text-[10px] shrink-0 font-sans font-bold">мм</span>
                  </div>

                  <button
                    type="submit"
                    className="px-2 py-1 rounded-glass bg-[#f5b920] text-[#0c0d12] font-black text-[10px] hover:bg-[#fac742] flex items-center gap-0.5 shrink-0 cursor-pointer shadow-sm"
                    title="Сохранить казну"
                  >
                    <Check className="w-3 h-3" />
                    <span>ОК</span>
                  </button>
                </form>
              ) : (
                <div className="text-sm font-bold font-mono text-gold flex items-center gap-2 flex-wrap">
                  <span title="Золотые монеты">{treasury.gp} зм</span>
                  <span className="text-gray-400 font-normal">•</span>
                  <span title="Серебряные монеты" className="text-gray-300">{treasury.sp} см</span>
                  <span className="text-gray-400 font-normal">•</span>
                  <span title="Медные монеты" className="text-amber-600">{treasury.cp} мм</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => openShortRestModal()}
              className="px-3 py-2 rounded-glass bg-amber-950/50 border border-amber-600/70 hover:border-amber-400 text-amber-300 hover:text-amber-100 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-[0_0_12px_rgba(245,158,11,0.25)] cursor-pointer"
              title="Короткий отдых отряда (1ч): трата костей хитов и восстановление способностей"
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>Отдых 1ч</span>
            </button>

            <button
              onClick={longRest}
              className="px-3 py-2 rounded-glass bg-blue-950/50 border border-blue-600/70 hover:border-blue-400 text-blue-300 hover:text-blue-100 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-[0_0_12px_rgba(59,130,246,0.25)] cursor-pointer"
              title="Долгий отдых (8 часов): 100% ОЗ, ячейки заклинаний, сброс истощения"
            >
              <Moon className="h-3.5 w-3.5 text-blue-400" />
              <span>Отдых 8ч</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-glass bg-amber-950/40 border border-amber-700/60 hover:border-amber-500 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Импорт персонажа из открытого формата .ttrpgh или LSS JSON"
            >
              <FileDown className="h-3.5 w-3.5 text-amber-400" />
              <span>Импорт .ttrpgh</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ttrpgh,.json"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={handleExportAllTtrpgh}
              className="px-3 py-2 rounded-glass bg-gold/15 border border-gold/50 hover:bg-gold/25 text-gold-light text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Экспорт всех персонажей отряда в формат .ttrpgh"
            >
              <Download className="h-3.5 w-3.5 text-gold" />
              <span>Экспорт .ttrpgh</span>
            </button>

            <button
              onClick={() => openQrModal()}
              className="px-3 py-2 rounded-glass bg-emerald-950/40 border border-emerald-600/70 hover:border-emerald-400 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Оффлайн QR-код генератор и сканер для обмена с мобильным приложением"
            >
              <QrCode className="h-3.5 w-3.5 text-emerald-400" />
              <span>QR-обмен</span>
            </button>

            <button
              onClick={openCharacterBuilder}
              className="px-3 py-2 rounded-glass bg-gold/20 border border-gold hover:bg-gold/30 text-gold-light text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,185,32,0.25)] cursor-pointer"
              title="Пошаговый конструктор персонажей по правилам D&D 2024 (19 видов)"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span>Конструктор 2024</span>
            </button>

            <button
              onClick={startAdd}
              className="px-3 py-2 rounded-glass bg-white/5 border border-[rgba(255,255,255,0.08)] hover:border-gold/50 text-gray-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-gold" />
              <span>Добавить героя</span>
            </button>

            <button
              onClick={() => deployPartyToCombat(true)}
              className="px-4 py-2 rounded-glass bg-[#f5b920] hover:bg-[#fac742] text-[#0c0d12] font-black text-xs shadow-[0_0_18px_rgba(245,185,32,0.35)] flex items-center gap-2 transition-all cursor-pointer"
            >
              <Swords className="h-3.5 w-3.5" />
              <span>Высадить в бой</span>
            </button>
          </div>
        </div>

        {/* Import notice toast */}
        {importNotice && (
          <div className="bg-emerald-950/80 border border-emerald-600/60 rounded-sm p-2.5 px-3 flex items-center gap-2 text-xs text-emerald-200 animate-in fade-in">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{importNotice}</span>
          </div>
        )}

        {/* Datalist helpers for quick class & species autocomplete */}
        <datalist id="dnd-classes-datalist">
          {DND_CLASSES_RU.map((cls) => (
            <option key={cls} value={`${cls} 1`} />
          ))}
        </datalist>
        <datalist id="dnd-species-datalist">
          {DND_SPECIES_RU.map((sp) => (
            <option key={sp} value={sp} />
          ))}
        </datalist>

        {/* Add / Edit Character Form Modal */}
        {(isAddingNew || editingId) && (
          <form
            onSubmit={handleSaveForm}
            className="p-4 rounded-sm border border-gold/40 bg-card space-y-3.5 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <h4 className="text-xs font-bold text-gold-light">
                {isAddingNew ? '+ Новый персонаж отряда' : 'Редактирование персонажа'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingId(null);
                }}
                className="text-gray-400 hover:text-white text-xs p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-gray-400">Имя персонажа:</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Например, Эльдрих"
                  className="w-full bg-surface border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400">Класс, архетип и уровень:</label>
                <input
                  type="text"
                  list="dnd-classes-datalist"
                  value={formClass}
                  onChange={(e) => setFormClass(e.target.value)}
                  placeholder="Паладин 5 (Преданность)"
                  className="w-full bg-surface border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400">Класс доспеха (КД):</label>
                <input
                  type="number"
                  required
                  value={formAc}
                  onChange={(e) => setFormAc(parseInt(e.target.value, 10) || 10)}
                  className="w-full bg-surface border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400">Максимум хитов (ХП):</label>
                <input
                  type="number"
                  required
                  value={formHp}
                  onChange={(e) => setFormHp(parseInt(e.target.value, 10) || 10)}
                  className="w-full bg-surface border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400">Бонус инициативы (+X):</label>
                <input
                  type="number"
                  value={formInit}
                  onChange={(e) => setFormInit(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-surface border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400">Пассивное Внимание:</label>
                <input
                  type="number"
                  value={formPerc}
                  onChange={(e) => setFormPerc(parseInt(e.target.value, 10) || 10)}
                  className="w-full bg-surface border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold font-mono"
                />
              </div>
            </div>

            {/* Quick Class Selection Chips */}
            <div>
              <span className="text-[9px] text-gray-500 block mb-1">
                Быстрый выбор класса D&D 2024 / 5e:
              </span>
              <div className="flex flex-wrap gap-1 max-w-full">
                {DND_CLASSES_RU.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => handleSelectClass(cls)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-surface hover:bg-gold/20 text-gray-300 hover:text-gold border border-border-subtle transition-colors shrink-0 leading-tight"
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Character Notes and Quick Templates */}
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 flex items-center justify-between flex-wrap gap-1">
                <span>Заметки ДМа / Особенности и черты:</span>
                <span className="text-[9px] text-gray-500">Шаблоны черт (кликните для добавления):</span>
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Стиль боя, тёмное зрение, сопротивления, черты..."
                className="w-full bg-surface border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
              />
              <div className="flex flex-wrap gap-1 pt-1 max-w-full">
                {NOTE_TEMPLATES_RU.map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => handleAddNoteTemplate(tpl)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-surface hover:bg-emerald-950/60 text-gray-300 hover:text-emerald-300 border border-border-subtle hover:border-emerald-700/60 transition-colors shrink-0 leading-tight"
                  >
                    + {tpl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingId(null);
                }}
                className="px-3 py-1 rounded border border-border-subtle text-xs text-gray-400 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded bg-gold text-canvas font-bold text-xs hover:bg-gold-light"
              >
                {isAddingNew ? 'Добавить' : 'Сохранить'}
              </button>
            </div>
          </form>
        )}

        {/* Member Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-glass-lg bg-[rgba(24,29,40,0.65)] border border-[rgba(255,255,255,0.08)] hover:border-gold/50 transition-all flex flex-col justify-between space-y-3 shadow-sm hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm border border-white/20"
                    style={{ backgroundColor: m.color || '#10B981' }}
                  >
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white truncate leading-snug" title={m.name}>{m.name}</h3>
                    <p className="text-xs text-emerald-400 font-medium truncate leading-tight mt-0.5" title={m.characterClass || 'Герой'}>
                      {m.characterClass || 'Герой'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openCharacterSheet(m.id)}
                    title="Открыть интерактивный лист персонажа D&D Beyond"
                    className="px-2.5 py-1 rounded-glass bg-gold/15 hover:bg-gold/30 border border-gold/40 text-gold-light text-xs font-semibold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-gold" />
                    <span className="hidden sm:inline">Лист</span>
                  </button>
                  <button
                    onClick={() => downloadTtrpghFile(m, m.avatarUrl)}
                    title="Экспорт персонажа в .ttrpgh с внедренным токеном"
                    className="p-1 rounded-glass hover:bg-gold/20 text-gold hover:text-gold-light transition-colors cursor-pointer"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openQrModal(m.id)}
                    title="Показать оффлайн QR-код персонажа для смартфона"
                    className="p-1 rounded-glass hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => startEdit(m)}
                    title="Быстрое редактирование"
                    className="p-1 rounded-glass hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeMember(m.id)}
                    title="Удалить из отряда"
                    className="p-1 rounded-glass hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-mono">
                <div className="bg-[rgba(14,18,25,0.7)] py-1.5 px-1 rounded-glass border border-[rgba(255,255,255,0.06)] flex flex-col min-w-0">
                  <span className="text-[9px] text-gray-400 font-sans flex items-center justify-center gap-0.5 leading-tight">
                    <Shield className="h-2.5 w-2.5 text-blue-400 shrink-0" /> КД
                  </span>
                  <span className="font-bold text-gray-100 leading-tight mt-0.5 truncate">{m.ac}</span>
                </div>

                <div className="bg-[rgba(14,18,25,0.7)] py-1.5 px-1 rounded-glass border border-[rgba(255,255,255,0.06)] flex flex-col min-w-0">
                  <span className="text-[9px] text-gray-400 font-sans flex items-center justify-center gap-0.5 leading-tight">
                    <Heart className="h-2.5 w-2.5 text-emerald-400 shrink-0" /> ОЗ
                  </span>
                  <span className="font-bold text-emerald-300 leading-tight mt-0.5 truncate">{m.maxHp}</span>
                </div>

                <div className="bg-[rgba(14,18,25,0.7)] py-1.5 px-1 rounded-glass border border-[rgba(255,255,255,0.06)] flex flex-col min-w-0">
                  <span className="text-[9px] text-gray-400 font-sans flex items-center justify-center gap-0.5 leading-tight">
                    <Zap className="h-2.5 w-2.5 text-gold shrink-0" /> ИНИЦ
                  </span>
                  <span className="font-bold text-gold-light leading-tight mt-0.5 truncate">
                    {m.initBonus >= 0 ? `+${m.initBonus}` : m.initBonus}
                  </span>
                </div>

                <div className="bg-[rgba(14,18,25,0.7)] py-1.5 px-1 rounded-glass border border-[rgba(255,255,255,0.06)] flex flex-col min-w-0">
                  <span className="text-[9px] text-gray-400 font-sans flex items-center justify-center gap-0.5 leading-tight">
                    <Eye className="h-2.5 w-2.5 text-purple-400 shrink-0" /> ВНИМ
                  </span>
                  <span className="font-bold text-purple-300 leading-tight mt-0.5 truncate">{m.passivePerception || 10}</span>
                </div>
              </div>

              {m.notes && (
                <p className="text-[11px] text-gray-400 italic break-words line-clamp-2 leading-relaxed" title={m.notes}>
                  {m.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
