import { getAdminClient } from "./auth.ts";

/**
 * Credenciales de Correo Argentino (MiCorreo) cargadas por cada tienda desde
 * su propio panel de administración (integration_settings), igual que
 * mercadopagoConfig. Se guardan como blob genérico para no depender de
 * nombres de campo exactos hasta confirmarlos contra la documentación real
 * de MiCorreo.
 */
export interface CorreoArgentinoConfig {
  agreementNumber: string;
  userId: string;
  apiKey: string;
  updatedBy?: string | null;
}

export async function getCorreoConfig(): Promise<CorreoArgentinoConfig | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("integration_settings")
    .select("data")
    .eq("key", "correoArgentinoConfig")
    .maybeSingle();

  return (data?.data as CorreoArgentinoConfig) || null;
}
