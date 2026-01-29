import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Heart, Share2, Edit, Trash2, ArrowLeft } from 'lucide-react'
import CommentSection from '../components/CommentSection'

interface Post {
  id: string
  title: string
  content: string
  tags: string[] | null
  is_public: boolean | null
  slug: string | null
  created_at: string
  thumbnail_url: string | null
  views_count: number | null
  user_id: string
  profiles?: {
    username: string
    avatar_url: string | null
  }
}

// 태그 색상 배열
const tagColors = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-red-100 text-red-700',
  'bg-teal-100 text-teal-700',
]

const getTagColor = (tag: string) => {
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return tagColors[hash % tagColors.length]
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [likesCount, setLikesCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [likingInProgress, setLikingInProgress] = useState(false)
  const [heartAnimation, setHeartAnimation] = useState(false)

  useEffect(() => {
    if (id) {
      fetchPost()
      incrementViewCount()
      fetchLikesData()
    }
  }, [id, user])

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setPost(data)
    } catch (error) {
      console.error('Error fetching post:', error)
      toast.error('게시글을 불러오는데 실패했습니다.')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_views', { post_id: id })
    } catch (error) {
      // 조회수 증가 실패는 무시 (RPC 함수가 없을 수 있음)
      console.log('View count increment skipped')
    }
  }

  const fetchLikesData = async () => {
    try {
      // 좋아요 총 개수
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', id)

      setLikesCount(count || 0)

      // 현재 사용자가 좋아요 눌렀는지 확인
      if (user) {
        const { data } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .single()

        setIsLiked(!!data)
      }
    } catch (error) {
      console.error('Error fetching likes:', error)
    }
  }

  const handleLikeToggle = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      navigate('/login')
      return
    }

    if (likingInProgress) return

    // 애니메이션 트리거
    setHeartAnimation(true)
    setTimeout(() => setHeartAnimation(false), 600)

    setLikingInProgress(true)

    try {
      if (isLiked) {
        // 좋아요 취소
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id)

        if (error) throw error

        setIsLiked(false)
        setLikesCount((prev) => prev - 1)
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: id, user_id: user.id })

        if (error) throw error

        setIsLiked(true)
        setLikesCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      toast.error('좋아요 처리에 실패했습니다.')
    } finally {
      setLikingInProgress(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('링크가 클립보드에 복사되었습니다!')
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      toast.error('링크 복사에 실패했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('게시글이 삭제되었습니다.')
      navigate('/')
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('게시글 삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p>게시글을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const isAuthor = user?.id === post.user_id
  const formattedDate = new Date(post.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>목록으로</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* 헤더 영역 */}
          <div className="p-8 border-b">
            {/* 공개/비공개 상태 표시 */}
            {isAuthor && !post.is_public && (
              <div className="mb-6 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                <span className="text-yellow-600">🔒</span>
                <p className="text-sm text-yellow-800">
                  이 글은 비공개 상태입니다. 본인만 볼 수 있습니다.
                </p>
              </div>
            )}

            {/* 제목 */}
            <h1 className="text-4xl font-bold mb-6 leading-tight">{post.title}</h1>

            {/* 작성자 정보 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {post.profiles?.avatar_url ? (
                  <img
                    src={post.profiles.avatar_url}
                    alt={post.profiles.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                    {post.profiles?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {post.profiles?.username || '알 수 없음'}
                  </p>
                  <p className="text-sm text-gray-500">{formattedDate}</p>
                </div>
              </div>

              {/* 작성자 전용 버튼 */}
              {isAuthor && (
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/edit/${post.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    수정
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                </div>
              )}
            </div>

            {/* 태그 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full ${getTagColor(
                      tag
                    )}`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 본문 */}
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {post.content}
              </p>
            </div>
          </div>

          {/* 하단 버튼 영역 */}
          <div className="p-8 border-t bg-gray-50">
            <div className="flex flex-col items-center gap-6">
              {/* 좋아요 섹션 */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleLikeToggle}
                  disabled={likingInProgress}
                  className={`relative flex items-center justify-center w-16 h-16 rounded-full font-medium transition-all ${
                    isLiked
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed ${
                    heartAnimation ? 'animate-heart-beat' : ''
                  }`}
                >
                  <Heart
                    className={`w-8 h-8 transition-all ${isLiked ? 'fill-current' : ''}`}
                  />
                </button>
                <p className="text-gray-700 font-medium">
                  {likesCount === 0 
                    ? '첫 번째로 좋아요를 눌러보세요' 
                    : likesCount === 1 
                    ? '1명이 좋아합니다' 
                    : `${likesCount.toLocaleString()}명이 좋아합니다`
                  }
                </p>
              </div>

              {/* 공유 버튼 */}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-100 border border-gray-300 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                <span>공유</span>
              </button>
            </div>
          </div>
        </article>

        {/* 댓글 섹션 */}
        <div className="mt-8">
          <CommentSection postId={id!} />
        </div>
      </div>
    </div>
  )
}
