# K-IG-CORE 프로젝트 가이드 & 에이전트 지침

이 프로젝트는 **K-IG 핵심 6대 어학 과정 (VOCA · GRAMMAR 1·2 · 수능영어 듣기 · READING · CNN)** 전용 독립 웹 플랫폼입니다.

---

## 1. 프로젝트 기본 정보
- **로컬 경로**: `C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE`
- **GitHub 원격 저장소**: [https://github.com/ghddlwls00-beep/K-IG-CORE](https://github.com/ghddlwls00-beep/K-IG-CORE)
- **스택**: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS 4 + Web Speech API
- **패키지 매니저**: `pnpm`

---

## 2. 핵심 6대 과정 구성
1. **VOCA (보카 어휘 매트릭스, slug: phonics)**
   - 분류: 중등단어 1·2·3 (mv1, mv2, mv3), 고등단어 (hv)
   - 사전: `content/voca_dictionary.json` (3,877개 단어 1:1 완벽 한글 뜻 연동)
   - 발음 테스트: 엄격한 4단계 레벨 평가 시스템 (`VoiceSpeakingTester.tsx`)
2. **GRAMMAR I (영문법 1, slug: grammar1)**
   - 핵심 영작 연습, 한글 프롬프트와 모범 답안 1:1 대조 및 해설
3. **GRAMMAR II (영문법 2, slug: grammar2)**
   - 심화 영작 연습, 문제-해설 완역 대조
4. **수능영어 듣기 (Listening & Dictation, slug: ld)**
   - 실전 수능형 리스닝, 영문 스크립트와 한글 대본 1:1 대조 및 Dictation(받아쓰기) 시험
5. **READING (리딩, slug: reading)**
   - 원어민 오디오 + 문장별 직독직해 분석 뷰어
   - 본문 클릭 및 마우스 드래그 시 고정 유지
6. **CNN 뉴스 (slug: cnn)**
   - CNN 비디오 영상 + 문장 단위 1:1 보도 대본 완역 대조 및 시사 어휘 디코딩

---

## 3. 핵심 규칙 및 개발 가이드
- **데이터 위치**: `content/lessons/` (각 과정별 JSON 데이터) 및 `content/voca_dictionary.json`
- **빌드 검증**: 작업 후 `npx tsc --noEmit` 및 `pnpm run build`로 정적 생성 무결성 검증
- **깃허브 배포**: 변경 완료 후 `git add -A`, `git commit -m "..."`, `git push origin main` 실행 (또는 `push_to_github.bat` 실행)
- **자율 실행**: 사용자 확인 질문으로 지체하지 말고 최적의 방안으로 즉시 구현하고 검증 후 보고할 것.
