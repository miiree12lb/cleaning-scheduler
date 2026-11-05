import { Navigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import "../css/login.css";

export default function Login() {
    const { auth } = useAuth();

    if (auth.status === "authenticated") {
        return <Navigate to="/" replace />;
    }
    
    return (
        <div className="login-page">
            <div className="login-card">
                <h1>Cleaning Scheduler</h1>
                <p>Weekly chores, shared fairly.</p>
                <a className="google-button" href="/api/auth/login">
                    Sign in with Google
                </a>
            </div>
        </div>
    );
}