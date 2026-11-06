import { useHouse } from "../../utils/useHouse";

export default function Current() {
    const { house } = useHouse();

    return <h1>This week in {house.name}</h1>;
}
