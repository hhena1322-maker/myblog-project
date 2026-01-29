// 이미지 파일 타입 검증
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_IMAGE_WIDTH = 1920
export const MAX_IMAGE_HEIGHT = 1920

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // 파일 타입 검증
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'jpg, png, gif, webp 파일만 업로드 가능합니다.' }
  }

  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '파일이 너무 큽니다. 최대 5MB까지 업로드 가능합니다.' }
  }

  return { valid: true }
}

// 이미지 리사이징 함수
export async function resizeImage(file: File, maxWidth = MAX_IMAGE_WIDTH, maxHeight = MAX_IMAGE_HEIGHT): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('이미지를 읽을 수 없습니다.'))
    }

    img.onload = () => {
      let width = img.width
      let height = img.height

      // 이미지가 최대 크기보다 작으면 원본 그대로 반환
      if (width <= maxWidth && height <= maxHeight) {
        resolve(file)
        return
      }

      // 비율 유지하면서 리사이징
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }
      }

      // Canvas로 리사이징
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context를 가져올 수 없습니다.'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('이미지 변환에 실패했습니다.'))
          }
        },
        file.type,
        0.9 // 품질 90%
      )
    }

    img.onerror = () => {
      reject(new Error('이미지를 로드할 수 없습니다.'))
    }

    reader.readAsDataURL(file)
  })
}
