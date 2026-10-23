import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { A } from '../assets.js'
import { Dropdown } from '../components/Controls.jsx'
import './monitoring.css'

// UI-004 데이터 연계 모니터링 목업 데이터
const BADGE = { 수신: '#bfdbfe', 송신: '#f8cdec', 성공: '#c7f5ce', 실패: '#ffd2d5', '부분 성공': '#fedcc5', '재처리 성공': '#bfdbfe' }

const BATCHES = [
  { id: 'KMA-NCST-01', name: '초단기실황(AWS) 수신', target: '기상청', dir: '수신', every: '10분', last: '10:30:00', result: '성공', next: '10:40:00', on: true },
  { id: 'KMA-WRN-03', name: '기상특보 수신', target: '기상청', dir: '수신', every: '5분', last: '10:30:00', result: '실패', next: '10:40:00', on: true },
  { id: 'SV-RSN-001', name: '노면센서 계측값 수신', target: '스마트빌리지 인프라', dir: '수신', every: '1분', last: '10:35:00', result: '성공', next: '10:36:00', on: true },
  { id: 'JDH-SNW-01', name: '제설 작업 현황 송신', target: '제주데이터허브', dir: '송신', every: '30분', last: '10:30:00', result: '성공', next: '11:00:00', on: true },
  { id: 'KMA-VSRT-02', name: '초단기예보 수신', target: '기상청', dir: '수신', every: '30분', last: '10:30:00', result: '성공', next: '11:00:00', on: true },
  { id: 'SV-CCTV-004', name: '적설 감시 CCTV 상태 수신', target: '스마트빌리지 인프라', dir: '수신', every: '5분', last: '10:35:00', result: '성공', next: '10:40:00', on: true },
  { id: 'GPS-VEH-01', name: '제설차량 GPS 궤적 수신', target: '차량 관제 단말', dir: '수신', every: '1분', last: '10:35:00', result: '부분 성공', next: '10:36:00', on: true },
  { id: 'SV-SALT-002', name: '제설제 농도 계측값 수신', target: '스마트빌리지 인프라', dir: '수신', every: '10분', last: '10:30:00', result: '성공', next: '10:40:00', on: true },
  { id: 'JDH-HZD-02', name: '위험요소 조치 결과 송신', target: '제주데이터허브', dir: '송신', every: '1시간', last: '10:00:00', result: '성공', next: '11:00:00', on: true },
  { id: 'KMA-SFC-04', name: '지상관측 일자료 수신', target: '기상청', dir: '수신', every: '1일', last: '00:10:00', result: '성공', next: '익일 00:10', on: false },
  { id: 'ITS-TRF-01', name: '주요 교통량 수신', target: '제주 ITS센터', dir: '수신', every: '15분', last: '10:30:00', result: '성공', next: '10:45:00', on: true },
  { id: 'JDH-RPT-03', name: '일일 제설 보고 송신', target: '제주데이터허브', dir: '송신', every: '1일', last: '06:00:00', result: '성공', next: '익일 06:00', on: false },
]

const RECV = [
  { no: 1248, at: '2026-10-19 10:35:00', target: '스마트빌리지 인프라', item: '노면센서 계측값', batch: 'SV-RSN-001', count: '1,240', took: '2.1s', result: '성공', err: '-' },
  { no: 1245, at: '2026-10-19 10:30:00', target: '기상청', item: '기상특보', batch: 'KMA-WRN-03', count: '0', took: '30.0s', result: '실패', err: '응답 시간 초과 (30s)', retry: true },
  { no: 1244, at: '2026-10-19 10:25:00', target: '스마트빌리지 인프라', item: '노면센서 계측값', batch: 'SV-RSN-001', count: '1,198', took: '2.6s', result: '부분 성공', err: '센서 42개소 결측', retry: true },
  { no: 1243, at: '2026-10-19 10:20:00', target: '기상청', item: '기상특보', batch: 'KMA-WRN-03', count: '3', took: '1.1s', result: '재처리 성공', err: '10:15 실패분 재수신', errOk: true },
]
const SENT = [
  { no: 512, at: '2026-10-19 10:30:00', target: '제주데이터허브', item: '제설 작업 현황', batch: 'JDH-SNW-01', count: '26', took: '0.8s', result: '성공', err: '-' },
  { no: 511, at: '2026-10-19 10:00:00', target: '제주데이터허브', item: '위험요소 조치 결과', batch: 'JDH-HZD-02', count: '14', took: '0.6s', result: '성공', err: '-' },
  { no: 510, at: '2026-10-19 10:00:00', target: '제주데이터허브', item: '제설 작업 현황', batch: 'JDH-SNW-01', count: '24', took: '0.9s', result: '성공', err: '-' },
  { no: 509, at: '2026-10-19 09:30:00', target: '제주데이터허브', item: '제설 작업 현황', batch: 'JDH-SNW-01', count: '0', took: '15.0s', result: '실패', err: '인증 토큰 만료', retry: true },
]

const PAGE = 4
const TARGETS = ['전체', '기상청', '스마트빌리지 인프라', '제주데이터허브', '차량 관제 단말', '제주 ITS센터']

export default function Monitoring() {
  const { setToast } = useOutletContext()
  const [target, setTarget] = useState('전체')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [toggles, setToggles] = useState(() => Object.fromEntries(BATCHES.map((b) => [b.id, b.on])))
  const [running, setRunning] = useState(null)

  const [tab, setTab] = useState('recv')
  const [hTarget, setHTarget] = useState('전체')
  const [hResult, setHResult] = useState('전체')
  const [hq, setHq] = useState('')
  const [from, setFrom] = useState('2026-10-19')
  const [to, setTo] = useState('2026-10-19')
  const [hPage, setHPage] = useState(1)
  const [retried, setRetried] = useState({})

  const batches = useMemo(
    () => BATCHES.filter((b) => (target === '전체' || b.target === target) && (!q || `${b.id} ${b.name}`.toLowerCase().includes(q.toLowerCase()))),
    [target, q],
  )
  const pages = Math.max(1, Math.ceil(batches.length / PAGE))
  const shown = batches.slice((page - 1) * PAGE, page * PAGE)

  const history = (tab === 'recv' ? RECV : SENT).filter(
    (r) => (hTarget === '전체' || r.target === hTarget) && (hResult === '전체' || r.result === hResult) && (!hq || `${r.batch} ${r.item}`.includes(hq)),
  )

  const run = (b) => {
    setRunning(b.id)
    setTimeout(() => {
      setRunning(null)
      setToast(`${b.id} 수동 실행 완료 (목업)`)
    }, 900)
  }

  return (
    <div className="page-scroll">
      <div className="mon">
        <section className="mcard">
          <div className="mcard__head">
            <h3>배치 스케줄 관리</h3>
            <small>총 {batches.length}개</small>
            <span style={{ flex: 1 }} />
            <b className="lbl">연계 대상</b>
            <Dropdown value={target} options={TARGETS} onChange={(v) => { setTarget(v); setPage(1) }} width={140} height={40} />
            <label className="search" style={{ width: 220 }}>
              <img src={A.icSearch} alt="" />
              <input placeholder="배치 ID · 배치명 검색" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
            </label>
          </div>
          <table className="mtable">
            <colgroup>
              <col style={{ width: 56 }} /><col style={{ width: 136 }} /><col style={{ width: 169 }} /><col style={{ width: 164 }} />
              <col style={{ width: 86 }} /><col style={{ width: 90 }} /><col style={{ width: 94 }} /><col style={{ width: 109 }} />
              <col style={{ width: 94 }} /><col style={{ width: 68 }} /><col style={{ width: 90 }} />
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
                  <td className="c">{(page - 1) * PAGE + i + 1}</td>
                  <td>{b.id}</td>
                  <td>{b.name}</td>
                  <td>{b.target}</td>
                  <td className="c"><Badge v={b.dir} /></td>
                  <td className="c">{b.every}</td>
                  <td className="c">{b.last}</td>
                  <td className="c"><Badge v={b.result} /></td>
                  <td className="c">{toggles[b.id] ? b.next : '-'}</td>
                  <td>
                    <button className={`toggle${toggles[b.id] ? ' on' : ''}`} onClick={() => setToggles((t) => ({ ...t, [b.id]: !t[b.id] }))} aria-label="사용 여부">
                      {toggles[b.id] && <img src={A.icToggleOn} alt="" />}
                    </button>
                  </td>
                  <td>
                    <button className="btn-outline-blue" disabled={!toggles[b.id] || running === b.id} onClick={() => run(b)}>
                      {running === b.id ? '실행중' : '실행'}
                    </button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={11} className="c empty">검색 결과가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} pages={pages} onChange={setPage} />
        </section>

        <section className="mcard">
          <div className="tabs-line mtabs">
            <button className={tab === 'recv' ? 'on' : ''} onClick={() => setTab('recv')}><span>수신 이력</span><i /></button>
            <button className={tab === 'sent' ? 'on' : ''} onClick={() => setTab('sent')}><span>송신 이력</span><i /></button>
          </div>
          <div className="mfilter">
            <b className="lbl">조회 기간</b>
            <DateField value={from} onChange={setFrom} />
            <span>~</span>
            <DateField value={to} onChange={setTo} />
            <b className="lbl">연계 대상</b>
            <Dropdown value={hTarget} options={TARGETS} onChange={setHTarget} width={128} height={40} />
            <b className="lbl">처리 결과</b>
            <Dropdown value={hResult} options={['전체', '성공', '실패', '부분 성공', '재처리 성공']} onChange={setHResult} width={110} height={40} />
            <label className="search" style={{ width: 180, height: 40 }}>
              <img src={A.icSearch} alt="" />
              <input placeholder="배치 ID · 항목명 검색" value={hq} onChange={(e) => setHq(e.target.value)} />
            </label>
            <span style={{ flex: 1 }} />
            <button className="btn-search" onClick={() => setToast(`${from} ~ ${to} 이력을 조회했습니다 (목업)`)}>
              <img src={A.icSearchWhite} alt="" />
              조회
            </button>
            <button className="btn-reset" onClick={() => { setHTarget('전체'); setHResult('전체'); setHq(''); setFrom('2026-10-19'); setTo('2026-10-19') }}>
              초기화
            </button>
          </div>
          <table className="mtable">
            <colgroup>
              <col style={{ width: 60 }} /><col style={{ width: 160 }} /><col style={{ width: 150 }} /><col style={{ width: 150 }} />
              <col style={{ width: 114 }} /><col style={{ width: 80 }} /><col style={{ width: 80 }} /><col style={{ width: 96 }} />
              <col /><col style={{ width: 96 }} />
            </colgroup>
            <thead>
              <tr>
                <th className="c">No</th><th>{tab === 'recv' ? '수신' : '송신'} 일시</th><th>연계 대상</th><th>연계 항목</th><th>배치 ID</th>
                <th className="c">{tab === 'recv' ? '수신' : '송신'} 건수</th><th className="c">소요 시간</th><th className="c">결과</th><th>오류 내용</th><th>재처리</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => {
                const done = retried[`${tab}-${r.no}`]
                return (
                  <tr key={r.no} className={r.result === '실패' ? 'hl' : ''}>
                    <td className="c">{r.no.toLocaleString()}</td>
                    <td>{r.at}</td>
                    <td>{r.target}</td>
                    <td>{r.item}</td>
                    <td>{r.batch}</td>
                    <td className="c">{r.count}</td>
                    <td className="c">{r.took}</td>
                    <td className="c"><Badge v={done ? '재처리 성공' : r.result} /></td>
                    <td className={r.err !== '-' && !r.errOk && !done ? 'err' : ''}>{done ? '재처리 완료' : r.err}</td>
                    <td>
                      {r.retry && !done && (
                        <button className="btn-outline-blue" onClick={() => { setRetried((m) => ({ ...m, [`${tab}-${r.no}`]: true })); setToast(`${r.batch} ${tab === 'recv' ? '재수신' : '재송신'} 요청 완료`) }}>
                          {tab === 'recv' ? '재수신' : '재송신'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {history.length === 0 && (
                <tr><td colSpan={10} className="c empty">조회 결과가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={hPage} pages={10} onChange={setHPage} />
        </section>
      </div>
    </div>
  )
}

function Badge({ v }) {
  return <span className="badge mbadge" style={{ background: BADGE[v] }}>{v}</span>
}

function DateField({ value, onChange }) {
  return (
    <label className="date-field">
      <input value={value} maxLength={10} onChange={(e) => onChange(e.target.value)} aria-label="날짜 (YYYY-MM-DD)" />
      <img src={A.icCalendar} alt="" />
    </label>
  )
}

function Pagination({ page, pages, onChange }) {
  const go = (p) => onChange(Math.min(pages, Math.max(1, p)))
  return (
    <div className="pager">
      <button onClick={() => go(1)}>«</button>
      <button onClick={() => go(page - 1)}>‹</button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button key={p} className={p === page ? 'on' : ''} onClick={() => go(p)}>{p}</button>
      ))}
      <button onClick={() => go(page + 1)}>›</button>
      <button onClick={() => go(pages)}>»</button>
    </div>
  )
}
