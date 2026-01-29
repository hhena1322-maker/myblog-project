import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Eye } from 'lucide-react'

interface PostCardProps {
  id: string
  title: string
  content: string
  thumbnailUrl?: string | null
  tags?: string[] | null
  createdAt: string
  author: {
    username: string
    avatarUrl?: string | null
  }
  likesCount: number
  commentsCount: number
  viewsCount: number
  slug?: string | null
}

// 그라데이션 배경 색상 배열
const gradients = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-indigo-500',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-yellow-500 to-orange-500',
  'from-red-500 to-pink-500',
  'from-indigo-500 to-purple-500',
  'from-teal-500 to-green-500',
]

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

// 상대 시간 계산
const getRelativeTime = (dateString: string) => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return '방금 전'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}주 전`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}개월 전`
  return `${Math.floor(diffInSeconds / 31536000)}년 전`
}

// ID 기반 그라데이션 선택
const getGradient = (id: string) => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return gradients[hash % gradients.length]
}

// 태그별 색상 선택
const getTagColor = (tag: string) => {
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return tagColors[hash % tagColors.length]
}

export default function PostCard({
  id,
  title,
  content,
  thumbnailUrl,
  tags,
  createdAt,
  author,
  likesCount,
  commentsCount,
  viewsCount,
  slug,
}: PostCardProps) {
  // 내용 미리보기 (100자 제한)
  const preview = content.length > 100 ? content.substring(0, 100) + '...' : content

  return (
    <Link
      to={`/post/${slug || id}`}
      className="group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      {/* 대표 이미지 또는 그라데이션 배경 */}
      <div className="relative h-48 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getGradient(id)}`} />
        )}
      </div>

      {/* 카드 내용 */}
      <div className="p-5">
        {/* 제목 */}
        <h2 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h2>

        {/* 내용 미리보기 */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{preview}</p>

        {/* 태그 */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className={`px-2.5 py-1 text-xs font-medium rounded-full ${getTagColor(tag)}`}
              >
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 작성자 정보 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt={author.username}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                {author.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700">{author.username}</span>
          </div>
          <span className="text-xs text-gray-500">{getRelativeTime(createdAt)}</span>
        </div>

        {/* 통계 */}
        <div className="flex items-center gap-4 text-sm text-gray-500 border-t pt-3">
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{likesCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{commentsCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{viewsCount}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
