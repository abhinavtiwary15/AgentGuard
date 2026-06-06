import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

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
        <div style={{
          padding: '48px 32px',
          fontFamily: "'Geist', sans-serif",
          maxWidth: 600,
          margin: '0 auto',
        }}>
          <div style={{
            width: 40, height: 40,
            background: '#CF1322',
            borderRadius: 8,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            color: 'white', fontWeight: 700,
            fontSize: 14, marginBottom: 16,
          }}>AG</div>
          <h2 style={{ color: '#0F0E0D', marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ color: '#8A8480', fontSize: 14, marginBottom: 24 }}>
            {this.state.error?.message}
          </p>
          <pre style={{
            background: '#F2F0EC',
            padding: 16, borderRadius: 8,
            fontSize: 11, color: '#4A4642',
            overflow: 'auto', marginBottom: 24,
          }}>
            {this.state.error?.stack?.slice(0, 500)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#CF1322', color: 'white',
              border: 'none', borderRadius: 6,
              padding: '8px 16px', cursor: 'pointer',
              fontFamily: "'Geist'", fontSize: 13,
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
