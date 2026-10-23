# 제주 제설·결빙 대응 시스템 — 프론트엔드 목업

Figma 시안(포트홀 flow · `448:1169`)을 기반으로 만든 **Vite + React 19 SPA 목업**입니다.
백엔드 없이 모든 데이터는 `src/data/*.js`의 목업 데이터로 동작하며, GitHub Pages에 정적으로 배포됩니다.

- 배포 주소: https://jeju-snow.innopam.com/
  (innopam 조직 Pages가 innopam.com에 연결돼 있어 프로젝트 사이트는 커스텀 서브도메인으로 운영)

## 화면 구성

| 경로 | 화면 | Figma 프레임 |
|---|---|---|
| `/` | 통합 관제 대시보드 — 지도 레이어(작업 상태·작업 횟수·노면 상태), 대시보드 / 제설 차량 현황 탭, 차량 궤적·전방 카메라 팝업, 위험 이벤트 알림 | UI-001-01 ~ 06 |
| `/stats` | 통계 — 조치 실적, 발생 추이, 시간대·유형·등급별 분포 | UI-002 |
| `/fusion` | 기상·제설 융합 분석 — 도로별 통합 카드, 대응시간 순위, 취약구간 목록 | UI-003 |
| `/monitoring` | 데이터 연계 모니터링 — 배치 스케줄, 수신/송신 이력 | UI-004 |

## 개발

```bash
npm install
npm run dev      # http://localhost:5173/
npm run build    # dist/ 생성 (SPA 라우팅용 404.html 포함)
```

## 기술 스택

- React 19 · React Router 7 (`BrowserRouter`)
- Vite 8 (`base: '/'`, `public/CNAME` = jeju-snow.innopam.com)
- 순수 CSS (Figma 변수 기반 CSS 커스텀 프로퍼티), 외부 UI 라이브러리 없음
- 지도는 Figma 시안의 정적 이미지 위에 차량·CCTV·기상 레이어를 오버레이 (드래그 이동, 확대/축소 지원)

## 배포

`main` 브랜치에 push 하면 `.github/workflows/deploy.yml`이 빌드 후 GitHub Pages로 배포합니다.
GitHub Pages는 서버 rewrite를 지원하지 않으므로 `index.html`을 `404.html`로 복사해 하위 경로 새로고침을 처리합니다.
