import { useState, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

import { type Theme } from "./types/types";

import Navbar from "./utils/Navbar";
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
        return "dark";
    });

    useEffect(() => {
        if (theme === "dark") {
        document.documentElement.classList.add("dark-mode");
        document.documentElement.classList.remove("light-mode");
        } else {
        document.documentElement.classList.add("light-mode");
        document.documentElement.classList.remove("dark-mode");
        }

        document.documentElement.setAttribute("data-theme", theme);

        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
    };

    return (
        <BrowserRouter>
            <Navbar theme={theme} toggleTheme={toggleTheme} />

            <main>
                <Routes>
                    <Route path="/" element={<Current />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/dishwasher" element={<Dishwasher />} />
                    <Route path="/Rules" element={<Rules />} />
                </Routes>
            </main>
        </BrowserRouter>
    );
}
