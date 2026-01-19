import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("UI error boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary">
          <h1>Something went wrong.</h1>
          <p>Check the console for details.</p>
          <pre>{String(this.state.error)}</pre>
        </main>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
