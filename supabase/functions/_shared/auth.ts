import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const ADMIN_EMAILS = [
  "leandromartello1987@gmail.com",
  "yesyrockmetal@gmail.com",
];

export function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Verifica que quien llama esté logueado y sea admin, igual que
 * assertIsAdmin() en las Cloud Functions originales.
 */
export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new HttpError(401, "Debes iniciar sesión.");

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new HttpError(401, "Debes iniciar sesión.");

  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return user;
  }

  const admin = getAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new HttpError(403, "Solo un administrador puede realizar esta acción.");
  }

  return user;
}
