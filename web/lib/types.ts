export interface Photo {
  id: string
  url: string
  storage_path: string
  original_url?: string | null
  original_storage_path?: string | null
  created_at: string
}
