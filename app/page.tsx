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
  const [savedAuthor, setSavedAuthor] = useState('')
  const [loading, setLoading] = useState(false)
  const [openDates, setOpenDates] = useState<string[]>([])

  async function fetchPosts(name: string) {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('author', name)
      .order('created_at', { ascending: false })
    setPosts(data || [])
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
    setOpenDates([today])
  }

  function handleLogin() {
    if (!author.trim()) return
    setSavedAuthor(author)
    fetchPosts(author)
  }

  async function handleSubmit() {
    if (!content.trim()) return
    setLoading(true)
    await supabase.from('posts').insert([{ content, author: savedAuthor }])
    setContent('')
    await fetchPosts(savedAuthor)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('posts').delete().eq('id', id)
    await fetchPosts(savedAuthor)
  }

  function toggleDate(date: string) {
    setOpenDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    )
  }

  const groupedByDate = posts.reduce((acc: any, post) => {
    const date = new Date(post.created_at).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(post)
    return acc
  }, {})

  // 이름 입력 전 화면
  if (!savedAuthor) {
    return (
      <main style={{ background: '#f4f7f4', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '40px 32px', boxShadow: '0 4px 20px rgba(74,103,65,0.1)', width: '100%', maxWidth: '360px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍀</div>
          <h1 style={{ color: '#4a6741', fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>감사 일기</h1>
          <p style={{ color: '#7a9e76', fontSize: '14px', marginBottom: '28px' }}>나의 이름은</p>
          <input
            style={{ border: '1px solid #d4e4d0', borderRadius: '10px', padding: '12px 14px', width: '100%', marginBottom: '12px', outline: 'none', color: '#4a6741', fontSize: '15px', boxSizing: 'border-box' }}
            placeholder="이름 입력"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            style={{ width: '100%', background: '#4a6741', color: 'white', border: 'none', borderRadius: '10px', padding: '13px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
          >
            시작하기
          </button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: '#f4f7f4', minHeight: '100vh', paddingBottom: '40px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 16px 0' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: '#4a6741', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>🍀 {savedAuthor}의 감사일기</h1>
          </div>
          <button
            onClick={() => { setSavedAuthor(''); setPosts([]); setAuthor('') }}
            style={{ color: '#aaa', fontSize: '13px', background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}
          >
            나가기
          </button>
        </div>

        {/* 글쓰기 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(74,103,65,0.08)', marginBottom: '24px' }}>
          <textarea
            style={{ border: '1px solid #d4e4d0', borderRadius: '10px', padding: '10px 14px', width: '100%', resize: 'none', outline: 'none', color: '#333', fontSize: '15px', boxSizing: 'border-box' }}
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

        {/* 글 목록 */}
        {Object.keys(groupedByDate).length === 0 && (
          <p style={{ color: '#7a9e76', textAlign: 'center', fontSize: '14px' }}>아직 글이 없어요. 첫 번째 감사 일기를 써보세요! 🌱</p>
        )}

        {Object.entries(groupedByDate).map(([date, datePosts]: any) => (
          <div key={date} style={{ marginBottom: '12px' }}>
            <button
              onClick={() => toggleDate(date)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: 'none', borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', boxShadow: '0 1px 6px rgba(74,103,65,0.07)', marginBottom: openDates.includes(date) ? '8px' : '0' }}
            >
              <span style={{ color: '#4a6741', fontWeight: 'bold', fontSize: '14px' }}>📅 {date}</span>
              <span style={{ color: '#7a9e76', fontSize: '13px' }}>{openDates.includes(date) ? '▲ 접기' : `▼ ${datePosts.length}개`}</span>
            </button>

            {openDates.includes(date) && datePosts.map((post: any) => (
              <div key={post.id} style={{ background: 'white', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', boxShadow: '0 1px 6px rgba(74,103,65,0.07)' }}>
                <p style={{ color: '#333', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>{post.content}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                  <span style={{ color: '#aaa', fontSize: '12px' }}>
                    {new Date(post.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => handleDelete(post.id)}
                    style={{ color: '#b9a', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  )
}