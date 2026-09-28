import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export function cloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

// Audio and video files are stored by Cloudinary under the 'video' resource
// type (even .wav/.mp3), so we must pass it explicitly when deleting.
// Without this, destroy() only looks in the 'image' bucket and returns
// "not found" — the asset stays in the account and keeps eating quota.
export const MEDIA_RESOURCE_TYPE = 'video'

export function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder: 'quizapp-question-media' },
      (error, result) => (error ? reject(error) : resolve(result))
    )
    stream.end(buffer)
  })
}

// Returns { result, resourceType }. Tries the media type first, then falls
// back to 'image' so older image-backed assets are still removable.
export function destroyAsset(publicId, resourceType = MEDIA_RESOURCE_TYPE) {
  const attempt = (type) =>
    new Promise((resolve) => {
      cloudinary.uploader.destroy(publicId, { resource_type: type }, (error, result) =>
        resolve(error ? { result: null, error } : { result })
      )
    })

  return attempt(resourceType).then(async (first) => {
    if (first.result && first.result.result === 'ok') {
      return { result: first.result, resourceType }
    }
    if (first.result && first.result.result === 'not found') {
      const second = await attempt('image')
      if (second.result && second.result.result === 'ok') {
        return { result: second.result, resourceType: 'image' }
      }
    }
    return first
  })
}

export default cloudinary