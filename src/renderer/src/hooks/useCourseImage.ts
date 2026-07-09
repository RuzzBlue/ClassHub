import { useEffect, useState } from 'react'
import { getAssetBlobUrl } from '../lib/utils'

export function useCourseImage(courseId: string, imagePath: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!imagePath) {
      setUrl(null)
      return
    }
    let revoked: string | null = null
    getAssetBlobUrl(courseId, imagePath)
      .then((blobUrl) => {
        revoked = blobUrl
        setUrl(blobUrl)
      })
      .catch(() => setUrl(null))
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [courseId, imagePath])

  return url
}
