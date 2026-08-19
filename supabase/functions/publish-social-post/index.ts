import { getCorsHeaders, makeJsonResponse } from "../_shared/cors.ts";
import { getAdminClient, HttpError, requireAdmin } from "../_shared/auth.ts";
import { runPublish, SocialAccount } from "../_shared/metaPublish.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const jsonResponse = makeJsonResponse(corsHeaders);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await requireAdmin(req);
    const { productId, productName, imageUrls, caption, targets, scheduledFor } = await req.json();

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return jsonResponse({ error: "Elegí al menos una foto." }, 400);
    }
    if (!targets?.facebook && !targets?.instagram) {
      return jsonResponse({ error: "Elegí al menos una red social." }, 400);
    }

    const admin = getAdminClient();
    const { data: accountRow } = await admin
      .from("integration_settings")
      .select("data")
      .eq("key", "socialAccounts")
      .maybeSingle();

    if (!accountRow?.data?.connected) {
      return jsonResponse({ error: "Primero vinculá tus cuentas de Facebook/Instagram." }, 412);
    }
    const account = accountRow.data as SocialAccount;

    const basePost = {
      product_id: productId || null,
      product_name: productName || "",
      image_urls: imageUrls,
      caption: caption || "",
      targets: { facebook: !!targets.facebook, instagram: !!targets.instagram },
      created_by: user.email || null,
    };

    const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;
    const isFuture = scheduledDate && scheduledDate.getTime() > Date.now() + 60 * 1000;

    if (isFuture) {
      const { data: inserted, error } = await admin.from("social_posts").insert({
        ...basePost,
        status: "scheduled",
        scheduled_for: scheduledDate!.toISOString(),
      }).select("id").single();
      if (error) throw error;
      return jsonResponse({ scheduled: true, id: inserted.id });
    }

    const results = await runPublish(account, { imageUrls, caption: caption || "", targets: basePost.targets });
    const values = Object.values(results) as { success?: boolean }[];
    const anySuccess = values.some((r) => r?.success);
    const anyRequested = values.length > 0;
    const status = anyRequested && anySuccess
      ? (values.every((r) => r.success) ? "published" : "partial")
      : "failed";

    const { data: inserted, error } = await admin.from("social_posts").insert({
      ...basePost,
      status,
      published_at: new Date().toISOString(),
      results,
    }).select("id").single();
    if (error) throw error;

    return jsonResponse({ scheduled: false, id: inserted.id, status, results });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
