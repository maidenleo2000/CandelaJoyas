import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient, HttpError, requireAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await requireAdmin(req);
    const { accessToken } = await req.json();

    if (!accessToken || typeof accessToken !== "string" || accessToken.trim().length < 10) {
      return jsonResponse({ error: "Ingresá un Access Token de Mercado Pago válido." }, 400);
    }

    const admin = getAdminClient();
    const { error } = await admin.from("integration_settings").upsert({
      key: "mercadopagoConfig",
      data: { accessToken: accessToken.trim(), updatedBy: user.email || null },
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
