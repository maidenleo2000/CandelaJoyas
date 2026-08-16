import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/auth.ts";
import { runPublish, SocialAccount } from "../_shared/metaPublish.ts";

// Invocada cada 5 minutos por pg_cron (ver supabase/migrations/0003_triggers_and_cron.sql)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = getAdminClient();
  const now = new Date().toISOString();

  const { data: due, error: dueError } = await admin
    .from("social_posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", now)
    .limit(20);

  if (dueError) return jsonResponse({ error: dueError.message }, 500);
  if (!due || due.length === 0) return jsonResponse({ processed: 0 });

  const { data: accountRow } = await admin
    .from("integration_settings")
    .select("data")
    .eq("key", "socialAccounts")
    .maybeSingle();

  if (!accountRow?.data?.connected) {
    console.warn("Hay publicaciones programadas pero no hay cuentas vinculadas.");
    return jsonResponse({ processed: 0, warning: "no_account_connected" });
  }
  const account = accountRow.data as SocialAccount;

  for (const post of due) {
    try {
      const results = await runPublish(account, {
        imageUrls: post.image_urls,
        caption: post.caption,
        targets: post.targets,
      });
      const values = Object.values(results) as { success?: boolean }[];
      const allOk = values.every((r) => r?.success);
      await admin.from("social_posts").update({
        status: allOk ? "published" : (values.some((r) => r?.success) ? "partial" : "failed"),
        published_at: new Date().toISOString(),
        results,
      }).eq("id", post.id);
    } catch (error) {
      console.error(`Error publicando post programado ${post.id}:`, error);
      await admin.from("social_posts").update({
        status: "failed",
        results: { error: (error as Error).message },
      }).eq("id", post.id);
    }
  }

  return jsonResponse({ processed: due.length });
});
