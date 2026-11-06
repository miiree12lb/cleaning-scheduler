import { useCallback, useEffect, useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import type { Rule, RuleKind } from "../../../../shared/types";
import ConfirmDialog from "../../utils/ConfirmDialog";
import { readError } from "../../utils/readError";
import { useRefreshOnFocus } from "../../utils/useRefreshOnFocus";
import "../../css/settings.css";
import "../../css/rules.css";

type Props = {
    houseId: number;
    kind: RuleKind;
    isAdmin: boolean;
    emptyText: string;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

export default function RulesList({ houseId, kind, isAdmin, emptyText }: Props) {
    const [rules, setRules] = useState<Rule[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Rule | null>(null);

    const loadRules = useCallback(async () => {
        setLoadError(false);
        try {
            const res = await fetch(`/api/houses/${houseId}/rules?kind=${kind}`);
            if (!res.ok) {
                setLoadError(true);
                return;
            }
            const data: Rule[] = await res.json();
            setRules(data);
        } catch {
            setLoadError(true);
        }
    }, [houseId, kind]);

    useEffect(() => {
        loadRules();
    }, [loadRules]);

    useRefreshOnFocus(loadRules);

    // Returns an error message, or null when it worked
    async function addRule(text: string): Promise<string | null> {
        try {
            const res = await fetch(`/api/houses/${houseId}/rules`, {
                method: "POST",
                headers: JSON_HEADERS,
                body: JSON.stringify({ kind, text }),
            });
            if (!res.ok) return await readError(res, "Could not add the rule.");
            const rule: Rule = await res.json();
            setRules((prev) => (prev === null ? [rule] : [...prev, rule]));
            return null;
        } catch {
            return "Could not reach the server.";
        }
    }

    async function saveRule(rule: Rule, text: string): Promise<string | null> {
        try {
            const res = await fetch(`/api/houses/${houseId}/rules/${rule.id}`, {
                method: "PATCH",
                headers: JSON_HEADERS,
                body: JSON.stringify({ text }),
            });
            if (!res.ok) return await readError(res, "Could not save the rule.");
            const saved: Rule = await res.json();
            setRules((prev) => (prev === null ? prev : prev.map((r) => (r.id === saved.id ? saved : r))));
            setEditingId(null);
            return null;
        } catch {
            return "Could not reach the server.";
        }
    }

    async function deleteRule(rule: Rule) {
        setBusy(true);
        setActionError(null);
        try {
            const res = await fetch(`/api/houses/${houseId}/rules/${rule.id}`, { method: "DELETE" });
            if (!res.ok) {
                setActionError(await readError(res, "Could not delete the rule."));
                return;
            }
            setRules((prev) => (prev === null ? prev : prev.filter((r) => r.id !== rule.id)));
        } catch {
            setActionError("Could not reach the server.");
        } finally {
            setBusy(false);
        }
    }

    async function move(index: number, direction: -1 | 1) {
        if (rules === null) return;
        const target = index + direction;
        if (target < 0 || target >= rules.length) return;

        // Show the new order right away, then save it
        const reordered = [...rules];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        setRules(reordered);

        setBusy(true);
        setActionError(null);
        try {
            const res = await fetch(`/api/houses/${houseId}/rules/order`, {
                method: "PUT",
                headers: JSON_HEADERS,
                body: JSON.stringify({ kind, ids: reordered.map((r) => r.id) }),
            });
            if (!res.ok) {
                setActionError(await readError(res, "Could not save the new order."));
                await loadRules(); // go back to what the server has
                return;
            }
            const saved: Rule[] = await res.json();
            setRules(saved);
        } catch {
            setActionError("Could not reach the server.");
            await loadRules();
        } finally {
            setBusy(false);
        }
    }

    if (loadError) return <p className="section-error">Could not load the rules.</p>;
    if (rules === null) return null;

    return (
        <div className="rules">
            {actionError && (
                <p className="section-error" role="alert">
                    {actionError}
                </p>
            )}

            {rules.length === 0 ? (
                <p className="rules-empty">{emptyText}</p>
            ) : (
                <ol className="rules-list">
                    {rules.map((rule, index) =>
                        rule.id === editingId ? (
                            <EditRuleRow
                                key={rule.id}
                                number={index + 1}
                                rule={rule}
                                onSave={(text) => saveRule(rule, text)}
                                onCancel={() => setEditingId(null)}
                            />
                        ) : (
                            <li key={rule.id} className="rule-row">
                                <span className="rule-number" aria-hidden="true">
                                    {index + 1}
                                </span>
                                <p className="rule-text">{rule.text}</p>

                                {isAdmin && (
                                    <div className="rule-actions">
                                        <button
                                            className="icon-button"
                                            onClick={() => move(index, -1)}
                                            disabled={busy || index === 0}
                                            aria-label={`Move rule ${index + 1} up`}
                                            title="Move up"
                                        >
                                            <ArrowUp size={16} aria-hidden="true" />
                                        </button>
                                        <button
                                            className="icon-button"
                                            onClick={() => move(index, 1)}
                                            disabled={busy || index === rules.length - 1}
                                            aria-label={`Move rule ${index + 1} down`}
                                            title="Move down"
                                        >
                                            <ArrowDown size={16} aria-hidden="true" />
                                        </button>
                                        <button
                                            className="icon-button"
                                            onClick={() => setEditingId(rule.id)}
                                            aria-label={`Edit rule ${index + 1}`}
                                            title="Edit"
                                        >
                                            <Pencil size={16} aria-hidden="true" />
                                        </button>
                                        <button
                                            className="icon-button danger"
                                            onClick={() => setPendingDelete(rule)}
                                            disabled={busy}
                                            aria-label={`Delete rule ${index + 1}`}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
                            </li>
                        ),
                    )}
                </ol>
            )}

            {isAdmin && <AddRuleForm onAdd={addRule} />}

            <ConfirmDialog
                open={pendingDelete !== null}
                title="Delete this rule?"
                message={pendingDelete ? `"${pendingDelete.text}"` : ""}
                confirmLabel="Delete"
                danger
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => {
                    if (pendingDelete) deleteRule(pendingDelete);
                    setPendingDelete(null);
                }}
            />
        </div>
    );
}

// ---------- Adding a rule ----------

function AddRuleForm({ onAdd }: { onAdd: (text: string) => Promise<string | null> }) {
    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const inputId = useId();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const err = await onAdd(text);
        setSaving(false);
        if (err) setError(err);
        else setText("");
    }

    return (
        <form className="rule-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor={inputId}>New rule</label>
            <textarea
                id={inputId}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="e.g. No shoes inside"
                aria-invalid={error !== null}
            />
            <div className="rule-form-footer">
                {error ? (
                    <span className="form-error" role="alert">
                        {error}
                    </span>
                ) : (
                    <span className="field-count">{text.length}/300</span>
                )}
                <button type="submit" className="primary-button" disabled={saving}>
                    <Plus size={16} aria-hidden="true" />
                    {saving ? "Adding…" : "Add rule"}
                </button>
            </div>
        </form>
    );
}

// ---------- Editing a rule ----------

type EditRuleRowProps = {
    number: number;
    rule: Rule;
    onSave: (text: string) => Promise<string | null>;
    onCancel: () => void;
};

function EditRuleRow({ number, rule, onSave, onCancel }: EditRuleRowProps) {
    const [text, setText] = useState(rule.text);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const err = await onSave(text);
        setSaving(false);
        if (err) setError(err);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLFormElement>) {
        if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
        }
    }

    return (
        <li className="rule-row editing">
            <span className="rule-number" aria-hidden="true">
                {number}
            </span>
            <form className="rule-edit" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={300}
                    rows={2}
                    autoFocus
                    aria-label={`Rule ${number}`}
                    aria-invalid={error !== null}
                />
                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}
                <div className="edit-task-actions">
                    <button type="button" className="secondary-button" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="submit" className="primary-button" disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </form>
        </li>
    );
}