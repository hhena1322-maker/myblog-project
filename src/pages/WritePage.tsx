import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ImageUpload from '../components/ImageUpload'

// 제목을 URL 친화적인 slug로 변환
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣-]/g, '') // 특수문자 제거
    .replace(/\s+/g, '-') // 공백을 하이픈으로
    .replace(/-+/g, '-') // 연속된 하이픈 제거
    .substring(0, 50) // 최대 50자
    + '-' + Date.now().toString().slice(-6) // 고유성을 위해 타임스탬프 추가
}

export default function WritePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [slug, setSlug] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 제목 변경 시 자동으로 slug 생성
  useEffect(() => {
    if (title.trim()) {
      setSlug(generateSlug(title))
    } else {
      setSlug('')
    }
  }, [title])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('로그인이 필요합니다.')
      navigate('/login')
      return
    }

    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.')
      return
    }

    // 태그 처리 (쉼표로 구분, 최대 5개)
    const tagArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 5)

    if (tagArray.length > 5) {
      toast.error('태그는 최대 5개까지 입력할 수 있습니다.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            title: title.trim(),
            content: content.trim(),
            tags: tagArray,
            is_public: isPublic,
            slug: slug,
            thumbnail_url: thumbnailUrl,
            user_id: user.id,
          },
        ])
        .select()
        .single()

      if (error) throw error

      toast.success(isPublic ? '게시글이 발행되었습니다.' : '게시글이 저장되었습니다.')
      navigate(`/post/${data.id}`)
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('게시글 작성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* 상단 버튼 영역 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">새 글 작성</h1>
            <div className="flex items-center gap-3">
              {/* 공개/비공개 스위치 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {isPublic ? '공개' : '비공개'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPublic ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !title.trim() || !content.trim()}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '발행 중...' : '발행하기'}
              </button>
            </div>
          </div>
        </div>

        {/* 글쓰기 폼 */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 제목 */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-4xl font-bold border-none outline-none placeholder-gray-300 focus:ring-0"
                placeholder="제목을 입력하세요"
                required
              />
            </div>

            {/* URL 주소 표시 */}
            {slug && (
              <div className="py-3 px-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">URL 주소:</span>{' '}
                  <code className="text-blue-600">/post/{slug}</code>
                </p>
              </div>
            )}

            {/* 대표 이미지 업로드 */}
            <ImageUpload
              imageUrl={thumbnailUrl}
              onImageChange={setThumbnailUrl}
            />

            {/* 태그 입력 */}
            <div>
              <label htmlFor="tags" className="block text-sm font-semibold text-gray-700 mb-2">
                태그 <span className="text-gray-400 font-normal">(쉼표로 구분, 최대 5개)</span>
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="예: JavaScript, React, 개발"
              />
              <p className="mt-2 text-xs text-gray-500">
                입력된 태그: {tags.split(',').filter(t => t.trim()).length}/5
              </p>
            </div>

            {/* 내용 에디터 */}
            <div>
              <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
                내용
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y transition-all"
                placeholder="당신의 이야기를 들려주세요..."
                required
              />
            </div>
          </form>
        </div>

        {/* 하단 안내 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {isPublic ? '✅ 발행하면 모든 사람이 볼 수 있습니다.' : '🔒 비공개 글은 본인만 볼 수 있습니다.'}
          </p>
        </div>
      </div>
    </div>
  )
}
