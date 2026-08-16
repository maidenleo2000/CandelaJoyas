import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient, HttpError, requireAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireAdmin(req);
    const admin = getAdminClient();
    const { error } = await admin.from("integration_settings").delete().eq("key", "socialAccounts");
    if (error) throw error;
    return jsonResponse({ success: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
