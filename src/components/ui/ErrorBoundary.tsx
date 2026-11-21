import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  detail?: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readableMessage =
      'Terjadi kendala saat menyinkronkan data dengan Cloud Firestore.';
    let detail = error.message;

    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed && parsed.error) {
        if (parsed.error.toLowerCase().includes('permission')) {
          readableMessage =
            'Akses ke data ditolak oleh aturan keamanan peran (Permission Denied).';
        } else {
          readableMessage = parsed.error;
        }
        detail = `Operasi: ${parsed.operationType ?? '-'} · Path: ${parsed.path ?? '-'}`;
      }
    } catch {
      if (error.message) {
        readableMessage = error.message;
      }
    }

    return {
      hasError: true,
      message: readableMessage,
      detail,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TRACECO ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F6F5] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#D9E0DC] rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FDF3F3] border border-[#E8C5C5] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#A62626]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#141B17]">
                  Gangguan Sinkronisasi Data
                </h1>
                <p className="text-sm text-[#34403A] mt-1">
                  {this.state.message}
                </p>
                {this.state.detail && (
                  <p className="text-xs font-mono text-[#58655E] mt-2 bg-[#F8FAF9] border border-[#D9E0DC] rounded-md px-2.5 py-1.5 break-all">
                    {this.state.detail}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#1B5E43] text-white text-sm font-medium hover:bg-[#144833] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Muat Ulang Aplikasi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
