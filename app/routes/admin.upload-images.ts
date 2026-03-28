// Resource route — no default export, so React Router returns action JSON directly
export async function action({ request }: { request: Request }) {
  const { uploadImageToR2 } = await import("~/utils/s3.server");

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "upload-images") {
    try {
      const albumId = formData.get("albumId") as string;
      const files = formData.getAll("images") as File[];

      if (!files || files.length === 0) {
        return Response.json({ intent: "error", error: "No files provided" }, { status: 400 });
      }

      const folder = `albums/${albumId}`;
      const urls: string[] = [];

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const publicUrl = await uploadImageToR2(buffer, file.name, folder);
        if (publicUrl) urls.push(publicUrl);
      }

      return Response.json({ intent: "upload-urls", urls });
    } catch (err) {
      console.error("Server upload error:", err);
      return Response.json(
        { intent: "error", error: err instanceof Error ? err.message : "Failed to upload images" },
        { status: 500 }
      );
    }
  }

  return Response.json({ intent: "error", error: "Unknown intent." }, { status: 400 });
}
