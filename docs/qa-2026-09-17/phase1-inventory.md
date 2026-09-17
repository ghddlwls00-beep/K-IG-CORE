# 1단계 — 사이트·관리자 전체 인벤토리

근거: 소스(`src/app`, `src/lib/courses.ts`, `src/lib/tabs.ts`, `content/courses/*.json`,
`src/lib/generated/validRoutes.json`), 운영 관리자 화면(읽기만, 2026-09-17 02:3x KST).
"시험 상태" 열은 각 단계가 끝날 때 채웁니다. 비어 있으면 **아직 안 본 것**입니다.

## A. 서비스 구조 요약 (감사 명령의 일반 LMS 항목과 다른 점)

| 명령의 항목 | 이 서비스 | 판정 |
|---|---|---|
| 회원가입·로그인·로그아웃·비밀번호 찾기 | **계정이 없음.** 이용권 코드 + 기기 등록(최대 N대)으로 접근 | 계정 기능은 NOT APPLICABLE. 대신 이용권 등록·해제·검증을 시험 |
| 수강 신청(enrollment) | 없음. 이용권 플랜(1M/1Y/LIFE, STU1M/STU1Y/STULIFE)이 곧 수강 범위 | 이용권 범위 시험으로 대체 |
| 결제·구독 | 사이트 안에 결제 없음. 관리자가 코드를 발급해 스마트스토어·크몽 판매(관리자 화면 문구) | **DEFERRED — OWNER/LAWYER** (새 결제창) |
| 강좌·카테고리·커리큘럼 관리(CMS) | 없음. 콘텐츠는 git 의 JSON 파일, 배포로 반영 | 관리자 CMS 항목 NOT APPLICABLE |
| 공개/비공개 강좌 | 라우팅 안 된 콘텐츠 폴더 8개 존재(`adults` `adults-m` `adults-w` `basics` `chinese` `man` `middle` `woman`) | 노출 여부 시험 대상 |
| 과제 제출 | 서버 제출 없음. 학습자 입력은 브라우저 localStorage (STUDENT 진도만 서버) | 로컬 저장·복원 시험 |
| 수료증·성취 | 수료증 없음. "완료 체크"·STUDENT 챕터 해금·마스터리 배지 | 수료증 NOT APPLICABLE, 완료 상태 시험 |
| 알림·이메일 | 발송 기능 없음 (소스에 메일·푸시 라이브러리 0) | NOT APPLICABLE |
| 고객 지원 경로 | **소스에 문의처·연락처 0건** | 이슈 후보 (8단계) |
| 약관·개인정보·환불 | 페이지 없음 (`/terms` `/privacy` `/pricing` 404) | **DEFERRED — OWNER/LAWYER** |
| 관리자 2차 인증 | 없음 (PIN 1개) | **DEFERRED — OWNER/LAWYER** |

## B. 공개 라우트

| 항목 | 유형 | 위치 | 접근 | 비고 |
|---|---|---|---|---|
| 홈 | 페이지 | `/` | 공개 | 섹션 사진 10종 |
| 섹션(탭) 7개 | 페이지 | `/t/students` `/t/voca` `/t/grammar1` `/t/grammar2` `/t/ld` `/t/reading` `/t/cnn` | 공개 | |
| 과정 목록 7개 | 페이지 | `/ld` `/reading` `/student` `/phonics` `/grammar1` `/grammar2` `/cnn` | 공개 | |
| 레슨 1,748개 | 페이지 | `/[course]/[lesson]`, STUDENT 는 `/student/[lesson]` | 무료 30 / 유료 1,718 | 아래 C |
| 관리자 | 페이지 | `/admin/license` | PIN | noindex |
| 404 | 페이지 | 없는 주소 | 공개 | |
| `sitemap.xml` `robots.txt` `icon.svg` | 정적 | | 공개 | |
| `/audio/[...path]` `/video/[...path]` | 미디어 게이트 | | 무료 목록 or 이용권 | |
| `search-index.json` | 데이터 | | 공개 | 검색 대화상자 |

## C. 과정·레슨 (validRoutes 기준, 전수)

| 과정 | slug | 레슨 페이지 | 본문/스크립트 | 무료 | 유료 | 그룹 | 비고 |
|---|---|---|---|---|---|---|---|
| VOCA 어휘 | `phonics` | 195 | 195/0 | 2 | 193 | 4 (중등01·02·03·고등) | 사전 3,877 표제어 |
| GRAMMAR I | `grammar1` | 194 | 53/141 | 12 | 182 | 6 | 홀수 번호는 짝수로 리다이렉트 |
| GRAMMAR II | `grammar2` | 88 | 44/44 | 4 | 84 | 6 | |
| LISTENING | `ld` | 552 | 276/276 | 4 | 548 | 5 | |
| READING | `reading` | 512 | 256/256 | 4 | 508 | 6 | 레슨당 어휘 카드 14 |
| STUDENT | `student` | 87 | 82 (색인) + 5 | 2 | 85 | 20 챕터 | ⚠️ `s1`~`s5` 는 파일·라우트는 있으나 색인에 없음 |
| CNN (폐지) | `cnn` | 120 | 120/0 | 2 | 118 | 2 | 폐지 과정인데 공개 노출 중 (COM-03, 소유자 결정) |
| **합계** | | **1,748** | | **30** | **1,718** | | CNN 제외 유료 1,600 |

## D. 레슨 화면 기능 (과정별 컴포넌트)

| 과정 | 컴포넌트 | 단계 | 상호작용 요소 |
|---|---|---|---|
| VOCA | `PhonicsLearningView` | 소리 매트릭스 · 인출 퀴즈 · 발음 테스트&오답노트 · 반사 드릴(스피드) | 단어 카드, 음성, 4지선다, 결과 화면, 마이크 발음 평가, Leitner 상자(로컬), 최고 점수(로컬) |
| GRAMMAR I/II | `GrammarLearningView` | Step 1 영작 · 2 빈칸 · 3 구문 각인 · 4 종합 평가 | 입력칸, 정답 보기, 자기 채점, 빈칸 채점, 시험 채점, 다른 정답 표시, 자동 저장 |
| LISTENING | `LdLearningView` | Step 1 블라인드 · 2 탭-딕테이션 · 3 소리 클리닉 · 4 섀도잉 · 5 1.5배속 | 문장 음성, 단어 타일, 정답 판정, 클리닉 선택, 마이크, 메모 |
| READING | `ReadingLearningView` | Step 1 속독 · 2 핵심 어휘 · 3 독해 퀴즈 · 4 원문 대조 | WPM 타이머, 어휘 카드 14, 클로즈, 영어만/한글만, 메모 자동 저장, 마이크 |
| STUDENT | `StudentLearningView` | 단계별 딕테이션·완료 | 단어 배열, 정답 판정, 완료 버튼(챕터 해금, 서버 진도) |
| CNN | `CnnLearningView` | Step 1 대본 · 2 연음 · 3 어휘 | (폐지 과정 — 내용 검수 대상 아님, 노출·동작만) |
| 공통 | `AudioPlayer` `ChapterAudioBar` `LessonActionButtons` `SearchDialog` `LicenseModal` `LanguageProvider` `KakaoTalkNoticeBanner` | | 재생·정지·5초 이동·문장 이동·속도, 챕터 전체 듣기, 북마크·완료 체크, 검색(Cmd+K), 이용권 등록·해제, UI 언어 4종(ko/en/ja/zh)·테마, 카카오 인앱 브라우저 안내 |

## E. API

| 경로 | 용도 | 접근 | 데이터 변경 |
|---|---|---|---|
| `POST /api/license/activate` | 이용권 등록 | 공개 | 예 (기기 기록) |
| `POST /api/license/verify` | 저장된 이용권 검증 | 공개 | 아니오 |
| `POST /api/license/deactivate` | 이 기기 해제 | 이용권 | 예 |
| `GET /api/license/status` | 전체 기기 현황 | 관리자 | 아니오 |
| `POST /api/license/reset` `revoke` `unrevoke` `update-limit` | 기기 초기화·환불 차단·해제·한도 | 관리자 | **예 — 시험 금지** |
| `POST /api/admin/login` `logout`, `GET /api/admin/check` | 관리자 세션 | PIN | 세션만 |
| `POST /api/admin/generate` | 코드 발급 | 관리자 | **예 — 시험 금지** |
| `POST /api/admin/student-progress` | STUDENT 진도 조회(get)·초기화(reset) | 관리자 | get 아니오 / reset **금지** |
| `GET/POST /api/progress/student` | STUDENT 진도 동기화 | 이용권 | 예 (본인 진도) |
| `GET /api/student/chapter-audio` | 챕터 전체 듣기 목록 | 챕터 해금 | 아니오 |
| `GET /api/media-health` | 미디어 저장소 상태 | 공개 | 아니오 |

## F. 관리자 화면 `/admin/license` (운영, PIN 인증 후 읽기만)

| 기능 | 유형 | 데이터 변경 | 시험 방식 |
|---|---|---|---|
| PIN 로그인 / 로그아웃 / 세션 확인 | 인증 | 세션 | 소유자가 PIN 입력. 로그아웃은 누르지 않음 |
| 기기 현황 새로고침 | 조회 | 아니오 | 읽기 전용 시험 가능 |
| 신규 코드 발급: 범위(VIP/STUDENT) · 기간(1M/1Y/LIFE) · 수량(1/5/10/30) · 기기 한도(1~5) · 메모 · 발급 버튼 | 폼 | **예** | 선택 UI 만 관찰, 발급 버튼 **누르지 않음** → "Read-only verification required" |
| 방금 생성된 코드 · 전체 복사 · 고객 발송 안내문 | 표시 | 아니오 | 발급 없이는 표시 안 됨 → 소스 검토 |
| 최근 발급 내역 (이 브라우저 localStorage `kig:admin:history`, 최대 100) | 목록 | 아니오 | 관찰 |
| 기기 한도 드롭다운 (코드별) | 폼 | **예 (즉시 저장)** | 누르지 않음 |
| 코드 복사 | 클립보드 | 아니오 | |
| STUDENT 진도 보기 / 초기화 | 조회 / **변경** | get 아니오 / reset 예 | 보기만 가능, 초기화 금지 |
| 🧪 내 기기에 등록 테스트 | **변경** | 예 (고객 코드의 기기 한 칸을 관리자 브라우저가 차지) | 누르지 않음 |
| 기기 초기화 · 🚫 환불 차단 · ↺ 차단 해제 | **변경** | 예 | 누르지 않음 |
| 목록 지우기 | 로컬 변경 | 이 브라우저 기록만 | 누르지 않음 |

관리자 화면에 **강좌·레슨·회원·가격 관리 기능은 없습니다.**
