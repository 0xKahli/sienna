-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ============================================================
-- Photos table
-- ============================================================
CREATE TABLE IF NOT EXISTS photos (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  url                   TEXT        NOT NULL,
  storage_path          TEXT        NOT NULL,
  original_url          TEXT,
  original_storage_path TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read photos (public gallery)
CREATE POLICY "Public read" ON photos
  FOR SELECT USING (true);

-- Allow service role full access (used server-side via supabaseAdmin)
CREATE POLICY "Service role full access" ON photos
  USING (auth.role() = 'service_role');

-- ============================================================
-- Storage bucket
-- (Also create this in the Supabase Dashboard → Storage)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('sienna', 'sienna', true)
--   ON CONFLICT (id) DO NOTHING;
