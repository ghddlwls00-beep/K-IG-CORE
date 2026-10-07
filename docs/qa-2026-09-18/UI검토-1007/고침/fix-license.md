# fix-license — 결과.md 2번 · 3번 고침 (2026-10-07)

같은 AI 계열이 고치고 확인했습니다 — **독립 검수가 아닙니다.** 커밋 · 푸시 하지 않았습니다.

고친 파일(내 몫): `src/components/LicenseModal.tsx` · `src/components/LessonPaywall.tsx` · 점검 도구 `docs/qa-2026-09-18/scripts/probe-commercial.cjs`.
손대지 않은 내 몫: `LicenseButton.tsx`(이미 규칙 0건 · 바꿀 것 없음) · `freeLessonLinks.ts`(바꿀 것 없음) · `KakaoTalkNoticeBanner.tsx`(이용권 창 안이 아니라 `layout.tsx` 맨 위 띠 — 결과.md 3장 19번 몫이라 그대로).

## 2번 — 이용권을 살 길(높음 · 사장님 결정대로)

| | 전 | 뒤 |
|---|---|---|
| 잠김 화면 단추 | '이용권 등록'(검정) + '구매 안내'(테두리) — 둘 다 같은 등록 창을 엶 | 판매처 주소가 **없으면** '이용권 등록' 하나만 검정(가로 꽉). **있으면** '이용권 등록'(검정) + '이용권 구매하기'(테두리, 그 주소를 새 탭) |
| 이용권 창 아래 | 💡 상자 안 '구매 링크 준비 중'(누를 수 없음) | 주소가 **없으면** 아무것도 없음. **있으면** 선 아래 '아직 이용권 코드가 없으면 · 이용권 구매하기 →'(새 탭) |
| 무료 강의 바로가기 | 2개 | 그대로 |

- 주소 넣는 법: 배포 환경값 `NEXT_PUBLIC_PURCHASE_URL` 에 `https://…` 주소. 비었거나 https 가 아니면 숨김(전과 같은 판정).
- 코드: `LicenseModal.tsx` 14–15줄(`PURCHASE_URL` · `HAS_PURCHASE_URL` 를 내보냄 — 잠김 화면도 같은 값을 읽어 두 화면이 함께 바뀜) · 307–322줄(창의 구매 줄) / `LessonPaywall.tsx` 5줄(가져오기) · 29–32줄(설명) · 122–142줄(단추).
- 주소가 있을 때도 직접 확인: dev 서버를 시험 주소(`https://example.com/kig-pass-test`)로 다시 띄워 사진 — 잠김 화면 · 창 모두 `href` = 그 주소 · `target=_blank` · 높이 48 / 44px.

## 3번 — 이용권 창 모양(사기 전 · 산 뒤)

| | 전 | 뒤 |
|---|---|---|
| 그림 문자 | 🔑 · 👑 · 🎓 · 💡 · 🛒 | `icons.tsx` 선 아이콘(자물쇠 · 체크 · X) |
| 영어 대문자 라벨 | 'ALL-PASS ACTIVE' · 'STUDENT PASS ACTIVE' | 없앰 — '상태 · 정상 이용 중' 한 줄 |
| 고정폭 한글 · 자간 | '정상 이용 중' · '가려서 보관 중' · '기기 슬롯 정상 연동' · '※ 각 코스의…' 고정폭, 입력 칸 자간 | 0 — 고정폭은 코드 글자(가린 코드 · 입력 값)에만 |
| 12px 미만 글 | 7곳(10.5~11.5px) — 사진 재기 tiny 7 | 0(사진 재기 tiny 0, 글자 크기 토큰 caption 12 · label 14 · body 16 · title-s 18) |
| 닫기 | 28px '✕' 글자 | 44×44px X 아이콘(`aria-label="닫기"` 그대로) |
| 상자 안 상자 | 산 뒤: 상자 안 상자 안 상자 · 호박색 점선 업그레이드 상자 · 파랑/초록 알약 | 한 상자 안에 선으로 나눈 줄(상태 · 이용권 · 이용권 코드 · 이 기기 · 등록일 · 만료일), 업그레이드는 선 아래 한 칸 |
| 이름 | '코스' · '강좌' · '인증 코드' · '이용권 시리얼 코드' · '챕터' | '과정' · '이용권 코드' · '장' |
| 'VIP' | '올패스 VIP 회원' · 'VIP 올패스로 업그레이드' | **그대로**(사장님 결정) |
| 입력 칸 | 16px(업그레이드 칸은 13px) | 둘 다 16px · 높이 44~48px |
| 단추 | 40px 이하, 알약 | 44~48px, 공통 모서리(rounded-control) |
| 직접 색 | blue · emerald · amber · red 26곳 | 0 — 맞음/틀림 토큰(`text-success` · `text-danger`)만 |

글 바뀐 것(전 → 뒤): 제목 'K-IG 이용권 등록' → '이용권 등록' · '발급받으신 코드를 등록하여 학습을 시작하세요.' → '받은 코드를 등록하면 바로 학습할 수 있습니다.' · '이용권 시리얼 코드' → '이용권 코드' · '현재 기기: … / 1인 최대 2대 기기 지원' → '이 기기: … / 한 사람이 기기 2대까지' · '인증 확인 중…' → '확인 중…' · '※ 각 코스의 1~2강은 이용권 없이도 무료로 상시 체험하실 수 있습니다.' → '각 과정의 첫 두 강의는 이용권 없이도 학습할 수 있습니다.' · (산 뒤) '…챕터 1부터 순차적으로…' → '…1장부터 차례대로…' · '전체 유료 강의가 활성화되어 있습니다.' → '모든 유료 강의를 학습할 수 있습니다.' · '기기 슬롯 정상 연동' 없앰(뜻 없는 말) · '※ 최대 2대 기기까지 자동 연동되어…' → '한 사람이 기기 2대까지 쓸 수 있습니다.' · '전 강좌 열람' → '모든 과정 학습' · 잠김 화면 기본 과정 이름 '코스' → '과정'(LessonPaywall 36줄).

**이용권 등록 동작은 그대로**: `handleSubmit` · `handleDeactivate`(확인 창 글 포함) · `activateKey` · `deactivateLicense` · 대문자 바꾸기 · 포커스 가두기 · Esc · 닫으면 연 단추로 포커스 — 한 글자도 안 바꿈. 입력 칸 `id="license-code"` · `id="license-upgrade-code"` · `aria-describedby="license-code-hint"` · `role="dialog"` · `aria-modal` · `aria-labelledby="license-modal-title"` · `label[for=…]` · 자리표시 `KIG-1Y-XXXX…` 그대로(원래 `name` · `data-*` 는 없었음). 단추 글 '이용권 코드 등록하기' · '이 기기에서 등록 해제' · '확인' · '등록' 그대로. `"STUDENT 패스 회원"` · `${STUDENT_PASS_SCOPE}` 그대로(plan-access.cjs 가 읽음).
잠긴 화면 표시 글('ALL-PASS ONLY' 등 다섯)과 `data-kig-paywall` 그대로.

## 검사

- `tsc --noEmit` → exit 0(이 작업 트리 전체 — 다른 일꾼이 고치는 중인 파일 포함).
- `check-design-rules.cjs LicenseModal · LicenseButton · LessonPaywall --zero monoKorean,trackedKorean,tinyText,smallInput,directColor,motion,emoji` → 전: LicenseModal monoKorean 4 · tinyText 16 · smallInput 2 · directColor 26 · emoji 4(exit 1) → 뒤: 모두 0(exit 0). `--selftest-break` → 7칸 모두 잡음(검사가 실패할 수 있음 확인).
- `docs/pass-off-grammar/검사/plan-access.cjs` → PASS(LicenseModal · LessonPaywall 포함). `--break=old-copy` → LicenseModal FAIL(exit 1) — 'STUDENT 패스 회원' 을 남겨서 이 깨기 시험이 여전히 듦.
- `probe-commercial.cjs`(진짜 파일을 fetch 만 바꿔 끼워 돌림 — 사이트맵 0개, 쪽 HTML 은 한 번 GET): 로컬 주소 없음 → `purchasePath: "registerOnly"` · 로컬 시험 주소 → `"link"`(purchaseLinkPresent true) · **운영(지금, 배포 전)** → `"deadEnd"`(purchaseGuideButton true) — 옛 꼴을 잡아냄(깨기 증명).
- 음성: 이 두 파일에는 소리 · 학습 글이 없음(소리 부르는 곳 0) — 소리 글 바뀜 0.
- 로컬 화면(next dev 3362 · 빈 프로필 · 코드 입력 0) 사진 — `docs/qa-2026-09-18/UI검토-1007/고침/fix-license/`
  - `before/` · `after/` : `{light|dark}-{phone|desktop}-{paywall|modal}.png` 8장씩 + `measure.json`(재기). 휴대폰 390 · 데스크톱 1366. 둘 다 옆 밀림 0, 연 창은 '이용권 코드' 칸에 포커스, Esc 로 닫힘.
  - `after-with-purchase-url/` : 시험 주소를 넣었을 때 8장 + `measure-paywall.json`.
  - `after/licensed-{LIFE|STU1Y}-{light|dark}-{phone|desktop}.png` 8장 + `measure-licensed.json` : **산 뒤 창**. 진짜 이용권 없이 이 탭 안에서만 흉내(이 기기 사본에 가짜 값 + `/api/license/verify` 를 '유효'로 답하고 다른 `/api/` 는 403 으로 막음 — 서버 · 이용권 기록에 닿지 않음, 코드 입력 0). 올패스 · STUDENT(업그레이드 칸 있음) 둘 다 12px 미만 0 · 고정폭 한글 0 · 누름 영역 44px 이상.
  - 산 뒤 창의 '전' 사진은 로컬에서 옛 파일로 되돌려 찍지 않았습니다(같은 작업 트리를 다른 일꾼 서버도 읽음) — 운영 사진 `docs/qa-2026-09-18/out/ui-1007/verify/license_modal_licensed_phone_masked.jpg` 가 '전'.

## 드라이버 · 도구에 주는 영향

- `probe-commercial.cjs` 고침(8–10 · 79–93줄): `purchaseGuideButton` · `registerButton` · `purchasePath`(link · registerOnly · deadEnd · none) 더함, `purchaseComingSoon` 은 그대로 둠. 알아 둘 것: 주소가 없는 동안 `legal.purchase` 에 잠긴 강의 쪽이 더는 안 잡힘(그 쪽에 '구매 안내' 글이 없어졌으니 맞는 결과).
- `lib/harness.cjs` 의 '구매 링크 준비 중' 감지(134줄)는 그대로 둠 — 이제 화면에 없어야 맞는 글이라 다시 나타나면 잡는 지킴이로 남음.
- `drive-generic.cjs` 는 '구매' · '이용권' 단추를 누르지 않음(111줄) — 영향 없음. `check-clone-licence.cjs` · `probe-security.cjs` 는 창의 글을 읽지 않음 — 영향 없음. 예전 도구(`qa-2026-09-15` · `09-17`)가 쓰는 `#license-code` · `label[for=license-code]` · `[role=dialog][aria-modal=true]` 그대로.
- **깨지는 것 하나(고치지 않음, 내 몫 아님)**: 오늘 검토 도구 `docs/qa-2026-09-18/UI검토-1007/verify-2.cjs` 326줄이 '구매 안내' 를 찾아 누름 — 이제 없으니 그 단계는 '못 찾음'으로 나옴(고친 결과대로임). 다시 돌릴 때는 '구매 안내' 대신 '이용권 구매하기'(주소가 있을 때만)로 바꾸면 됨.

## 안 한 것과 까닭

- 홈(LandingPage) · 학습법 · 단계 · 채점 · 음성 — 손대지 않음(지시).
- `icons.tsx` 에 열쇠 아이콘을 더하지 않음 — 공통 부품이라 다른 일꾼과 겹칠 수 있어 있는 자물쇠 · 체크 · X 만 씀.
- 업그레이드 칸(휴대폰 252px)에서 자리표시 `KIG-1Y-XXXX…` 가 끝이 잘려 보임 — 코드 꼴을 보여 주는 자리표시(UX-01)라 그대로 둠. 등록 칸은 '…' 로 줄어듦.
- 카카오톡 안내 띠 — 이용권 창 안이 아니라 지시대로 그대로(결과.md 19번).

## 사고 하나 — 다른 일꾼(fix-list) 사진 폴더를 덮음

같은 임시 폴더(scratchpad)에 fix-list 가 `cap.cjs` 를 같은 이름으로 써서 내 `cap.cjs` 가 덮였고, 나는 그것을 모르고 19:32 에 돌렸습니다(내 인자 'after-with-purchase-url' 은 그 도구에서 무시 → `--tag before`, BASE 3363). 3363 에 서버가 없어 **`docs/qa-2026-09-18/out/ui-1007/fix-list/before/` 의 사진 17장 · result.json 이 모두 '연결 거부' 화면**으로 쓰였습니다. 19:39 에 멈췄고, 그 폴더에 `주의-fix-license-실수.txt` 를 남겼습니다. 그 전에 같은 이름의 fix-list '전' 사진이 있었다면 덮였으니 **fix-list 의 '전' 사진은 다시 찍어야 합니다**(git 밖 out/ 폴더라 되살릴 수 없음). 앱 · 저장소 파일에는 영향 없음. 그 뒤로 나는 `fixlicense-cap.cjs` 라는 다른 이름만 썼습니다.

dev 서버(3362) · 브라우저(9962) 는 끝내고 닫았습니다.
