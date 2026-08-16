import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getMpAccessToken } from "../_shared/mpConfig.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { items, customerData } = await req.json();
    const token = await getMpAccessToken();
    if (!token) return jsonResponse({ error: "Mercado Pago no está configurado. Cargá tu Access Token en el panel de administración." }, 500);

    const mpItems = items.map((item: any) => ({
      id: String(item.id || "prod"),
      title: String(item.name || "Producto").substring(0, 250),
      unit_price: Number(item.price),
      quantity: Number(item.quantity),
      currency_id: "ARS",
      category_id: "clothing",
      description: "Producto de indumentaria",
    }));

    if (customerData?.shippingMethod === "mercadoenvios") {
      const shipCost = Number(customerData.shippingCost || 0);
      if (shipCost > 0) {
        mpItems.push({
          id: "shipping_fee",
          title: "Envío a domicilio",
          unit_price: shipCost,
          quantity: 1,
          currency_id: "ARS",
          category_id: "others",
          description: `Envío a: ${customerData.address?.street} ${customerData.address?.number}, ${customerData.address?.city}`,
        });
      }
    }

    const prodHost = Deno.env.get("STORE_ORIGIN") || customerData?.origin || "https://genovevaindu.com.ar";

    const preferenceBody = {
      items: mpItems,
      payer: {
        name: String(customerData?.customerName || "Cliente"),
        email: customerData?.customerEmail || "test_user_12345@testuser.com",
        phone: { number: String(customerData?.customerPhone || "1111111111") },
      },
      back_urls: {
        success: `${prodHost}/success`,
        failure: `${prodHost}/cart`,
        pending: `${prodHost}/cart`,
      },
      auto_return: "approved",
      statement_descriptor: "TIENDA APP",
      external_reference: customerData?.orderId || `order_${Date.now()}`,
    };

    const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("ERROR MP:", result);
      return jsonResponse({ error: result.message || "Error creando preferencia de Mercado Pago" }, 500);
    }

    return jsonResponse({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (error) {
    console.error("ERROR MP:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
