import { useEffect, useState, useCallback } from "react";
import type { Member } from "../../../../../../shared/types";
import { useAuth } from "../../../../auth/AuthContext";
import { useRefreshOnFocus } from "../../../../utils/useRefreshOnFocus";

type Props = {
    houseId: number;
    isAdmin: boolean;
};

export default function MembersSection({ houseId, isAdmin }: Props) {
    const [members, setMembers] = useState<Member[] | null>(null);
    const [error, setError] = useState(false);

    const { auth } = useAuth();
    const myId = auth.status === "authenticated" ? auth.user.id : null;

    const loadMembers = useCallback(
        async (showLoading: boolean) => {
            if (showLoading) setMembers(null);
            setError(false);
            try {
                const res = await fetch(`/api/houses/${houseId}/members`);
                if (!res.ok) {
                    setError(true);
                    return;
                }
                const data: Member[] = await res.json();
                setMembers(data);
            } catch {
                setError(true);
            }
        },
        [houseId],
    );

    useEffect(() => {
        loadMembers(true);
    }, [loadMembers]);

    const refreshMembers = useCallback(() => loadMembers(false), [loadMembers]);
    useRefreshOnFocus(refreshMembers);

    if (error) {
        return (
            <section className="settings-section">
                <p className="section-error">Could not load the members.</p>
            </section>
        );
    }

    if (members === null) return null;

    return (
        <section className="settings-section">
            <header className="section-header">
                <h2>Members</h2>
                <span className="section-count">{members.length}</span>
            </header>

            <ul className="task-list">
                {members.map((member) => {
                    const isMe = member.id === myId;

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

                            {member.role === "admin" && <span className="picker-badge">Admin</span>}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
