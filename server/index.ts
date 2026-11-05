export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    return new Response(`hello from the ${pathname}`);
  },
} satisfies ExportedHandler<Env>;