import { useId, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch } from "../../utils/apiFetch";

type Mode = "login" | "register";
type Field = "name" | "email" | "password" | "ageConfirmed";
type FormError = { message: string; field?: Field };

type Props = {
    returnTo: string; // where to go after logging in, already checked by the Login page
};

export default function PasswordForm({ returnTo }: Props) {
    const [mode, setMode] = useState<Mode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<FormError | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [olderThan16, setOlderThan16] = useState(false);
    const id = useId();

    const registering = mode === "register";

    // The message for one field, if the error is about that field
    const errorFor = (field: Field) =>
        error?.field === field ? error.message : null;
    // Errors that aren't about one field: wrong email or password, no connection
    const generalError = error && !error.field ? error.message : null;

    function switchMode() {
        setMode(registering ? "login" : "register");
        setError(null);
        setPassword("");
        setShowPassword(false);
        setOlderThan16(false);
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
                        ? { name, email, password, ageConfirmed: olderThan16 }
                        : { email, password },
                ),
            });
            if (!res.ok) {
                // The server says what's wrong, and for sign-up also which field it's about
                const data: { error?: string; field?: Field } = await res
                    .json()
                    .catch(() => ({}));
                setError({
                    message:
                        data.error ??
                        (registering
                            ? "Could not create the account."
                            : "Could not log in."),
                    field: data.field,
                });
                return;
            }
            // A full page load, so the app starts fresh and loads the new session
            window.location.assign(returnTo);
        } catch {
            setError({ message: "Could not reach the server." });
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
                        aria-invalid={errorFor("name") !== null}
                        aria-describedby={
                            errorFor("name") ? `${id}-name-error` : undefined
                        }
                    />
                    <FieldMessage
                        id={`${id}-name-error`}
                        message={errorFor("name")}
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
                    aria-invalid={errorFor("email") !== null}
                    aria-describedby={
                        errorFor("email") ? `${id}-email-error` : undefined
                    }
                />
                <FieldMessage
                    id={`${id}-email-error`}
                    message={errorFor("email")}
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
                        aria-invalid={errorFor("password") !== null}
                        aria-describedby={
                            errorFor("password")
                                ? `${id}-password-error`
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
                <div className="field-footer form-message">
                    {errorFor("password") ? (
                        <span
                            id={`${id}-password-error`}
                            className="field-error"
                            role="alert"
                        >
                            {errorFor("password")}
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

            {registering && (
                <>
                    <label className="checkbox-row">
                        <input
                            type="checkbox"
                            checked={olderThan16}
                            onChange={(e) => setOlderThan16(e.target.checked)}
                            aria-invalid={errorFor("ageConfirmed") !== null}
                            aria-describedby={
                                errorFor("ageConfirmed")
                                    ? `${id}-age-error`
                                    : undefined
                            }
                        />
                        <span>
                            I'm 16 or older, and I agree to the{" "}
                            <Link to="/terms" target="_blank">
                                Terms
                            </Link>
                        </span>
                    </label>
                    <FieldMessage
                        id={`${id}-age-error`}
                        message={errorFor("ageConfirmed")}
                    />
                </>
            )}

            <FieldMessage id={`${id}-error`} message={generalError} />

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
                {registering ? "Already have an account?" : "Not with us yet?"}{" "}
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

// The red message under a field (or above the button), in the same style as before
function FieldMessage({ id, message }: { id: string; message: string | null }) {
    if (!message) return null;
    return (
        <div className="field-footer form-message">
            <span id={id} className="field-error" role="alert">
                {message}
            </span>
        </div>
    );
}
