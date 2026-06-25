'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CATEGORIES = [
  '월급', '일급',
  '식비', '생활비', '교통비', '문화생활', '의료', '쇼핑',
  '카드비', '보험료', '용돈', '가족행사', '경조사', '저축', '기타'
]
const CATEGORY_COLORS: Record<string, string> = {
  '월급': '#2D6A4F', '일급': '#40916C',
  '식비': '#F4A261', '생활비': '#E9A178', '교통비': '#2A9D8F', '문화생활': '#E76F51',
  '의료': '#E9C46A', '쇼핑': '#F4845F', '카드비': '#6D597A',
  '보험료': '#355070', '용돈': '#B56576', '가족행사': '#9A8C98',
  '경조사': '#4A4E69', '저축': '#52B788', '기타': '#A0A0A0'
}
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

function adjustPayday(year: number, month: number, payday: number) {
  const d = new Date(year, month, payday)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1)
  return d
}

export default function Budget() {
  const [authed, setAuthed] = useState(false)
  const [household, setHousehold] = useState('')
  const [mode, setMode] = useState<'login' | 'signup' | 'rename'>('login')
  const [nickInput, setNickInput] = useState('')
  const [pwInput, setPwInput] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [newNick, setNewNick] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMsg, setAuthMsg] = useState('')

  const [tab, setTab] = useState('dashboard')
  const [items, setItems] = useState<any[]>([])
  const [fixed, setFixed] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])

  const [payday, setPayday] = useState(25)
  const [viewMode, setViewMode] = useState('payday')

  const now = new Date()
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)

  const [type, setType] = useState('지출')
  const [category, setCategory] = useState('식비')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [editId, setEditId] = useState<string | null>(null)

  const [fxName, setFxName] = useState('')
  const [fxAmount, setFxAmount] = useState('')
  const [fxEditId, setFxEditId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')

  const [showAllCat, setShowAllCat] = useState(false)
  const [showAllItems, setShowAllItems] = useState(false)
  const [openFixed, setOpenFixed] = useState(true)
  const [openCat, setOpenCat] = useState(true)
  const [openSettings, setOpenSettings] = useState(false)

  const periodKey = `${selYear}-${String(selMonth).padStart(2, '0')}`

  async function fetchAll(hh: string) {
    const [t, f, n] = await Promise.all([
      supabase.from('transactions').select('*').eq('household', hh).order('date', { ascending: false }),
      supabase.from('fixed_expenses').select('*').eq('household', hh).order('created_at'),
      supabase.from('notes').select('*').eq('household', hh).order('created_at', { ascending: false }),
    ])
    setItems(t.data || []); setFixed(f.data || []); setNotes(n.data || [])
  }
  async function fetchSettings(hh: string) {
    const { data } = await supabase.from('app_settings').select('*').eq('household', hh).single()
    if (data) { setPayday(data.payday); setViewMode(data.view_mode) }
    else { await supabase.from('app_settings').insert([{ household: hh, payday: 25, view_mode: 'payday' }]) }
  }
  useEffect(() => { if (authed && household) { fetchAll(household); fetchSettings(household) } }, [authed, household])

  async function handleLogin() {
    if (!nickInput || !pwInput) { setAuthError('닉네임과 비밀번호를 입력하세요'); return }
    const { data } = await supabase.from('accounts').select('*').eq('nickname', nickInput).single()
    if (data && data.password === pwInput) { setHousehold(data.nickname); setAuthed(true); setAuthError('') }
    else { setAuthError('닉네임 또는 비밀번호가 맞지 않아요') }
  }
  async function handleSignup() {
    if (!nickInput || !pwInput) { setAuthError('닉네임과 비밀번호를 입력하세요'); return }
    if (pwInput !== pwConfirm) { setAuthError('비밀번호가 일치하지 않아요'); return }
    const { data: exists } = await supabase.from('accounts').select('nickname').eq('nickname', nickInput).single()
    if (exists) { setAuthError('이미 있는 닉네임이에요'); return }
    const { error } = await supabase.from('accounts').insert([{ nickname: nickInput, password: pwInput }])
    if (error) { setAuthError('가입 중 문제가 생겼어요'); return }
    setHousehold(nickInput); setAuthed(true); setAuthError('')
  }
  async function handleRename() {
    if (!nickInput || !pwInput || !newNick) { setAuthError('모든 칸을 입력하세요'); return }
    // 현재 계정 확인
    const { data: acc } = await supabase.from('accounts').select('*').eq('nickname', nickInput).single()
    if (!acc || acc.password !== pwInput) { setAuthError('현재 닉네임 또는 비밀번호가 맞지 않아요'); return }
    // 새 닉네임 중복 확인
    const { data: dup } = await supabase.from('accounts').select('nickname').eq('nickname', newNick).single()
    if (dup) { setAuthError('이미 있는 닉네임이에요'); return }
    // 계정 + 모든 데이터의 집 이름 변경
    await supabase.from('accounts').update({ nickname: newNick }).eq('nickname', nickInput)
    await supabase.from('transactions').update({ household: newNick }).eq('household', nickInput)
    await supabase.from('fixed_expenses').update({ household: newNick }).eq('household', nickInput)
    await supabase.from('notes').update({ household: newNick }).eq('household', nickInput)
    await supabase.from('app_settings').update({ household: newNick }).eq('household', nickInput)
    setAuthError(''); setAuthMsg(`닉네임이 "${newNick}"(으)로 변경됐어요! 새 닉네임으로 로그인하세요`)
    setMode('login'); setNickInput(''); setPwInput(''); setNewNick('')
  }

  function getPeriod() {
    if (viewMode === 'calendar') {
      return { start: new Date(selYear, selMonth - 1, 1), end: new Date(selYear, selMonth, 0) }
    } else {
      const start = adjustPayday(selYear, selMonth - 1, payday)
      const end = adjustPayday(selYear, selMonth, payday)
      end.setDate(end.getDate() - 1)
      return { start, end }
    }
  }
  const { start, end } = getPeriod()
  const inPeriod = (dateStr: string) => { const d = new Date(dateStr); return d >= start && d <= end }

  const periodItems = items.filter(i => inPeriod(i.date))
  const income = periodItems.filter(i => i.type === '수입').reduce((s, i) => s + i.amount, 0)
  const variableExpense = periodItems.filter(i => i.type === '지출').reduce((s, i) => s + i.amount, 0)
  const periodFixed = fixed.filter(f => f.period === periodKey)
  const fixedTotal = periodFixed.reduce((s, f) => s + f.amount, 0)
  const totalExpense = variableExpense + fixedTotal

  const byCategory = CATEGORIES.map(cat => ({
    cat, total: periodItems.filter(i => i.type === '지출' && i.category === cat).reduce((s, i) => s + i.amount, 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
  const maxCat = byCategory.length > 0 ? byCategory[0].total : 1
  const visibleCats = showAllCat ? byCategory : byCategory.slice(0, 5)
  const sortedItems = [...periodItems].sort((a, b) => b.date.localeCompare(a.date))
  const visibleItems = showAllItems ? sortedItems : sortedItems.slice(0, 5)

  async function handleAdd() {
    if (!amount || isNaN(Number(amount))) return
    await supabase.from('transactions').insert([{ type, category, amount: Number(amount), memo, date, household }])
    setAmount(''); setMemo(''); await fetchAll(household)
  }
  function startEdit(item: any) {
    setEditId(item.id); setType(item.type); setCategory(item.category)
    setAmount(String(item.amount)); setMemo(item.memo || ''); setDate(item.date)
    setTab('list'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  async function handleUpdate() {
    if (!editId || !amount || isNaN(Number(amount))) return
    await supabase.from('transactions').update({ type, category, amount: Number(amount), memo, date }).eq('id', editId)
    setEditId(null); setAmount(''); setMemo(''); await fetchAll(household)
  }
  function cancelEdit() { setEditId(null); setAmount(''); setMemo('') }
  async function handleDelete(id: string) { await supabase.from('transactions').delete().eq('id', id); await fetchAll(household) }

  async function handleAddFixed() {
    if (!fxName || !fxAmount || isNaN(Number(fxAmount))) return
    if (fxEditId) {
      await supabase.from('fixed_expenses').update({ name: fxName, amount: Number(fxAmount) }).eq('id', fxEditId)
      setFxEditId(null)
    } else {
      await supabase.from('fixed_expenses').insert([{ name: fxName, amount: Number(fxAmount), period: periodKey, household }])
    }
    setFxName(''); setFxAmount(''); await fetchAll(household)
  }
  function startEditFixed(f: any) {
    setFxEditId(f.id); setFxName(f.name); setFxAmount(String(f.amount))
  }
  function cancelEditFixed() { setFxEditId(null); setFxName(''); setFxAmount('') }
  async function handleDeleteFixed(id: string) { await supabase.from('fixed_expenses').delete().eq('id', id); await fetchAll(household) }

  async function handleAddNote() {
    if (!noteInput.trim()) return
    await supabase.from('notes').insert([{ content: noteInput, household }]); setNoteInput(''); await fetchAll(household)
  }
  async function handleDeleteNote(id: string) { await supabase.from('notes').delete().eq('id', id); await fetchAll(household) }
  async function saveSettings(newPayday: number, newMode: string) {
    setPayday(newPayday); setViewMode(newMode)
    await supabase.from('app_settings').update({ payday: newPayday, view_mode: newMode }).eq('household', household)
  }
  function handleLogout() {
    setAuthed(false); setHousehold(''); setNickInput(''); setPwInput(''); setPwConfirm(''); setNewNick('')
    setItems([]); setFixed([]); setNotes([]); setEditId(null); setFxEditId(null); setMode('login')
  }

  if (!authed) {
    return (
      <main style={s.loginWrap}>
        <div style={s.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 40 }}>💰</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 4px', color: '#355070' }}>우리집 가계부</h1>
            <p style={{ fontSize: 13, color: '#9A8C98' }}>
              {mode === 'login' ? '로그인하세요' : mode === 'signup' ? '새 가계부를 만드세요' : '닉네임을 변경하세요'}
            </p>
          </div>

          {authMsg && <p style={{ color: '#52B788', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{authMsg}</p>}

          {mode === 'rename' ? (
            <>
              <input placeholder="현재 닉네임" value={nickInput} onChange={e => setNickInput(e.target.value)} style={s.input} />
              <input type="password" placeholder="비밀번호" value={pwInput} onChange={e => setPwInput(e.target.value)} style={s.input} />
              <input placeholder="새 닉네임" value={newNick} onChange={e => setNewNick(e.target.value)} style={s.input} />
            </>
          ) : (
            <>
              <input placeholder="닉네임 (예: 우리집)" value={nickInput} onChange={e => setNickInput(e.target.value)} style={s.input} />
              <input type="password" placeholder="비밀번호" value={pwInput} onChange={e => setPwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && mode === 'login' && handleLogin()} style={s.input} />
              {mode === 'signup' && (
                <input type="password" placeholder="비밀번호 확인" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} style={s.input} />
              )}
            </>
          )}

          {authError && <p style={{ color: '#E76F51', fontSize: 13, margin: '4px 0' }}>{authError}</p>}

          <button
            onClick={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleRename}
            style={{ ...s.btn, marginTop: 8 }}>
            {mode === 'login' ? '로그인' : mode === 'signup' ? '가계부 만들기' : '닉네임 변경'}
          </button>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mode !== 'login' && (
              <button onClick={() => { setMode('login'); setAuthError(''); setAuthMsg('') }} style={s.linkBtn}>로그인하기</button>
            )}
            {mode !== 'signup' && (
              <button onClick={() => { setMode('signup'); setAuthError(''); setAuthMsg('') }} style={s.linkBtn}>처음이신가요? 새 가계부 만들기</button>
            )}
            {mode !== 'rename' && (
              <button onClick={() => { setMode('rename'); setAuthError(''); setAuthMsg('') }} style={s.linkBtn}>닉네임 변경하기</button>
            )}
          </div>
        </div>
      </main>
    )
  }

  const periodLabel = `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`

  return (
    <main style={{ minHeight: '100vh', background: '#F7F5F2', padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#355070' }}>[{household}] 가계부</h1>
          <button onClick={handleLogout} style={{ fontSize: 12, color: '#9A8C98', background: 'none', border: '1px solid #E8E3DD', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>로그아웃</button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} style={s.miniSelect}>
            {[selYear - 1, selYear, selYear + 1].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))} style={s.miniSelect}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#9A8C98' }}>{periodLabel}</span>
        </div>

        <div style={s.tabRow}>
          {[['dashboard', '대시보드'], ['list', '내역'], ['report', '월별 리포트'], ['note', '메모장']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{ ...s.tab, ...(tab === k ? s.tabActive : {}) }}>{label}</button>
          ))}
        </div>

        {tab === 'dashboard' && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={s.card}><div style={s.cardLabel}>수입</div><div style={{ ...s.cardVal, color: '#52B788' }}>{won(income)}</div></div>
              <div style={s.card}><div style={s.cardLabel}>지출</div><div style={{ ...s.cardVal, color: '#E76F51' }}>{won(totalExpense)}</div></div>
            </div>
            <div style={s.navyCard}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>남은 돈</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{won(income - totalExpense)}</div>
            </div>

            <div style={s.section}>
              <button onClick={() => setOpenFixed(!openFixed)} style={s.foldHeader}>
                <span style={s.sectionTitle}>고정지출 <span style={{ fontWeight: 400, color: '#9A8C98', fontSize: 13 }}>({won(fixedTotal)})</span></span>
                <span style={{ color: '#9A8C98' }}>{openFixed ? '▲' : '▼'}</span>
              </button>
              {openFixed && (
                <div style={{ marginTop: 12 }}>
                  {periodFixed.map(f => (
                    <div key={f.id} style={s.rowItem}>
                      <span style={{ fontSize: 14, color: '#4A4E69' }}>{f.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4E69' }}>{won(f.amount)}</span>
                        <button onClick={() => startEditFixed(f)} style={{ ...s.delBtn, color: '#2A9D8F' }}>수정</button>
                        <button onClick={() => handleDeleteFixed(f.id)} style={s.delBtn}>삭제</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input placeholder="항목 (예: 집 이자)" value={fxName} onChange={e => setFxName(e.target.value)} style={{ ...s.input, marginBottom: 0, flex: 2 }} />
                    <input type="number" placeholder="금액" value={fxAmount} onChange={e => setFxAmount(e.target.value)} style={{ ...s.input, marginBottom: 0, flex: 1 }} />
                  </div>
                  {fxEditId ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={cancelEditFixed} style={s.toggle}>취소</button>
                      <button onClick={handleAddFixed} style={{ ...s.btn, flex: 2 }}>고정지출 수정</button>
                    </div>
                  ) : (
                    <button onClick={handleAddFixed} style={{ ...s.btn, marginTop: 8 }}>이번 달 고정지출 추가</button>
                  )}
                </div>
              )}
            </div>

            <div style={s.section}>
              <button onClick={() => setOpenCat(!openCat)} style={s.foldHeader}>
                <span style={s.sectionTitle}>어디에 썼나요?</span>
                <span style={{ color: '#9A8C98' }}>{openCat ? '▲' : '▼'}</span>
              </button>
              {openCat && (
                <div style={{ marginTop: 12 }}>
                  {byCategory.length === 0 && <p style={{ color: '#9A8C98', fontSize: 14 }}>지출 내역이 없어요</p>}
                  {visibleCats.map(c => (
                    <div key={c.cat} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#4A4E69' }}>{c.cat}</span>
                        <span style={{ fontWeight: 600, color: '#4A4E69' }}>{won(c.total)}</span>
                      </div>
                      <div style={{ height: 8, background: '#F0EDE8', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${(c.total / maxCat) * 100}%`, height: '100%', background: CATEGORY_COLORS[c.cat], borderRadius: 8 }} />
                      </div>
                    </div>
                  ))}
                  {byCategory.length > 5 && (
                    <button onClick={() => setShowAllCat(!showAllCat)} style={s.foldBtn}>
                      {showAllCat ? '접기 ▲' : `${byCategory.length - 5}개 더 보기 ▼`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'list' && (
          <>
            <div style={s.section}>
              <h2 style={s.sectionTitle}>{editId ? '내역 수정' : '내역 추가'}</h2>
              <div style={{ display: 'flex', gap: 8, margin: '16px 0 12px' }}>
                <button onClick={() => setType('지출')} style={{ ...s.toggle, ...(type === '지출' ? s.toggleActive : {}) }}>지출</button>
                <button onClick={() => setType('수입')} style={{ ...s.toggle, ...(type === '수입' ? s.toggleActive : {}) }}>수입</button>
              </div>
              <select value={category} onChange={e => setCategory(e.target.value)} style={s.input}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" placeholder="금액" value={amount} onChange={e => setAmount(e.target.value)} style={s.input} />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={s.input} />
              <input placeholder="메모 (선택)" value={memo} onChange={e => setMemo(e.target.value)} style={s.input} />
              {editId ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={cancelEdit} style={s.toggle}>취소</button>
                  <button onClick={handleUpdate} style={{ ...s.btn, flex: 2 }}>수정 완료</button>
                </div>
              ) : (
                <button onClick={handleAdd} style={s.btn}>추가하기</button>
              )}
            </div>
            <div style={s.section}>
              <h2 style={s.sectionTitle}>전체 내역</h2>
              <div style={{ marginTop: 12 }}>
                {sortedItems.length === 0 && <p style={{ color: '#9A8C98', fontSize: 14 }}>이 기간 내역이 없어요</p>}
                {visibleItems.map(item => (
                  <div key={item.id} style={s.rowItem}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: CATEGORY_COLORS[item.category] }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4E69' }}>{item.category}</span>
                        {item.memo && <span style={{ fontSize: 12, color: '#9A8C98' }}>· {item.memo}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#B0A8A8', marginTop: 2 }}>{item.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: item.type === '수입' ? '#52B788' : '#E76F51' }}>
                        {item.type === '수입' ? '+' : '-'}{won(item.amount)}
                      </span>
                      <button onClick={() => startEdit(item)} style={{ ...s.delBtn, color: '#2A9D8F' }}>수정</button>
                      <button onClick={() => handleDelete(item.id)} style={s.delBtn}>삭제</button>
                    </div>
                  </div>
                ))}
                {sortedItems.length > 5 && (
                  <button onClick={() => setShowAllItems(!showAllItems)} style={s.foldBtn}>
                    {showAllItems ? '접기 ▲' : `${sortedItems.length - 5}개 더 보기 ▼`}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'report' && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>이번 기간 분석</h2>
            <p style={{ fontSize: 13, color: '#9A8C98', margin: '8px 0 16px' }}>{periodLabel}</p>
            <div style={{ marginBottom: 16 }}>
              <div style={s.reportRow}><span style={{ color: '#4A4E69' }}>고정지출</span><span style={{ fontWeight: 600, color: '#355070' }}>{won(fixedTotal)}</span></div>
              <div style={s.reportRow}><span style={{ color: '#4A4E69' }}>변동지출</span><span style={{ fontWeight: 600, color: '#E76F51' }}>{won(variableExpense)}</span></div>
              <div style={{ ...s.reportRow, paddingTop: 8, borderTop: '1px solid #F0EDE8' }}><span style={{ color: '#4A4E69', fontWeight: 700 }}>총 지출</span><span style={{ fontWeight: 700, color: '#E76F51' }}>{won(totalExpense)}</span></div>
            </div>
            <h2 style={s.sectionTitle}>카테고리 비중</h2>
            <div style={{ marginTop: 12 }}>
              {byCategory.length === 0 && <p style={{ color: '#9A8C98', fontSize: 14 }}>지출 내역이 없어요</p>}
              {byCategory.map(c => {
                const pct = variableExpense > 0 ? Math.round((c.total / variableExpense) * 100) : 0
                return (
                  <div key={c.cat} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#4A4E69' }}>{c.cat}</span>
                      <span style={{ fontWeight: 600, color: '#4A4E69' }}>{won(c.total)} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: '#F0EDE8', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: CATEGORY_COLORS[c.cat], borderRadius: 8 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'note' && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>메모장</h2>
            <p style={{ fontSize: 13, color: '#9A8C98', margin: '8px 0 12px' }}>특이사항을 자유롭게 적어두세요</p>
            <textarea placeholder="예: 이번 달 경조사 많음, 다음 달 보험금 환급 예정..." value={noteInput}
              onChange={e => setNoteInput(e.target.value)} style={{ ...s.input, minHeight: 80, resize: 'vertical' as const }} />
            <button onClick={handleAddNote} style={s.btn}>메모 추가</button>
            <div style={{ marginTop: 16 }}>
              {notes.map(n => (
                <div key={n.id} style={{ ...s.rowItem, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, color: '#4A4E69', whiteSpace: 'pre-wrap' }}>{n.content}</p>
                    <div style={{ fontSize: 11, color: '#B0A8A8', marginTop: 4 }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</div>
                  </div>
                  <button onClick={() => handleDeleteNote(n.id)} style={s.delBtn}>삭제</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ ...s.section, marginTop: 24 }}>
          <button onClick={() => setOpenSettings(!openSettings)} style={s.foldHeader}>
            <span style={s.sectionTitle}>⚙️ 설정</span>
            <span style={{ color: '#9A8C98' }}>{openSettings ? '▲' : '▼'}</span>
          </button>
          {openSettings && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={() => saveSettings(payday, 'payday')} style={{ ...s.toggle, ...(viewMode === 'payday' ? s.toggleActive : {}) }}>월급일 기준</button>
                <button onClick={() => saveSettings(payday, 'calendar')} style={{ ...s.toggle, ...(viewMode === 'calendar' ? s.toggleActive : {}) }}>달력 기준</button>
              </div>
              {viewMode === 'payday' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, color: '#4A4E69' }}>월급일</span>
                  <select value={payday} onChange={e => saveSettings(Number(e.target.value), viewMode)} style={{ ...s.miniSelect, flex: 1 }}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>매월 {d}일</option>)}
                  </select>
                </div>
              )}
              <p style={{ fontSize: 12, color: '#B0A8A8', marginTop: 12 }}>닉네임 변경은 로그아웃 후 로그인 화면에서 할 수 있어요</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F5F2', padding: 24 },
  loginCard: { width: '100%', maxWidth: 360, background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 8px 30px rgba(0,0,0,0.06)' },
  input: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #E8E3DD', fontSize: 14, marginBottom: 10, boxSizing: 'border-box', background: '#FAF9F7', color: '#4A4E69' },
  btn: { width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#355070', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  linkBtn: { width: '100%', background: 'none', border: 'none', color: '#9A8C98', fontSize: 13, cursor: 'pointer', padding: 2 },
  tabRow: { display: 'flex', gap: 4, marginBottom: 20, background: '#EDE9E4', padding: 4, borderRadius: 12 },
  tab: { flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', background: 'transparent', color: '#9A8C98', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tabActive: { background: 'white', color: '#355070', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  card: { flex: 1, background: 'white', borderRadius: 16, padding: 16 },
  cardLabel: { fontSize: 12, color: '#9A8C98' },
  cardVal: { fontSize: 18, fontWeight: 700 },
  navyCard: { background: '#355070', borderRadius: 16, padding: 16, marginBottom: 24, color: 'white' },
  section: { background: 'white', borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#355070' },
  foldHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  reportRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 },
  rowItem: { background: '#FAF9F7', borderRadius: 12, padding: 14, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  delBtn: { fontSize: 12, color: '#C0B8B8', background: 'none', border: 'none', cursor: 'pointer' },
  foldBtn: { width: '100%', padding: 8, marginTop: 4, borderRadius: 8, border: 'none', background: '#F0EDE8', color: '#9A8C98', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  toggle: { flex: 1, padding: 10, borderRadius: 10, border: '1px solid #E8E3DD', background: '#FAF9F7', color: '#9A8C98', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  toggleActive: { background: '#355070', color: 'white', border: '1px solid #355070' },
  miniSelect: { padding: '8px 12px', borderRadius: 10, border: '1px solid #E8E3DD', fontSize: 13, background: '#FAF9F7', color: '#4A4E69' },
}