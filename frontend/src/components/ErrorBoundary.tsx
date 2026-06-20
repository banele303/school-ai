import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "2rem",
            maxWidth: "800px",
            margin: "2rem auto",
            fontFamily: "monospace",
            background: "#1a1a2e",
            color: "#e0e0e0",
            borderRadius: "8px",
            border: "1px solid #e94560",
          }}
        >
          <h1 style={{ color: "#e94560", marginBottom: "1rem" }}>
            ⚠️ Application Error
          </h1>
          <h2 style={{ color: "#f5a623", marginBottom: "0.5rem" }}>
            {this.state.error.name}
          </h2>
          <pre
            style={{
              background: "#16213e",
              padding: "1rem",
              borderRadius: "4px",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "#ff6b6b",
              fontSize: "14px",
            }}
          >
            {this.state.error.message}
          </pre>
          {this.state.error.stack && (
            <>
              <h3 style={{ color: "#f5a623", marginTop: "1rem", marginBottom: "0.5rem" }}>
                Stack Trace
              </h3>
              <pre
                style={{
                  background: "#16213e",
                  padding: "1rem",
                  borderRadius: "4px",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "#aaa",
                  fontSize: "12px",
                  maxHeight: "400px",
                }}
              >
                {this.state.error.stack}
              </pre>
            </>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "#e94560",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
