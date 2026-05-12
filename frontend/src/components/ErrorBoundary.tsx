"use client";
import { Component, ReactNode } from "react";

interface Props  { children: ReactNode; }
interface State  { hasError: boolean; error: Error | null; }

/** Fix #18: Catches React render errors and shows a recovery UI instead of white screen */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] p-8">
          <div className="max-w-lg w-full rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-4 backdrop-blur-xl shadow-2xl">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-white text-2xl font-bold">Something went wrong</h1>
            <p className="text-white/60 text-sm font-mono break-all">
              {this.state.error?.message ?? "Unknown error"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
