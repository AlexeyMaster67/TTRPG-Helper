import React, { useState, useEffect, useRef } from 'react';
import { broadcastService } from '../../services/broadcastService';
import { HandoutData } from '../../types/broadcast';
import {
  Scroll,
  FileText,
  ShieldAlert,
  HelpCircle,
  Award,
  Sparkles,
  Send,
  EyeOff,
  Plus,
  Trash2,
  Image as ImageIcon,
  Check,
  RotateCcw,
  BookOpen,
  Map as MapIcon,
  User,
  Monitor,
  Upload,
  X,
  Radio,
} from 'lucide-react';
import clsx from 'clsx';

interface HandoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HandoutPreset {
  id: string;
  name: string;
  type: HandoutData['type'];
  title: string;
  content: string;
  imageUrl?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRESETS: HandoutPreset[] = [
  {
    id: 'preset-letter',
    name: 'Старинное письмо',
    type: 'letter',
    title: 'Письмо из прошлого',
    content:
      'Мой старый друг,\n\nЕсли ты читаешь эти строки, значит, башня пала, а тени вернулись в долину. Не доверяй тем, кто носит серебряные амулеты с глазом. Ищи истинный ключ под тремя воронами у старого колодца к северу от руин.\n\nДа хранят тебя боги рассвета,\n— Э.',
    icon: FileText,
  },
  {
    id: 'preset-map',
    name: 'Карта подземелья',
    type: 'map',
    title: 'План подземного святилища',
    content:
      'Истлевший пергамент с начертанной схемой залов и коридоров.\nПотайной проход отмечен руной в восточной стене зала жертвоприношений.\nЛовушка с опускной решёткой в главном проходе.',
    icon: MapIcon,
  },
  {
    id: 'preset-portrait',
    name: 'Портрет персонажа',
    type: 'portrait',
    title: 'Таинственный незнакомец',
    content:
      'Высокая фигура в темном плаще с серебряным филигранным медальоном на груди.\nВнимательный пронзительный взгляд серых глаз, тонкая саркастичная улыбка.',
    icon: User,
  },
  {
    id: 'preset-scroll',
    name: 'Древний свиток',
    type: 'scroll',
    title: 'Свиток Архимага',
    content:
      'Древние руны силы, начертанные мерцающими лазурными чернилами из драконьей пыли...\nПри чтении формулы воздух вокруг наполняется запахом грозового озона и астральным сиянием.',
    icon: Sparkles,
  },
  {
    id: 'preset-decree',
    name: 'Королевский указ',
    type: 'decree',
    title: 'КОРОЛЕВСКИЙ УКАЗ',
    content:
      'ИМЕНЕМ ЕГО ВЕЛИЧЕСТВА КОРОЛЯ АЛДОРИНА III!\n\nВсем верным подданным и странникам Королевства объявляется строжайший запрет на посещение Шепчущего леса до следующего полнолуния.\n\nЛюбые лица, замеченные в общении с культом Багровой Луны, будут немедленно преданы суду Верховного Инквизитора.\n\nСкреплено королевской печатью в год 1492 Л.Д.',
    icon: Award,
  },
  {
    id: 'preset-clue',
    name: 'Записка культиста',
    type: 'clue',
    title: 'Окровавленный обрывок пергамента',
    content:
      'Семь звёзд сойдутся на исходе этой луны...\n\nКровь невинного откроет врата Бездны в полночь. Собрание у заброшенного склепа под корнями Древа Висельников. Пароль стража: «Пепел помнит всё».\n\nНе дайте чужакам помешать началу ритуала!',
    icon: ShieldAlert,
  },
  {
    id: 'preset-bounty',
    name: 'Объявление о награде',
    type: 'bounty',
    title: 'В РОЗЫСКЕ: ЖИВЫМ ИЛИ МЁРТВЫМ',
    content:
      'НАГРАДА: 500 ЗОЛОТЫХ МОНЕТ!\n\nРазыскивается опасный беглец «Одноглазый Морган».\nОбвиняется в ограблении каравана герцога, поджоге ратуши и контрабанде запретных артефактов.\n\nОсобые приметы: повязка на левом глазу, шрам через щёку, говорит с хриплым акцентом портовых трущоб.\n\nОбращаться к коменданту городской стражи.',
    icon: Scroll,
  },
  {
    id: 'preset-riddle',
    name: 'Загадка древних',
    type: 'riddle',
    title: 'Надпись на каменной плите',
    content:
      '«У меня нет голоса, но я кричу;\nНет крыльев, но я летаю;\nНет зубов, но я кусаю;\nНет рта, но я шепчу.\n\nНазови моё имя, и врата святилища откроются перед тобой...»\n\n(Ответ: Ветер)',
    icon: HelpCircle,
  },
];

const STORAGE_KEY = 'dnd_saved_handouts_v1';

export function HandoutsModal({ isOpen, onClose }: HandoutsModalProps) {
  const [activeHandout, setActiveHandout] = useState<HandoutData>({
    id: `handout-${Date.now()}`,
    title: PRESETS[0].title,
    content: PRESETS[0].content,
    type: PRESETS[0].type,
    timestamp: Date.now(),
  });

  const [savedHandouts, setSavedHandouts] = useState<HandoutData[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenPlayerWindow = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_player_window');
    } catch {
      window.open('?view=player', 'PlayerDisplay', 'width=1280,height=800');
    }
  };

  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setActiveHandout((prev) => ({
          ...prev,
          imageUrl: ev.target?.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Sync saved handouts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedHandouts));
    } catch (e) {
      console.warn('Failed to save handouts to localStorage:', e);
    }
  }, [savedHandouts]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: HandoutPreset) => {
    setActiveHandout({
      id: `handout-${Date.now()}`,
      title: preset.title,
      content: preset.content,
      type: preset.type,
      imageUrl: preset.imageUrl,
      timestamp: Date.now(),
    });
  };

  const handleBroadcast = () => {
    const payload: HandoutData = {
      ...activeHandout,
      id: activeHandout.id || `handout-${Date.now()}`,
      timestamp: Date.now(),
    };
    broadcastService.send({
      type: 'BROADCAST_HANDOUT',
      payload,
    });
    setBroadcastingId(payload.id);
  };

  const handleDismiss = () => {
    broadcastService.send({
      type: 'DISMISS_HANDOUT',
    });
    setBroadcastingId(null);
  };

  const handleSaveHandout = () => {
    const existingIndex = savedHandouts.findIndex((h) => h.id === activeHandout.id);
    if (existingIndex >= 0) {
      const updated = [...savedHandouts];
      updated[existingIndex] = { ...activeHandout, timestamp: Date.now() };
      setSavedHandouts(updated);
    } else {
      setSavedHandouts([{ ...activeHandout, timestamp: Date.now() }, ...savedHandouts]);
    }
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2000);
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedHandouts(savedHandouts.filter((h) => h.id !== id));
  };

  const isCurrentBroadcasting = broadcastingId === activeHandout.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 select-none font-sans">
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-[rgba(18,22,30,0.92)] backdrop-blur-2xl border border-[rgba(255,255,255,0.08)] rounded-glass-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[rgba(14,18,25,0.7)] border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-glass bg-gold/15 text-gold border border-gold/30 shadow-[0_0_12px_rgba(245,185,32,0.2)]">
              <Scroll className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Транслятор раздаток и тайн игрокам</span>
                {isCurrentBroadcasting && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/60 animate-pulse">
                    <Radio className="h-2.5 w-2.5 inline" />
                    <span>В ЭФИРЕ У ИГРОКОВ</span>
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400">
                Создавайте старинные письма, свитки, указы и улики и мгновенно выводите их на экран игроков
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-glass text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body: Split View (Left: Editor & Presets, Right: Live Fantasy Preview) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[rgba(255,255,255,0.08)]">
          {/* Left Column: Editor & Presets */}
          <div className="w-full md:w-1/2 flex flex-col p-4 overflow-y-auto space-y-4 bg-[rgba(14,18,25,0.5)]">
            {/* Presets Row */}
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Готовые шаблоны
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1c262f] border border-[#2e3b46] hover:border-gold/50 hover:bg-[#232f3a] text-left text-xs text-gray-200 transition-all group"
                    >
                      <Icon className="h-3.5 w-3.5 text-gold group-hover:scale-110 transition-transform flex-shrink-0" />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type Selector */}
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Стиль оформления
              </span>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'letter', label: 'Письмо' },
                    { id: 'scroll', label: 'Свиток' },
                    { id: 'map', label: 'Карта' },
                    { id: 'portrait', label: 'Портрет' },
                    { id: 'decree', label: 'Указ' },
                    { id: 'clue', label: 'Улика' },
                    { id: 'bounty', label: 'Награда' },
                    { id: 'riddle', label: 'Загадка' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveHandout({ ...activeHandout, type: t.id })}
                    className={clsx(
                      'px-2.5 py-1 rounded text-xs font-medium transition-all',
                      activeHandout.type === t.id
                        ? 'bg-gold text-black font-bold shadow-sm'
                        : 'bg-[#1c262f] text-gray-400 hover:text-gray-200 border border-[#2e3b46]'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Заголовок раздатки
              </label>
              <input
                type="text"
                value={activeHandout.title}
                onChange={(e) => setActiveHandout({ ...activeHandout, title: e.target.value })}
                placeholder="Например: Старинное письмо, Королевский указ..."
                className="w-full px-3 py-1.5 rounded bg-[#10151a] border border-[#2e3b46] focus:border-gold text-gray-100 text-xs outline-none"
              />
            </div>

            {/* Content Textarea */}
            <div className="flex-1 flex flex-col min-h-[160px]">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Текст документа
              </label>
              <textarea
                value={activeHandout.content}
                onChange={(e) => setActiveHandout({ ...activeHandout, content: e.target.value })}
                placeholder="Введите текст сообщения, письма, заклинания или улики..."
                className="flex-1 w-full px-3 py-2 rounded bg-[#10151a] border border-[#2e3b46] focus:border-gold text-gray-100 text-xs outline-none font-serif leading-relaxed resize-none"
                rows={7}
              />
            </div>

            {/* Image URL / Upload */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>Изображение (URL или файл с диска)</span>
                <span className="text-gray-500 font-normal lowercase">для карты, портрета или арта</span>
              </label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <ImageIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500" />
                  <input
                    type="text"
                    value={activeHandout.imageUrl || ''}
                    onChange={(e) =>
                      setActiveHandout({
                        ...activeHandout,
                        imageUrl: e.target.value.trim() || undefined,
                      })
                    }
                    placeholder="https://... или загрузите файл"
                    className="w-full pl-8 pr-3 py-1.5 rounded bg-[#10151a] border border-[#2e3b46] focus:border-gold text-gray-100 text-xs outline-none"
                  />
                </div>

                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelected}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  className="px-2.5 py-1.5 text-xs text-gray-200 bg-[#1c262f] hover:bg-[#25323e] border border-[#2e3b46] hover:border-gold/50 rounded flex items-center gap-1 shrink-0 transition-colors"
                  title="Загрузить изображение с компьютера"
                >
                  <Upload className="h-3.5 w-3.5 text-gold" />
                  <span>С диска</span>
                </button>

                {activeHandout.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveHandout({ ...activeHandout, imageUrl: undefined })}
                    className="px-2 py-1.5 text-xs text-gray-400 hover:text-red-400 bg-[#1c262f] border border-[#2e3b46] rounded shrink-0 flex items-center justify-center"
                    title="Удалить ссылку на изображение"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Saved Handouts Quick Bar */}
            {savedHandouts.length > 0 && (
              <div className="pt-2 border-t border-[#2e3b46]">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Сохранённые раздатки ({savedHandouts.length})
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {savedHandouts.map((saved) => (
                    <div
                      key={saved.id}
                      onClick={() => setActiveHandout(saved)}
                      className={clsx(
                        'flex items-center gap-1.5 px-2 py-1 rounded text-xs border cursor-pointer transition-all',
                        activeHandout.id === saved.id
                          ? 'bg-gold/20 text-gold-light border-gold'
                          : 'bg-[#1a232b] text-gray-300 border-[#2e3b46] hover:border-gray-500'
                      )}
                    >
                      <BookOpen className="h-3 w-3 text-gold" />
                      <span className="truncate max-w-[120px]">{saved.title}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSaved(saved.id, e)}
                        className="text-gray-500 hover:text-red-400 ml-1"
                        title="Удалить из сохранённых"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Authentic Fantasy Parchment Preview */}
          <div className="w-full md:w-1/2 flex flex-col p-4 bg-[#0d1216] overflow-y-auto items-center justify-center">
            <div className="w-full max-w-md flex flex-col items-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-gold" />
                Предпросмотр экрана игроков
              </span>

              {/* Parchment Box */}
              <div
                className={clsx(
                  'w-full rounded-sm p-6 relative shadow-2xl transition-all border-4',
                  activeHandout.type === 'decree'
                    ? 'bg-[#f4ebd9] text-[#1f170f] border-[#8a2b1f]'
                    : activeHandout.type === 'bounty'
                    ? 'bg-[#efe5cd] text-[#2c1d11] border-[#5a3a22]'
                    : activeHandout.type === 'clue'
                    ? 'bg-[#211815] text-[#d6c4b2] border-[#7a2016]'
                    : 'bg-[#fbf4e6] text-[#2a1d13] border-[#8c6b38]'
                )}
                style={{
                  boxShadow: '0 10px 35px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.06)',
                }}
              >
                {/* Decorative Heraldry / Header Symbol */}
                <div className="flex items-center justify-center gap-2 mb-3 text-center">
                  <Sparkles className="h-3.5 w-3.5 opacity-60 inline" />
                  <span className="text-sm font-serif font-black tracking-widest uppercase opacity-75">
                    {activeHandout.type === 'decree'
                      ? 'КОРОЛЕВСКИЙ УКАЗ'
                      : activeHandout.type === 'bounty'
                      ? 'РОЗЫСК И НАГРАДА'
                      : activeHandout.type === 'clue'
                      ? 'ТАЙНАЯ УЛИКА'
                      : activeHandout.type === 'riddle'
                      ? 'ДРЕВНЯЯ ЗАГАДКА'
                      : activeHandout.type === 'map'
                      ? 'КАРТА МЕСТНОСТИ'
                      : activeHandout.type === 'portrait'
                      ? 'ПОРТРЕТ ПЕРСОНАЖА'
                      : activeHandout.type === 'scroll'
                      ? 'МАГИЧЕСКИЙ СВИТОК'
                      : 'СТАРИННОЕ ПОСЛАНИЕ'}
                  </span>
                  <Sparkles className="h-3.5 w-3.5 opacity-60 inline" />
                </div>

                {/* Handout Title */}
                <h3 className="font-serif font-bold text-center text-lg sm:text-xl tracking-wide mb-3 leading-snug drop-shadow-sm border-b pb-2 border-current/20">
                  {activeHandout.title || 'Без названия'}
                </h3>

                {/* Optional Attached Image */}
                {activeHandout.imageUrl && (
                  <div className="mb-4 rounded overflow-hidden border-2 border-current/30 shadow-md max-h-48 flex items-center justify-center bg-black/20">
                    <img
                      src={activeHandout.imageUrl}
                      alt={activeHandout.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Handout Text Body */}
                <div className="font-serif text-xs sm:text-sm leading-relaxed whitespace-pre-line tracking-normal select-none">
                  {activeHandout.content || 'Текст документа пуст...'}
                </div>

                {/* Decorative Bottom Flourish */}
                <div className="mt-5 pt-3 border-t border-current/20 flex items-center justify-between text-[10px] opacity-70 font-serif italic">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 inline" />
                    <span>Тайна открыта искателям</span>
                  </span>
                  <span>D&D 2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#11171c] border-t border-[#2e3b46] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveHandout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1c262f] border border-[#2e3b46] hover:border-gold text-xs text-gray-200 transition-colors"
            >
              {showCopiedToast ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Сохранено!</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 text-gold" />
                  <span>Сохранить раздатку</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset(PRESETS[0])}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1c262f] border border-[#2e3b46] hover:border-gray-500 text-xs text-gray-400 hover:text-gray-200 transition-colors"
              title="Сбросить к первоначальному письму"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Сброс</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPlayerWindow}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1c262f] border border-[#2e3b46] hover:border-emerald-500 text-xs text-gray-300 hover:text-white transition-colors"
              title="Открыть окно экрана игроков"
            >
              <Monitor className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Экран игроков</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isCurrentBroadcasting ? (
              <button
                type="button"
                onClick={handleDismiss}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-red-950/80 hover:bg-red-900 border border-red-500 text-red-100 font-bold text-xs transition-all shadow-md active:scale-95"
              >
                <EyeOff className="h-3.5 w-3.5 text-red-300" />
                <span>Скрыть у игроков</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBroadcast}
                className="flex items-center gap-1.5 px-5 py-1.5 rounded bg-gradient-to-r from-gold to-gold-light hover:brightness-110 text-canvas font-black text-xs transition-all shadow-gold-glow active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Транслировать игрокам</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-[#1c262f] border border-[#2e3b46] hover:bg-card text-xs text-gray-300 hover:text-white transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
