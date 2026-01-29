import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'
import PostCardSkeleton from '../components/PostCardSkeleton'
import { ArrowUpDown } from 'lucide-react'

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
  likes_count?: number
  comments_count?: number
}

type SortOption = 'latest' | 'popular'

const POSTS_PER_PAGE = 12

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('latest')
  const [page, setPage] = useState(0)
  
  const observerTarget = useRef<HTMLDivElement>(null)

  // 게시글 가져오기
  const fetchPosts = async (pageNum: number, sort: SortOption, reset = false) => {
    try {
      if (pageNum === 0) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      // 기본 쿼리
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `, { count: 'exact' })
        .eq('is_public', true)

      // 정렬
      if (sort === 'latest') {
        query = query.order('created_at', { ascending: false })
      }

      // 페이지네이션
      const from = pageNum * POSTS_PER_PAGE
      const to = from + POSTS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // 각 게시글의 좋아요, 댓글 수 가져오기
      const postsWithCounts = await Promise.all(
        (data || []).map(async (post) => {
          const [likesResult, commentsResult] = await Promise.all([
            supabase
              .from('post_likes')
              .select('id', { count: 'exact', head: true })
              .eq('post_id', post.id),
            supabase
              .from('post_comments')
              .select('id', { count: 'exact', head: true })
              .eq('post_id', post.id),
          ])

          return {
            ...post,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
          }
        })
      )

      // 인기순 정렬 (좋아요 + 댓글 수)
      if (sort === 'popular') {
        postsWithCounts.sort((a, b) => {
          const scoreA = (a.likes_count || 0) + (a.comments_count || 0)
          const scoreB = (b.likes_count || 0) + (b.comments_count || 0)
          return scoreB - scoreA
        })
      }

      if (reset) {
        setPosts(postsWithCounts)
      } else {
        setPosts((prev) => [...prev, ...postsWithCounts])
      }

      setHasMore(count ? from + POSTS_PER_PAGE < count : false)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    setPage(0)
    fetchPosts(0, sortBy, true)
  }, [sortBy])

  // 무한 스크롤
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && !loadingMore && hasMore) {
        const nextPage = page + 1
        setPage(nextPage)
        fetchPosts(nextPage, sortBy, false)
      }
    },
    [loadingMore, hasMore, page, sortBy]
  )

  useEffect(() => {
    const element = observerTarget.current
    const option = { threshold: 0.1 }
    const observer = new IntersectionObserver(handleObserver, option)

    if (element) observer.observe(element)

    return () => {
      if (element) observer.unobserve(element)
    }
  }, [handleObserver])

  // 정렬 변경
  const handleSortChange = (newSort: SortOption) => {
    if (newSort !== sortBy) {
      setSortBy(newSort)
      setPosts([])
      setPage(0)
      setHasMore(true)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold">최근 게시글</h1>
        
        {/* 정렬 옵션 */}
        <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-1">
          <button
            onClick={() => handleSortChange('latest')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              sortBy === 'latest'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            최신순
          </button>
          <button
            onClick={() => handleSortChange('popular')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              sortBy === 'popular'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            인기순
          </button>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">아직 게시글이 없습니다.</p>
          <Link
            to="/write"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            첫 게시글을 작성해보세요!
          </Link>
        </div>
      ) : (
        <>
          {/* 게시글 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                id={post.id}
                title={post.title}
                content={post.content}
                thumbnailUrl={post.thumbnail_url}
                tags={post.tags}
                createdAt={post.created_at}
                author={{
                  username: post.profiles?.username || '알 수 없음',
                  avatarUrl: post.profiles?.avatar_url,
                }}
                likesCount={post.likes_count || 0}
                commentsCount={post.comments_count || 0}
                viewsCount={post.views_count || 0}
                slug={post.slug}
              />
            ))}
          </div>

          {/* 무한 스크롤 트리거 */}
          {hasMore && (
            <div ref={observerTarget} className="mt-8">
              {loadingMore && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <PostCardSkeleton key={i} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
