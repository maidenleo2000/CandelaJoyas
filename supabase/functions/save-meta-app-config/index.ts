import { getCorsHeaders, makeJsonResponse } from "../_shared/cors.ts";
import { getAdminClient, HttpError, requireAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const jsonResponse = makeJsonResponse(corsHeaders);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await requireAdmin(req);
    const { appId, appSecret } = await req.json();

    if (!appId || typeof appId !== "string" || !appSecret || typeof appSecret !== "string") {
      return jsonResponse({ error: "Completá el App ID y el App Secret." }, 400);
    }

    const admin = getAdminClient();
    const { error } = await admin.from("integration_settings").upsert({
      key: "metaAppConfig",
      data: { appId: appId.trim(), appSecret: appSecret.trim(), updatedBy: user.email || null },
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
