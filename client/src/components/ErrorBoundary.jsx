import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // If it's a Vite dynamic import error (chunk failed to load), force a full reload
    if (error.message && error.message.includes('Failed to fetch dynamically imported module')) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '100px 40px', textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <p>We are updating the site. Please refresh the page.</p>
          <button onClick={() => window.location.reload()} className="btn-dark" style={{ marginTop: '20px' }}>
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
