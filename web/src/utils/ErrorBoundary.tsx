import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import "../css/errorState.css";

type Props = { children: ReactNode };
type State = { crashed: boolean };

// If anything inside crashes while rendering, show a friendly message instead of a white page
export default class ErrorBoundary extends Component<Props, State> {
    state: State = { crashed: false };

    static getDerivedStateFromError(): State {
        return { crashed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Stays in the browser console, for debugging
        console.error("The app crashed:", error, info.componentStack);
    }

    render() {
        if (!this.state.crashed) return this.props.children;

        return (
            <div className="error-page">
                <div className="error-state" role="alert">
                    <p className="error-state-title">Something went wrong</p>
                    <p className="error-state-hint">
                        This page ran into a problem. Reloading usually fixes
                        it. If it keeps happening, let us know what you were
                        doing.
                    </p>
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => window.location.reload()}
                    >
                        <RotateCw size={16} aria-hidden="true" />
                        Reload
                    </button>
                </div>
            </div>
        );
    }
}
