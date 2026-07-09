import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * App-wide error boundary.
 *
 * If any component throws during render, React 18 unmounts the whole tree and
 * the user is left staring at a blank white page with the error only in the
 * console. This boundary catches those errors and shows a readable fallback
 * instead, so the application can never silently white-screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log for debugging; in production this could report to a monitoring service.
    console.error('[ErrorBoundary] Caught a rendering error:', error, info);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl ring-1 ring-red-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-100 flex items-center justify-center text-3xl">
            ⚠️
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-6">
            The application hit an unexpected error. You can reload the page to try again.
          </p>
          {this.state.error && (
            <pre className="text-left text-xs bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 overflow-x-auto text-red-700 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold shadow-lg hover:from-teal-600 hover:to-cyan-600 transition-all"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}
