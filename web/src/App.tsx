import { useState, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

import { type Theme } from "./types/types";

import RequireAuth from "./auth/RequireAuth";
import Layout from "./utils/Layout";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Current from "./pages/Current";
import Calendar from "./pages/Calendar";
import Dishwasher from "./pages/Dishwasher";
import Rules from "./pages/Rules";

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
                    <Route element={<Layout theme={theme} toggleTheme={toggleTheme} />}>
                        <Route path="/" element={<Current />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/dishwasher" element={<Dishwasher />} />
                        <Route path="/rules" element={<Rules />} />
                    </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}
