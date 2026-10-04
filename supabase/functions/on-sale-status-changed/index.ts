import { getCorsHeaders, makeJsonResponse } from "../_shared/cors.ts";

// Disparada por el trigger on_sale_status_changed (ver
// 0019_sale_status_changed_email.sql) cuando el estado del pedido pasa
// a "Enviada", "Completada" o "Cancelada". Los estados intermedios
// (Pendiente/Confirmada) no generan email para no saturar al cliente.
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const jsonResponse = makeJsonResponse(corsHeaders);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { record } = await req.json();
    const customerEmail = record?.customer_email;
    const customerName = record?.customer_name || "Cliente";
    const status = record?.status;
    const saleNumber = record?.sale_number;
    const reference = saleNumber ? `VTA-${String(saleNumber).padStart(6, "0")}` : record?.id;
    const trackingNumber = record?.correo_tracking_number || record?.tracking_number;
    const trackingUrl = record?.correo_label_url || record?.tracking_url;

    if (!customerEmail) {
      console.log("No hay email para esta venta, saltando envío.");
      return jsonResponse({ sent: false, reason: "no_email" });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.warn("RESEND_API_KEY no configurada. El email no se enviará.");
      return jsonResponse({ sent: false, reason: "no_api_key" });
    }

    const statusCopy: Record<string, { subject: string; heading: string; message: string; color: string }> = {
      Enviada: {
        subject: `Tu pedido ${reference} fue enviado - Candela Joyas`,
        heading: "¡Tu pedido está en camino! 📦",
        message: "Te confirmamos que tu pedido fue despachado.",
        color: "#0d6efd",
      },
      Completada: {
        subject: `Tu pedido ${reference} fue entregado - Candela Joyas`,
        heading: "¡Tu pedido fue entregado! 🎉",
        message: "Esperamos que disfrutes tu compra. ¡Gracias por elegirnos!",
        color: "#28a745",
      },
      Cancelada: {
        subject: `Tu pedido ${reference} fue cancelado - Candela Joyas`,
        heading: "Tu pedido fue cancelado",
        message: "Tu pedido fue cancelado. Si no lo esperabas o tenés dudas, contactanos respondiendo este correo.",
        color: "#dc3545",
      },
    };

    const copy = status ? statusCopy[status] : undefined;
    if (!copy) {
      console.log(`Estado "${status}" no requiere email, saltando envío.`);
      return jsonResponse({ sent: false, reason: "status_not_notified" });
    }

    const trackingHtml = trackingNumber
      ? `<div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #666;">Número de seguimiento: <strong>${trackingNumber}</strong></p>
          ${trackingUrl ? `<p style="margin: 5px 0 0 0;"><a href="${trackingUrl}" style="color: #d4a373;">Ver seguimiento del envío</a></p>` : ""}
        </div>`
      : "";

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Candela Joyas <pedidos@candelajoyas.com.ar>",
        to: [customerEmail],
        subject: copy.subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
            <h2 style="color: ${copy.color}; text-align: center;">${copy.heading}</h2>
            <p style="font-size: 16px; color: #333;">Hola ${customerName}. ${copy.message}</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #666;">Número de pedido</p>
              <p style="margin: 5px 0 0 0; font-size: 22px; font-weight: bold; color: #d4a373;">${reference}</p>
            </div>
            ${trackingHtml}
            <div style="text-align: center; margin: 25px 0;">
              <a href="https://candelajoyas.com.ar/mi-cuenta" style="background-color: #d4a373; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; display: inline-block;">Ver estado de mi pedido</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">Este es un mensaje automático de Candela Joyas. Por favor no respondas a este correo.</p>
          </div>
        `,
      }),
    });

    if (!resp.ok) {
      console.error("Error enviando email con Resend:", await resp.text());
      return jsonResponse({ sent: false }, 500);
    }

    console.log(`Email de cambio de estado (${status}) enviado a ${customerEmail}`);
    return jsonResponse({ sent: true });
  } catch (error) {
    console.error("Error enviando email con Resend:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
