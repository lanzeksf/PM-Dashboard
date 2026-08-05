import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { pathToFileURL } from "url";
import path from "path";

// Runs the same api/*.js Vercel-style serverless handlers locally under
// `vite dev`, so the auth endpoints work in local dev without needing
// `vercel dev`. Vercel's Node.js runtime gives handlers a pre-parsed
// `req.body` and `res.status()/.json()` — this shim replicates just that,
// nothing else; the actual handler code is identical in both places.
//
// Uses plain Node `import()` (not server.ssrLoadModule) — these files are
// already plain ESM with no JSX/TS to transform, and ssrLoadModule's own
// resolver doesn't reliably find @prisma/client's generated package here.
function apiDevPlugin() {
  return {
    name: "ksf-api-dev-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/api/")) return next();

        const routePath = req.url.split("?")[0].replace(/^\/api\//, "");
        const modPath = path.join(process.cwd(), "api", `${routePath}.js`);

        let mod;
        try {
          // Cache-busted so edits to api/**/*.js or server/**/*.js take effect
          // on the next request without restarting the dev server.
          mod = await import(`${pathToFileURL(modPath).href}?t=${Date.now()}`);
        } catch (e) {
          console.error(`[api${req.url}] module load failed:`, e);
          res.statusCode = 404;
          res.end("Not found");
          return;
        }

        if (req.method !== "GET" && req.method !== "HEAD") {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const raw = Buffer.concat(chunks).toString("utf8");
          try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
        }

        res.status = code => { res.statusCode = code; return res; };
        res.json = data => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        };

        try {
          await mod.default(req, res);
        } catch (e) {
          console.error(`[api${req.url}]`, e);
          if (!res.writableEnded) res.status(500).json({ error: "Internal server error" });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
  server: {
    proxy: {
      "/projectsight-api": {
        target: "https://api-usw2.trimblepaas.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/projectsight-api/, ""),
      },
    },
  },
});
