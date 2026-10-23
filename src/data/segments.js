// 제설 구간 목업 데이터 (지도 좌표는 data/geo.js 의 SEGMENTS_GEO)

export const STATE_COLOR = { 미작업: '#f93c65', '제설 필요': '#ff8a3d', 진행중: '#fcbe2d', 완료: '#00b69b' }
export const RISK_COLOR = { 높음: '#e7000b', 보통: '#dc7200', 낮음: '#16a05d' }

// UC-GIS-009 제설 작업 상태 및 재결빙 위험 구간 / 구간 정보 레이어
export const SEGMENTS = [
  { code: 'K-12', road: '1100도로', place: '성판악', state: '진행중', risk: '높음', refreeze: true, blackice: true, jur: '도청', region: '제주시' },
  { code: 'K-16-2', road: '5·16도로', place: '교래', state: '제설 필요', risk: '높음', refreeze: true, jur: '도청', region: '조천읍' },
  { code: 'P-2', road: '평화로', place: '광령', state: '미작업', risk: '높음', blackice: true, jur: '도청', region: '애월읍' },
  { code: 'B-4', road: '번영로', place: '대천', state: '미작업', risk: '보통', refreeze: true, jur: '도청', region: '조천읍' },
  { code: 'V-2', road: '비자림로', place: '송당', state: '미작업', risk: '보통', jur: '제주시', region: '구좌읍' },
  { code: 'S-1', road: '산록도로', place: '안덕', state: '완료', risk: '낮음', habitual: true, jur: '서귀포시', region: '안덕면' },
  { code: 'N-3', road: '남조로', place: '수망', state: '진행중', risk: '보통', habitual: true, jur: '서귀포시', region: '남원읍' },
  { code: 'H-1', road: '한창로', place: '한경', state: '완료', risk: '낮음', habitual: true, jur: '제주시', region: '한경면' },
]
export const segName = (s) => `${s.road} · ${s.place} (${s.code})`
