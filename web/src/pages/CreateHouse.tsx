import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { type FormEvent } from "react";
import { CircleUser } from "lucide-react";
import "../css/createHouse.css";

export default function CreateHouse() {
    const [name, setName] = useState<string>("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const navigate = useNavigate();

    async function handleSubmit(e: FormEvent) {
        setSubmitting(true);
        setErrorMsg(null);
        e.preventDefault();

        const res = await fetch("/api/houses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name }),
        });

        if (!res.ok) {
            const errorRes = await res.json();
            setErrorMsg(errorRes.error);
            setSubmitting(false);
            return;
        }

        const house = await res.json();
        navigate(`/houses/${house.id}`);
    }

    return (
        <div className="centered-page">
            <div className="card form-card">
                <Link
                    to="/account"
                    className="home-account"
                    title="Your account"
                >
                    <CircleUser size={18} aria-hidden="true" />
                    <span>Account</span>
                </Link>

                <h1>Create a house</h1>

                <p className="card-subtitle">
                    You'll be its first admin. You can invite others afterwards.
                </p>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="field">
                        <label htmlFor="name">House name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            placeholder="e.g. Kerkstraat 12"
                            onChange={(e) => setName(e.target.value)}
                            maxLength={50}
                            autoFocus
                            aria-invalid={errorMsg !== null}
                            aria-describedby={
                                errorMsg ? "name-error" : undefined
                            }
                        />
                        <div className="field-footer">
                            {errorMsg ? (
                                <span
                                    id="name-error"
                                    className="field-error"
                                    role="alert"
                                >
                                    {errorMsg}
                                </span>
                            ) : (
                                <span />
                            )}
                            <span className="field-count">
                                {name.length}/50
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={submitting}
                    >
                        {submitting ? "Creating…" : "Create house"}
                    </button>
                </form>

                <Link to="/" state={{ choose: true }} className="back-link">
                    ← Back
                </Link>
            </div>
        </div>
    );
}
