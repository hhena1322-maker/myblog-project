export default function PostCardSkeleton() {
  return (
    <div className="block bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
      {/* 이미지 스켈레톤 */}
      <div className="h-48 bg-gray-200" />

      {/* 카드 내용 */}
      <div className="p-5">
        {/* 제목 스켈레톤 */}
        <div className="h-6 bg-gray-200 rounded mb-2" />
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />

        {/* 내용 미리보기 스켈레톤 */}
        <div className="h-4 bg-gray-200 rounded mb-2" />
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-4" />

        {/* 태그 스켈레톤 */}
        <div className="flex gap-2 mb-4">
          <div className="h-6 w-16 bg-gray-200 rounded-full" />
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
          <div className="h-6 w-14 bg-gray-200 rounded-full" />
        </div>

        {/* 작성자 정보 스켈레톤 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>

        {/* 통계 스켈레톤 */}
        <div className="flex gap-4 border-t pt-3">
          <div className="h-4 w-12 bg-gray-200 rounded" />
          <div className="h-4 w-12 bg-gray-200 rounded" />
          <div className="h-4 w-12 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}
