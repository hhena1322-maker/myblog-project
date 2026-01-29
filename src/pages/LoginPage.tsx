import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from || '/' // 이전 페이지 경로 또는 메인 페이지
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      toast.error('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      // 로그인 상태 유지 설정
      if (rememberMe) {
        // localStorage에 세션 저장 (기본값, 브라우저 종료 후에도 유지)
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        })
      } else {
        // sessionStorage에 세션 저장 (브라우저 탭 닫으면 삭제)
        // Supabase 클라이언트를 임시로 재구성
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        })
        
        if (error) throw error
        
        // 세션을 sessionStorage로 이동
        const session = await supabase.auth.getSession()
        if (session.data.session) {
          sessionStorage.setItem('supabase.auth.token', JSON.stringify(session.data.session))
          localStorage.removeItem('supabase.auth.token')
        }
      }

      toast.success('로그인 성공!')
      // 원래 가려던 페이지로 이동
      setTimeout(() => navigate(from, { replace: true }), 500)
    } catch (error: any) {
      console.error('Error signing in:', error)
      if (
        error.message.includes('Invalid login credentials') ||
        error.message.includes('Email not confirmed')
      ) {
        toast.error('이메일 또는 비밀번호가 틀렸습니다.')
      } else {
        toast.error('로그인에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2 text-center text-gray-900">로그인</h1>
          <p className="text-center text-gray-600 mb-8">mybloge에 다시 오신 것을 환영합니다</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="example@email.com"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>

            {/* 로그인 상태 유지 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700">
                로그인 상태 유지
              </label>
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <Link to="/signup" className="text-blue-600 font-semibold hover:underline">
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
