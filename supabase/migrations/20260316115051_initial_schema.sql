-- ═══════════════════════════════════════════
-- Tiệm ảnh Hina Studio — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Albums table
create table if not exists albums (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  category    text not null,
  cover_url   text,
  created_at  timestamptz default now()
);

-- Photos table
create table if not exists photos (
  id          uuid primary key default uuid_generate_v4(),
  album_id    uuid not null references albums(id) on delete cascade,
  url         text not null,
  caption     text,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- Indexes
create index if not exists idx_photos_album on photos(album_id);
create index if not exists idx_albums_category on albums(category);

-- RLS (Row Level Security) - allow public read, authenticated write
alter table albums enable row level security;
alter table photos enable row level security;

-- Public read policies
create policy "Albums are viewable by everyone"
  on albums for select using (true);

create policy "Photos are viewable by everyone"
  on photos for select using (true);

-- Service role has full access (used by our server-side code)
-- No additional policies needed — service role key bypasses RLS
