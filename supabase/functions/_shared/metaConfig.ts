import { getAdminClient } from "./auth.ts";

export async function getMetaCredentials() {
  const admin = getAdminClient();
  const { data } = await admin
    .from("integration_settings")
    .select("data")
    .eq("key", "metaAppConfig")
    .maybeSingle();

  const appId = data?.data?.appId || Deno.env.get("META_APP_ID") || null;
  const appSecret = data?.data?.appSecret || Deno.env.get("META_APP_SECRET") || null;
  return { appId, appSecret };
}

export function socialAccountKey() {
  return "socialAccounts";
}
