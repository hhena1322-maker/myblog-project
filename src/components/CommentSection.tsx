import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Heart, MessageCircle, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getRelativeTimeString } from '../lib/timeUtils'

interface Comment {
  id: string
  content: string
  created_at: string
  updated_at: string
  user_id: string
  parent_id: string | null
  deleted_at: string | null
  profiles?: {
    username: string
    avatar_url: string | null
  }
}

interface CommentWithLikes extends Comment {
  likesCount: number
  isLiked: boolean
  repliesCount: number
  replies?: CommentWithLikes[]
}

interface CommentSectionProps {
  postId: string
}

const COMMENTS_PER_PAGE = 20

export default function CommentSection({ postId }: CommentSectionProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [comments, setComments] = useState<CommentWithLikes[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [showReplies, setShowReplies] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    fetchComments()
  }, [postId])

  const fetchComments = async (loadMore = false) => {
    try {
      const currentOffset = loadMore ? offset : 0
      
      // 최상위 댓글만 가져오기 (parent_id가 null인 것)
      const { data: commentsData, error: commentsError } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + COMMENTS_PER_PAGE - 1)

      if (commentsError) throw commentsError

      // 더 가져올 데이터가 있는지 확인
      setHasMore(commentsData.length === COMMENTS_PER_PAGE)

      // 각 댓글의 좋아요 수와 답글 수 가져오기
      const commentsWithData = await Promise.all(
        commentsData.map(async (comment) => {
          // 좋아요 수
          const { count: likesCount } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', comment.id)

          // 현재 사용자가 좋아요 눌렀는지
          let isLiked = false
          if (user) {
            const { data: likeData } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .single()
            isLiked = !!likeData
          }

          // 답글 수
          const { count: repliesCount } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', comment.id)

          return {
            ...comment,
            likesCount: likesCount || 0,
            isLiked,
            repliesCount: repliesCount || 0,
            replies: [],
          }
        })
      )

      if (loadMore) {
        setComments([...comments, ...commentsWithData])
        setOffset(currentOffset + COMMENTS_PER_PAGE)
      } else {
        setComments(commentsWithData)
        setOffset(COMMENTS_PER_PAGE)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
      toast.error('댓글을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    if (!newComment.trim()) {
      toast.error('댓글 내용을 입력해주세요.')
      return
    }

    if (newComment.length > 1000) {
      toast.error('댓글은 최대 1000자까지 입력 가능합니다.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
          parent_id: null,
        })

      if (error) throw error

      toast.success('댓글이 작성되었습니다.')
      setNewComment('')
      // 댓글 목록 새로고침
      setOffset(0)
      await fetchComments()
    } catch (error) {
      console.error('Error creating comment:', error)
      toast.error('댓글 작성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    if (!replyContent.trim()) {
      toast.error('답글 내용을 입력해주세요.')
      return
    }

    if (replyContent.length > 1000) {
      toast.error('답글은 최대 1000자까지 입력 가능합니다.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: replyContent.trim(),
          parent_id: parentId,
        })

      if (error) throw error

      toast.success('답글이 작성되었습니다.')
      setReplyContent('')
      setReplyingTo(null)
      // 답글 목록 새로고침
      await fetchComments()
      // 답글 목록 펼치기
      setTimeout(() => {
        fetchReplies(parentId)
      }, 100)
    } catch (error) {
      console.error('Error creating reply:', error)
      toast.error('답글 작성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string, isReply: boolean = false, parentId?: string) => {
    if (!editContent.trim()) {
      toast.error('댓글 내용을 입력해주세요.')
      return
    }

    if (editContent.length > 1000) {
      toast.error('댓글은 최대 1000자까지 입력 가능합니다.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('post_comments')
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', user?.id)

      if (error) throw error

      toast.success('댓글이 수정되었습니다.')
      setEditingId(null)
      setEditContent('')
      
      if (isReply && parentId) {
        // 답글 수정 시 답글만 새로고침
        await fetchReplies(parentId)
      } else {
        // 댓글 수정 시 전체 새로고침
        await fetchComments()
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      toast.error('댓글 수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string, isReply: boolean = false, parentId?: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return

    try {
      // 소프트 삭제: deleted_at을 현재 시간으로 업데이트
      const { error } = await supabase
        .from('post_comments')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', user?.id)

      if (error) throw error

      toast.success('댓글이 삭제되었습니다.')
      
      if (isReply && parentId) {
        // 답글 삭제 시
        if (showReplies.has(parentId)) {
          await fetchReplies(parentId) // 답글 목록 새로고침
        }
      } else {
        // 댓글 삭제 시
        await fetchComments()
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error('댓글 삭제에 실패했습니다.')
    }
  }

  const fetchReplies = async (parentId: string) => {
    try {
      const { data: repliesData, error: repliesError } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true })

      if (repliesError) throw repliesError

      // 각 답글의 좋아요 수 가져오기
      const repliesWithData = await Promise.all(
        repliesData.map(async (reply) => {
          const { count: likesCount } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', reply.id)

          let isLiked = false
          if (user) {
            const { data: likeData } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', reply.id)
              .eq('user_id', user.id)
              .single()
            isLiked = !!likeData
          }

          return {
            ...reply,
            likesCount: likesCount || 0,
            isLiked,
            repliesCount: 0,
            replies: [],
          }
        })
      )

      // 댓글 목록 업데이트
      setComments(comments.map(comment => {
        if (comment.id === parentId) {
          return { ...comment, replies: repliesWithData }
        }
        return comment
      }))

      // 답글 표시
      setShowReplies(new Set([...showReplies, parentId]))
    } catch (error) {
      console.error('Error fetching replies:', error)
      toast.error('답글을 불러오는데 실패했습니다.')
    }
  }

  const toggleReplies = (commentId: string) => {
    if (showReplies.has(commentId)) {
      const newShowReplies = new Set(showReplies)
      newShowReplies.delete(commentId)
      setShowReplies(newShowReplies)
    } else {
      fetchReplies(commentId)
    }
  }

  const handleToggleLike = async (commentId: string, isLiked: boolean) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      if (isLiked) {
        // 좋아요 취소
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          })

        if (error) throw error
      }

      // 좋아요 상태 업데이트 (댓글과 답글 모두)
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isLiked: !isLiked,
            likesCount: isLiked ? comment.likesCount - 1 : comment.likesCount + 1,
          }
        }
        // 답글 확인
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: comment.replies.map(reply => {
              if (reply.id === commentId) {
                return {
                  ...reply,
                  isLiked: !isLiked,
                  likesCount: isLiked ? reply.likesCount - 1 : reply.likesCount + 1,
                }
              }
              return reply
            })
          }
        }
        return comment
      }))
    } catch (error) {
      console.error('Error toggling like:', error)
      toast.error('좋아요 처리에 실패했습니다.')
    }
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">
        댓글 <span className="text-gray-500">({comments.length})</span>
      </h2>

      {/* 댓글 입력창 */}
      {user ? (
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 작성해주세요..."
            rows={3}
            maxLength={1000}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-gray-500">
              {newComment.length}/1000
            </span>
            <button
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '작성 중...' : '댓글 작성'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-gray-600 mb-4">댓글을 쓰려면 로그인하세요</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인
          </button>
        </div>
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          첫 번째 댓글을 작성해보세요!
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg border border-gray-200 p-4">
              {/* 댓글 헤더 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {comment.profiles?.avatar_url ? (
                    <img
                      src={comment.profiles.avatar_url}
                      alt={comment.profiles.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {comment.profiles?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {comment.deleted_at ? '삭제된 사용자' : (comment.profiles?.username || '알 수 없음')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getRelativeTimeString(comment.created_at)}
                      {!comment.deleted_at && comment.created_at !== comment.updated_at && ' (수정됨)'}
                    </p>
                  </div>
                </div>

                {/* 수정/삭제 버튼 (본인 댓글만, 삭제되지 않은 경우만) */}
                {user?.id === comment.user_id && !comment.deleted_at && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(comment.id)
                        setEditContent(comment.content)
                      }}
                      className="text-gray-500 hover:text-blue-600 transition-colors"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-gray-500 hover:text-red-600 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 댓글 내용 */}
              {comment.deleted_at ? (
                <div className="mb-3 py-2 px-4 bg-gray-100 rounded-lg">
                  <p className="text-gray-500 italic">삭제된 댓글입니다</p>
                </div>
              ) : editingId === comment.id ? (
                <div className="mb-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-500">
                      {editContent.length}/1000
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setEditContent('')
                        }}
                        className="px-4 py-1.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleEditComment(comment.id)}
                        disabled={submitting}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {submitting ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-800 mb-3 whitespace-pre-wrap">{comment.content}</p>
              )}

              {/* 댓글 액션 */}
              <div className="flex items-center gap-4">
                {!comment.deleted_at && (
                  <>
                    <button
                      onClick={() => handleToggleLike(comment.id, comment.isLiked)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${
                        comment.isLiked
                          ? 'text-red-600 hover:text-red-700'
                          : 'text-gray-500 hover:text-red-600'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${comment.isLiked ? 'fill-current' : ''}`}
                      />
                      <span>{comment.likesCount}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (replyingTo === comment.id) {
                          setReplyingTo(null)
                          setReplyContent('')
                        } else {
                          setReplyingTo(comment.id)
                          // @닉네임 자동 추가
                          setReplyContent(`@${comment.profiles?.username || '알 수 없음'} `)
                        }
                      }}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>답글</span>
                    </button>
                  </>
                )}

                {comment.repliesCount > 0 && (
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showReplies.has(comment.id) ? '답글 숨기기' : `답글 ${comment.repliesCount}개 보기`}
                  </button>
                )}
              </div>

              {/* 답글 목록 */}
              {showReplies.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 pl-8 border-l-2 border-blue-200 space-y-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bg-gray-50 rounded-lg p-4 relative">
                      {/* 연결선 */}
                      <div className="absolute -left-8 top-6 w-6 h-px bg-blue-200"></div>
                      {/* 답글 헤더 */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {reply.profiles?.avatar_url ? (
                            <img
                              src={reply.profiles.avatar_url}
                              alt={reply.profiles.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                              {reply.profiles?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-sm text-gray-900">
                              {reply.profiles?.username || '알 수 없음'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {getRelativeTimeString(reply.created_at)}
                              {reply.created_at !== reply.updated_at && ' (수정됨)'}
                            </p>
                          </div>
                        </div>

                        {user?.id === reply.user_id && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingId(reply.id)
                                setEditContent(reply.content)
                              }}
                              className="text-gray-500 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(reply.id, true, comment.id)}
                              className="text-gray-500 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 답글 내용 */}
                      {reply.deleted_at ? (
                        <div className="mb-2 py-2">
                          <p className="text-gray-400 italic text-sm">삭제된 댓글입니다</p>
                        </div>
                      ) : editingId === reply.id ? (
                        <div className="mb-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={2}
                            maxLength={1000}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500">
                              {editContent.length}/1000
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingId(null)
                                  setEditContent('')
                                }}
                                className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleEditComment(reply.id, true, comment.id)}
                                disabled={submitting}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {submitting ? '저장 중...' : '저장'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">{reply.content}</p>
                      )}

                      {/* 답글 액션 */}
                      {!reply.deleted_at && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleLike(reply.id, reply.isLiked)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                              reply.isLiked
                                ? 'text-red-600 hover:text-red-700'
                                : 'text-gray-500 hover:text-red-600'
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${reply.isLiked ? 'fill-current' : ''}`}
                            />
                            <span>{reply.likesCount}</span>
                          </button>

                          <button
                            onClick={() => {
                              if (replyingTo === reply.id) {
                                setReplyingTo(null)
                                setReplyContent('')
                              } else {
                                setReplyingTo(reply.id)
                                // @닉네임 자동 추가 (답글의 답글은 원 댓글에 추가)
                                setReplyContent(`@${reply.profiles?.username || '알 수 없음'} `)
                              }
                            }}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>답글</span>
                          </button>
                        </div>
                      )}
                      {/* 답글에 대한 답글 입력창 */}
                      {replyingTo === reply.id && user && !reply.deleted_at && (
                        <div className="mt-3 pl-4 border-l-2 border-gray-300">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="답글을 작성해주세요..."
                            rows={2}
                            maxLength={1000}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500">
                              {replyContent.length}/1000
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setReplyingTo(null)
                                  setReplyContent('')
                                }}
                                className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={submitting || !replyContent.trim()}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {submitting ? '작성 중...' : '답글 작성'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 답글 입력창 (삭제되지 않은 댓글만) */}
              {replyingTo === comment.id && user && !comment.deleted_at && (
                <div className="mt-4 pl-8 border-l-2 border-blue-300">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="답글을 작성해주세요..."
                    rows={2}
                    maxLength={1000}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-500">
                      {replyContent.length}/1000
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyContent('')
                        }}
                        className="px-4 py-1.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={submitting || !replyContent.trim()}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {submitting ? '작성 중...' : '답글 작성'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 더보기 버튼 */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => fetchComments(true)}
                disabled={loading}
                className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {loading ? '로딩 중...' : '댓글 더보기'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
