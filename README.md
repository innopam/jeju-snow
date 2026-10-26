# 제주 제설·결빙 대응 시스템 — 프론트엔드 목업

Figma 시안(포트홀 flow · `448:1169`)을 기반으로 만든 **Vite + React 19 SPA 목업**입니다.
백엔드 없이 모든 데이터는 `src/data/*.js`의 목업 데이터로 동작하며, GitHub Pages에 정적으로 배포됩니다.

- 배포 주소: https://innopamsolution.github.io/jeju-snow/
- 코드 저장소: [innopam/jeju-snow](https://github.com/innopam/jeju-snow) · 화면 배포 저장소: [innopamSolution/jeju-snow](https://github.com/innopamSolution/jeju-snow)
  (innopam 조직 Pages는 innopam.com 으로 연결돼 있어, 화면은 개인 계정 Pages로 배포)

## 화면 구성 및 구현 기능

화면설계서(JRSP-SD-04-01), 유스케이스 명세서(JRSP-SD-01-02), 메뉴구조도(JRSP-SD-04-03) 기준으로 구현했습니다.

| 경로 | 화면 ID | 구현 기능 (관련 UC) |
|---|---|---|
| `/login` | MN-SIRS-001 | 제주데이터허브 SSO·아이디 로그인, 인증 실패 안내, 접속 이력 기록, 권한별 메뉴 (UC-ACC-001) |
| `/` | UI-SIRS-001-01 | 레이어 On/Off·검색·접기, 구간정보 레이어(교통량 축·우선노선·상습 결빙·재결빙·블랙아이스), 구간 선택 말풍선, 지도 가운데 행정구역 경로, 일반/위성 전환, 확대·축소·이동, 거리·면적 재기, 행정시별 종합 현황, 지도 보기/목록 보기 연결 (UC-GIS-001·003·004·006·009, UC-STA-001, UC-LNK-001-02) |
| `/` | UI-SIRS-001-02·03 | 제설 작업 레이어(택1) 선택 시 전체 노선 색상·범례를 제설 작업 상태 / 작업 횟수 / 노면 상태로 전환, 확대(레벨 11 이상) 시 구간별 라벨 (UC-GIS-004·008) |
| `/` | UI-SIRS-001-04 | 관할·상태·차종 필터, 검색, 상태순 정렬, 단말 이상(배터리 20% 이하·수신 지연) 필터, 선택 차량 위치·궤적·실시간 영상 팝업 (UC-GIS-005) |
| 상단 | UI-SIRS-001-05 | 실시간 알림 바, 미확인 배지, 유형 탭, 모두 읽음, 알림 선택 시 해당 구간으로 지도 이동·읽음 처리, 주기적 신규 이벤트 수신 (UC-EVT-001) |
| `/stats` | UI-SIRS-002 | 기간 캘린더, 일·주·월 집계, 시/도 → 읍면동 연동, 조회 시 차트 갱신, 차트 툴팁 (UC-STA-002·008) |
| `/fusion` | UI-SIRS-003 | 대응시간 판정(우수·양호·주의·미흡)·평균 자동 계산·정렬, 취약구간 목록(미조치 시간순) ↔ 지도 마커·상세 카드 연동 (UC-STA-005·007, UC-GIS-011-02) |
| `/monitoring` | UI-SIRS-004 | 관리자 전용. 배치 검색·사용 토글·수동 실행·스케줄 수정, 수신/송신 이력 조회·초기화, 실패 건 재처리 → 이력 기록 (UC-OMS-001, UC-LNK-001-01) |

### 목업 데모 계정

| 권한 | 아이디 / 비밀번호 | 비고 |
|---|---|---|
| 관리자 | `admin` / `demo1234` | SSO 버튼도 관리자로 로그인 |
| 업무담당자 | `staff` / `demo1234` | 데이터 연계 모니터링 메뉴 숨김 |

알림 읽음 상태, 배치 설정, 송수신 이력은 브라우저 localStorage에 저장됩니다. 데이터 연계 모니터링의 기준일(‘오늘’)은 시안 데이터에 맞춰 2026-10-19입니다.

## 지도 연계 (K-Geo플랫폼 · 브이월드)

요구사항(GIS-013·014, UC-GIS-013)에 따라 자체 배경지도를 쓰지 않고 국토교통부 K-Geo플랫폼 공간정보를 **브이월드 오픈API**로 연계합니다. 지도 엔진은 OpenLayers입니다.

| 기능 | 연계 API |
|---|---|
| 일반지도 | WMTS `Base` |
| 위성지도 | WMTS `Satellite` + `Hybrid` |
| 연속지적도 | WMS `lp_pa_cbnd_bubun`, `lp_pa_cbnd_bonbun` (확대 레벨 15 이상) |
| 타일 캐싱·프리페치 | OpenLayers 타일 캐시(`cacheSize`)·`preload` |

- 인증키는 `VITE_VWORLD_KEY` 환경변수로 주입합니다. 로컬은 `.env.example`을 `.env.local`로 복사해 키를 넣고, 배포는 GitHub 저장소 Secret `VWORLD_KEY`에 등록합니다.
- 키가 없으면 개발용 임시 배경지도(OpenStreetMap)로 표시됩니다.
- 노선·구간·차량·CCTV 좌표(`src/data/geo.js`)는 목업용 근사치이며, 운영 시 스마트빌리지 인프라 연계 데이터로 교체합니다.

## 반응형 지원

| 화면 폭 | 레이아웃 |
|---|---|
| 데스크톱 (1280px 이상) | 시안 그대로. 왼쪽 메뉴 펼침, 대시보드 우측 패널 고정 |
| 태블릿 (768~1279px) | 왼쪽 메뉴 아이콘만 표시, 대시보드 우측 패널은 지도 위에 겹쳐 열림, 통계 1열, 융합 분석은 지도 → 차트 → 분석 패널 순으로 쌓임, 표는 가로 스크롤 |
| 모바일 (767px 이하) | 햄버거 메뉴(서랍), 대시보드 종합 현황은 하단 시트, 레이어·범례 접힘, 조회 조건 세로 배치, 융합 분석 지도는 선택 구간 카드만 표시 |

## 개발

```bash
npm install
npm run dev      # http://localhost:5173/jeju-snow/
npm run build    # dist/ 생성 (SPA 라우팅용 404.html 포함)
```

## 기술 스택

- React 19 · React Router 7 (`BrowserRouter`, `basename=/jeju-snow/`)
- Vite 8 (`base: '/jeju-snow/'`)
- 순수 CSS (Figma 변수 기반 CSS 커스텀 프로퍼티), 외부 UI 라이브러리 없음
- 지도: OpenLayers + 브이월드(K-Geo플랫폼) 배경지도, 노선은 벡터 레이어, 마커는 실제 경위도 기준

## 배포

두 저장소 모두에 push 되도록 `origin`에 push URL 2개가 설정돼 있습니다. `innopamSolution/jeju-snow`의 `main`에 push 되면 `.github/workflows/deploy.yml`이 빌드 후 GitHub Pages로 배포합니다.
GitHub Pages는 서버 rewrite를 지원하지 않으므로 `index.html`을 `404.html`로 복사해 하위 경로 새로고침을 처리합니다.
