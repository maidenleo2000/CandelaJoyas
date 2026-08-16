import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient, HttpError, requireAdmin } from "../_shared/auth.ts";

// Reemplaza el truco de "secondary Firebase app" de UsersTab.jsx: crear un
// usuario con contraseña arbitraria requiere el service_role key, que nunca
// puede viajar al cliente, así que esto vive en una Edge Function.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireAdmin(req);
    const { email, password, displayName, role } = await req.json();

    if (!email || !password || password.length < 6) {
      return jsonResponse({ error: "Email y contraseña (mínimo 6 caracteres) son requeridos." }, 400);
    }

    const admin = getAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName || "" },
    });

    if (error) {
      const message = error.message.includes("already been registered")
        ? "Este correo ya tiene una cuenta creada en el sistema."
        : error.message;
      return jsonResponse({ error: message }, 400);
    }

    // El trigger on_auth_user_created ya creó la fila en profiles con role='client';
    // la actualizamos si se pidió un rol distinto.
    if (role && role !== "client") {
      await admin.from("profiles").update({ role, display_name: displayName || "" }).eq("id", data.user.id);
    }

    return jsonResponse({ success: true, id: data.user.id });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
