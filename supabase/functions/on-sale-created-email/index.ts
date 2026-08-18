import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

// Disparada por el trigger on_sale_created_notify (ver 0013_sale_number_and_created_email.sql)
// apenas se crea una venta. Confirma la recepción del pedido e informa
// el número interno de venta como referencia (independiente del email
// de "pago aprobado" que envía on-sale-approved-notify).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { record } = await req.json();
    const customerEmail = record?.customer_email;
    const customerName = record?.customer_name || "Cliente";
    const total = record?.total || 0;
    const items = Array.isArray(record?.items) ? record.items : [];
    const saleNumber = record?.sale_number;

    if (!customerEmail) {
      console.log("No hay email para esta venta, saltando envío.");
      return jsonResponse({ sent: false, reason: "no_email" });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.warn("RESEND_API_KEY no configurada. El email no se enviará.");
      return jsonResponse({ sent: false, reason: "no_api_key" });
    }

    const reference = saleNumber
      ? `VTA-${String(saleNumber).padStart(6, "0")}`
      : record?.id;

    const itemsHtml = items
      .map(
        (it: { name?: string; quantity?: number; price?: number }) =>
          `<tr>
            <td style="padding: 6px 0; color: #333;">${it.name ?? "Producto"}</td>
            <td style="padding: 6px 0; color: #333; text-align: center;">${it.quantity ?? 1}</td>
            <td style="padding: 6px 0; color: #333; text-align: right;">$${Number(it.price ?? 0).toLocaleString()}</td>
          </tr>`
      )
      .join("");

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Candela Joyas <pedidos@candelajoyas.com.ar>",
        to: [customerEmail],
        subject: `Confirmamos tu pedido ${reference} - Candela Joyas`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
            <h2 style="color: #d4a373; text-align: center;">¡Gracias por tu compra, ${customerName}!</h2>
            <p style="font-size: 16px; color: #333;">Recibimos tu pedido correctamente. Guardá este número como referencia para cualquier consulta:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #666;">Número de pedido</p>
              <p style="margin: 5px 0 0 0; font-size: 22px; font-weight: bold; color: #d4a373;">${reference}</p>
            </div>
            ${
              itemsHtml
                ? `<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                      <tr style="border-bottom: 1px solid #eee;">
                        <th style="text-align: left; padding: 6px 0; color: #999; font-size: 13px;">Producto</th>
                        <th style="text-align: center; padding: 6px 0; color: #999; font-size: 13px;">Cant.</th>
                        <th style="text-align: right; padding: 6px 0; color: #999; font-size: 13px;">Precio</th>
                      </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                  </table>`
                : ""
            }
            <p style="font-size: 16px; color: #333; text-align: right;"><strong>Total: $${Number(total).toLocaleString()}</strong></p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 14px; color: #666;">Te avisaremos por email apenas se confirme el pago. Ante cualquier consulta, mencioná tu número de pedido.</p>
            <p style="font-size: 12px; color: #999; text-align: center;">Este es un mensaje automático de Candela Joyas. Por favor no respondas a este correo.</p>
          </div>
        `,
      }),
    });

    if (!resp.ok) {
      console.error("Error enviando email con Resend:", await resp.text());
      return jsonResponse({ sent: false }, 500);
    }

    console.log(`Email de confirmación de compra enviado a ${customerEmail}`);
    return jsonResponse({ sent: true });
  } catch (error) {
    console.error("Error enviando email con Resend:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
