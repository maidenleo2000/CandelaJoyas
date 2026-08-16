import { supabase } from "./supabase";

export async function getMpConfigStatus() {
  const { data, error } = await supabase.functions.invoke("get-mp-config-status");
  if (error) throw error;
  return data; // { configured }
}

export async function saveMpConfig(accessToken) {
  const { data, error } = await supabase.functions.invoke("save-mp-config", {
    body: { accessToken },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
