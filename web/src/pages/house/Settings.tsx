import { useHouse } from "../../utils/useHouse";
import TasksSection from "./settings/tasks/TasksSection";
import InviteSection from "./settings/InviteSection";
import MembersSection from "./settings/members/MembersSection";
import DangerZone from "./settings/DangerZone";

export default function Settings() {
    const { house } = useHouse();

    return (
        <div className="settings">
            <h1>Settings</h1>
            {house.role === "admin" && <InviteSection houseId={house.id} />}
            <TasksSection houseId={house.id} isAdmin={house.role === "admin"} />
            <MembersSection houseId={house.id} isAdmin={house.role === "admin"} />
            {house.role === "admin" && <DangerZone houseId={house.id} houseName={house.name} />}
        </div>
    );
}
