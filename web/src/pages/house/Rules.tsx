import { useCallback, useEffect, useState } from "react";
import type { RuleSection } from "../../../../shared/types";
import { useHouse } from "../../utils/useHouse";
import { useAuth } from "../../auth/AuthContext";
import { useRefreshOnFocus } from "../../utils/useRefreshOnFocus";
import { readError } from "../../utils/readError";
import SectionCard from "./rules/SectionCard";
import AddSectionForm from "./rules/AddSectionForm";
import { apiFetch } from "../../utils/apiFetch";
import ErrorState from "../../utils/ErrorState";
import { useDelayedFlag } from "../../utils/useDelayedFlag";
import { RowsSkeleton } from "../../utils/Skeleton";
import "../../css/settings.css";
import "../../css/rules.css";

export default function Rules() {
    const { house } = useHouse();
    const { auth } = useAuth();
    const me =
        auth.status === "authenticated"
            ? { id: auth.user.id, name: auth.user.name }
            : null;
    const isAdmin = house.role === "admin";

    const [sections, setSections] = useState<RuleSection[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const loadSections = useCallback(async () => {
        setLoadError(false);
        try {
            const res = await apiFetch(`/api/houses/${house.id}/rules`);
            if (!res.ok) {
                setLoadError(true);
                return;
            }
            const data: RuleSection[] = await res.json();
            setSections(data);
        } catch {
            setLoadError(true);
        }
    }, [house.id]);

    useEffect(() => {
        loadSections();
    }, [loadSections]);

    useRefreshOnFocus(loadSections);
    const showSkeleton = useDelayedFlag(sections === null && !loadError);

    function replaceSection(updated: RuleSection) {
        setSections((prev) =>
            prev === null
                ? prev
                : prev.map((s) => (s.id === updated.id ? updated : s)),
        );
    }

    function removeSection(id: number) {
        setSections((prev) =>
            prev === null ? prev : prev.filter((s) => s.id !== id),
        );
    }

    function addSection(created: RuleSection) {
        setSections((prev) => (prev === null ? [created] : [...prev, created]));
    }

    async function moveSection(index: number, direction: -1 | 1) {
        if (sections === null) return;
        const target = index + direction;
        if (target < 0 || target >= sections.length) return;

        // Show the new order right away, then save it
        const reordered = [...sections];
        [reordered[index], reordered[target]] = [
            reordered[target],
            reordered[index],
        ];
        setSections(reordered);

        setBusy(true);
        setActionError(null);
        try {
            const res = await apiFetch(
                `/api/houses/${house.id}/rules/sections/order`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
                },
            );
            if (!res.ok) {
                setActionError(
                    await readError(res, "Could not save the new order."),
                );
                await loadSections();
                return;
            }
            const saved: RuleSection[] = await res.json();
            setSections(saved);
        } catch {
            setActionError("Could not reach the server.");
            await loadSections();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rules-page">
            <header className="rules-header">
                <h1>House rules</h1>
                <p>The agreements everyone in {house.name} lives by.</p>
            </header>

            {loadError && (
                <ErrorState
                    title="Couldn't load the rules"
                    onRetry={loadSections}
                />
            )}

            {sections === null && showSkeleton && <RowsSkeleton />}

            {actionError && (
                <p className="section-error" role="alert">
                    {actionError}
                </p>
            )}

            {sections !== null && sections.length === 0 && (
                <p className="rules-empty">
                    {isAdmin
                        ? "No rules yet. Start by adding a section below."
                        : "No rules yet."}
                </p>
            )}

            {sections?.map((section, index) => (
                <SectionCard
                    key={section.id}
                    houseId={house.id}
                    section={section}
                    me={me}
                    isAdmin={isAdmin}
                    canMoveUp={index > 0}
                    canMoveDown={index < sections.length - 1}
                    busy={busy}
                    onMove={(direction) => moveSection(index, direction)}
                    onChange={replaceSection}
                    onDeleted={() => removeSection(section.id)}
                />
            ))}

            {isAdmin && sections !== null && (
                <AddSectionForm houseId={house.id} onCreated={addSection} />
            )}
        </div>
    );
}
