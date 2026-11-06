import { useHouse } from "../../utils/useHouse";
import RulesList from "./RulesList";

export default function Rules() {
    const { house } = useHouse();

    return (
        <div className="rules-page">
            <header className="rules-header">
                <h1>House rules</h1>
                <p>The agreements everyone in {house.name} lives by.</p>
            </header>

            <section className="settings-section">
                <RulesList
                    houseId={house.id}
                    kind="house"
                    isAdmin={house.role === "admin"}
                    emptyText="No house rules yet."
                />
            </section>
        </div>
    );
}
