import { uploadImageToR2, deleteImageFromR2 } from "~/utils/s3.server";
import { updateAlbum, syncAlbumPhotos } from "~/utils/supabase.server";
import { prisma } from "~/utils/db.server";

/**
 * Resource Route: /admin/api/album/$id/media
 * Handles all background media operations for an album
 */
export async function action({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const albumId = params.id;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  /* ── 1. Multiple Photos Upload ── */
  if (intent === "upload-images") {
    try {
      const files = formData.getAll("images") as File[];
      if (!files || files.length === 0)
        return Response.json({ error: "No files provided" }, { status: 400 });

      const folder = `albums/${albumId}`;
      const urls: string[] = [];
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const publicUrl = await uploadImageToR2(buffer, file.name, folder);
        if (publicUrl) urls.push(publicUrl);
      }
      return Response.json({ intent: "upload-urls", urls });
    } catch (err) {
      console.error("[API Upload Photos Error]:", err);
      return Response.json({ error: "Failed to upload images" }, { status: 500 });
    }
  }

  /* ── 2. Single Thumbnail (Cover) Upload ── */
  if (intent === "upload-thumbnail") {
    try {
      const file = formData.get("thumbnail") as File;
      if (!file || file.size === 0)
        return Response.json({ error: "No file provided" }, { status: 400 });

      const oldThumbnailUrl = formData.get("oldThumbnailUrl") as string;
      if (oldThumbnailUrl) await deleteImageFromR2(oldThumbnailUrl);

      const buffer = Buffer.from(await file.arrayBuffer());
      const publicUrl = await uploadImageToR2(buffer, file.name, `albums/${albumId}/thumbnails`);
      if (!publicUrl) return Response.json({ error: "Upload failed" }, { status: 500 });

      await updateAlbum(albumId, { thumbnail_url: publicUrl });
      return Response.json({ intent: "thumbnail-updated", url: publicUrl });
    } catch (err) {
      console.error("[API Upload Thumbnail Error]:", err);
      return Response.json({ error: "Failed to upload thumbnail" }, { status: 500 });
    }
  }

  /* ── 3. Delete Thumbnail ── */
  if (intent === "delete-thumbnail") {
    try {
      const thumbnailUrl = formData.get("thumbnailUrl") as string;
      if (thumbnailUrl) await deleteImageFromR2(thumbnailUrl);
      await updateAlbum(albumId, { thumbnail_url: undefined });
      return Response.json({ intent: "thumbnail-deleted" });
    } catch (err) {
      console.error("[API Delete Thumbnail Error]:", err);
      return Response.json({ error: "Failed to delete thumbnail" }, { status: 500 });
    }
  }

  /* ── 4. Delete Single Photo (Immediate DB + R2) ── */
  if (intent === "delete-photo") {
    try {
      const imageUrl = formData.get("imageUrl") as string;
      if (imageUrl) {
        await deleteImageFromR2(imageUrl);
        await prisma.photo.deleteMany({ where: { url: imageUrl, albumId } });
      }
      return Response.json({ intent: "photo-deleted" });
    } catch (err) {
      console.error("[API Delete Photo Error]:", err);
      return Response.json({ error: "Failed to delete photo" }, { status: 500 });
    }
  }

  return Response.json({ error: "Unknown intent" }, { status: 400 });
}
