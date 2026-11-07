import { useHouse } from "../../utils/useHouse";
import TasksSection from "./tasks/TasksSection";
import "../../css/settings.css";
import "../../css/rules.css";

export default function Tasks() {
    const { house } = useHouse();
    const isAdmin = house.role === "admin";

    return (
        <div className="rules-page">
            <header className="rules-header">
                <h1>Tasks</h1>
                <p>
                    {isAdmin
                        ? `The chores that rotate between everyone in ${house.name}, one person each per week.`
                        : `The chores that rotate between everyone in ${house.name}.`}
                </p>
            </header>

            <TasksSection houseId={house.id} isAdmin={isAdmin} />
        </div>
    );
}
