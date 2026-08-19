import { getCorsHeaders, makeJsonResponse } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/auth.ts";
import { sendPushToTokens } from "../_shared/fcm.ts";

// Disparada por el trigger on_sale_created_notify (ver 0003_triggers_and_cron.sql)
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const jsonResponse = makeJsonResponse(corsHeaders);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { record } = await req.json();
    const total = record?.total || 0;
    const customer = record?.customer_name || "Cliente";

    const admin = getAdminClient();
    const { data: admins } = await admin
      .from("profiles")
      .select("fcm_tokens")
      .eq("role", "admin")
      .eq("push_enabled", true);

    const tokens = Array.from(new Set((admins || []).flatMap((a) => a.fcm_tokens || [])));
    if (tokens.length === 0) return jsonResponse({ sent: 0 });

    await sendPushToTokens(tokens, {
      title: "¡Nueva Venta Realizada! 🛍️",
      body: `${customer} acaba de comprar por $${Number(total).toLocaleString()}.`,
    });

    return jsonResponse({ sent: tokens.length });
  } catch (error) {
    console.error("Error notificación:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
