import { getAdminClient } from "./auth.ts";

/**
 * El Access Token de Mercado Pago lo carga cada tienda desde su propio panel
 * de administración (integration_settings), para que cada cliente pueda usar
 * su propia cuenta de Mercado Pago sin depender de un secret compartido.
 * MERCADOPAGO_ACCESS_TOKEN como variable de entorno queda solo como fallback
 * para desarrollo/pruebas.
 */
export async function getMpAccessToken(): Promise<string | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("integration_settings")
    .select("data")
    .eq("key", "mercadopagoConfig")
    .maybeSingle();

  return data?.data?.accessToken || Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || null;
}
