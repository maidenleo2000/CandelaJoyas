import { supabase } from "./supabase";

async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data;
}

export async function getMetaAppConfigStatus() {
  return invoke("get-meta-app-config-status"); // { configured, appId }
}

export async function saveMetaAppConfig(appId, appSecret) {
  return invoke("save-meta-app-config", { appId, appSecret });
}

/**
 * Arma la URL del diálogo de login de Facebook para vincular Página + Instagram.
 * El App ID se pisa desde integration_settings (cargado en el panel); ya no
 * depende de variables de entorno del frontend.
 */
export async function getMetaConnectUrl() {
  const { configured, appId } = await getMetaAppConfigStatus();
  if (!configured || !appId) {
    throw new Error(
      "Primero cargá el App ID y el App Secret de tu app de Meta en la sección de arriba.",
    );
  }
  const scope = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "instagram_basic",
    "instagram_content_publish",
    "business_management",
  ].join(",");

  const META_GRAPH_VERSION = "v21.0";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const metaRedirectUri = `https://${projectRef}.functions.supabase.co/meta-oauth-callback`;

  const returnUrl = encodeURIComponent(window.location.origin + "/admin");

  return `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
    metaRedirectUri,
  )}&scope=${scope}&response_type=code&state=${returnUrl}`;
}

export async function getSocialAccountStatus() {
  return invoke("get-social-account-status");
}

export async function disconnectSocialAccount() {
  return invoke("disconnect-social-account");
}

export async function publishSocialPost(payload) {
  return invoke("publish-social-post", payload);
}
