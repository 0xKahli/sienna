import { Photo } from '@/lib/types'
import { supabaseAdmin } from '@/lib/supabase'
import Gallery from '@/components/Gallery'

export const dynamic = 'force-dynamic'

async function getPhotos(): Promise<Photo[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('photos')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data as Photo[]
  } catch {
    return []
  }
}

export default async function HomePage() {
  const photos = await getPhotos()

  return (
    <div className="pb-24">
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-[#8b7355]">
          <p className="text-sm tracking-widest uppercase opacity-60">no images yet</p>
        </div>
      ) : (
        <Gallery photos={photos} />
      )}
    </div>
  )
}
