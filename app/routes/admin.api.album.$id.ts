// Resource route — no default export → returns JSON directly
export async function action({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const { updateAlbum, syncAlbumPhotos } = await import("~/utils/supabase.server");

  const albumId = params.id;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update-album") {
    try {
      const title = formData.get("title") as string;
      const slug = formData.get("slug") as string;
      const description = formData.get("description") as string;
      const categoryId = formData.get("categoryId") as string;
      const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
      const photosJson = formData.get("photos") as string;
      const thumbnailUrl = formData.get("thumbnailUrl") as string;

      const photoUrls: string[] = photosJson ? JSON.parse(photosJson) : [];

      await updateAlbum(albumId, {
        title,
        slug,
        description: description || undefined,
        categoryId,
        sort_order: sortOrder,
        cover_url: photoUrls[0] || thumbnailUrl || undefined,
        thumbnail_url: thumbnailUrl || photoUrls[0] || undefined,
      });

      await syncAlbumPhotos(
        albumId,
        photoUrls.map((url, i) => ({ url, sort_order: i }))
      );

      return Response.json({ intent: "success" });
    } catch (err) {
      console.error("update-album error:", err);
      return Response.json(
        { error: err instanceof Error ? err.message : "Update failed" },
        { status: 500 }
      );
    }
  }

  return Response.json({ error: "Unknown intent." }, { status: 400 });
}
