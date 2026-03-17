import { createClient } from "@supabase/supabase-js";
import { prisma } from "./db.server";

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
    );
  }

  return createClient(url, key);
}

// Keep supabase client for non-DB tasks if needed (e.g. storage, auth)
export const supabase = getSupabaseClient();

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface Album {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  cover_url: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  album_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

/** Category helpers */
export async function getCategories(): Promise<Category[]> {
  console.log("Prisma keys:", Object.keys(prisma || {}));
  const categories = await (prisma as any).category.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return categories.map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    sort_order: c.sortOrder,
  }));
}

export async function createCategory(data: { name: string; slug: string; sort_order?: number }) {
  return prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      sortOrder: data.sort_order || 0,
    },
  });
}

export async function updateCategory(id: string, data: { name?: string; slug?: string; sort_order?: number }) {
  return prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      sortOrder: data.sort_order,
    },
  });
}

export async function deleteCategory(id: string) {
  return prisma.category.delete({ where: { id } });
}

/** Fetch all albums with category info */
export async function getAlbums(): Promise<Album[]> {
  const albums = await prisma.album.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return albums.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    description: a.description,
    categoryId: a.categoryId,
    categoryName: a.category.name,
    categorySlug: a.category.slug,
    cover_url: a.coverUrl,
    created_at: a.createdAt.toISOString(),
  }));
}

/** Fetch a single album by Slug */
export async function getAlbumBySlug(slug: string): Promise<Album | null> {
  const album = await prisma.album.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!album) return null;

  return {
    id: album.id,
    slug: album.slug,
    title: album.title,
    description: album.description,
    categoryId: album.categoryId,
    categoryName: album.category.name,
    categorySlug: album.category.slug,
    cover_url: album.coverUrl,
    created_at: album.createdAt.toISOString(),
  };
}

/** Fetch photos for an album */
export async function getAlbumPhotos(albumId: string): Promise<Photo[]> {
  const photos = await prisma.photo.findMany({
    where: { albumId },
    orderBy: { sortOrder: "asc" },
  });

  return photos.map((p) => ({
    id: p.id,
    album_id: p.albumId,
    url: p.url,
    caption: p.caption,
    sort_order: p.sortOrder || 0,
    created_at: p.createdAt.toISOString(),
  }));
}

/** Create a new album */
export async function createAlbum(album: {
  title: string;
  slug: string;
  description?: string;
  categoryId: string;
  cover_url?: string;
}): Promise<Album> {
  const created = await prisma.album.create({
    data: {
      title: album.title,
      slug: album.slug,
      description: album.description,
      categoryId: album.categoryId,
      coverUrl: album.cover_url,
    },
    include: { category: true },
  });

  return {
    id: created.id,
    slug: created.slug,
    title: created.title,
    description: created.description,
    categoryId: created.categoryId,
    categoryName: created.category.name,
    categorySlug: created.category.slug,
    cover_url: created.coverUrl,
    created_at: created.createdAt.toISOString(),
  };
}

/** Insert photo records for an album */
export async function addPhotosToAlbum(
  photos: {
    album_id: string;
    url: string;
    caption?: string;
    sort_order: number;
  }[]
): Promise<Photo[]> {
  await prisma.photo.createMany({
    data: photos.map((p) => ({
      albumId: p.album_id,
      url: p.url,
      caption: p.caption,
      sortOrder: p.sort_order,
    })),
  });

  return getAlbumPhotos(photos[0].album_id);
}

/** Delete an album and its photos */
export async function deleteAlbum(id: string): Promise<void> {
  await prisma.album.delete({
    where: { id },
  });
}
