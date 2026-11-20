import { useState } from 'react'
import { Checkbox, Radio } from '../../components/Controls'
import Icon from '../../components/Icon'
import RoutePicker from './RoutePicker'
import type { Vehicle } from '../../data/dashboard'

// UI-001-04-03 제설 작업 지시 — 대상 구간(여러 개) · 작업 유형 · 우선순위 · 전달 메모
// 구간 = [이름, 길이(km)] — 목업: 차량이 다니는 노선과 과거 작업 노선에서 고른다
export const SECTIONS: Record<string, [name: string, km: number]> = {
  '1100도로': ['1100도로 ~ 성판악 (K-12)', 6.8],
  평화로: ['평화로 ~ 어승생 (P-2)', 5.2],
  '5·16도로': ['5·16도로 ~ 숲터널 (K-16-2)', 12.0],
  번영로: ['번영로 ~ 봉개 (B-3)', 7.4],
  산록도로: ['산록도로 ~ 관음사 (S-5)', 9.1],
  비자림로: ['비자림로 ~ 교래 (J-4)', 8.3],
  남조로: ['남조로 ~ 수망 (N-2)', 10.6],
}
const MEMO_MAX = 200

export interface WorkOrderData {
  sections: string[]
  kind: string
  priority: string
  memo: string
  at: string // 지시 시각 HH:MM:SS
}

interface WorkOrderProps {
  vehicle: Vehicle
  pastRoads: string[] // 이 차량의 과거 작업 노선 (최근 순)
  onCancel: () => void
  onSend: (order: WorkOrderData) => void
}
// 대상 구간 선택지 — 과거 작업 노선 또는 지도에서 고른 구간
interface SectionOption {
  key: string
  name: string
  km: number
  tag?: string // 과거 작업 · 지도 선택
  detail?: string // 지도 선택: 시작·끝 주소
}
export default function WorkOrder({ vehicle, pastRoads, onCancel, onSend }: WorkOrderProps) {
  // 첫 구간 = 이번에 맡길 노선(시안: 1100도로), 나머지 = 과거 작업 노선
  const home = vehicle.info.split(' · ')[0]
  const first = vehicle.name === '11호차' || !SECTIONS[home] ? '1100도로' : home
  const roads = [first, ...pastRoads.filter((r) => r !== first && SECTIONS[r])].filter((r, i, a) => a.indexOf(r) === i).slice(0, 3)
  const [options, setOptions] = useState<SectionOption[]>(() =>
    roads.map((r, i) => ({ key: r, name: SECTIONS[r][0], km: SECTIONS[r][1], tag: i > 0 ? '과거 작업' : undefined })),
  )
  const [picked, setPicked] = useState(() => new Set(roads.slice(0, 2)))
  const [mapOpen, setMapOpen] = useState(false)
  const [kind, setKind] = useState('제설')
  const [priority, setPriority] = useState('긴급')
  const [memo, setMemo] = useState('')

  const toggle = (r: string) =>
    setPicked((s) => {
      const n = new Set(s)
      if (n.has(r)) n.delete(r)
      else n.add(r)
      return n
    })
  const send = () =>
    onSend({
      sections: options.filter((o) => picked.has(o.key)).map((o) => o.name),
      kind,
      priority,
      memo: memo.trim(),
      at: new Date().toTimeString().slice(0, 8),
    })

  return (
    <div className="wo">
      <div className="vh__head">
        <button className="vh__back" onClick={onCancel} aria-label="차량 현황으로">
          <Icon name="chevron-left" />
        </button>
        <b>작업 지시</b>
        <span style={{ flex: 1 }} />
        <b>{vehicle.name}</b>
        <span className="vh__type">{vehicle.type}</span>
      </div>

      <div className="wo__body">
        <section className="wo__sec">
          <div className="wo__title">
            <p className="section-title">작업 대상 구간</p>
            <button className="wo__link" onClick={() => setMapOpen(true)}>지도에서 선택</button>
          </div>
          {options.map((o) => {
            const on = picked.has(o.key)
            return (
              <label key={o.key} className={`wo-opt${on ? ' on' : ''}`} title={o.detail}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(o.key)} />
                <Checkbox checked={on} />
                <span className="wo-opt__txt">
                  <b>{o.name}</b>
                  {o.detail && <small>{o.detail}</small>}
                </span>
                {o.tag && <span className={`pbadge ${o.tag === '지도 선택' ? 'tone-blue' : 'tone-etc'}`}>{o.tag}</span>}
                <small>{o.km.toFixed(1)}km</small>
              </label>
            )
          })}
        </section>

        <section className="wo__sec">
          <p className="section-title">작업 내용</p>
          {([['작업 유형', ['제설', '순찰'], kind, setKind], ['우선순위', ['긴급', '일반'], priority, setPriority]] as const).map(([label, opts, val, set]) => (
            <div key={label} className="wo__row" role="radiogroup" aria-label={label}>
              <span>{label}</span>
              {opts.map((o) => (
                <label key={o} className="wo__radio">
                  <input type="radio" className="sr-only" name={label} checked={val === o} onChange={() => set(o)} />
                  <Radio checked={val === o} />
                  {o}
                </label>
              ))}
            </div>
          ))}
        </section>

        <section className="wo__sec">
          <p className="section-title">전달 메모 <small>선택</small></p>
          <label className="textarea-wrap">
            <textarea
              className="textarea"
              value={memo}
              maxLength={MEMO_MAX}
              placeholder="기사에게 전달할 내용을 입력하세요."
              onChange={(e) => setMemo(e.target.value)}
              aria-label="전달 메모"
            />
            <small>{memo.length} / {MEMO_MAX}</small>
          </label>
        </section>

        <ul className="wo__note"><li>제설 작업 모바일로 작업 지시가 자동 전달됩니다.</li></ul>
      </div>

      {mapOpen && (
        <RoutePicker
          onClose={() => setMapOpen(false)}
          onAdd={(sec) => {
            const key = `map-${sec.links.join('-')}`
            setOptions((list) => (list.some((o) => o.key === key) ? list : [...list, { key, name: sec.name, km: sec.km, tag: '지도 선택', detail: `${sec.start.addr} → ${sec.end.addr}` }]))
            setPicked((p) => new Set(p).add(key))
            setMapOpen(false)
          }}
        />
      )}

      <div className="wo__foot">
        <button className="btn btn--outline" onClick={onCancel}>취소</button>
        <button className="btn btn--primary" onClick={send} disabled={picked.size === 0}>지시 발송</button>
      </div>
    </div>
  )
}
