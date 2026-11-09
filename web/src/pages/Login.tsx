import { Navigate, useSearchParams } from "react-router";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext";
import PasswordForm from "./login/PasswordForm";
import "../css/login.css";

const ERRORS: Record<string, string> = {
    cancelled: "Sign-in was cancelled.",
    failed: "Sign-in didn't work. Please try again.",
    email_in_use: "This email address already belongs to another account.",
    too_many: "Too many login attempts. Wait a minute and try again.",
};

export default function Login() {
    const { auth } = useAuth();
    const [searchParams] = useSearchParams();

    // Only paths inside this app, never another site
    const requested = searchParams.get("returnTo") ?? "/";
    const returnTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

    const error = searchParams.get("error");

    // Already logged in: go straight to where they were heading
    if (auth.status === "authenticated") {
        return <Navigate to={returnTo} replace />;
    }

    // Wait until we know whether they're logged in
    if (auth.status === "loading") {
        return null;
    }

    const loginUrl = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>Cleaning Scheduler</h1>
                <p>Weekly chores, shared fairly.</p>

                {error && (
                    <p className="login-error" role="alert">
                        {ERRORS[error] ?? ERRORS.failed}
                    </p>
                )}

                <a className="google-button" href={loginUrl}>
                    Sign in with Google
                </a>

                   <div className="login-divider">
                        <span>or</span>
                    </div>

                    <PasswordForm returnTo={returnTo ?? "/"} />
            </div>

            <p className="login-privacy">
                By continuing, your name and email are stored to run the app. <Link to="/privacy">Privacy</Link>
            </p>
        </div>
    );
}