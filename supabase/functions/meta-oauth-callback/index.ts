import { getAdminClient } from "../_shared/auth.ts";
import { getMetaCredentials } from "../_shared/metaConfig.ts";
import { META_GRAPH_VERSION } from "../_shared/metaPublish.ts";

function redirectUrl() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  return `https://${projectRef}.functions.supabase.co/meta-oauth-callback`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { appId, appSecret } = await getMetaCredentials();
  const returnUrl = (url.searchParams.get("state") && decodeURIComponent(url.searchParams.get("state")!))
    || "https://candelajoyas.com.ar/admin";

  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    const reason = url.searchParams.get("error_description") || errorParam;
    return Response.redirect(`${returnUrl}?social=error&reason=${encodeURIComponent(reason)}`, 302);
  }

  const code = url.searchParams.get("code");
  if (!code || !appId || !appSecret) {
    return Response.redirect(`${returnUrl}?social=error&reason=missing_config`, 302);
  }

  try {
    const metaRedirectUri = redirectUrl();

    const tokenUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(metaRedirectUri)}&client_secret=${appSecret}&code=${code}`;
    const tokenResp = await fetch(tokenUrl);
    const tokenData = await tokenResp.json();
    if (!tokenResp.ok || !tokenData.access_token) {
      console.error("Error obteniendo access_token:", tokenData);
      return Response.redirect(`${returnUrl}?social=error&reason=token_exchange_failed`, 302);
    }

    const longLivedUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`;
    const longLivedResp = await fetch(longLivedUrl);
    const longLivedData = await longLivedResp.json();
    const userAccessToken = longLivedData.access_token || tokenData.access_token;

    const pagesResp = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${userAccessToken}`);
    const pagesData = await pagesResp.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return Response.redirect(`${returnUrl}?social=error&reason=no_pages`, 302);
    }

    const page = pagesData.data[0];

    const admin = getAdminClient();
    await admin.from("integration_settings").upsert({
      key: "socialAccounts",
      data: {
        connected: true,
        fbUserAccessToken: userAccessToken,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        igUserId: page.instagram_business_account?.id || null,
        igUsername: page.instagram_business_account?.username || null,
      },
      updated_at: new Date().toISOString(),
    });

    return Response.redirect(`${returnUrl}?social=connected`, 302);
  } catch (error) {
    console.error("Error en meta-oauth-callback:", error);
    return Response.redirect(`${returnUrl}?social=error&reason=unexpected`, 302);
  }
});
