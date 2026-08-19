import { getCorsHeaders, makeJsonResponse } from "../_shared/cors.ts";
import { getAdminClient, HttpError, requireAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const jsonResponse = makeJsonResponse(corsHeaders);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireAdmin(req);
    const admin = getAdminClient();
    const { data } = await admin
      .from("integration_settings")
      .select("data")
      .eq("key", "socialAccounts")
      .maybeSingle();

    if (!data?.data?.connected) {
      return jsonResponse({ connected: false });
    }

    return jsonResponse({
      connected: true,
      pageName: data.data.pageName || null,
      igUsername: data.data.igUsername || null,
      igConnected: !!data.data.igUserId,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
