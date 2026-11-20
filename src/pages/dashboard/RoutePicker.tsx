import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Feature from 'ol/Feature.js'
import LineString from 'ol/geom/LineString.js'
import Point from 'ol/geom/Point.js'
import DragPan from 'ol/interaction/DragPan.js'
import PointerInteraction from 'ol/interaction/Pointer.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import { Circle, Fill, Stroke, Style, Text } from 'ol/style.js'
import type MapBrowserEvent from 'ol/MapBrowserEvent.js'
import Icon from '../../components/Icon'
import { LINKS, ROUTE_LINKS } from '../../data/links'
import { JEJU_CENTER, regionAtGeo } from '../../data/geo'
import type { LonLat } from '../../data/geo'
import { createBaseLayers } from '../../map/basemap'
import { fromLonLat, toLonLat, useOlMap } from '../../map/useOlMap'

// 작업 지시 > 지도에서 선택 — 노선 링크 위를 드래그해서 작업 대상 구간을 고른다
// 시작·끝점의 도로명(우선노선 이름)과 주소(행정동)를 찾아 구간 이름을 만든다

export interface PickedSection {
  name: string // 작업 대상 구간 목록에 들어갈 이름
  km: number
  links: number[]
  start: PointInfo
  end: PointInfo
}
interface PointInfo {
  road: string // 도로명 — 우선노선 링크면 노선 이름, 아니면 '관리 노선'
  addr: string // 주소 — 행정동 (예: 제주시 노형동)
  at: LonLat
}

const LINK_BY_ID = new Map(LINKS.map(([id, jur, dong, len, coords]) => [id, { id, jur, dong, len, coords }]))
// 링크 → 우선노선 이름 (1100도로 · 평화로 …)
const ROAD_OF_LINK = new Map<number, string>()
Object.entries(ROUTE_LINKS).forEach(([road, chain]) => chain.forEach(([id]) => ROAD_OF_LINK.has(id) || ROAD_OF_LINK.set(id, road)))
const KM = [92.4, 111.0] // 제주 위도에서 경도·위도 1도 ≈ km
const dist = (a: LonLat, b: LonLat) => Math.hypot((a[0] - b[0]) * KM[0], (a[1] - b[1]) * KM[1])

const pointInfo = (at: LonLat, linkId: number): PointInfo => {
  const r = regionAtGeo(at)
  return { road: ROAD_OF_LINK.get(linkId) ?? '관리 노선', addr: `${r.city} ${r.name}`.replace(/^(\S+) \1 /, '$1 '), at }
}
const short = (addr: string) => addr.split(' ').slice(-1)[0]

// 선택한 링크들의 끝점 중 다른 링크와 이어지지 않은 점(말단)에서 드래그 시작·끝에 가까운 점을 고른다
function summarize(ids: number[], from: LonLat, to: LonLat): PickedSection | null {
  if (!ids.length) return null
  const ends = ids.flatMap((id) => {
    const c = LINK_BY_ID.get(id)!.coords
    return [{ id, at: c[0] }, { id, at: c[c.length - 1] }]
  })
  const terminals = ends.filter((e) => ends.filter((o) => o !== e && dist(o.at, e.at) < 0.03).length === 0)
  const pool = terminals.length >= 2 ? terminals : ends
  const s = pool.reduce((b, e) => (dist(e.at, from) < dist(b.at, from) ? e : b))
  const rest = pool.filter((e) => e !== s)
  const t = (rest.length ? rest : pool).reduce((b, e) => (dist(e.at, to) < dist(b.at, to) ? e : b))
  const start = pointInfo(s.at, s.id)
  const end = pointInfo(t.at, t.id)
  const km = ids.reduce((sum, id) => sum + LINK_BY_ID.get(id)!.len, 0) / 1000
  const head = start.road === '관리 노선' ? short(start.addr) : `${start.road} ${short(start.addr)}`
  const tail = end.road === start.road ? short(end.addr) : end.road === '관리 노선' ? short(end.addr) : `${end.road} ${short(end.addr)}`
  return { name: `${head} ~ ${tail}`, km, links: ids, start, end }
}

const styleOf = (selected: boolean, road: boolean) =>
  selected
    ? [new Style({ stroke: new Stroke({ color: '#fff', width: 9 }) }), new Style({ stroke: new Stroke({ color: '#3b82f6', width: 6 }) })]
    : new Style({ stroke: new Stroke({ color: road ? '#475467' : '#98a2b3', width: road ? 3.5 : 2.5 }) })
const markerStyle = (label: string, color: string) =>
  new Style({
    image: new Circle({ radius: 11, fill: new Fill({ color }), stroke: new Stroke({ color: '#fff', width: 2 }) }),
    text: new Text({ text: label, font: '700 11px Pretendard, sans-serif', fill: new Fill({ color: '#fff' }) }),
  })
const trailStyle = new Style({ stroke: new Stroke({ color: 'rgba(49,47,130,.55)', width: 2, lineDash: [6, 6] }) })

export default function RoutePicker({ onClose, onAdd }: { onClose: () => void; onAdd: (s: PickedSection) => void }) {
  const [picked, setPicked] = useState<PickedSection | null>(null)

  const layers = useMemo(() => {
    const linkSrc = new VectorSource({
      features: LINKS.map(([id, , , , coords]) => {
        const f = new Feature(new LineString(coords.map((c) => fromLonLat(c))))
        f.setId(id)
        return f
      }),
    })
    const selected = new Set<number>()
    const linkLayer = new VectorLayer({
      source: linkSrc,
      style: (f) => styleOf(selected.has(f.getId() as number), ROAD_OF_LINK.has(f.getId() as number)),
    })
    const markSrc = new VectorSource()
    const markLayer = new VectorLayer({ source: markSrc })
    return { linkLayer, markSrc, markLayer, selected }
  }, [])
  const { elRef, mapRef } = useOlMap({ center: JEJU_CENTER, zoom: 10.2, layers: () => [...createBaseLayers().normal, layers.linkLayer, layers.markLayer] })

  // 마우스 조작 — 왼쪽 버튼 드래그 = 구간 선택(지나간 링크를 모은다), 오른쪽 버튼 드래그 = 지도 이동, 휠 = 확대·축소
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const { linkLayer, markSrc, selected } = layers
    const button = (e: MapBrowserEvent) => (e.originalEvent as PointerEvent).button
    // 기본 이동(왼쪽 드래그)을 오른쪽 드래그 이동으로 바꾼다
    const defaultPans = map.getInteractions().getArray().filter((i) => i instanceof DragPan)
    defaultPans.forEach((i) => map.removeInteraction(i))
    const rightPan = new DragPan({ condition: (e) => button(e) === 2 })
    map.addInteraction(rightPan)
    const el = map.getTargetElement() as HTMLElement | null
    const noMenu = (e: Event) => e.preventDefault()
    el?.addEventListener('contextmenu', noMenu)
    let order: number[] = []
    let path: number[][] = []
    const trail = new Feature(new LineString([]))
    trail.setStyle(trailStyle)
    const hit = (e: MapBrowserEvent) =>
      map.forEachFeatureAtPixel(e.pixel, (f) => {
        const id = f.getId() as number
        if (!selected.has(id)) {
          selected.add(id)
          order.push(id)
          linkLayer.changed()
        }
        return true
      }, { layerFilter: (l) => l === linkLayer, hitTolerance: 8 })
    const interaction = new PointerInteraction({
      handleDownEvent: (e) => {
        if (button(e) !== 0) return false
        selected.clear()
        order = []
        path = [e.coordinate]
        markSrc.clear()
        markSrc.addFeature(trail)
        trail.getGeometry()!.setCoordinates(path)
        hit(e)
        return true
      },
      handleDragEvent: (e) => {
        path.push(e.coordinate)
        trail.getGeometry()!.setCoordinates(path)
        hit(e)
      },
      handleUpEvent: (e) => {
        markSrc.clear()
        const res = summarize(order, toLonLat(path[0]), toLonLat(e.coordinate))
        if (res) {
          const s = new Feature(new Point(fromLonLat(res.start.at)))
          s.setStyle(markerStyle('S', '#312f82'))
          const t = new Feature(new Point(fromLonLat(res.end.at)))
          t.setStyle(markerStyle('E', '#d92332'))
          markSrc.addFeatures([s, t])
        }
        linkLayer.changed()
        setPicked(res)
        return false
      },
    })
    map.addInteraction(interaction)
    const cursor = (e: MapBrowserEvent) => {
      if (!el) return
      if (e.dragging) {
        if ((e.originalEvent as PointerEvent).buttons === 2) el.style.cursor = 'grabbing'
        return
      }
      el.style.cursor = map.hasFeatureAtPixel(e.pixel, { layerFilter: (l) => l === linkLayer, hitTolerance: 8 }) ? 'pointer' : 'crosshair'
    }
    map.on('pointermove', cursor)
    return () => {
      map.removeInteraction(interaction)
      map.removeInteraction(rightPan)
      defaultPans.forEach((i) => map.addInteraction(i))
      map.un('pointermove', cursor)
      el?.removeEventListener('contextmenu', noMenu)
    }
  }, [mapRef, layers])

  const reset = () => {
    layers.selected.clear()
    layers.markSrc.clear()
    layers.linkLayer.changed()
    setPicked(null)
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  return createPortal(
    <div className="vmodal-dim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vmodal rpick" role="dialog" aria-modal="true" aria-label="지도에서 구간 선택">
        <div className="vmodal__head">
          <b>지도에서 구간 선택</b>
          <button onClick={onClose} aria-label="닫기"><Icon name="close" /></button>
        </div>
        <div className="rpick__body">
          <div className="rpick__bar">
            <span className="rpick__key"><kbd>왼쪽 버튼</kbd> 끌어서 구간 선택</span>
            <span className="rpick__key"><kbd>오른쪽 버튼</kbd> 끌어서 지도 이동</span>
            <span className="rpick__key"><kbd>휠</kbd> 확대·축소</span>
            <small>다시 끌면 새로 고릅니다.</small>
          </div>
          <div className="rpick__map" ref={elRef} />
          <div className="rpick__info">
            {picked ? (
              <>
                <dl>
                  <div><dt><i className="rpick__dot s">S</i>시작점</dt><dd><b>{picked.start.road}</b>{picked.start.addr}</dd></div>
                  <div><dt><i className="rpick__dot e">E</i>끝점</dt><dd><b>{picked.end.road}</b>{picked.end.addr}</dd></div>
                  <div><dt>구간</dt><dd><b>{picked.name}</b>{picked.links.length}개 링크 · {picked.km.toFixed(1)}km</dd></div>
                </dl>
              </>
            ) : (
              <p className="rpick__empty">선택한 구간이 없습니다.</p>
            )}
          </div>
        </div>
        <div className="rpick__foot">
          <button className="btn btn--outline" onClick={reset} disabled={!picked}>다시 선택</button>
          <span style={{ flex: 1 }} />
          <button className="btn btn--outline" onClick={onClose}>취소</button>
          <button className="btn btn--primary" onClick={() => picked && onAdd(picked)} disabled={!picked}>구간 추가</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
