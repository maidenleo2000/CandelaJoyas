import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

// Disparada por el trigger on_sale_approved_notify (ver 0003_triggers_and_cron.sql)
// cuando payment_status pasa a "approved".
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { record } = await req.json();
    const customerEmail = record?.customer_email;
    const customerName = record?.customer_name || "Cliente";
    const total = record?.total || 0;
    const orderId = record?.id;

    if (!customerEmail) {
      console.log("No hay email para esta venta, saltando envío.");
      return jsonResponse({ sent: false, reason: "no_email" });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.warn("RESEND_API_KEY no configurada. El email no se enviará.");
      return jsonResponse({ sent: false, reason: "no_api_key" });
    }

    const mpId = record?.mercadopago_payment_id;
    const saleNumber = record?.sale_number;
    const reference = saleNumber ? `VTA-${String(saleNumber).padStart(6, "0")}` : orderId;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Candela Joyas <pedidos@candelajoyas.com.ar>",
        to: [customerEmail],
        subject: "¡Tu pago ha sido confirmado! 🛍️ - Candela Joyas",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
            <h2 style="color: #d4a373; text-align: center;">¡Gracias por tu compra, ${customerName}!</h2>
            <p style="font-size: 16px; color: #333;">Te confirmamos que hemos recibido tu pago correctamente por un total de <strong>$${Number(total).toLocaleString()}</strong>.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #666;">Número de pedido: <strong>${reference}</strong></p>
              ${mpId ? `<p style="margin: 5px 0 0 0; color: #666;">Referencia de pago: <strong>${mpId}</strong></p>` : ""}
              <p style="margin: 5px 0 0 0; color: #666;">Estado: <span style="color: #28a745; font-weight: bold;">Pago Aprobado</span></p>
            </div>
            <p style="font-size: 14px; color: #666;">Nos pondremos en contacto contigo a la brevedad para coordinar la entrega de tus productos.</p>
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

    console.log(`Email enviado con éxito a ${customerEmail}`);
    return jsonResponse({ sent: true });
  } catch (error) {
    console.error("Error enviando email con Resend:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
