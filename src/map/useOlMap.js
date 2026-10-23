// OpenLayers 지도 생성 훅 — 지도 인스턴스와 화면 갱신 tick 을 돌려준다.
import { useEffect, useRef, useState } from 'react'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import ScaleLine from 'ol/control/ScaleLine.js'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import 'ol/ol.css'

export { fromLonLat, toLonLat }

export function useOlMap({ center, zoom, layers }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const map = new Map({
      target: elRef.current,
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

  const pixelOf = (lonlat) => mapRef.current?.getPixelFromCoordinate(fromLonLat(lonlat)) ?? null
  return { elRef, mapRef, tick, pixelOf }
}
