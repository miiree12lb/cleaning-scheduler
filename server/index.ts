export default {
    async fetch(request, env, ctx) {
        const pathname = new URL(request.url).pathname;
        if (pathname.startsWith("/api/")) {
            return new Response(`hello from ${pathname}`);
        }
        return new Response("Path not found", { status: 404 });
    },
} satisfies ExportedHandler<Env>;
