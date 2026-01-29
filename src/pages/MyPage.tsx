import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Camera, Edit2, Heart, FileText, Eye, MessageCircle, Lock, Globe, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { validateImageFile, resizeImage } from '../lib/imageUtils'

interface Post {
  id: string
  title: string
  content: string
  created_at: string
  is_public: boolean | null
  views_count: number | null
  thumbnail_url: string | null
  likesCount?: number
  commentsCount?: number
}

interface Profile {
  username: string
  email: string
  bio: string | null
  avatar_url: string | null
  email_public: boolean | null
  created_at: string
}

interface Stats {
  totalPosts: number
  totalLikes: number
}

export default function MyPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({ totalPosts: 0, totalLikes: 0 })
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editForm, setEditForm] = useState({ 
    username: '', 
    bio: '', 
    email_public: true,
    avatar_url: '' 
  })
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  
  // 탭 관련 상태
  const [activeTab, setActiveTab] = useState<'my-posts' | 'liked-posts'>('my-posts')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'views'>('latest')
  const [filterBy, setFilterBy] = useState<'all' | 'public' | 'private'>('all')
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  const fetchUserData = async () => {
    try {
      const [postsResponse, profileResponse] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single(),
      ])

      if (postsResponse.error) throw postsResponse.error
      if (profileResponse.error) throw profileResponse.error

      const postsData = postsResponse.data || []
      
      // 각 게시글의 좋아요 수와 댓글 수 가져오기
      const postsWithStats = await Promise.all(
        postsData.map(async (post) => {
          const [likesResult, commentsResult] = await Promise.all([
            supabase
              .from('post_likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id),
            supabase
              .from('post_comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id)
              .is('deleted_at', null)
          ])
          
          return {
            ...post,
            likesCount: likesResult.count || 0,
            commentsCount: commentsResult.count || 0,
          }
        })
      )

      setPosts(postsWithStats)
      setProfile(profileResponse.data)
      setEditForm({
        username: profileResponse.data.username,
        bio: profileResponse.data.bio || '',
        email_public: profileResponse.data.email_public ?? true,
        avatar_url: profileResponse.data.avatar_url || '',
      })

      // 통계 가져오기
      await fetchStats(postsData)
      
      // 좋아요한 글 가져오기
      await fetchLikedPosts()
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLikedPosts = async () => {
    try {
      // 사용자가 좋아요한 게시글 ID 가져오기
      const { data: likedPostIds, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user?.id)

      if (likesError) throw likesError

      if (likedPostIds && likedPostIds.length > 0) {
        const postIds = likedPostIds.map(like => like.post_id)
        
        // 좋아요한 게시글 정보 가져오기
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .in('id', postIds)
          .order('created_at', { ascending: false })

        if (postsError) throw postsError

        // 좋아요 수와 댓글 수 추가
        const postsWithStats = await Promise.all(
          (postsData || []).map(async (post) => {
            const [likesResult, commentsResult] = await Promise.all([
              supabase
                .from('post_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id),
              supabase
                .from('post_comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id)
                .is('deleted_at', null)
            ])
            
            return {
              ...post,
              likesCount: likesResult.count || 0,
              commentsCount: commentsResult.count || 0,
            }
          })
        )

        setLikedPosts(postsWithStats)
      } else {
        setLikedPosts([])
      }
    } catch (error) {
      console.error('Error fetching liked posts:', error)
    }
  }

  const fetchStats = async (userPosts: Post[]) => {
    try {
      // 작성한 글 수
      const totalPosts = userPosts.length

      // 받은 좋아요 총합
      if (totalPosts > 0) {
        const postIds = userPosts.map(post => post.id)
        const { count } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds)

        setStats({ totalPosts, totalLikes: count || 0 })
      } else {
        setStats({ totalPosts: 0, totalLikes: 0 })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // 파일 검증
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast.error(validation.error || '파일을 업로드할 수 없습니다.')
      return
    }

    setUploadingAvatar(true)
    try {
      // 이미지 리사이징
      const resizedBlob = await resizeImage(file, 500, 500)

      // 파일명 생성
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-avatar-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, resizedBlob, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Public URL 가져오기
      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      // 프로필 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      toast.success('프로필 사진이 변경되었습니다.')
      await refreshProfile()
      await fetchUserData()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('프로필 사진 업로드에 실패했습니다.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleEditAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 검증
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast.error(validation.error || '파일을 업로드할 수 없습니다.')
      return
    }

    setEditAvatarFile(file)
    // 미리보기 생성
    const reader = new FileReader()
    reader.onload = (e) => {
      setEditAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleEditAvatarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files[0]
    if (!file) return

    // 파일 검증
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast.error(validation.error || '파일을 업로드할 수 없습니다.')
      return
    }

    setEditAvatarFile(file)
    // 미리보기 생성
    const reader = new FileReader()
    reader.onload = (e) => {
      setEditAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    if (!user) return

    if (!editForm.username.trim()) {
      toast.error('닉네임을 입력해주세요.')
      return
    }

    try {
      let avatarUrl = editForm.avatar_url

      // 새 프로필 사진이 있으면 업로드
      if (editAvatarFile) {
        // 이미지 리사이징
        const resizedBlob = await resizeImage(editAvatarFile, 500, 500)

        // 파일명 생성
        const fileExt = editAvatarFile.name.split('.').pop()
        const fileName = `${user.id}-avatar-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        // Supabase Storage에 업로드
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, resizedBlob, {
            contentType: editAvatarFile.type,
            cacheControl: '3600',
            upsert: true,
          })

        if (uploadError) throw uploadError

        // Public URL 가져오기
        const { data } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath)

        avatarUrl = data.publicUrl
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: editForm.username.trim(),
          bio: editForm.bio.trim() || null,
          email_public: editForm.email_public,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('프로필이 수정되었습니다.')
      setIsEditingProfile(false)
      setEditAvatarFile(null)
      setEditAvatarPreview(null)
      await refreshProfile()
      await fetchUserData()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('프로필 수정에 실패했습니다.')
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user?.id)

      if (error) throw error

      toast.success('게시글이 삭제되었습니다.')
      await fetchUserData()
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('게시글 삭제에 실패했습니다.')
    }
  }

  // 정렬 및 필터링
  const getFilteredAndSortedPosts = () => {
    const currentPosts = activeTab === 'my-posts' ? posts : likedPosts
    
    // 필터링 (내 글만)
    let filtered = currentPosts
    if (activeTab === 'my-posts') {
      if (filterBy === 'public') {
        filtered = currentPosts.filter(post => post.is_public === true)
      } else if (filterBy === 'private') {
        filtered = currentPosts.filter(post => post.is_public === false)
      }
    }

    // 정렬
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortBy === 'popular') {
        return (b.likesCount || 0) - (a.likesCount || 0)
      } else if (sortBy === 'views') {
        return (b.views_count || 0) - (a.views_count || 0)
      }
      return 0
    })

    return sorted
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          {/* 배경 그라데이션 */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          
          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16">
              {/* 프로필 사진 */}
              <div className="relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-5xl font-bold text-white">
                        {profile?.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                  {/* 변경 버튼 (hover 시 표시) */}
                  <button
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-white">
                      <Camera className="w-8 h-8 mb-1" />
                      <span className="text-sm font-medium">변경</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 프로필 정보 */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {profile?.username || '알 수 없음'}
                    </h1>
                    <p className="text-gray-600 mb-1">{profile?.email || user?.email}</p>
                    {profile?.bio && (
                      <p className="text-gray-700 mt-3 max-w-2xl">{profile.bio}</p>
                    )}
                  </div>
                  
                  {/* 프로필 편집 버튼 */}
                  <button
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>프로필 편집</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                  <span>가입일: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 프로필 편집 폼 */}
        {isEditingProfile && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">프로필 편집</h2>
            <div className="space-y-6">
              {/* 프로필 사진 변경 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  프로필 사진
                </label>
                <div className="flex items-center gap-6">
                  {/* 현재 사진 */}
                  <div className="relative">
                    {editAvatarPreview ? (
                      <img
                        src={editAvatarPreview}
                        alt="Preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : editForm.avatar_url ? (
                      <img
                        src={editForm.avatar_url}
                        alt={editForm.username}
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full border-4 border-gray-200 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">
                          {editForm.username?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 드래그 앤 드롭 영역 */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleEditAvatarDrop}
                    onClick={() => editFileInputRef.current?.click()}
                    className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleEditAvatarSelect}
                      className="hidden"
                    />
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">
                      클릭하거나 드래그하여 사진 변경
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, GIF, WEBP (최대 5MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* 닉네임 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  닉네임
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={50}
                />
              </div>

              {/* 한 줄 소개 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  한 줄 소개
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="자신을 소개해주세요 (최대 200자)"
                />
                <p className="text-xs text-gray-500 mt-1">{editForm.bio.length}/200</p>
              </div>

              {/* 이메일 공개 여부 */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      이메일 공개
                    </label>
                    <p className="text-xs text-gray-500">
                      다른 사용자가 내 이메일을 볼 수 있습니다
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, email_public: !editForm.email_public })}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      editForm.email_public ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        editForm.email_public ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setIsEditingProfile(false)
                    setEditForm({
                      username: profile?.username || '',
                      bio: profile?.bio || '',
                      email_public: profile?.email_public ?? true,
                      avatar_url: profile?.avatar_url || '',
                    })
                    setEditAvatarFile(null)
                    setEditAvatarPreview(null)
                  }}
                  className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 통계 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">작성한 글</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPosts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                <Heart className="w-7 h-7 text-red-600 fill-current" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">받은 좋아요</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalLikes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* 탭 헤더 */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('my-posts')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'my-posts'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                작성한 글 ({posts.length})
              </button>
              <button
                onClick={() => setActiveTab('liked-posts')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'liked-posts'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                좋아요한 글 ({likedPosts.length})
              </button>
            </div>
          </div>

          {/* 컨트롤 바 */}
          {activeTab === 'my-posts' && posts.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
              {/* 정렬 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">정렬:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'latest' | 'popular' | 'views')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="latest">최신순</option>
                  <option value="popular">인기순</option>
                  <option value="views">조회수순</option>
                </select>
              </div>

              {/* 필터 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">필터:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterBy('all')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      filterBy === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setFilterBy('public')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      filterBy === 'public'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    공개
                  </button>
                  <button
                    onClick={() => setFilterBy('private')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      filterBy === 'private'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    비공개
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 글 목록 */}
          <div className="p-6">
            {getFilteredAndSortedPosts().length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {activeTab === 'my-posts'
                    ? '아직 작성한 글이 없습니다.'
                    : '아직 좋아요한 글이 없습니다.'}
                </p>
                {activeTab === 'my-posts' && (
                  <Link
                    to="/write"
                    className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    첫 글을 작성해보세요!
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getFilteredAndSortedPosts().map((post) => (
                  <div
                    key={post.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredPostId(post.id)}
                    onMouseLeave={() => setHoveredPostId(null)}
                  >
                    <Link
                      to={`/post/${post.id}`}
                      className="block h-full p-5 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all bg-white"
                    >
                      {/* 썸네일 */}
                      {post.thumbnail_url && (
                        <img
                          src={post.thumbnail_url}
                          alt={post.title}
                          className="w-full h-40 object-cover rounded-lg mb-4"
                        />
                      )}

                      {/* 제목 */}
                      <h3 className="text-lg font-semibold mb-2 text-gray-900 line-clamp-2">
                        {post.title}
                      </h3>

                      {/* 날짜 */}
                      <p className="text-gray-500 text-sm mb-3">
                        {new Date(post.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>

                      {/* 통계 */}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{post.views_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{post.likesCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.commentsCount || 0}</span>
                        </div>
                      </div>

                      {/* 공개/비공개 배지 */}
                      <div className="mt-3">
                        {post.is_public ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            <Globe className="w-3 h-3" />
                            공개
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                            <Lock className="w-3 h-3" />
                            비공개
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* hover 시 수정/삭제 버튼 (내 글만) */}
                    {activeTab === 'my-posts' && hoveredPostId === post.id && (
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            navigate(`/edit/${post.id}`)
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          수정
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleDeletePost(post.id)
                          }}
                          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors shadow-lg flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
