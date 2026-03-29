import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Vyskytla sa neočakávaná chyba.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        errorMessage = `Chyba Firestore (${parsedError.operationType}): ${parsedError.error}`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#121212] p-4">
          <div className="card max-w-md w-full p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-[#C14F4F]/20 text-[#C14F4F] rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Ups! Niečo sa pokazilo</h2>
            <p className="text-white/60">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary w-full justify-center"
            >
              Obnoviť stránku
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
