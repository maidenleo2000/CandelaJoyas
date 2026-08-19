import { getCorsHeaders, makeJsonResponse } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/auth.ts";
import { getMpAccessToken } from "../_shared/mpConfig.ts";

// Llamada desde SuccessPage.jsx cuando un cliente (anónimo, sin permisos de
// lectura/escritura sobre "sales") vuelve de Mercado Pago. A diferencia del
// código original de Firebase (que confiaba en el ?status=approved de la URL
// sin verificar nada), acá se valida el pago contra la API de Mercado Pago
// antes de marcar la orden como aprobada, y toda la escritura se hace con
// el service role (bypassea RLS).
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const jsonResponse = makeJsonResponse(corsHeaders);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { orderId, paymentId } = await req.json();
    if (!orderId || !paymentId) {
      return jsonResponse({ error: "Faltan orderId o paymentId." }, 400);
    }

    const token = await getMpAccessToken();
    if (!token) return jsonResponse({ error: "Mercado Pago no está configurado." }, 500);

    const admin = getAdminClient();

    const { data: order, error: orderError } = await admin
      .from("sales")
      .select("*")
      .eq("id", orderId)
      .single();
    if (orderError || !order) return jsonResponse({ error: "Orden no encontrada." }, 404);

    // Verificar el pago contra la API de Mercado Pago (nunca confiar en query params del cliente)
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
    const payment = await mpResp.json();
    if (!mpResp.ok) {
      return jsonResponse({ error: "No se pudo verificar el pago con Mercado Pago." }, 502);
    }

    if (payment.status !== "approved") {
      return jsonResponse({ approved: false, status: payment.status });
    }

    // Evitar descuentos/emails duplicados si ya estaba aprobada
    const alreadyApproved = order.payment_status === "approved";

    if (!alreadyApproved) {
      const { error: updateError } = await admin.from("sales").update({
        payment_status: "approved",
        mercadopago_payment_id: String(paymentId),
        status: "Confirmada",
        updated_at: new Date().toISOString(),
      }).eq("id", orderId);
      if (updateError) throw updateError;

      // El stock ya se descuenta automáticamente al crear el pedido (trigger en "sales",
      // ver 0011_stock_deduct_on_pending.sql). Este fallback solo cubre pedidos que
      // hayan quedado sin descontar (ej: creados antes de esa migración).
      if (!order.stock_deducted) {
        const { data: siteSettings } = await admin
          .from("site_settings")
          .select("data")
          .eq("id", 1)
          .single();

        if (siteSettings?.data?.enableStockManagement) {
          await admin.rpc("deduct_stock_for_sale", { sale_id: orderId });
          await admin.from("sales").update({ stock_deducted: true }).eq("id", orderId);
        }
      }
    }

    return jsonResponse({ approved: true, total: order.total });
  } catch (error) {
    console.error("Error confirmando pago:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
