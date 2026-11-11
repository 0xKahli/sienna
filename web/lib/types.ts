export interface Photo {
  id: string
  url: string
  storage_path: string
  original_url?: string | null
  original_storage_path?: string | null
  position?: number
  likes_count?: number
  created_at: string
}
