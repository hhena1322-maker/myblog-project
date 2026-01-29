import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { Search, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 로컬스토리지에서 최근 검색어 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // 최근 검색어 저장
  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return

    const updated = [
      trimmed,
      ...recentSearches.filter(q => q !== trimmed)
    ].slice(0, 5) // 최대 5개만 저장

    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const handleSearch = (query: string = searchQuery) => {
    const trimmed = query.trim()
    if (!trimmed) return

    saveRecentSearch(trimmed)
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    setSearchQuery('')
    setIsFocused(false)
    searchInputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isFocused || recentSearches.length === 0) {
      if (e.key === 'Enter') {
        handleSearch()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < recentSearches.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0) {
        handleSearch(recentSearches[selectedIndex])
      } else {
        handleSearch()
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false)
      setSelectedIndex(-1)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('로그아웃 되었습니다.')
    navigate('/')
  }

  return (
    <nav className="bg-white shadow-md relative z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            mybloge
          </Link>

          {/* 검색창 */}
          <div className="flex-1 max-w-xl mx-8 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="검색어를 입력하세요"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* 최근 검색어 추천 */}
            {isFocused && recentSearches.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                <p className="px-4 py-2 text-xs font-semibold text-gray-500">
                  최근 검색어
                </p>
                {recentSearches.map((recent, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(recent)}
                    className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                      selectedIndex === index ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{recent}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/write"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  글쓰기
                </Link>
                
                {/* 사용자 프로필 정보 */}
                <div className="flex items-center gap-3">
                  <Link
                    to="/mypage"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {/* 프로필 아바타 */}
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                    </div>
                    {/* 닉네임 */}
                    <span className="text-gray-700 font-medium">
                      {profile?.username || '사용자'}
                    </span>
                  </Link>
                </div>

                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-gray-700 hover:text-red-600 transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                >
                  로그인
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
