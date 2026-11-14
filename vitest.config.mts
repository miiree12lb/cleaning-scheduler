import path from "node:path";
import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";

export default defineConfig({
    test: {
        coverage: {
            reportsDirectory: "test/coverage",
            include: ["server/**/*.ts", "shared/**/*.ts"],
            exclude: ["server/migrations/**"],
        },
        projects: [
            {
                // Plain functions, in Node: validators, weeks, rotation, passwords, links
                test: {
                    name: "unit",
                    include: [
                        "test/server/**/*.test.ts",
                        "test/shared/**/*.test.ts",
                        "test/web/**/*.test.ts",
                    ],
                },
            },
            {
                // The real Worker and a real local D1, in Cloudflare's runtime
                plugins: [
                    cloudflareTest(async () => {
                        const migrations = await readD1Migrations(
                            path.resolve("server/migrations"),
                        );
                        return {
                            wrangler: { configPath: "./wrangler.jsonc" },
                            miniflare: {
                                // Only for tests: lets the setup file create the tables
                                bindings: { TEST_MIGRATIONS: migrations },
                            },
                        };
                    }),
                ],
                test: {
                    name: "api",
                    include: ["test/api/**/*.test.ts"],
                    setupFiles: ["./test/api/apply-migrations.ts"],
                },
            },
        ],
    },
});
