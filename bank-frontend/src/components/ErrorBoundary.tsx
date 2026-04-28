import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Unexpected application error',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('UI crashed:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
          <div className="max-w-xl w-full rounded-2xl border border-red-500/40 bg-slate-900/90 p-8 shadow-2xl">
            <h1 className="text-2xl font-bold text-red-300">Application Recovered From a Crash</h1>
            <p className="mt-3 text-slate-300">
              A runtime error happened in the UI. This screen prevents a black page and helps you recover.
            </p>
            <p className="mt-3 text-sm text-slate-400 break-all">
              Error: {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-400"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
