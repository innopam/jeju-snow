import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { A } from '../assets.js'
import { DEMO_HINT, login, loginSSO, sessionStore } from '../auth.js'
import { useStore } from '../store.js'
import './login.css'

// MN-SIRS-001-01 로그인 — 제주데이터허브 계정(SSO) 로그인, 실패 시 안내 (UC-ACC-001-01 예외 흐름)
export default function Login() {
  const session = useStore(sessionStore)
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/'
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  if (session) return <Navigate to={from} replace />

  const submit = (e) => {
    e.preventDefault()
    if (!id.trim() || !pw) return setError('아이디와 비밀번호를 입력해 주세요.')
    const r = login(id, pw)
    if (!r.ok) return setError(r.message)
    navigate(from, { replace: true })
  }

  return (
    <div className="login">
      <div className="login__brand">
        <img src={A.logo} alt="Jeju" />
        <p>제설·결빙 대응 시스템</p>
      </div>
      <form className="login__card" onSubmit={submit} noValidate>
        <h1>로그인</h1>
        <p className="login__sub">제주데이터허브 계정으로 로그인하면 권한에 맞는 메뉴를 사용할 수 있습니다.</p>
        <button type="button" className="login__sso" onClick={() => { loginSSO(); navigate(from, { replace: true }) }}>
          제주데이터허브 계정으로 로그인 (SSO)
        </button>
        <div className="login__or"><span>또는</span></div>
        <label>
          아이디
          <input value={id} onChange={(e) => { setId(e.target.value); setError('') }} autoComplete="username" placeholder="아이디" />
        </label>
        <label>
          비밀번호
          <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setError('') }} autoComplete="current-password" placeholder="비밀번호" />
        </label>
        {error && <p className="login__error" role="alert">{error}</p>}
        <button type="submit" className="btn-primary login__submit">로그인</button>
        <div className="login__hint">
          <b>목업 데모 계정</b>
          {DEMO_HINT.map((h) => (
            <button type="button" key={h.id} onClick={() => { setId(h.id); setPw(h.pw); setError('') }}>
              {h.role} · {h.id} / {h.pw}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}
