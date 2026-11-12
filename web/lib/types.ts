export interface Photo {
  id: string
  url: string
  storage_path: string
  original_url?: string | null
  original_storage_path?: string | null
  position?: number
  likes_count?: number
  blur_data_url?: string | null
  thumbnail_url?: string | null
  width?: number | null
  height?: number | null
  created_at: string
}
