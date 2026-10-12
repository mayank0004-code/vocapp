import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--sp-6)',
          textAlign: 'center',
          background: 'var(--bg-color)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-family)',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(255, 59, 48, 0.1)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--sp-4)',
            fontSize: 24,
          }}>
            ⚠️
          </div>
          <h2 style={{
            fontSize: 'var(--type-title)',
            fontWeight: 600,
            marginBottom: 'var(--sp-2)',
            letterSpacing: '-0.02em',
          }}>
            Something unexpected occurred
          </h2>
          <p style={{
            fontSize: 'var(--type-body)',
            color: 'var(--text-secondary)',
            maxWidth: 400,
            lineHeight: 1.5,
            marginBottom: 'var(--sp-5)',
          }}>
            {this.state.error?.message || "An error occurred while displaying this content."}
          </p>
          <button
            className="btn btn-primary"
            onClick={this.handleReset}
            style={{ minWidth: 140 }}
          >
            Reload Vocapp
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
