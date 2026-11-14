import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            reportsDirectory: "test/coverage",
            include: ["server/**/*.ts", "shared/**/*.ts"],
            exclude: ["server/migrations/**"],
        },
    },
});
