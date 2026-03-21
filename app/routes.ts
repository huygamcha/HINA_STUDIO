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
    route("admin", "routes/admin.dashboard.tsx"),
    route("admin/albums", "routes/admin.albums.tsx"),
    route("admin/new-album", "routes/admin.new-album.tsx"),
    route("admin/edit-album/:id", "routes/admin.edit-album.$id.tsx"),
    route("admin/categories", "routes/admin.categories.tsx"),
  ]),
] satisfies RouteConfig;
