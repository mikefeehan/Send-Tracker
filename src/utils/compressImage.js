/**
 * Compress an image File to max dimension + JPEG quality.
 * Returns a new File (JPEG) or the original if compression failed.
 *
 * @param {File} file — the source image file
 * @param {object} [opts]
 * @param {number} [opts.maxDimension=1600] — max width or height in pixels
 * @param {number} [opts.quality=0.85] — JPEG quality 0..1
 * @returns {Promise<File>}
 */
export async function compressImage(file, { maxDimension = 1600, quality = 0.85 } = {}) {
  if (!file || !file.type.startsWith('image/')) return file

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = dataUrl
    })

    const { width, height } = img
    const longest = Math.max(width, height)

    // If already small enough, don't bother re-encoding (unless it's huge anyway)
    if (longest <= maxDimension && file.size < 800_000) return file

    const scale = Math.min(1, maxDimension / longest)
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, targetW, targetH)

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file

    // If compression somehow made it bigger, use the original
    if (blob.size >= file.size) return file

    const newName = file.name.replace(/\.[^.]+$/, '.jpg')
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch (err) {
    console.warn('Image compression failed, using original:', err)
    return file
  }
}
