import { useOutletContext } from "react-router";
import type { HouseContext } from "../types/types";

export function useHouse(): HouseContext {
    return useOutletContext<HouseContext>();
}
