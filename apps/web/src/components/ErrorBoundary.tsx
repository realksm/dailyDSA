// A render crash shows a message instead of unmounting the whole app (a blank page).
import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page crashed:", error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    // Navigating elsewhere clears the error.
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="page">
        <div className="card empty">
          <h3>This page hit an error</h3>
          <p>{this.state.error.message}</p>
          <p className="small" style={{ marginTop: 8 }}>
            If the server was just updated, restart it (<code>pnpm server</code>) and reload.
          </p>
          <p style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => window.location.reload()}>Reload</button>
          </p>
        </div>
      </main>
    );
  }
}
