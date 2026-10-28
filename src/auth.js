// UC-ACC-001 로그인·로그아웃 (목업) — 실제 인증 서버 없이 브라우저 안에서만 동작한다.
import { createStore } from './store.js'

export const ROLES = { ADMIN: '관리자', STAFF: '업무담당자' }

// 목업 전용 데모 계정 (실제 계정·비밀번호가 아님)
const DEMO_USERS = [
  { id: 'admin', pw: 'demo1234', name: '홍길동', dept: '도로관리과', role: ROLES.ADMIN },
  { id: 'staff', pw: 'demo1234', name: '김제주', dept: '제주시 건설과', role: ROLES.STAFF },
]
export const DEMO_HINT = DEMO_USERS.map((u) => ({ id: u.id, pw: u.pw, role: u.role }))

export const sessionStore = createStore('jeju-snow.session', null, 'session')
export const accessLogStore = createStore('jeju-snow.access-log', [])

const now = () => new Date().toLocaleString('ko-KR', { hour12: false })
const log = (user, action, ok = true) =>
  accessLogStore.set((list) => [{ at: now(), id: user, action, ok }, ...list].slice(0, 200))

export function login(id, pw) {
  const user = DEMO_USERS.find((u) => u.id === id.trim() && u.pw === pw)
  if (!user) {
    log(id || '(빈 아이디)', '로그인', false)
    return { ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }
  const { pw: _pw, ...profile } = user
  sessionStore.set({ ...profile, loginAt: now() })
  log(user.id, '로그인')
  return { ok: true }
}

// 제주데이터허브 SSO (목업) — 관리자 계정으로 바로 로그인
export function loginSSO() {
  const { pw: _pw, ...profile } = DEMO_USERS[0]
  sessionStore.set({ ...profile, loginAt: now(), sso: true })
  log(profile.id, '로그인(SSO)')
}

export function logout() {
  const s = sessionStore.get()
  if (s) log(s.id, '로그아웃')
  sessionStore.set(null)
}

// 권한별 접근 가능 메뉴 (데이터 연계 모니터링은 관리자 전용 — UC-OMS-001 주요 액터: 관리자)
export const canAccess = (session, path) => !(path === '/monitoring' && session?.role !== ROLES.ADMIN)

// 목업 시연용 — 이 탭에서 처음 접속하면 관리자로 로그인된 상태로 바로 대시보드를 연다.
// 로그아웃하면 세션 값이 null 로 남아 그 뒤로는 로그인 화면이 정상적으로 뜬다.
const firstVisit = (() => {
  try {
    return window.sessionStorage.getItem('jeju-snow.session') === null
  } catch {
    return false
  }
})()
if (firstVisit) {
  const { pw: _pw, ...profile } = DEMO_USERS[0]
  sessionStore.set({ ...profile, loginAt: now() })
  log(profile.id, '로그인(자동)')
}
