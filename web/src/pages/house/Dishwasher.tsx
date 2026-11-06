import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import type { Member } from "../../../../shared/types";
import { useHouse } from "../../utils/useHouse";
import { useRefreshOnFocus } from "../../utils/useRefreshOnFocus";
import RulesList from "./RulesList";
import "../../css/rules.css";

export default function Dishwasher() {
    const { house } = useHouse();
    const [members, setMembers] = useState<Member[] | null>(null);

    const loadMembers = useCallback(async () => {
        try {
            const res = await fetch(`/api/houses/${house.id}/members`);
            if (res.ok) {
                const data: Member[] = await res.json();
                setMembers(data);
            }
        } catch {
            // the rules still work without this list
        }
    }, [house.id]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    useRefreshOnFocus(loadMembers);

    const users = members?.filter((m) => m.uses_dishwasher === 1) ?? [];

    return (
        <div className="rules-page">
            <header className="rules-header">
                <h1>Dishwasher</h1>
                <p>Everyone who uses the dishwasher helps empty it.</p>
            </header>

            <section className="settings-section">
                <header className="section-header">
                    <h2>Who uses it</h2>
                    {members && <span className="section-count">{users.length}</span>}
                </header>

                {members === null ? null : users.length === 0 ? (
                    <p className="rules-empty">Nobody has said they use the dishwasher yet.</p>
                ) : (
                    <ul className="who-uses">
                        {users.map((m) => (
                            <li key={m.id}>
                                <span className="picker-avatar" aria-hidden="true">
                                    {m.name.charAt(0).toUpperCase()}
                                </span>
                                {m.name}
                            </li>
                        ))}
                    </ul>
                )}

                <p className="section-hint">
                    You can change whether you use it in <Link to="../settings">Settings</Link>.
                </p>
            </section>

            <section className="settings-section">
                <header className="section-header">
                    <h2>Rules</h2>
                </header>
                <RulesList
                    houseId={house.id}
                    kind="dishwasher"
                    isAdmin={house.role === "admin"}
                    emptyText="No dishwasher rules yet."
                />
            </section>
        </div>
    );
}
