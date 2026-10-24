import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';
import { useSettingsStore } from '../../store/settingsStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleResetCombat = async () => {
    try {
      localStorage.removeItem('dnd_ait_active_session');
    } catch {}

    try {
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(
        'active_session.json',
        JSON.stringify({ combatants: [], currentTurnIndex: 0, roundCounter: 1, activeCombatantId: null }),
        { baseDir: BaseDirectory.AppData }
      );
    } catch {}

    useCombatStore.getState().resetCombat();
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isEn = useSettingsStore.getState().language === 'en';
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0b0e11] text-gray-100 p-6 select-none font-sans">
          <div className="w-full max-w-lg rounded-sm border border-red-700/60 bg-[#161d24] p-6 shadow-2xl flex flex-col gap-4 text-center items-center ring-1 ring-red-900/40">
            <div className="w-14 h-14 rounded-full bg-red-950/70 border border-red-600/60 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.25)]">
              <AlertTriangle className="h-7 w-7 text-red-400" />
            </div>

            <div>
              <h2 className="font-serif text-lg font-bold text-gray-100 tracking-wide">
                {isEn ? 'An unexpected interface error occurred' : 'Произошла непредвиденная ошибка интерфейса'}
              </h2>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {isEn
                  ? 'Interface intercepted by the ErrorBoundary circuit. Combat state is protected. Choose an action to recover:'
                  : 'Интерфейс перехвачен защитным контуром ErrorBoundary. Состояние боя не повредило приложение. Выберите действие для восстановления:'}
              </p>
            </div>

            {this.state.error && (
              <div className="w-full text-left bg-[#0b0e11] p-3 rounded-sm border border-red-950/80 max-h-36 overflow-y-auto">
                <span className="font-mono text-[11px] text-red-300 break-words leading-relaxed block">
                  {this.state.error.toString()}
                </span>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 pt-2 border-t border-red-950/40 font-mono text-[10px] text-gray-500 whitespace-pre-wrap break-all">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                onClick={this.handleResetCombat}
                className="flex items-center gap-1.5 rounded-sm bg-gold px-4 py-2 text-xs font-bold text-canvas hover:bg-gold-light shadow-gold-glow transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isEn ? 'Reset combat & start over' : 'Сбросить бой и начать заново'}</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-1.5 rounded-sm border border-[#374450] bg-[#1a232b] px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-[#222e39] transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{isEn ? 'Reload application' : 'Перезагрузить приложение'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
