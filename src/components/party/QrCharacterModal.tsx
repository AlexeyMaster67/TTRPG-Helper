import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  Upload,
  Copy,
  Check,
  X,
  Download,
  AlertCircle,
  Shield,
  Heart,
  VideoOff,
  UserCheck,
  FileText,
} from 'lucide-react';
import { usePartyStore } from '../../store/partyStore';
import { useSettingsStore } from '../../store/settingsStore';
import { audioService } from '../../services/audioService';
import {
  compressForQr,
  decompressFromQr,
  importCharacterFromTtrpgh,
} from '../../services/ttrpghFormat';
import { PartyMember } from '../../types/party';

export function QrCharacterModal() {
  const language = useSettingsStore((s) => s.language);
  const isEn = language === 'en';

  const {
    members,
    isQrModalOpen,
    qrTargetMemberId,
    closeQrModal,
    addMember,
    showToast,
  } = usePartyStore();

  const [activeTab, setActiveTab] = useState<'show' | 'scan'>('show');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [pastedCode, setPastedCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Canvas refs
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize selected member when opening
  useEffect(() => {
    if (isQrModalOpen) {
      if (qrTargetMemberId && members.some((m) => m.id === qrTargetMemberId)) {
        setSelectedMemberId(qrTargetMemberId);
        setActiveTab('show');
      } else if (members.length > 0) {
        setSelectedMemberId(members[0].id);
      } else {
        setActiveTab('scan');
      }
      setQrError(null);
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [isQrModalOpen, qrTargetMemberId, members]);

  // Selected member object
  const currentMember = members.find((m) => m.id === selectedMemberId) || members[0] || null;

  // Generate QR code on canvas whenever currentMember changes in 'show' tab
  useEffect(() => {
    if (!isQrModalOpen || activeTab !== 'show' || !currentMember || !qrCanvasRef.current) {
      return;
    }

    try {
      setQrError(null);
      const payload = compressForQr(currentMember);

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
            console.error('QR rendering error:', error);
            setQrError(isEn ? 'QR code generation error: ' + error.message : 'Ошибка формирования QR-кода: ' + error.message);
          }
        }
      );
    } catch (err: any) {
      console.error('Failed to compress character for QR:', err);
      setQrError(err?.message || (isEn ? 'Failed to generate QR' : 'Не удалось сгенерировать QR'));
    }
  }, [isQrModalOpen, activeTab, currentMember, isEn]);

  // Copy raw QR payload string to clipboard
  const handleCopyCode = async () => {
    if (!currentMember) return;
    try {
      const payload = compressForQr(currentMember);
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      showToast(isEn ? `Character ${currentMember.name} QR code copied to clipboard.` : `QR-код персонажа ${currentMember.name} скопирован в буфер обмена.`);
    } catch (e) {
      console.error('Clipboard write error:', e);
    }
  };

  // Download QR image as PNG
  const handleDownloadQrPng = () => {
    if (!qrCanvasRef.current || !currentMember) return;
    const url = qrCanvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    const cleanName = (currentMember.name || 'character').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
    link.download = `${cleanName}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process a decoded QR string
  const handleImportDecodedString = useCallback(
    (codeStr: string) => {
      const trimmed = codeStr.trim();
      if (!trimmed) {
        setCameraError(isEn ? 'Empty string to import' : 'Пустая строка для импорта');
        return;
      }

      try {
        let imported: PartyMember;
        if (trimmed.startsWith('TTRPGH:1:')) {
          const ttrpgh = decompressFromQr(trimmed);
          imported = importCharacterFromTtrpgh(ttrpgh);
        } else {
          // Fallback if full JSON was pasted
          imported = importCharacterFromTtrpgh(trimmed);
        }

        addMember(imported);
        audioService.playCriticalHit();
        showToast(isEn ? `Hero ${imported.name} successfully imported via QR!` : `Герой ${imported.name} успешно импортирован через QR-код!`);
        stopCamera();
        closeQrModal();
      } catch (err: any) {
        console.error('Failed to decompress QR:', err);
        setCameraError(err?.message || (isEn ? 'Failed to recognize character QR code.' : 'Не удалось распознать QR-код персонажа.'));
      }
    },
    [addMember, showToast, closeQrModal, isEn]
  );

  // Stop webcam stream
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

  // Start webcam stream for real-time QR scanning
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(isEn ? 'Webcam is not available in the current environment.' : 'Веб-камера недоступна в текущем окружении.');
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
      console.error('Camera access error:', err);
      setCameraError(isEn ? 'Failed to access camera: ' + (err?.message || 'Permission denied') : 'Не удалось запустить камеру: ' + (err?.message || 'Доступ запрещен'));
      setCameraActive(false);
    }
  };

  // Loop scanning video frames with jsQR
  const scanVideoFrame = () => {
    if (!videoRef.current || !scanCanvasRef.current || !streamRef.current) {
      return;
    }

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

  // Scan QR from an uploaded file image
  const handleScanImageFile = (file: File) => {
    setCameraError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleImportDecodedString(code.data);
        } else {
          setCameraError(isEn ? 'QR code was not detected in the uploaded image.' : 'QR-код не обнаружен на загруженном изображении.');
        }
      };
      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  // Drop image on scan zone
  const handleDropScan = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleScanImageFile(e.dataTransfer.files[0]);
    }
  };

  if (!isQrModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 select-none font-sans animate-in fade-in duration-200"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropScan}
    >
      <div className="w-full max-w-xl bg-[rgba(16,20,28,0.95)] backdrop-blur-2xl border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85)] text-gray-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-border-subtle bg-[#121622] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-sm">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                {isEn ? 'Offline QR Character Exchange (.ttrpgh)' : 'Оффлайн QR-обмен персонажами (.ttrpgh)'}
              </h2>
              <p className="text-[11px] text-gray-400">
                {isEn ? '100% offline transfer between PC and smartphones without cables or Wi-Fi' : '100% автономная передача между ПК и смартфонами без проводов и Wi-Fi'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              closeQrModal();
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isEn ? 'Close' : 'Закрыть окно'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border-subtle bg-[#0e121a] px-5 pt-2">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('show');
            }}
            disabled={members.length === 0}
            className={`px-4 py-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'show'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{isEn ? 'Show Character QR' : 'Показать QR героя'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'scan'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isEn ? 'Scan / Import' : 'Сканировать / Импортировать'}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* ============================================================= */}
          {/* TAB 1: SHOW QR CODE                                           */}
          {/* ============================================================= */}
          {activeTab === 'show' && currentMember && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Member Selector (if multiple) */}
              {members.length > 1 && (
                <div className="flex items-center justify-between gap-3 bg-[#131824] p-2.5 rounded-xl border border-border-subtle">
                  <span className="text-xs font-medium text-gray-300">{isEn ? 'Select character:' : 'Выберите героя:'}</span>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="bg-[#0b0e14] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 max-w-xs truncate"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.characterClass || (isEn ? 'Hero' : 'Герой')}, {m.level || 1} {isEn ? 'lvl' : 'ур.'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* QR Code Presentation Box */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-4 border-[#1e2638] shadow-[0_10px_30px_rgba(0,0,0,0.5)] mx-auto w-fit">
                <canvas ref={qrCanvasRef} className="block rounded-lg" />
                <div className="mt-2 text-center text-[11px] font-mono font-bold text-gray-800">
                  {currentMember.name} • {isEn ? 'Lvl' : 'Ур.'} {currentMember.level || 1} {currentMember.characterClass}
                </div>
              </div>

              {qrError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/50 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{qrError}</span>
                </div>
              )}

              {/* Quick Stat Badges */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#131824] p-2.5 rounded-xl border border-border-subtle flex flex-col items-center justify-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">{isEn ? 'Armor Class' : 'Класс брони'}</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-white text-sm mt-0.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{currentMember.ac}</span>
                  </div>
                </div>

                <div className="bg-[#131824] p-2.5 rounded-xl border border-border-subtle flex flex-col items-center justify-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">{isEn ? 'Hit Points' : 'Здоровье'}</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-white text-sm mt-0.5">
                    <Heart className="w-3.5 h-3.5 text-red-400" />
                    <span>
                      {currentMember.currentHp !== undefined ? currentMember.currentHp : currentMember.maxHp} / {currentMember.maxHp}
                    </span>
                  </div>
                </div>

                <div className="bg-[#131824] p-2.5 rounded-xl border border-border-subtle flex flex-col items-center justify-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">{isEn ? 'Speed' : 'Скорость'}</span>
                  <span className="font-mono font-bold text-white text-sm mt-0.5">
                    {currentMember.speed || (isEn ? '30 ft.' : '30 фт.')}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-4 py-2 rounded-xl bg-[#1b2230] hover:bg-[#253042] text-xs font-bold text-gray-200 border border-border-subtle flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">{isEn ? 'Code copied!' : 'Код скопирован!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                      <span>{isEn ? 'Copy Code' : 'Копировать код'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  className="px-4 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 text-xs font-bold text-emerald-300 border border-emerald-600/70 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isEn ? 'Download PNG' : 'Скачать PNG'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 2: SCAN OR IMPORT QR CODE                                 */}
          {/* ============================================================= */}
          {activeTab === 'scan' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Webcam Live Scanner */}
              <div className="bg-[#121622] p-4 rounded-xl border border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      {isEn ? 'Camera scan (Laptop / Smartphone)' : 'Сканирование камерой ноутбука / смартфона'}
                    </span>
                  </div>

                  {!cameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Start Camera' : 'Включить камеру'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-600/50 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <VideoOff className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Stop Camera' : 'Остановить камеру'}</span>
                    </button>
                  )}
                </div>

                {cameraActive && (
                  <div className="relative rounded-lg overflow-hidden border border-emerald-500/40 bg-black aspect-video flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    {/* Viewfinder crosshairs */}
                    <div className="absolute inset-8 border-2 border-emerald-400/60 rounded-xl pointer-events-none flex items-center justify-center">
                      <div className="text-[10px] font-mono text-emerald-300 bg-black/60 px-2 py-0.5 rounded">
                        {isEn ? 'Point camera at character QR code' : 'Наведите камеру на QR-код'}
                      </div>
                    </div>
                  </div>
                )}
                {/* Hidden canvas for processing video frames */}
                <canvas ref={scanCanvasRef} className="hidden" />
              </div>

              {cameraError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/50 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Upload image file with QR */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/80 bg-[#10141e] hover:bg-[#131926] transition-colors cursor-pointer text-center space-y-1.5"
              >
                <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                <div className="text-xs font-semibold text-gray-200">
                  {isEn ? 'Upload QR image file or screenshot' : 'Загрузить фото или скриншот с QR-кодом'}
                </div>
                <p className="text-[11px] text-gray-500">
                  {isEn ? 'Click to browse file or drag and drop image here' : 'Нажмите для выбора файла или перетащите изображение в это окно'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleScanImageFile(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
              </div>

              {/* Paste Text Payload directly */}
              <div className="bg-[#121622] p-3.5 rounded-xl border border-border-subtle space-y-2">
                <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  <span>{isEn ? 'Or paste raw text code (TTRPGH:1:...):' : 'Или вставьте текстовый код (TTRPGH:1:...):'}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pastedCode}
                    onChange={(e) => setPastedCode(e.target.value)}
                    placeholder="TTRPGH:1:..."
                    className="flex-1 bg-[#090c12] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleImportDecodedString(pastedCode)}
                    disabled={!pastedCode.trim()}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Import' : 'Импорт'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
