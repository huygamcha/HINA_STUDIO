import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  // Public routes
  index("routes/home.tsx"),
  route("album/:slug", "routes/album.tsx"),

  // Auth
  route("login", "routes/login.tsx"),

  // Admin (protected)
  layout("routes/admin.tsx", [
    route("admin/albums", "routes/admin.albums.tsx"),
    route("admin/new-album", "routes/admin.new-album.tsx"),
    route("admin/upload-images", "routes/admin.upload-images.ts"),
    route("admin/edit-album/:id", "routes/admin.edit-album.$id.tsx"),
    route("admin/api/album/:id", "routes/admin.api.album.$id.ts"),
    route("admin/api/album/:id/media", "routes/admin.api.album.$id.media.ts"),
    route("admin/categories", "routes/admin.categories.tsx"),
  ]),
] satisfies RouteConfig;
