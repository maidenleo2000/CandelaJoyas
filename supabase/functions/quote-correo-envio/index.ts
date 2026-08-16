import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getCorreoConfig } from "../_shared/correoConfig.ts";

/**
 * Cotiza un envío contra la API de Correo Argentino (MiCorreo).
 *
 * IMPORTANTE: esta función es pública (la llama un comprador anónimo desde
 * el checkout), a diferencia de save/get-correo-config que son admin-only.
 *
 * La URL exacta del endpoint, el esquema de autenticación (agreementNumber /
 * userId / apiKey) y el formato de request/response de MiCorreo todavía no
 * están confirmados contra la documentación oficial (requiere una cuenta
 * activa en integracion.correoargentino.com.ar). Todo eso queda aislado acá
 * abajo: cuando haya credenciales reales, ajustar MICORREO_QUOTE_URL, el
 * body de `fetch` y el mapeo de la respuesta sin tocar el resto del sistema.
 */
const MICORREO_QUOTE_URL = "https://api.correoargentino.com.ar/micorreo/v1/tarifas";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      postalCodeOrigin,
      postalCodeDestination,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
    } = await req.json();

    if (!postalCodeDestination || !/^\d{4}$/.test(String(postalCodeDestination).trim())) {
      return jsonResponse({ error: "Ingresá un código postal de destino válido." }, 400);
    }
    if (!postalCodeOrigin) {
      return jsonResponse({ error: "El código postal de origen no está configurado en el panel de administración." }, 400);
    }

    const config = await getCorreoConfig();
    if (!config) {
      return jsonResponse({ error: "Correo Argentino no está configurado. Cargá tus credenciales en el panel de administración." }, 400);
    }

    const resp = await fetch(MICORREO_QUOTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agreement-Number": config.agreementNumber,
        "X-User-Id": config.userId,
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        cpOrigen: String(postalCodeOrigin).trim(),
        cpDestino: String(postalCodeDestination).trim(),
        pesoKg: Number(weightKg) || 1,
        altoCm: Number(heightCm) || 20,
        anchoCm: Number(widthCm) || 20,
        largoCm: Number(lengthCm) || 20,
      }),
    });

    const result = await resp.json().catch(() => null);
    if (!resp.ok || !result) {
      console.error("ERROR cotización Correo Argentino:", result);
      return jsonResponse({ error: "No se pudo cotizar el envío con Correo Argentino en este momento." }, 502);
    }

    const cost = Number(result.precio ?? result.tarifa ?? result.total ?? 0);
    if (!cost || cost <= 0) {
      return jsonResponse({ error: "Correo Argentino no devolvió una tarifa válida para ese destino." }, 502);
    }

    return jsonResponse({
      cost,
      quoteId: result.idCotizacion ?? result.id ?? null,
      raw: result,
    });
  } catch (error) {
    console.error("ERROR cotización Correo Argentino:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
