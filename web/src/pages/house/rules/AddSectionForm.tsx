import { useId, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { RuleSection } from "../../../../../shared/types";
import Switch from "../../../utils/Switch";
import { readError } from "../../../utils/readError";

type Props = {
    houseId: number;
    onCreated: (section: RuleSection) => void;
};

export default function AddSectionForm({ houseId, onCreated }: Props) {
    const [name, setName] = useState("");
    const [optIn, setOptIn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const inputId = useId();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/houses/${houseId}/rules/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, optIn }),
            });
            if (!res.ok) {
                setError(await readError(res, "Could not add the section."));
                return;
            }
            const created: RuleSection = await res.json();
            onCreated(created);
            setName("");
            setOptIn(false);
        } catch {
            setError("Could not reach the server.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form className="rule-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor={inputId}>New section</label>
            <Switch
                checked={optIn}
                onChange={setOptIn}
                label="Ask everyone whether they use this"
            />
            <input
                id={inputId}
                className="section-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="e.g. Dishwasher, Washing machine, Balcony"
                aria-invalid={error !== null}
            />
            <div className="rule-form-footer">
                {error ? (
                    <span className="form-error" role="alert">
                        {error}
                    </span>
                ) : (
                    <span />
                )}
                <button
                    type="submit"
                    className="primary-button"
                    disabled={saving}
                >
                    <Plus size={16} aria-hidden="true" />
                    {saving ? "Adding…" : "Add section"}
                </button>
            </div>
        </form>
    );
}
