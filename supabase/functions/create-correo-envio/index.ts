import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient, HttpError, requireAdmin } from "../_shared/auth.ts";
import { getCorreoConfig } from "../_shared/correoConfig.ts";

/**
 * Crea el envío en Correo Argentino (MiCorreo) para un pedido ya confirmado
 * y genera su etiqueta. Se dispara manualmente desde la pestaña Envíos del
 * panel (botón "Generar etiqueta"), no automáticamente al comprar, para no
 * generar etiquetas de pedidos que después se cancelan.
 *
 * Igual que en quote-correo-envio: la URL exacta, el esquema de auth y el
 * formato de respuesta de MiCorreo quedan aislados acá para ajustar cuando
 * haya credenciales reales activas.
 */
const MICORREO_SHIPMENT_URL = "https://api.correoargentino.com.ar/micorreo/v1/ordenes-de-envio";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireAdmin(req);
    const { saleId } = await req.json();
    if (!saleId) return jsonResponse({ error: "Falta el id del pedido." }, 400);

    const admin = getAdminClient();
    const { data: sale, error: saleError } = await admin
      .from("sales")
      .select("*")
      .eq("id", saleId)
      .single();
    if (saleError || !sale) return jsonResponse({ error: "No se encontró el pedido." }, 404);

    if (sale.correo_tracking_number) {
      return jsonResponse({ error: "Este pedido ya tiene una etiqueta generada." }, 400);
    }

    const config = await getCorreoConfig();
    if (!config) {
      return jsonResponse({ error: "Correo Argentino no está configurado. Cargá tus credenciales en el panel de administración." }, 400);
    }

    const address = sale.shipping_address || {};
    const quote = sale.correo_shipment_data || {};

    const resp = await fetch(MICORREO_SHIPMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agreement-Number": config.agreementNumber,
        "X-User-Id": config.userId,
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        idCotizacion: quote.quoteId ?? null,
        destinatario: {
          nombre: sale.customer_name,
          telefono: sale.customer_phone,
          email: sale.customer_email || undefined,
        },
        domicilio: {
          calle: address.street,
          numero: address.number,
          localidad: address.city,
          provincia: address.province,
          codigoPostal: address.zip,
        },
        peso: quote.raw?.pesoKg,
        alto: quote.raw?.altoCm,
        ancho: quote.raw?.anchoCm,
        largo: quote.raw?.largoCm,
      }),
    });

    const result = await resp.json().catch(() => null);
    if (!resp.ok || !result) {
      console.error("ERROR creando envío Correo Argentino:", result);
      await admin.from("sales").update({
        correo_shipment_status: "error",
        correo_shipment_data: { ...quote, shipmentError: result || "Error desconocido" },
        updated_at: new Date().toISOString(),
      }).eq("id", saleId);
      return jsonResponse({ error: "No se pudo generar el envío con Correo Argentino." }, 502);
    }

    const trackingNumber = result.numeroEnvio ?? result.tracking ?? result.id ?? null;
    const labelBase64 = result.etiquetaPdfBase64 ?? result.labelPdfBase64 ?? null;
    const labelUrlFromApi = result.etiquetaUrl ?? result.labelUrl ?? null;

    let labelUrl: string | null = labelUrlFromApi;

    if (labelBase64) {
      const pdfBytes = Uint8Array.from(atob(labelBase64), (c) => c.charCodeAt(0));
      const path = `${saleId}.pdf`;
      const { error: uploadError } = await admin.storage
        .from("shipping-labels")
        .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
      if (uploadError) {
        console.error("ERROR subiendo etiqueta a Storage:", uploadError);
      } else {
        const { data: publicUrlData } = admin.storage.from("shipping-labels").getPublicUrl(path);
        labelUrl = publicUrlData.publicUrl;
      }
    }

    await admin.from("sales").update({
      correo_tracking_number: trackingNumber,
      correo_label_url: labelUrl,
      correo_shipment_status: "created",
      correo_shipment_data: { ...quote, shipment: result },
      updated_at: new Date().toISOString(),
    }).eq("id", saleId);

    return jsonResponse({ trackingNumber, labelUrl });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    console.error("ERROR creando envío Correo Argentino:", error);
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
