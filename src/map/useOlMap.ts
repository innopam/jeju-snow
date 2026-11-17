// OpenLayers 지도 생성 훅 — 지도 인스턴스와 화면 갱신 tick 을 돌려준다.
import { useEffect, useRef, useState } from 'react'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import ScaleLine from 'ol/control/ScaleLine.js'
import type BaseLayer from 'ol/layer/Base.js'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import 'ol/ol.css'
import type { LonLat } from '../data/geo'

export { fromLonLat, toLonLat }

interface OlMapOptions {
  center: LonLat
  zoom: number
  layers: () => BaseLayer[]
}

export function useOlMap({ center, zoom, layers }: OlMapOptions) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const map = new Map({
      target: elRef.current!, // 마운트 뒤 effect 라 항상 있다
      layers: layers(),
      view: new View({ center: fromLonLat(center), zoom, minZoom: 7, maxZoom: 19, constrainResolution: false }),
      controls: defaultControls({ zoom: false, rotate: false, attributionOptions: { collapsible: false } }).extend([new ScaleLine({ units: 'metric' })]),
    })
    mapRef.current = map
    // HTML 오버레이(차량·CCTV·기상 등)를 지도 이동에 맞춰 다시 그린다
    let raf = 0
    const onRender = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setTick((t) => t + 1))
    }
    map.on('postrender', onRender)
    return () => {
      cancelAnimationFrame(raf)
      map.un('postrender', onRender)
      map.setTarget(undefined)
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pixelOf = (lonlat: LonLat) => mapRef.current?.getPixelFromCoordinate(fromLonLat(lonlat)) ?? null
  const sizeOf = () => mapRef.current?.getSize() ?? null
  return { elRef, mapRef, tick, pixelOf, sizeOf }
}
