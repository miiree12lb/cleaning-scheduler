import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import type { Rule } from "../../../../../shared/types";
import ConfirmDialog from "../../../utils/ConfirmDialog";
import { readError } from "../../../utils/readError";
import { apiFetch } from "../../../utils/apiFetch";

type Props = {
    houseId: number;
    sectionId: number;
    rules: Rule[];
    isAdmin: boolean;
    onChange: (rules: Rule[]) => void;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

export default function RulesList({
    houseId,
    sectionId,
    rules,
    isAdmin,
    onChange,
}: Props) {
    const [actionError, setActionError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Rule | null>(null);

    const api = `/api/houses/${houseId}/rules`;

    async function addRule(text: string): Promise<string | null> {
        try {
            const res = await apiFetch(`${api}/sections/${sectionId}/rules`, {
                method: "POST",
                headers: JSON_HEADERS,
                body: JSON.stringify({ text }),
            });
            if (!res.ok) return await readError(res, "Could not add the rule.");
            const rule: Rule = await res.json();
            onChange([...rules, rule]);
            return null;
        } catch {
            return "Could not reach the server.";
        }
    }

    async function saveRule(rule: Rule, text: string): Promise<string | null> {
        try {
            const res = await apiFetch(`${api}/rules/${rule.id}`, {
                method: "PATCH",
                headers: JSON_HEADERS,
                body: JSON.stringify({ text }),
            });
            if (!res.ok)
                return await readError(res, "Could not save the rule.");
            const saved: Rule = await res.json();
            onChange(rules.map((r) => (r.id === saved.id ? saved : r)));
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
            const res = await apiFetch(`${api}/rules/${rule.id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                setActionError(
                    await readError(res, "Could not delete the rule."),
                );
                return;
            }
            onChange(rules.filter((r) => r.id !== rule.id));
        } catch {
            setActionError("Could not reach the server.");
        } finally {
            setBusy(false);
        }
    }

    async function move(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= rules.length) return;

        const previous = rules;
        const reordered = [...rules];
        [reordered[index], reordered[target]] = [
            reordered[target],
            reordered[index],
        ];
        onChange(reordered);

        setBusy(true);
        setActionError(null);
        try {
            const res = await apiFetch(
                `${api}/sections/${sectionId}/rules/order`,
                {
                    method: "PUT",
                    headers: JSON_HEADERS,
                    body: JSON.stringify({ ids: reordered.map((r) => r.id) }),
                },
            );
            if (!res.ok) {
                setActionError(
                    await readError(res, "Could not save the new order."),
                );
                onChange(previous);
                return;
            }
            const saved: Rule[] = await res.json();
            onChange(saved);
        } catch {
            setActionError("Could not reach the server.");
            onChange(previous);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rules">
            {actionError && (
                <p className="section-error" role="alert">
                    {actionError}
                </p>
            )}

            {rules.length === 0 ? (
                <p className="rules-empty">
                    {isAdmin
                        ? "No rules in this section yet. Add the first one below."
                        : "No rules in this section yet."}
                </p>
            ) : (
                <ol className="rule-list">
                    {rules.map((rule, index) =>
                        editingId === rule.id ? (
                            <EditRuleRow
                                key={rule.id}
                                rule={rule}
                                onSave={(text) => saveRule(rule, text)}
                                onCancel={() => setEditingId(null)}
                            />
                        ) : (
                            <li key={rule.id} className="rule-row">
                                <span
                                    className="rule-number"
                                    aria-hidden="true"
                                >
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
                                            <ArrowUp
                                                size={16}
                                                aria-hidden="true"
                                            />
                                        </button>
                                        <button
                                            className="icon-button"
                                            onClick={() => move(index, 1)}
                                            disabled={
                                                busy ||
                                                index === rules.length - 1
                                            }
                                            aria-label={`Move rule ${index + 1} down`}
                                            title="Move down"
                                        >
                                            <ArrowDown
                                                size={16}
                                                aria-hidden="true"
                                            />
                                        </button>
                                        <button
                                            className="icon-button"
                                            onClick={() =>
                                                setEditingId(rule.id)
                                            }
                                            disabled={busy}
                                            aria-label={`Edit rule ${index + 1}`}
                                            title="Edit"
                                        >
                                            <Pencil
                                                size={16}
                                                aria-hidden="true"
                                            />
                                        </button>
                                        <button
                                            className="icon-button danger"
                                            onClick={() =>
                                                setPendingDelete(rule)
                                            }
                                            disabled={busy}
                                            aria-label={`Delete rule ${index + 1}`}
                                            title="Delete"
                                        >
                                            <Trash2
                                                size={16}
                                                aria-hidden="true"
                                            />
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
                confirmLabel="Delete rule"
                danger
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => {
                    const rule = pendingDelete;
                    setPendingDelete(null);
                    if (rule) deleteRule(rule);
                }}
            />
        </div>
    );
}

function AddRuleForm({
    onAdd,
}: {
    onAdd: (text: string) => Promise<string | null>;
}) {
    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const inputId = useId();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const problem = await onAdd(text);
        setSaving(false);
        if (problem) {
            setError(problem);
            return;
        }
        setText("");
    }

    // Enter adds the rule, Shift+Enter makes a new line
    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
        }
    }

    return (
        <form className="rule-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor={inputId}>New rule</label>
            <textarea
                id={inputId}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={300}
                rows={2}
                placeholder="e.g. Take the trash out when it's full"
                aria-invalid={error !== null}
            />
            <div className="rule-form-footer">
                {error ? (
                    <span className="form-error" role="alert">
                        {error}
                    </span>
                ) : (
                    <span className="char-count">{text.length}/300</span>
                )}
                <button
                    type="submit"
                    className="primary-button"
                    disabled={saving}
                >
                    <Plus size={16} aria-hidden="true" />
                    {saving ? "Adding…" : "Add rule"}
                </button>
            </div>
        </form>
    );
}

type EditRuleRowProps = {
    rule: Rule;
    onSave: (text: string) => Promise<string | null>;
    onCancel: () => void;
};

function EditRuleRow({ rule, onSave, onCancel }: EditRuleRowProps) {
    const [text, setText] = useState(rule.text);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const problem = await onSave(text);
        setSaving(false);
        if (problem) setError(problem);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
        }
    }

    return (
        <li className="rule-row editing">
            <form className="rule-form" onSubmit={handleSubmit} noValidate>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={300}
                    rows={2}
                    autoFocus
                    aria-label="Rule text"
                    aria-invalid={error !== null}
                />
                <div className="rule-form-footer">
                    {error ? (
                        <span className="form-error" role="alert">
                            {error}
                        </span>
                    ) : (
                        <span className="char-count">{text.length}/300</span>
                    )}
                    <div className="rule-form-buttons">
                        <button
                            type="submit"
                            className="primary-button"
                            disabled={saving}
                        >
                            {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        </li>
    );
}
