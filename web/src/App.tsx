import { useState, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

import { type Theme } from "./types/types";

import RequireAuth from "./auth/RequireAuth";
import Layout from "./utils/Layout";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Current from "./pages/house/Current";
import Calendar from "./pages/house/Calendar";
import Dishwasher from "./pages/house/Dishwasher";
import Rules from "./pages/house/Rules";
import Home from "./pages/Home";
import CreateHouse from "./pages/CreateHouse";
import Settings from "./pages/house/Settings";
import JoinHouse from"./pages/JoinHouse"

export default function App() {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "light" || saved === "dark") {
            return saved;
        }
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
    };

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={<RequireAuth />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/houses/new" element={<CreateHouse />} />
                    <Route path="/join/:code" element={<JoinHouse />} />

                    <Route
                        path="/houses/:houseId"
                        element={<Layout theme={theme} toggleTheme={toggleTheme} />}
                    >
                        <Route index element={<Current />} />
                        <Route path="calendar" element={<Calendar />} />
                        <Route path="dishwasher" element={<Dishwasher />} />
                        <Route path="rules" element={<Rules />} />
                        <Route path="settings" element={<Settings />} />
                    </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}
