import { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  QrCode,
  Download,
  Upload,
  Camera,
  Copy,
  Check,
  X,
  User,
  AlertCircle,
  VideoOff,
} from 'lucide-react';
import { PartyMember } from '../../../types/party';
import { usePartyStore } from '../../../store/partyStore';
import { audioService } from '../../../services/audioService';
import {
  compressForQr,
  decompressFromQr,
  downloadTtrpghFile,
  importCharacterFromTtrpgh,
} from '../../../services/ttrpghFormat';
import { SPECIES_2024_DATA } from '../../../data/species2024Data';

interface MobileCharacterTabProps {
  member: PartyMember;
  onSelectMember: (id: string) => void;
}

export function MobileCharacterTab({
  member,
  onSelectMember,
}: MobileCharacterTabProps) {
  const { members, addMember, showToast } = usePartyStore();

  const [isQrShowOpen, setIsQrShowOpen] = useState(false);
  const [isQrScanOpen, setIsQrScanOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  // QR Scanner states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pastedCode, setPastedCode] = useState('');

  // Canvas / Video refs
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Species details lookup
  const matchedSpecies = SPECIES_2024_DATA.find(
    (s) =>
      s.id.toLowerCase() === (member.species || '').toLowerCase() ||
      s.nameRu.toLowerCase() === (member.species || '').toLowerCase() ||
      s.nameEn.toLowerCase() === (member.species || '').toLowerCase()
  );

  // Generate QR code on canvas whenever QR display modal opens
  useEffect(() => {
    if (!isQrShowOpen || !qrCanvasRef.current || !member) return;

    try {
      setQrError(null);
      const payload = compressForQr(member);

      QRCode.toCanvas(
        qrCanvasRef.current,
        payload,
        {
          width: 280,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        },
        (error) => {
          if (error) {
            setQrError('Ошибка формирования QR-кода: ' + error.message);
          }
        }
      );
    } catch (err: any) {
      setQrError(err?.message || 'Не удалось сформировать QR');
    }
  }, [isQrShowOpen, member]);

  // Copy QR text payload
  const handleCopyCode = async () => {
    try {
      const payload = compressForQr(member);
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast(`QR-код персонажа ${member.name} скопирован в буфер.`);
    } catch {
      // Fallback
    }
  };

  // Download QR as PNG
  const handleDownloadQrPng = () => {
    if (!qrCanvasRef.current) return;
    const url = qrCanvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    const cleanName = (member.name || 'character').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
    link.download = `${cleanName}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Изображение QR-кода сохранено.');
  };

  // Export .ttrpgh file
  const handleExportTtrpgh = () => {
    downloadTtrpghFile(member);
    showToast(`Файл ${member.name}.ttrpgh экспортирован.`);
  };

  // Process decoded QR or string
  const handleImportDecodedString = useCallback(
    (codeStr: string) => {
      const trimmed = codeStr.trim();
      if (!trimmed) {
        setCameraError('Пустые данные для импорта');
        return;
      }

      try {
        let imported: PartyMember;
        if (trimmed.startsWith('TTRPGH:1:')) {
          const ttrpgh = decompressFromQr(trimmed);
          imported = importCharacterFromTtrpgh(ttrpgh);
        } else {
          imported = importCharacterFromTtrpgh(trimmed);
        }

        addMember(imported);
        audioService.playCriticalHit();
        showToast(`Герой ${imported.name} успешно загружен!`);
        stopCamera();
        setIsQrScanOpen(false);
        onSelectMember(imported.id);
      } catch (err: any) {
        setCameraError(err?.message || 'Не удалось распознать данные персонажа.');
      }
    },
    [addMember, showToast, onSelectMember]
  );

  // Stop camera stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Start camera stream
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Камера недоступна в текущем окружении.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });

      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanVideoFrame();
      }
    } catch (err: any) {
      setCameraError('Не удалось запустить камеру: ' + (err?.message || 'Доступ запрещен'));
      setCameraActive(false);
    }
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || !scanCanvasRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = scanCanvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          if (code.data.startsWith('TTRPGH:1:') || code.data.includes('"format":"ttrpgh"')) {
            handleImportDecodedString(code.data);
            return;
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  // File import for .ttrpgh
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importCharacterFromTtrpgh(text);
        addMember(imported);
        audioService.playCriticalHit();
        showToast(`Герой ${imported.name} импортирован из файла.`);
        onSelectMember(imported.id);
      } catch (err: any) {
        showToast('Ошибка импорта .ttrpgh: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Hidden File Input for .ttrpgh Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".ttrpgh,.json"
        className="hidden"
      />

      {/* Character Switcher Dropdown */}
      {members.length > 1 && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md">
          <label className="text-xs text-stone-400 font-semibold uppercase tracking-wider shrink-0">
            Активный герой:
          </label>
          <select
            value={member.id}
            onChange={(e) => onSelectMember(e.target.value)}
            className="w-full sm:w-auto min-w-0 flex-1 h-10 px-3 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 font-bold text-xs sm:text-sm focus:border-amber-500 focus:outline-none truncate"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.characterClass || 'Игрок'}, ур. {m.level || 1})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Offline QR & Exchange Card */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/30 border border-amber-600/40 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-stone-100 uppercase tracking-wider">
              Оффлайн-обмен и QR
            </h3>
          </div>
          <span className="text-[11px] text-amber-300 font-medium">
            Без интернета
          </span>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Мгновенная передача персонажа за столом: покажите QR-код для сканирования Мастером с ПК или обменяйтесь файлами .ttrpgh.
        </p>

        {/* QR & File Buttons Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setIsQrShowOpen(true)}
            className="min-h-[50px] rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 transition-all touch-manipulation"
          >
            <QrCode className="w-4 h-4" />
            <span>Показать QR-код</span>
          </button>

          <button
            onClick={() => {
              setIsQrScanOpen(true);
              startCamera();
            }}
            className="min-h-[50px] rounded-xl bg-stone-800 hover:bg-stone-750 active:scale-95 border border-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all touch-manipulation"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Сканировать QR</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleExportTtrpgh}
            className="min-h-[44px] rounded-xl bg-stone-850 hover:bg-stone-800 active:scale-95 border border-stone-700 text-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all touch-manipulation"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Экспорт .ttrpgh</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] rounded-xl bg-stone-850 hover:bg-stone-800 active:scale-95 border border-stone-700 text-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all touch-manipulation"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Импорт .ttrpgh</span>
          </button>
        </div>
      </div>

      {/* Character Identity & Passport Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider">
            Паспорт героя
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs items-stretch">
          <div className="bg-stone-850 p-2.5 rounded-xl border border-stone-800 flex flex-col justify-between">
            <span className="text-stone-400 block text-[10px] uppercase font-semibold mb-1">
              Имя персонажа
            </span>
            <span className="text-stone-100 font-bold text-sm truncate">
              {member.name}
            </span>
          </div>

          <div className="bg-stone-850 p-2.5 rounded-xl border border-stone-800 flex flex-col justify-between">
            <span className="text-stone-400 block text-[10px] uppercase font-semibold mb-1">
              Класс и уровень
            </span>
            <span className="text-stone-100 font-bold text-xs sm:text-sm leading-snug">
              {member.characterClass || 'Воин'} ({member.level || 1} ур.)
            </span>
          </div>

          <div className="bg-stone-850 p-2.5 rounded-xl border border-stone-800 flex flex-col justify-between">
            <span className="text-stone-400 block text-[10px] uppercase font-semibold mb-1">
              Вид (Родословная)
            </span>
            <span className="text-stone-100 font-bold text-sm truncate">
              {member.species || 'Человек'}
            </span>
          </div>

          <div className="bg-stone-850 p-2.5 rounded-xl border border-stone-800 flex flex-col justify-between">
            <span className="text-stone-400 block text-[10px] uppercase font-semibold mb-1">
              Бонус мастерства
            </span>
            <span className="text-amber-300 font-bold text-sm font-mono">
              +{member.proficiencyBonus || 2}
            </span>
          </div>
        </div>

        {/* Species 2024 Traits Showcase */}
        {matchedSpecies && (
          <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
            <div className="text-xs font-bold text-stone-300 uppercase tracking-wider">
              Особенности вида: {matchedSpecies.nameRu} ({matchedSpecies.nameEn})
            </div>
            <div className="space-y-1.5">
              {matchedSpecies.traits.slice(0, 3).map((t, idx) => (
                <div
                  key={idx}
                  className="bg-stone-850 p-2 rounded-lg border border-stone-800 text-xs"
                >
                  <span className="font-semibold text-amber-300">{t.nameRu}: </span>
                  <span className="text-stone-400">{t.descriptionRu}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes & Backstory */}
        {member.notes && (
          <div className="mt-3 pt-3 border-t border-stone-800">
            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
              Заметки и предыстория
            </div>
            <p className="text-xs text-stone-300 bg-stone-850 p-2.5 rounded-xl border border-stone-800 whitespace-pre-wrap leading-relaxed">
              {member.notes}
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen High-Contrast Show QR Modal */}
      {isQrShowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-700 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full flex items-center justify-between pb-2 border-b border-stone-800">
              <div>
                <h3 className="font-bold text-stone-100 text-base">
                  QR-код персонажа
                </h3>
                <p className="text-xs text-amber-400 font-medium">
                  {member.name} (ур. {member.level || 1})
                </p>
              </div>
              <button
                onClick={() => setIsQrShowOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-100 bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High-Contrast Canvas */}
            <div className="p-3 bg-white rounded-2xl shadow-inner border-4 border-amber-500/80">
              <canvas ref={qrCanvasRef} className="block mx-auto max-w-[260px] h-auto" />
            </div>

            {qrError && (
              <div className="text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-800">
                {qrError}
              </div>
            )}

            <p className="text-xs text-stone-400 leading-tight">
              Мастер может навести камеру смартфона или веб-камеру с ПК для мгновенной загрузки листа.
            </p>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2 w-full pt-1">
              <button
                onClick={handleCopyCode}
                className="min-h-[44px] rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
              </button>

              <button
                onClick={handleDownloadQrPng}
                className="min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md shadow-amber-950/40"
              >
                <Download className="w-4 h-4" />
                <span>PNG картинка</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Camera Scanner Modal */}
      {isQrScanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-700 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-stone-100 text-base">
                  Сканировать QR-код
                </h3>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setIsQrScanOpen(false);
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-100 bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Camera Viewfinder */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-stone-700">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas ref={scanCanvasRef} className="hidden" />
                  <div className="absolute inset-8 border-2 border-dashed border-amber-400/80 rounded-xl pointer-events-none animate-pulse" />
                </>
              ) : (
                <div className="text-center p-4 space-y-2">
                  <VideoOff className="w-10 h-10 text-stone-600 mx-auto" />
                  <p className="text-xs text-stone-400">
                    Камера не активна или доступ заблокирован
                  </p>
                  <button
                    onClick={startCamera}
                    className="min-h-[40px] px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                  >
                    Включить камеру
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-xl border border-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Manual text paste input fallback */}
            <div className="pt-2 border-t border-stone-800 space-y-2">
              <label className="block text-xs font-semibold text-stone-400">
                Или вставьте строку QR-кода вручную:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  placeholder="TTRPGH:1:..."
                  className="flex-1 min-h-[44px] px-3 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-mono focus:border-amber-500 focus:outline-none"
                />
                <button
                  onClick={() => handleImportDecodedString(pastedCode)}
                  className="min-h-[44px] px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold active:scale-95"
                >
                  Загрузить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
