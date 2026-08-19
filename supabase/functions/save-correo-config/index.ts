import { getCorsHeaders, makeJsonResponse } from "../_shared/cors.ts";
import { getAdminClient, HttpError, requireAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const jsonResponse = makeJsonResponse(corsHeaders);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await requireAdmin(req);
    const { agreementNumber, userId, apiKey } = await req.json();

    if (
      !agreementNumber || typeof agreementNumber !== "string" || !agreementNumber.trim() ||
      !userId || typeof userId !== "string" || !userId.trim() ||
      !apiKey || typeof apiKey !== "string" || apiKey.trim().length < 5
    ) {
      return jsonResponse({ error: "Completá el número de acuerdo, el usuario y la API Key de Correo Argentino." }, 400);
    }

    const admin = getAdminClient();
    const { error } = await admin.from("integration_settings").upsert({
      key: "correoArgentinoConfig",
      data: {
        agreementNumber: agreementNumber.trim(),
        userId: userId.trim(),
        apiKey: apiKey.trim(),
        updatedBy: user.email || null,
      },
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
