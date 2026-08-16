export const META_GRAPH_VERSION = "v21.0";

export async function publishToFacebook(
  pageId: string,
  pageAccessToken: string,
  imageUrls: string[],
  caption: string,
) {
  if (imageUrls.length === 1) {
    const resp = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: imageUrls[0], caption, access_token: pageAccessToken }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || "Error publicando en Facebook");
    return { success: true, postId: data.post_id || data.id };
  }

  const uploadedIds: string[] = [];
  for (const url of imageUrls.slice(0, 10)) {
    const resp = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, published: false, access_token: pageAccessToken }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || "Error subiendo foto a Facebook");
    uploadedIds.push(data.id);
  }

  const feedResp = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: caption,
      attached_media: uploadedIds.map((id) => ({ media_fbid: id })),
      access_token: pageAccessToken,
    }),
  });
  const feedData = await feedResp.json();
  if (!feedResp.ok) throw new Error(feedData.error?.message || "Error creando publicación en Facebook");
  return { success: true, postId: feedData.id };
}

export async function publishToInstagram(
  igUserId: string,
  pageAccessToken: string,
  imageUrls: string[],
  caption: string,
) {
  const images = imageUrls.slice(0, 10);

  if (images.length === 1) {
    const createResp = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: images[0], caption, access_token: pageAccessToken }),
    });
    const createData = await createResp.json();
    if (!createResp.ok) throw new Error(createData.error?.message || "Error creando el contenedor de Instagram");

    const publishResp = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: createData.id, access_token: pageAccessToken }),
    });
    const publishData = await publishResp.json();
    if (!publishResp.ok) throw new Error(publishData.error?.message || "Error publicando en Instagram");
    return { success: true, postId: publishData.id };
  }

  const childIds: string[] = [];
  for (const url of images) {
    const resp = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: pageAccessToken }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || "Error subiendo imagen del carrusel a Instagram");
    childIds.push(data.id);
  }

  const carouselResp = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      caption,
      children: childIds,
      access_token: pageAccessToken,
    }),
  });
  const carouselData = await carouselResp.json();
  if (!carouselResp.ok) throw new Error(carouselData.error?.message || "Error creando el carrusel de Instagram");

  const publishResp = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carouselData.id, access_token: pageAccessToken }),
  });
  const publishData = await publishResp.json();
  if (!publishResp.ok) throw new Error(publishData.error?.message || "Error publicando el carrusel en Instagram");
  return { success: true, postId: publishData.id };
}

export interface SocialAccount {
  connected: boolean;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igUserId: string | null;
  igUsername: string | null;
}

export async function runPublish(
  account: SocialAccount,
  { imageUrls, caption, targets }: { imageUrls: string[]; caption: string; targets: { facebook: boolean; instagram: boolean } },
) {
  const results: Record<string, unknown> = {};

  if (targets.facebook) {
    try {
      results.facebook = await publishToFacebook(account.pageId, account.pageAccessToken, imageUrls, caption);
    } catch (error) {
      results.facebook = { success: false, error: (error as Error).message };
    }
  }

  if (targets.instagram) {
    if (!account.igUserId) {
      results.instagram = { success: false, error: "No hay una cuenta de Instagram profesional vinculada a la Página." };
    } else {
      try {
        results.instagram = await publishToInstagram(account.igUserId, account.pageAccessToken, imageUrls, caption);
      } catch (error) {
        results.instagram = { success: false, error: (error as Error).message };
      }
    }
  }

  return results;
}
