import { supabase } from "./supabase";

export async function getCorreoConfigStatus() {
  const { data, error } = await supabase.functions.invoke("get-correo-config-status");
  if (error) throw error;
  return data; // { configured }
}

export async function saveCorreoConfig({ agreementNumber, userId, apiKey }) {
  const { data, error } = await supabase.functions.invoke("save-correo-config", {
    body: { agreementNumber, userId, apiKey },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function quoteCorreoEnvio({ postalCodeOrigin, postalCodeDestination, weightKg, lengthCm, widthCm, heightCm }) {
  const { data, error } = await supabase.functions.invoke("quote-correo-envio", {
    body: { postalCodeOrigin, postalCodeDestination, weightKg, lengthCm, widthCm, heightCm },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data; // { cost, quoteId, raw }
}

export async function createCorreoEnvio(saleId) {
  const { data, error } = await supabase.functions.invoke("create-correo-envio", {
    body: { saleId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data; // { trackingNumber, labelUrl }
}
