import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import MadigunLogo from './MadigunLogo';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-[#3E312C]" id="error-boundary-screen">
          <div className="max-w-md w-full bg-white border border-[#EBE6DD] rounded-[32px] p-6 sm:p-8 shadow-sm text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-4">
              <MadigunLogo size={64} />
            </div>

            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 text-amber-700 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h1 className="font-serif text-2xl font-bold text-[#3E312C] mb-2">
              Application Recovery
            </h1>
            
            <p className="text-xs text-[#8C7A6B] leading-relaxed mb-6">
              The application encountered an unexpected runtime issue while rendering. You can quickly reload or reset cached session data to restore normal operation.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3.5 bg-[#F9F8F5] border border-[#E6E4DD] rounded-xl text-left">
                <p className="text-[11px] font-mono font-bold text-[#3E312C] break-words">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs font-bold text-white bg-[#3E312C] hover:bg-[#2C211F] transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Application
              </button>

              <button
                onClick={this.handleResetCache}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-bold text-[#8C7A6B] bg-[#FAF9F5] hover:bg-[#EBE6DD] border border-[#E6E4DD] transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Local Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
