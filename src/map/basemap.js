// 배경지도·연속지적도 — K-Geo플랫폼 공간정보(브이월드 오픈API) 연계 (UC-GIS-013, 요구사항 GIS-013·014)
// 인증키(VITE_VWORLD_KEY)가 있으면 브이월드 WMTS/WMS 를, 없으면 개발용 임시 배경(OpenStreetMap)을 쓴다.
import TileLayer from 'ol/layer/Tile.js'
import OSM from 'ol/source/OSM.js'
import TileWMS from 'ol/source/TileWMS.js'
import XYZ from 'ol/source/XYZ.js'

export const VWORLD_KEY = import.meta.env.VITE_VWORLD_KEY || ''
export const HAS_VWORLD = Boolean(VWORLD_KEY)

const VWORLD_ATTR = '© <a href="https://www.vworld.kr" target="_blank" rel="noreferrer">브이월드(국토교통부 K-Geo플랫폼)</a>'
const wmts = (layer, ext) =>
  new XYZ({
    url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/${layer}/{z}/{y}/{x}.${ext}`,
    attributions: VWORLD_ATTR,
    minZoom: 6,
    maxZoom: 19,
    crossOrigin: 'anonymous',
    cacheSize: 2048, // 타일 캐싱 (UC-GIS-013 기본 흐름 2)
  })

// preload: 주변·저배율 타일을 미리 받아 두는 프리페치 (UC-GIS-013 기본 흐름 3)
export function createBaseLayers() {
  if (!HAS_VWORLD) {
    return {
      normal: [new TileLayer({ source: new OSM({ cacheSize: 2048 }), preload: 2, className: 'ol-layer base-osm' })],
      satellite: null,
    }
  }
  return {
    normal: [new TileLayer({ source: wmts('Base', 'png'), preload: 2 })],
    satellite: [new TileLayer({ source: wmts('Satellite', 'jpeg'), preload: 2 }), new TileLayer({ source: wmts('Hybrid', 'png'), preload: 1 })],
  }
}

// 연속지적도 (WMS: lp_pa_cbnd_bubun · lp_pa_cbnd_bonbun) — 확대 레벨 15 이상에서만 표출
export function createCadastralLayer() {
  if (!HAS_VWORLD) return null
  return new TileLayer({
    minZoom: 15,
    opacity: 0.8,
    source: new TileWMS({
      url: 'https://api.vworld.kr/req/wms',
      params: {
        KEY: VWORLD_KEY,
        DOMAIN: window.location.origin,
        LAYERS: 'lp_pa_cbnd_bubun,lp_pa_cbnd_bonbun',
        STYLES: 'lp_pa_cbnd_bubun_line,lp_pa_cbnd_bonbun_line',
        FORMAT: 'image/png',
        TRANSPARENT: true,
        VERSION: '1.3.0',
      },
      projection: 'EPSG:3857',
      attributions: VWORLD_ATTR,
      crossOrigin: 'anonymous',
    }),
  })
}
