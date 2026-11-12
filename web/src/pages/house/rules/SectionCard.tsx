import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { RuleSection } from "../../../../../shared/types";
import ConfirmDialog from "../../../utils/ConfirmDialog";
import Switch from "../../../utils/Switch";
import { readError } from "../../../utils/readError";
import { apiFetch } from "../../../utils/apiFetch";
import RulesList from "./RulesList";

type Props = {
    houseId: number;
    section: RuleSection;
    me: { id: number; name: string } | null;
    isAdmin: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    busy: boolean;
    onMove: (direction: -1 | 1) => void;
    onChange: (section: RuleSection) => void;
    onDeleted: () => void;
};

export default function SectionCard({
    houseId,
    section,
    me,
    isAdmin,
    canMoveUp,
    canMoveDown,
    busy,
    onMove,
    onChange,
    onDeleted,
}: Props) {
    const [expanded, setExpanded] = useState(true);
    const [renaming, setRenaming] = useState(false);
    const [nameDraft, setNameDraft] = useState(section.name);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const base = `/api/houses/${houseId}/rules/sections/${section.id}`;
    const iUseIt = me !== null && section.users.some((u) => u.id === me.id);
    const bodyId = `section-body-${section.id}`;

    async function patchSection(changes: {
        name?: string;
        optIn?: boolean;
    }): Promise<boolean> {
        setSaving(true);
        setError(null);
        try {
            const res = await apiFetch(base, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(changes),
            });
            if (!res.ok) {
                setError(await readError(res, "Could not save the section."));
                return false;
            }
            const updated: RuleSection = await res.json();
            onChange(updated);
            return true;
        } catch {
            setError("Could not reach the server.");
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function handleRename(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (await patchSection({ name: nameDraft })) setRenaming(false);
    }

    function handleRenameKeyDown(e: KeyboardEvent<HTMLFormElement>) {
        if (e.key === "Escape") {
            e.preventDefault();
            setNameDraft(section.name);
            setRenaming(false);
        }
    }

    async function deleteSection() {
        setSaving(true);
        setError(null);
        try {
            const res = await apiFetch(base, { method: "DELETE" });
            if (!res.ok) {
                setError(await readError(res, "Could not delete the section."));
                return;
            }
            onDeleted();
        } catch {
            setError("Could not reach the server.");
        } finally {
            setSaving(false);
        }
    }

    async function setUsesIt(value: boolean) {
        if (me === null) return;
        setSaving(true);
        setError(null);
        try {
            const res = await apiFetch(`${base}/me`, {
                method: value ? "PUT" : "DELETE",
            });
            if (!res.ok) {
                setError(await readError(res, "Could not save your answer."));
                return;
            }
            onChange({
                ...section,
                users: value
                    ? [...section.users.filter((u) => u.id !== me.id), me]
                    : section.users.filter((u) => u.id !== me.id),
            });
        } catch {
            setError("Could not reach the server.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="settings-section rule-section">
            <div className="rule-section-header">
                {renaming ? (
                    <form
                        className="section-rename"
                        onSubmit={handleRename}
                        onKeyDown={handleRenameKeyDown}
                    >
                        <input
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            maxLength={40}
                            autoFocus
                            aria-label="Section name"
                        />
                        <button
                            type="submit"
                            className="primary-button"
                            disabled={saving}
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                                setNameDraft(section.name);
                                setRenaming(false);
                            }}
                        >
                            Cancel
                        </button>
                    </form>
                ) : (
                    <button
                        type="button"
                        className="rule-section-toggle"
                        onClick={() => setExpanded((open) => !open)}
                        aria-expanded={expanded}
                        aria-controls={bodyId}
                    >
                        <ChevronDown
                            size={18}
                            aria-hidden="true"
                            className={expanded ? "chevron open" : "chevron"}
                        />
                        <h2>{section.name}</h2>
                        <span className="section-count">
                            {section.rules.length}
                        </span>
                        {section.optIn && (
                            <span className="picker-badge">
                                {section.users.length}{" "}
                                {section.users.length === 1
                                    ? "uses it"
                                    : "use it"}
                            </span>
                        )}
                    </button>
                )}

                {isAdmin && !renaming && (
                    <div className="rule-actions">
                        <button
                            className="icon-button"
                            onClick={() => onMove(-1)}
                            disabled={busy || !canMoveUp}
                            aria-label={`Move section ${section.name} up`}
                            title="Move up"
                        >
                            <ArrowUp size={16} aria-hidden="true" />
                        </button>
                        <button
                            className="icon-button"
                            onClick={() => onMove(1)}
                            disabled={busy || !canMoveDown}
                            aria-label={`Move section ${section.name} down`}
                            title="Move down"
                        >
                            <ArrowDown size={16} aria-hidden="true" />
                        </button>
                        <button
                            className="icon-button"
                            onClick={() => setRenaming(true)}
                            aria-label={`Rename section ${section.name}`}
                            title="Rename"
                        >
                            <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                            className="icon-button danger"
                            onClick={() => setConfirmingDelete(true)}
                            disabled={saving}
                            aria-label={`Delete section ${section.name}`}
                            title="Delete section"
                        >
                            <Trash2 size={16} aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <p className="section-error" role="alert">
                    {error}
                </p>
            )}

            {expanded && (
                <div id={bodyId} className="rule-section-body">
                    {isAdmin && (
                        <Switch
                            checked={section.optIn}
                            onChange={(value) => patchSection({ optIn: value })}
                            label="Ask everyone whether they use this"
                            disabled={saving}
                        />
                    )}

                    {section.optIn && (
                        <div className="section-users">
                            <Switch
                                checked={iUseIt}
                                onChange={setUsesIt}
                                label={`I use this`}
                                disabled={saving || me === null}
                            />
                            {section.users.length === 0 ? (
                                <p className="rules-empty">
                                    Nobody has said they use this yet.
                                </p>
                            ) : (
                                <ul className="who-uses">
                                    {section.users.map((u) => (
                                        <li key={u.id}>
                                            <span
                                                className="picker-avatar"
                                                aria-hidden="true"
                                            >
                                                {u.name.charAt(0).toUpperCase()}
                                            </span>
                                            {u.name}
                                            {me?.id === u.id && (
                                                <span className="member-you">
                                                    {" "}
                                                    (you)
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <RulesList
                        houseId={houseId}
                        sectionId={section.id}
                        rules={section.rules}
                        isAdmin={isAdmin}
                        onChange={(rules) => onChange({ ...section, rules })}
                    />
                </div>
            )}

            <ConfirmDialog
                open={confirmingDelete}
                title={`Delete the "${section.name}" section?`}
                message={
                    section.rules.length > 0
                        ? `Its ${section.rules.length} ${section.rules.length === 1 ? "rule is" : "rules are"} deleted too.`
                        : "It has no rules yet."
                }
                confirmLabel="Delete section"
                danger
                onCancel={() => setConfirmingDelete(false)}
                onConfirm={() => {
                    setConfirmingDelete(false);
                    deleteSection();
                }}
            />
        </section>
    );
}
