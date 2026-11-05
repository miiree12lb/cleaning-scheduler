import { useOutletContext } from "react-router";
import type { HouseSummary } from "../../../../shared/types";

export default function Current() {
    const house = useOutletContext<HouseSummary>();

    return <h1>This week in {house.name}</h1>;
}