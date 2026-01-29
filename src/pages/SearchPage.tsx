import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FileText, User } from 'lucide-react'
import { toast } from 'sonner'

interface Post {
  id: string
  title: string
  content: string
  created_at: string
  user_id: string
  profiles?: {
    username: string
    avatar_url: string | null
  }
}

interface Profile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
}

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [posts, setPosts] = useState<Post[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (query.trim()) {
      searchContent()
    } else {
      setLoading(false)
    }
  }, [query])

  const searchContent = async () => {
    setLoading(true)
    try {
      // 글 검색 (제목 또는 내용에 검색어 포함)
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('is_public', true)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20)

      if (postsError) throw postsError

      // 작성자 검색 (닉네임에 검색어 포함)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .limit(10)

      if (profilesError) throw profilesError

      setPosts(postsData || [])
      setProfiles(profilesData || [])
    } catch (error) {
      console.error('Error searching:', error)
      toast.error('검색에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 검색어 강조 함수
  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text

    const regex = new RegExp(`(${searchQuery})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-gray-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!query.trim()) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">검색어를 입력해주세요.</p>
          </div>
        </div>
      </div>
    )
  }

  const totalResults = posts.length + profiles.length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* 검색 결과 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            '<span className="text-blue-600">{query}</span>' 검색 결과
          </h1>
          <p className="text-gray-600">
            총 {totalResults}개의 결과를 찾았습니다.
          </p>
        </div>

        {totalResults === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">검색 결과가 없습니다.</p>
            <p className="text-gray-400 text-sm mt-2">다른 검색어를 시도해보세요.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 글 결과 */}
            {posts.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    글 ({posts.length})
                  </h2>
                </div>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <Link
                      key={post.id}
                      to={`/post/${post.id}`}
                      className="block p-5 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <h3 className="text-xl font-semibold mb-2 text-gray-900">
                        {highlightText(post.title, query)}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {highlightText(post.content, query)}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          {post.profiles?.avatar_url ? (
                            <img
                              src={post.profiles.avatar_url}
                              alt={post.profiles.username}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                              {post.profiles?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                          <span>{post.profiles?.username || '알 수 없음'}</span>
                        </div>
                        <span>•</span>
                        <span>
                          {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 작성자 결과 */}
            {profiles.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-6">
                  <User className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    작성자 ({profiles.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                            {profile.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {highlightText(profile.username, query)}
                          </p>
                          {profile.bio && (
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {profile.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
