'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [posts, setPosts] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error('불러오기 에러:', error)
    setPosts(data || [])
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  async function handleSubmit() {
    if (!content.trim()) return
    setLoading(true)
    const { error } = await supabase.from('posts').insert([{ content }])
    if (error) console.error('저장 에러:', error)
    setContent('')
    await fetchPosts()
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('posts').delete().eq('id', id)
    await fetchPosts()
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-2">🙏 감사 일기</h1>
      <p className="text-center text-gray-500 mb-8">오늘 감사한 일을 적어보세요</p>

      <div className="mb-8">
        <textarea
          className="w-full border rounded-xl p-4 text-base resize-none focus:outline-none focus:ring-2 focus:ring-yellow-300"
          rows={4}
          placeholder="오늘 감사한 일은 무엇인가요? ✨"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-2 w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl transition"
        >
          {loading ? '저장 중...' : '✏️ 감사 일기 쓰기'}
        </button>
      </div>

      <div className="space-y-4">
        {posts.length === 0 && (
          <p className="text-center text-gray-400">아직 글이 없어요. 첫 번째 감사 일기를 써보세요! 🌱</p>
        )}
        {posts.map((post) => (
          <div key={post.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-400">
                {new Date(post.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </span>
              <button
                onClick={() => handleDelete(post.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}