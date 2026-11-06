import { useHouse } from "../../utils/useHouse";
import TasksSection from "./settings/TasksSection";
import InviteSection from "./settings/InviteSection";

export default function Settings() {
    const { house, reloadHouse } = useHouse();

    return (
        <div className="settings">
            <h1>Settings</h1>
            {house.role === "admin" && <InviteSection houseId={house.id} />}
            <TasksSection houseId={house.id} isAdmin={house.role === "admin"} />
        </div>
    );
}
