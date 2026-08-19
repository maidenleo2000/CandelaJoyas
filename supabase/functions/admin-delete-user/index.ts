import { getCorsHeaders, makeJsonResponse } from "../_shared/cors.ts";
import { getAdminClient, HttpError, requireAdmin } from "../_shared/auth.ts";

// Borra la cuenta de auth.users (no solo el perfil): requiere service_role,
// por eso vive en una Edge Function. public.profiles se borra en cascada.
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const jsonResponse = makeJsonResponse(corsHeaders);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const requester = await requireAdmin(req);
    const { id } = await req.json();

    if (!id) {
      return jsonResponse({ error: "Falta el id del usuario a eliminar." }, 400);
    }
    if (id === requester.id) {
      return jsonResponse({ error: "No podés eliminar tu propia cuenta." }, 400);
    }

    const admin = getAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
