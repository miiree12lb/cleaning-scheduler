import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { LogOut, UserMinus } from "lucide-react";
import type { Member } from "../../../../../../shared/types";
import { useAuth } from "../../../../auth/AuthContext";
import { useHouse } from "../../../../utils/useHouse";
import { useRefreshOnFocus } from "../../../../utils/useRefreshOnFocus";
import { readError } from "../../../../utils/readError";
import ConfirmDialog from "../../../../utils/ConfirmDialog";

type Props = {
    houseId: number;
    isAdmin: boolean;
};

type Role = Member["role"];

export default function MembersSection({ houseId, isAdmin }: Props) {
    const [members, setMembers] = useState<Member[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [confirmingLeave, setConfirmingLeave] = useState(false);
    const [confirmingStepDown, setConfirmingStepDown] = useState(false);
    const [pendingRemoval, setPendingRemoval] = useState<Member | null>(null);

    const navigate = useNavigate();
    const { reloadHouse } = useHouse();
    const { auth } = useAuth();
    const myId = auth.status === "authenticated" ? auth.user.id : null;

    const loadMembers = useCallback(
        async (showLoading: boolean) => {
            if (showLoading) setMembers(null);
            setLoadError(false);
            try {
                const res = await fetch(`/api/houses/${houseId}/members`);
                if (!res.ok) {
                    setLoadError(true);
                    return;
                }
                const data: Member[] = await res.json();
                setMembers(data);
            } catch {
                setLoadError(true);
            }
        },
        [houseId],
    );

    useEffect(() => {
        loadMembers(true);
    }, [loadMembers]);

    const refreshMembers = useCallback(() => loadMembers(false), [loadMembers]);
    useRefreshOnFocus(refreshMembers);

    async function leaveHouse() {
        setActionError(null);
        try {
            const res = await fetch(`/api/houses/${houseId}/members/me`, { method: "DELETE" });
            if (!res.ok) {
                setActionError(await readError(res, "Could not leave the house."));
                return;
            }
            navigate("/", { replace: true });
        } catch {
            setActionError("Could not reach the server.");
        }
    }

    async function changeRole(member: Member, role: Role) {
        setBusyId(member.id);
        setActionError(null);
        try {
            const res = await fetch(`/api/houses/${houseId}/members/${member.id}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role }),
            });
            if (!res.ok) {
                setActionError(await readError(res, "Could not change the role."));
                return;
            }
            setMembers((prev) =>
                prev === null ? prev : prev.map((m) => (m.id === member.id ? { ...m, role } : m)),
            );
            if (member.id === myId) {
                await reloadHouse();
            }
        } catch {
            setActionError("Could not reach the server.");
        } finally {
            setBusyId(null);
        }
    }

    async function removeFromHouse(member: Member) {
        setBusyId(member.id);
        setActionError(null);
        try {
            const res = await fetch(`/api/houses/${houseId}/members/${member.id}`, { method: "DELETE" });
            if (!res.ok) {
                setActionError(await readError(res, "Could not remove the member."));
                return;
            }
            setMembers((prev) => (prev === null ? prev : prev.filter((m) => m.id !== member.id)));
        } catch {
            setActionError("Could not reach the server.");
        } finally {
            setBusyId(null);
        }
    }

    if (loadError) {
        return (
            <section className="settings-section">
                <p className="section-error">Could not load the members.</p>
            </section>
        );
    }

    if (members === null) return null;

    const me = members.find((m) => m.id === myId) ?? null;

    return (
        <section className="settings-section">
            <header className="section-header">
                <h2>Members</h2>
                <span className="section-count">{members.length}</span>
            </header>

            {actionError && (
                <p className="section-error" role="alert">
                    {actionError}
                </p>
            )}

            <ul className="task-list">
                {members.map((member) => {
                    const isMe = member.id === myId;
                    const busy = busyId === member.id;

                    return (
                        <li key={member.id} className="task-row member-row">
                            <span className="picker-avatar" aria-hidden="true">
                                {member.name.charAt(0).toUpperCase()}
                            </span>

                            <div className="task-text">
                                <span className="task-name">
                                    {member.name}
                                    {isMe && <span className="member-you"> (you)</span>}
                                </span>
                            </div>

                            <div className="member-meta">
                                {member.role === "admin" && <span className="picker-badge">Admin</span>}

                                <div className="task-actions">
                                    {isAdmin && !isMe && (
                                        <>
                                            <button
                                                className="icon-button"
                                                onClick={() =>
                                                    changeRole(member, member.role === "admin" ? "member" : "admin")
                                                }
                                                disabled={busy}
                                            >
                                                {member.role === "admin" ? "Make member" : "Make admin"}
                                            </button>
                                            <button
                                                className="icon-button danger"
                                                onClick={() => setPendingRemoval(member)}
                                                disabled={busy}
                                                aria-label={`Remove ${member.name}`}
                                                title="Remove"
                                            >
                                                <UserMinus size={16} aria-hidden="true" />
                                            </button>
                                        </>
                                    )}

                                    {isMe && isAdmin && (
                                        <button
                                            className="icon-button"
                                            onClick={() => setConfirmingStepDown(true)}
                                            disabled={busy}
                                        >
                                            Step down
                                        </button>
                                    )}

                                    {isMe && (
                                        <button className="icon-button danger" onClick={() => setConfirmingLeave(true)}>
                                            <LogOut size={16} aria-hidden="true" />
                                            <span>Leave</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            <ConfirmDialog
                open={confirmingLeave}
                title="Leave this house?"
                message="You'll need a new invite link to come back."
                confirmLabel="Leave house"
                danger
                onCancel={() => setConfirmingLeave(false)}
                onConfirm={() => {
                    setConfirmingLeave(false);
                    leaveHouse();
                }}
            />

            <ConfirmDialog
                open={confirmingStepDown}
                title="Step down as admin?"
                message="You'll lose admin rights in this house. Only another admin can give them back."
                confirmLabel="Step down"
                onCancel={() => setConfirmingStepDown(false)}
                onConfirm={() => {
                    setConfirmingStepDown(false);
                    if (me) changeRole(me, "member");
                }}
            />

            <ConfirmDialog
                open={pendingRemoval !== null}
                title={`Remove ${pendingRemoval?.name} from the house?`}
                message="They'll lose access right away, and will need a new invite link to come back."
                confirmLabel="Remove"
                danger
                onCancel={() => setPendingRemoval(null)}
                onConfirm={() => {
                    if (pendingRemoval) removeFromHouse(pendingRemoval);
                    setPendingRemoval(null);
                }}
            />
        </section>
    );
}
