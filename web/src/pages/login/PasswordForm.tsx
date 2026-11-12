import { useId, useState, type FormEvent } from "react";
import { readError } from "../../utils/readError";
import { apiFetch } from "../../utils/apiFetch";
import { Eye, EyeOff } from "lucide-react";

type Mode = "login" | "register";

type Props = {
    returnTo: string; // where to go after logging in, already checked by the Login page
};

export default function PasswordForm({ returnTo }: Props) {
    const [mode, setMode] = useState<Mode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const id = useId();

    const registering = mode === "register";

    function switchMode() {
        setMode(registering ? "login" : "register");
        setError(null);
        setPassword("");
        setShowPassword(false);
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const res = await apiFetch(`/api/auth/${mode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    registering
                        ? { name, email, password }
                        : { email, password },
                ),
            });
            if (!res.ok) {
                setError(
                    await readError(
                        res,
                        registering
                            ? "Could not create the account."
                            : "Could not log in.",
                    ),
                );
                return;
            }
            // A full page load, so the app starts fresh and loads the new session
            window.location.assign(returnTo);
        } catch {
            setError("Could not reach the server.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form className="password-form" onSubmit={handleSubmit} noValidate>
            {registering && (
                <div className="field">
                    <label htmlFor={`${id}-name`}>Your name</label>
                    <input
                        id={`${id}-name`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={50}
                        autoComplete="name"
                    />
                </div>
            )}

            <div className="field">
                <label htmlFor={`${id}-email`}>Email</label>
                <input
                    id={`${id}-email`}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={254}
                    autoComplete="email"
                />
            </div>

            <div className="field">
                <label htmlFor={`${id}-password`}>Password</label>
                <div className="password-input">
                    <input
                        id={`${id}-password`}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        maxLength={200}
                        autoComplete={
                            registering ? "new-password" : "current-password"
                        }
                        aria-invalid={error !== null}
                        aria-describedby={
                            error
                                ? `${id}-error`
                                : registering
                                  ? `${id}-hint`
                                  : undefined
                        }
                    />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword((shown) => !shown)}
                        aria-label={
                            showPassword ? "Hide password" : "Show password"
                        }
                        aria-pressed={showPassword}
                        title={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? (
                            <EyeOff size={18} aria-hidden="true" />
                        ) : (
                            <Eye size={18} aria-hidden="true" />
                        )}
                    </button>
                </div>
                <div className="field-footer">
                    {error ? (
                        <span
                            id={`${id}-error`}
                            className="field-error"
                            role="alert"
                        >
                            {error}
                        </span>
                    ) : registering ? (
                        <span id={`${id}-hint`} className="field-count">
                            At least 10 characters
                        </span>
                    ) : (
                        <span />
                    )}
                </div>
            </div>

            <button
                type="submit"
                className="primary-button"
                disabled={submitting}
            >
                {submitting
                    ? registering
                        ? "Creating account…"
                        : "Logging in…"
                    : registering
                      ? "Create account"
                      : "Log in"}
            </button>

            <p className="password-switch">
                {registering ? "Already have an account?" : "No with us yet?"}{" "}
                <button
                    type="button"
                    className="link-button"
                    onClick={switchMode}
                >
                    {registering ? "Log in" : "Create account"}
                </button>
            </p>
        </form>
    );
}
