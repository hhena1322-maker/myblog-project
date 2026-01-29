import { useState, useRef } from 'react'
import type { DragEvent } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { validateImageFile, resizeImage } from '../lib/imageUtils'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ImageUploadProps {
  imageUrl: string | null
  onImageChange: (url: string | null) => void
}

export default function ImageUpload({ imageUrl, onImageChange }: ImageUploadProps) {
  const { user } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    // 파일 검증
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast.error(validation.error || '파일을 업로드할 수 없습니다.')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // 이미지 리사이징
      setUploadProgress(30)
      const resizedBlob = await resizeImage(file)

      // 파일명 생성 (고유한 파일명)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `thumbnails/${fileName}`

      setUploadProgress(60)

      // Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, resizedBlob, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      setUploadProgress(90)

      // Public URL 가져오기
      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      setUploadProgress(100)
      onImageChange(data.publicUrl)
      toast.success('이미지가 업로드되었습니다.')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      // 파일 인풋 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = () => {
    onImageChange(null)
    toast.success('이미지가 제거되었습니다.')
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        대표 이미지 <span className="text-gray-400 font-normal">(선택사항)</span>
      </label>

      {imageUrl ? (
        // 미리보기
        <div className="relative rounded-lg overflow-hidden border-2 border-gray-200">
          <img
            src={imageUrl}
            alt="대표 이미지"
            className="w-full h-64 object-cover"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        // 업로드 영역
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          } ${uploading ? 'pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploading ? (
            // 업로드 진행 중
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <p className="text-sm text-gray-600 mb-2">업로드 중...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{uploadProgress}%</p>
            </div>
          ) : (
            // 업로드 안내
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                클릭하거나 파일을 드래그하여 업로드
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG, GIF, WEBP (최대 5MB)
              </p>
            </div>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        ⚡ 이미지는 자동으로 최적화됩니다 (최대 1920px)
      </p>
    </div>
  )
}
