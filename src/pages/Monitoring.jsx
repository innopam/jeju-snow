import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { A } from '../assets.js'
import { Dropdown } from '../components/Controls.jsx'
import { EVERY, EVERY_MIN, MOCK_TODAY, RESULTS, TARGETS, batchStore, historyStore, hms, ymd } from '../data/monitoring.js'
import { useStore } from '../store.js'
import './monitoring.css'

// UI-SIRS-004 데이터 연계 모니터링 — UC-OMS-001-01 배치 관리 / UC-OMS-001-02 송수신 이력 조회
const BADGE = { 수신: '#bfdbfe', 송신: '#f8cdec', 성공: '#c7f5ce', 실패: '#ffd2d5', '부분 성공': '#fedcc5', '재처리 성공': '#bfdbfe' }
const BATCH_PAGE = 4
const HIST_PAGE = 8
const DEFAULT_FILTER = { from: MOCK_TODAY, to: MOCK_TODAY, target: '전체', result: '전체', q: '' }

export default function Monitoring() {
  const { setToast } = useOutletContext()
  const batches = useStore(batchStore)
  const history = useStore(historyStore)

  // ① 배치 스케줄 관리
  const [target, setTarget] = useState('전체')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [running, setRunning] = useState(null)
  const [editing, setEditing] = useState(null)

  const batchList = useMemo(
    () => batches.filter((b) => (target === '전체' || b.target === target) && (!q.trim() || `${b.id} ${b.name}`.toLowerCase().includes(q.trim().toLowerCase()))),
    [batches, target, q],
  )
  const pages = Math.max(1, Math.ceil(batchList.length / BATCH_PAGE))
  const shown = batchList.slice((page - 1) * BATCH_PAGE, page * BATCH_PAGE)
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])

  const addHistory = (b, result, err = '', extra = {}) => {
    const now = new Date()
    historyStore.set((h) => {
      const list = h[b.dir]
      const rec = {
        no: Math.max(...list.map((r) => r.no)) + 1, at: `${MOCK_TODAY} ${hms(now)}`, batch: b.id,
        count: result === '실패' ? 0 : Math.round(b.dir === '수신' ? 300 + Math.random() * 900 : 10 + Math.random() * 20),
        took: `${(0.5 + Math.random() * 2.5).toFixed(1)}s`, result, err, ...extra,
      }
      return { ...h, [b.dir]: [rec, ...list] }
    })
  }

  // 수동 실행 — 결과를 배치 목록과 이력에 기록 (UC-LNK-001-01 기본 흐름 4)
  const run = (b) => {
    setRunning(b.id)
    setTimeout(() => {
      const now = new Date()
      const next = new Date(now.getTime() + EVERY_MIN[b.every] * 60000)
      batchStore.set((list) => list.map((x) => (x.id === b.id ? { ...x, last: hms(now), result: '성공', next: ymd(next) === ymd(now) ? hms(next) : `익일 ${hms(next)}` } : x)))
      addHistory(b, '성공')
      setRunning(null)
      setToast(`${b.id} 수동 실행 완료 — ${b.dir} 이력에 기록했습니다.`)
    }, 900)
  }
  const toggleUse = (b) => {
    batchStore.set((list) => list.map((x) => (x.id === b.id ? { ...x, on: !x.on } : x)))
    setToast(`${b.id} 배치를 ${b.on ? '중지' : '사용'}로 변경했습니다.`)
  }

  // ② 수신·송신 이력 — 조회 버튼을 눌러야 조건이 반영된다
  const [tab, setTab] = useState('수신')
  const [draft, setDraft] = useState(DEFAULT_FILTER)
  const [applied, setApplied] = useState(DEFAULT_FILTER)
  const [hPage, setHPage] = useState(1)
  const [err, setErr] = useState('')
  const targetOf = (id) => batches.find((b) => b.id === id)
  const histList = useMemo(() => {
    const f = applied
    return history[tab]
      .filter((r) => {
        const b = targetOf(r.batch)
        const d = r.at.slice(0, 10)
        return d >= f.from && d <= f.to && (f.target === '전체' || b?.target === f.target) && (f.result === '전체' || r.result === f.result) &&
          (!f.q.trim() || `${r.batch} ${b?.item ?? ''}`.toLowerCase().includes(f.q.trim().toLowerCase()))
      })
      .sort((a, b) => (a.at < b.at ? 1 : -1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, tab, applied, batches])
  const hPages = Math.max(1, Math.ceil(histList.length / HIST_PAGE))
  const hShown = histList.slice((hPage - 1) * HIST_PAGE, hPage * HIST_PAGE)

  const search = () => {
    if (draft.from > draft.to) return setErr('조회 시작일이 종료일보다 늦습니다.')
    setErr('')
    setApplied(draft)
    setHPage(1)
  }
  const reset = () => {
    setErr('')
    setDraft(DEFAULT_FILTER)
    setApplied(DEFAULT_FILTER)
    setHPage(1)
  }
  const retry = (r) => {
    const b = targetOf(r.batch)
    historyStore.set((h) => ({ ...h, [tab]: h[tab].map((x) => (x.no === r.no ? { ...x, retried: true } : x)) }))
    addHistory(b, '재처리 성공', `${r.at.slice(11, 16)} 실패분 ${tab === '수신' ? '재수신' : '재송신'}`)
    setToast(`${r.batch} ${tab === '수신' ? '재수신' : '재송신'} 완료 — 이력에 '재처리 성공'으로 기록했습니다.`)
  }

  return (
    <div className="page-scroll">
      <div className="mon">
        <section className="mcard">
          <div className="mcard__head">
            <h3>배치 스케줄 관리</h3>
            <small>총 {batchList.length}개</small>
            <span style={{ flex: 1 }} />
            <b className="lbl">연계 대상</b>
            <Dropdown value={target} options={TARGETS} onChange={(v) => { setTarget(v); setPage(1) }} width={170} height={40} />
            <label className="search" style={{ width: 220 }}>
              <img src={A.icSearch} alt="" />
              <input placeholder="배치 ID · 배치명 검색" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
            </label>
          </div>
          <table className="mtable">
            <colgroup>
              <col style={{ width: 56 }} /><col style={{ width: 136 }} /><col style={{ width: 190 }} /><col style={{ width: 164 }} />
              <col style={{ width: 86 }} /><col style={{ width: 90 }} /><col style={{ width: 94 }} /><col style={{ width: 109 }} />
              <col style={{ width: 120 }} /><col style={{ width: 68 }} /><col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr>
                <th className="c">No</th><th>배치 ID</th><th>배치명</th><th>연계 대상</th><th className="c">방향</th><th className="c">실행 주기</th>
                <th className="c">최근 실행</th><th className="c">최근 결과</th><th className="c">다음 실행</th><th>사용</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((b, i) => (
                <tr key={b.id} className={b.result === '실패' ? 'hl' : ''}>
                  <td className="c">{(page - 1) * BATCH_PAGE + i + 1}</td>
                  <td>{b.id}</td>
                  <td><button className="link" onClick={() => setEditing(b)} title="배치 스케줄 수정">{b.name}</button></td>
                  <td>{b.target}</td>
                  <td className="c"><Badge v={b.dir} /></td>
                  <td className="c">{b.every}</td>
                  <td className="c">{b.last}</td>
                  <td className="c"><Badge v={b.result} /></td>
                  <td className="c">{b.on ? b.next : '-'}</td>
                  <td>
                    <button className={`toggle${b.on ? ' on' : ''}`} onClick={() => toggleUse(b)} aria-label={`${b.id} 사용 여부`} aria-pressed={b.on}>
                      {b.on && <img src={A.icToggleOn} alt="" />}
                    </button>
                  </td>
                  <td>
                    <button className="btn-outline-blue" disabled={!b.on || running === b.id} onClick={() => run(b)} title={b.on ? '지금 실행' : '사용 중지된 배치입니다'}>
                      {running === b.id ? '실행중' : '실행'}
                    </button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={11} className="c empty">검색 결과가 없습니다.</td></tr>}
            </tbody>
          </table>
          <Pagination page={page} pages={pages} onChange={setPage} />
        </section>

        <section className="mcard">
          <div className="tabs-line mtabs" role="tablist">
            {['수신', '송신'].map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => { setTab(t); setHPage(1) }}><span>{t} 이력</span><i /></button>
            ))}
          </div>
          <div className="mfilter">
            <b className="lbl">조회 기간</b>
            <DateField value={draft.from} onChange={(from) => setDraft((d) => ({ ...d, from }))} label="조회 시작일" />
            <span>~</span>
            <DateField value={draft.to} onChange={(to) => setDraft((d) => ({ ...d, to }))} label="조회 종료일" />
            <b className="lbl">연계 대상</b>
            <Dropdown value={draft.target} options={TARGETS} onChange={(target) => setDraft((d) => ({ ...d, target }))} width={140} height={40} />
            <b className="lbl">처리 결과</b>
            <Dropdown value={draft.result} options={RESULTS} onChange={(result) => setDraft((d) => ({ ...d, result }))} width={112} height={40} />
            <label className="search" style={{ width: 160, height: 40 }}>
              <img src={A.icSearch} alt="" />
              <input placeholder="배치 ID · 항목명 검색" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && search()} />
            </label>
            <span style={{ flex: 1 }} />
            <button className="btn-search" onClick={search}>
              <img src={A.icSearchWhite} alt="" />
              조회
            </button>
            <button className="btn-reset" onClick={reset}>초기화</button>
          </div>
          {err && <p className="mfilter__err" role="alert">{err}</p>}
          <p className="mresult">
            {applied.from === applied.to ? applied.from : `${applied.from} ~ ${applied.to}`} · {tab} 이력 {histList.length.toLocaleString()}건
            {histList.some((r) => r.result === '실패' && !r.retried) && <em> · 미처리 실패 {histList.filter((r) => r.result === '실패' && !r.retried).length}건</em>}
          </p>
          <table className="mtable">
            <colgroup>
              <col style={{ width: 70 }} /><col style={{ width: 170 }} /><col style={{ width: 150 }} /><col style={{ width: 150 }} />
              <col style={{ width: 120 }} /><col style={{ width: 80 }} /><col style={{ width: 80 }} /><col style={{ width: 110 }} />
              <col /><col style={{ width: 96 }} />
            </colgroup>
            <thead>
              <tr>
                <th className="c">No</th><th>{tab} 일시</th><th>연계 대상</th><th>연계 항목</th><th>배치 ID</th>
                <th className="c">{tab} 건수</th><th className="c">소요 시간</th><th className="c">결과</th><th>오류 내용</th><th>재처리</th>
              </tr>
            </thead>
            <tbody>
              {hShown.map((r) => {
                const b = targetOf(r.batch)
                const errRed = r.err && (r.result === '실패' || r.result === '부분 성공')
                return (
                  <tr key={r.no} className={r.result === '실패' && !r.retried ? 'hl' : ''}>
                    <td className="c">{r.no.toLocaleString()}</td>
                    <td>{r.at}</td>
                    <td>{b?.target}</td>
                    <td>{b?.item}</td>
                    <td>{r.batch}</td>
                    <td className="c">{r.count.toLocaleString()}</td>
                    <td className="c">{r.took}</td>
                    <td className="c"><Badge v={r.result} /></td>
                    <td className={errRed ? 'err' : ''} title={r.err}>{r.err || '-'}</td>
                    <td>
                      {(r.result === '실패' || r.result === '부분 성공') && (r.retried ? <span className="done-tag">재처리 완료</span> : (
                        <button className="btn-outline-blue" onClick={() => retry(r)}>{tab === '수신' ? '재수신' : '재송신'}</button>
                      ))}
                    </td>
                  </tr>
                )
              })}
              {hShown.length === 0 && <tr><td colSpan={10} className="c empty">조회 결과가 없습니다. 조회 기간·조건을 바꿔 보세요.</td></tr>}
            </tbody>
          </table>
          <Pagination page={hPage} pages={hPages} onChange={setHPage} />
        </section>
      </div>
      {editing && <BatchEditor batch={editing} onClose={() => setEditing(null)} onSave={(patch) => {
        batchStore.set((list) => list.map((x) => (x.id === editing.id ? { ...x, ...patch } : x)))
        setToast(`${editing.id} 스케줄을 저장했습니다.`)
        setEditing(null)
      }} />}
    </div>
  )
}

function Badge({ v }) {
  return <span className="badge mbadge" style={{ background: BADGE[v] }}>{v}</span>
}

function DateField({ value, onChange, label }) {
  return (
    <label className="date-field">
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      <img src={A.icCalendar} alt="" />
    </label>
  )
}

function Pagination({ page, pages, onChange }) {
  const go = (p) => onChange(Math.min(pages, Math.max(1, p)))
  const start = Math.max(1, Math.min(page - 4, pages - 9))
  const nums = Array.from({ length: Math.min(10, pages) }, (_, i) => start + i)
  return (
    <div className="pager">
      <button onClick={() => go(1)} disabled={page === 1} aria-label="처음">«</button>
      <button onClick={() => go(page - 1)} disabled={page === 1} aria-label="이전">‹</button>
      {nums.map((p) => (
        <button key={p} className={p === page ? 'on' : ''} onClick={() => go(p)} aria-current={p === page ? 'page' : undefined}>{p}</button>
      ))}
      <button onClick={() => go(page + 1)} disabled={page === pages} aria-label="다음">›</button>
      <button onClick={() => go(pages)} disabled={page === pages} aria-label="마지막">»</button>
    </div>
  )
}

// 배치 스케줄 수정 (UC-OMS-001-01 기본 흐름 3 — 관리자가 배치 스케줄을 관리)
function BatchEditor({ batch, onClose, onSave }) {
  const [every, setEvery] = useState(batch.every)
  const [on, setOn] = useState(batch.on)
  const [name, setName] = useState(batch.name)
  const [err, setErr] = useState('')
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const save = () => {
    if (!name.trim()) return setErr('배치명을 입력하세요.')
    onSave({ every, on, name: name.trim() })
  }
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="배치 스케줄 수정">
        <h3>배치 스케줄 수정</h3>
        <dl>
          <dt>배치 ID</dt><dd>{batch.id}</dd>
          <dt>연계 대상</dt><dd>{batch.target} · {batch.dir}</dd>
        </dl>
        <label>배치명<input value={name} onChange={(e) => { setName(e.target.value); setErr('') }} /></label>
        <label>실행 주기
          <select value={every} onChange={(e) => setEvery(e.target.value)}>
            {EVERY.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="modal__row">사용 여부
          <button type="button" className={`toggle${on ? ' on' : ''}`} onClick={() => setOn((o) => !o)} aria-pressed={on}>{on && <img src={A.icToggleOn} alt="" />}</button>
        </label>
        {err && <p className="mfilter__err">{err}</p>}
        <div className="modal__actions">
          <button className="btn-reset" onClick={onClose}>취소</button>
          <button className="btn-search" onClick={save}>저장</button>
        </div>
      </div>
    </div>
  )
}
