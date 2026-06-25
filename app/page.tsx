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
  const [author, setAuthor] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
    setPosts(data || [])
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  async function handleSubmit() {
    if (!content.trim() || !author.trim()) return
    setLoading(true)
    await supabase.from('posts').insert([{ content, author }])
    setContent('')
    await fetchPosts()
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('posts').delete().eq('id', id)
    await fetchPosts()
  }

  // 날짜별로 묶기
  const groupedByDate = posts.reduce((acc: any, post) => {
    const date = new Date(post.created_at).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(post)
    return acc
  }, {})

  // 날짜 안에서 이름별로 묶기
  const groupByAuthor = (posts: any[]) => {
    return posts.reduce((acc: any, post) => {
      const name = post.author || '익명'
      if (!acc[name]) acc[name] = []
      acc[name].push(post)
      return acc
    }, {})
  }

  return (
    <main style={{ background: '#f4f7f4', minHeight: '100vh' }} className="pb-12">
      <div className="max-w-xl mx-auto px-4 pt-10">

        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 style={{ color: '#4a6741' }} className="text-3xl font-bold mb-1">🌿 감사 일기</h1>
          <p style={{ color: '#7a9e76' }} className="text-sm">오늘 감사한 일을 적어보세요</p>
        </div>

        {/* 글쓰기 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(74,103,65,0.08)' }} className="mb-8">
          <input
            style={{ border: '1px solid #d4e4d0', borderRadius: '10px', padding: '10px 14px', width: '100%', marginBottom: '10px', outline: 'none', color: '#4a6741' }}
            placeholder="이름을 입력하세요 🌱"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <textarea
            style={{ border: '1px solid #d4e4d0', borderRadius: '10px', padding: '10px 14px', width: '100%', resize: 'none', outline: 'none', color: '#333' }}
            rows={4}
            placeholder="오늘 감사한 일은 무엇인가요? ✨"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ marginTop: '10px', width: '100%', background: '#4a6741', color: 'white', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
          >
            {loading ? '저장 중...' : '✏️ 감사 일기 쓰기'}
          </button>
        </div>

        {/* 글 목록 - 날짜별 */}
        {Object.keys(groupedByDate).length === 0 && (
          <p style={{ color: '#7a9e76' }} className="text-center text-sm">아직 글이 없어요. 첫 번째 감사 일기를 써보세요! 🌱</p>
        )}

        {Object.entries(groupedByDate).map(([date, datePosts]: any) => (
          <div key={date} className="mb-8">
            {/* 날짜 헤더 */}
            <div style={{ color: '#4a6741', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px', paddingLeft: '4px' }}>
              📅 {date}
            </div>

            {/* 이름별로 묶기 */}
            {Object.entries(groupByAuthor(datePosts)).map(([name, authorPosts]: any) => (
              <div key={name} className="mb-4">
                <div style={{ color: '#7a9e76', fontSize: '13px', fontWeight: '600', marginBottom: '6px', paddingLeft: '4px' }}>
                  🌿 {name}
                </div>
                {authorPosts.map((post: any) => (
                  <div key={post.id} style={{ background: 'white', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', boxShadow: '0 1px 6px rgba(74,103,65,0.07)' }}>
                    <p style={{ color: '#333', fontSize: '15px', lineHeight: '1.6' }}>{post.content}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                      <span style={{ color: '#aaa', fontSize: '12px' }}>
                        {new Date(post.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => handleDelete(post.id)}
                        style={{ color: '#c9a', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  )
}
