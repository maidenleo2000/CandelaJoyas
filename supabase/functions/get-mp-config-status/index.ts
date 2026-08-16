import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireAdmin } from "../_shared/auth.ts";
import { getMpAccessToken } from "../_shared/mpConfig.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireAdmin(req);
    const token = await getMpAccessToken();
    return jsonResponse({ configured: !!token });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
