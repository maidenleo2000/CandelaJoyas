import { getCorsHeaders, makeJsonResponse } from "../_shared/cors.ts";
import { HttpError, requireAdmin } from "../_shared/auth.ts";
import { getMetaCredentials } from "../_shared/metaConfig.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const jsonResponse = makeJsonResponse(corsHeaders);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireAdmin(req);
    const { appId, appSecret } = await getMetaCredentials();
    return jsonResponse({ configured: !!(appId && appSecret), appId: appId || null });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
