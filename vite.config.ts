import { defineConfig, type Plugin, type Connect } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import type { IncomingMessage, ServerResponse } from "node:http";

const ROLE_RANK: Record<string, number> = {
  helper: 1, member: 1, sld: 2, ld: 3, aux: 4, adm: 5, manager: 6,
};

function generateLoginCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let raw = "";
  for (let i = 0; i < 12; i++) raw += chars[Math.floor(Math.random() * chars.length)];
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

function adminApiPlugin(): Plugin {
  return {
    name: "admin-api",
    configureServer(server) {
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          if (req.url !== "/api/admin/reset-password" || req.method !== "POST") {
            next();
            return;
          }

          const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
          const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

          const reply = (status: number, data: object) => {
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          };

          const chunks: Buffer[] = [];
          await new Promise<void>((resolve) => {
            req.on("data", (chunk: Buffer) => chunks.push(chunk));
            req.on("end", resolve);
          });

          try {
            const body = JSON.parse(Buffer.concat(chunks).toString()) as { targetUserId?: string };
            const { targetUserId } = body;

            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith("Bearer ")) { reply(401, { error: "Unauthorized" }); return; }
            const token = authHeader.slice(7);

            const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
              headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_ROLE_KEY },
            });
            if (!userRes.ok) { reply(403, { error: "Invalid token" }); return; }
            const user = await userRes.json() as { id?: string };
            if (!user.id) { reply(403, { error: "Invalid token" }); return; }

            const rolesRes = await fetch(
              `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}&select=role`,
              { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY } }
            );
            if (!rolesRes.ok) { reply(403, { error: "Could not verify role" }); return; }
            const roles = await rolesRes.json() as { role: string }[];
            const topRole = roles.reduce<string>(
              (best, r) => (ROLE_RANK[r.role] ?? 0) > (ROLE_RANK[best] ?? 0) ? r.role : best,
              "member"
            );

            if (topRole !== "manager") { reply(403, { error: "Manager access required" }); return; }
            if (!targetUserId) { reply(400, { error: "targetUserId is required" }); return; }
            if (targetUserId === user.id) { reply(400, { error: "Cannot reset your own password via this endpoint" }); return; }

            const loginCode = generateLoginCode();

            const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${targetUserId}`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                apikey: SERVICE_ROLE_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                password: loginCode,
                user_metadata: { force_password_reset: true },
              }),
            });

            if (!updateRes.ok) {
              const errText = await updateRes.text().catch(() => "");
              let errMsg = "Failed to generate login code";
              try { errMsg = (JSON.parse(errText) as { message?: string }).message ?? errMsg; } catch { errMsg = errText || errMsg; }
              console.error("[adminApi] Supabase error:", errText);
              reply(500, { error: errMsg });
              return;
            }

            console.log(`[adminApi] Login code generated for ${targetUserId} by manager ${user.id}`);
            reply(200, { password: loginCode });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            console.error("[adminApi] Error:", msg);
            reply(500, { error: msg });
          }
        }
      );
    },
  };
}

export default defineConfig({
  plugins: [
    adminApiPlugin(),
    TanStackRouterVite({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts" }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true,
    allowedHosts: true,
  },
});
