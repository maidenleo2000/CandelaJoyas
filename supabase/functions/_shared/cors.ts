// Incluye candelajoyas.com.ar (tienda), https://localhost (WebView de Capacitor
// en Android, usado por ambas apps) y stock.candelajoyas.com.ar
// (Control_Stock_Cande, proyecto separado en Vercel que comparte este mismo
// Supabase y llama a admin-create-user/admin-delete-user).
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://candelajoyas.com.ar,https://www.candelajoyas.com.ar,https://localhost,https://stock.candelajoyas.com.ar")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export function getCorsHeaders(requestOrigin: string | null) {
  const allowOrigin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

export function makeJsonResponse(corsHeaders: Record<string, string>) {
  return (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
