import { useOutletContext } from "react-router";
import type { HouseSummary } from "../../../../shared/types";
import TasksSection from "./settings/TasksSection";

export default function Settings() {
    const house = useOutletContext<HouseSummary>();

    return (
        <div className="settings">
            <h1>Settings</h1>
            <TasksSection houseId={house.id} isAdmin={house.role === "admin"} />
        </div>
    );
}