// PC·모바일 진입점 선택 — 휴대폰(모바일 브라우저)이면 mobile.html 을 연다. 태블릿·PC 는 PC 진입점.
// ?pc 를 붙이면 휴대폰에서도 PC 진입점을 그대로 쓴다.
export function isMobileDevice(): boolean {
  if (new URLSearchParams(window.location.search).has('pc')) return false
  const uaData = (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData
  if (uaData) return uaData.mobile
  return /Android.+Mobile|iPhone|iPod|Windows Phone/i.test(navigator.userAgent)
}

// 현재 경로(/jeju-snow/stats)를 모바일 주소(/jeju-snow/mobile.html#/stats)로 바꾼다
export function mobileUrl(): string {
  const base = import.meta.env.BASE_URL
  const path = window.location.pathname.startsWith(base) ? window.location.pathname.slice(base.length) : ''
  return `${base}mobile.html#/${path}`
}
