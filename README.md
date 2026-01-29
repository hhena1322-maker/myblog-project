# MyBloge - 블로그 플랫폼

React + TypeScript + Vite + Supabase로 구축된 블로그 플랫폼입니다.

## 기능

- ✅ 회원가입 / 로그인 / 로그아웃
- ✅ 게시글 작성 / 수정 / 삭제
- ✅ 게시글 목록 및 상세 보기
- ✅ 마이 페이지 (내가 작성한 글 목록)
- ✅ 반응형 네비게이션 바

## 페이지 구성

- **메인 페이지** (`/`) - 모든 게시글 목록
- **상세 페이지** (`/post/:id`) - 게시글 상세 보기
- **글쓰기 페이지** (`/write`) - 새 게시글 작성 (로그인 필요)
- **로그인 페이지** (`/login`) - 로그인
- **회원가입 페이지** (`/signup`) - 회원가입
- **마이 페이지** (`/mypage`) - 내 프로필 및 작성한 글 (로그인 필요)

## 기술 스택

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **Routing**: React Router v6
- **Backend**: Supabase (Auth + Database)
- **UI Components**: shadcn/ui, Radix UI

## 환경 설정

1. `.env` 파일 생성 (`.env.example` 참고):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. 패키지 설치:

```bash
npm install
```

3. 개발 서버 실행:

```bash
npm run dev
```

4. 브라우저에서 http://localhost:5173/ 접속

## 데이터베이스 구조

### profiles 테이블
- `id` (UUID, PK) - 사용자 ID
- `username` (TEXT) - 사용자명
- `email` (TEXT) - 이메일
- `created_at` (TIMESTAMP) - 생성일
- `updated_at` (TIMESTAMP) - 수정일

### posts 테이블
- `id` (UUID, PK) - 게시글 ID
- `title` (TEXT) - 제목
- `content` (TEXT) - 내용
- `user_id` (UUID, FK) - 작성자 ID
- `created_at` (TIMESTAMP) - 생성일
- `updated_at` (TIMESTAMP) - 수정일

## Supabase MCP 활용

이 프로젝트는 Supabase MCP (Model Context Protocol)를 활용하여 데이터베이스 마이그레이션과 타입 생성을 자동화했습니다.

- `apply_migration` - 데이터베이스 테이블 생성
- `generate_typescript_types` - TypeScript 타입 자동 생성
- `get_project_url` / `get_publishable_keys` - 프로젝트 정보 조회

## 보안 (Row Level Security)

Supabase RLS 정책이 적용되어 있습니다:

- **profiles**: 누구나 조회 가능, 본인만 수정 가능
- **posts**: 누구나 조회 가능, 로그인한 사용자만 작성 가능, 본인만 수정/삭제 가능

## 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

## 라이센스

MIT
