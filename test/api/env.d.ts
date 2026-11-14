/// <reference path="../../node_modules/@cloudflare/vitest-plugin/types/cloudflare-test.d.ts" />
/// <reference path="../../worker-configuration.d.ts" />
import type { D1Migration } from "cloudflare:test";

declare module "cloudflare:workers" {
    interface ProvidedEnv extends Env {
        TEST_MIGRATIONS: D1Migration[];
    }
}
