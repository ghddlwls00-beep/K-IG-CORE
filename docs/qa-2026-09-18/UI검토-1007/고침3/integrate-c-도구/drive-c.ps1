# integrate-c (2026-10-08 고침3): 고침2/integrate-b-도구/drive-b.ps1 사본 — 로컬 next start 3380 · 디버깅 9986~9989 · 빈 프로필(이용권 없음) ·
#   --suffix -uifixc · 브라우저 한 번에 하나 · 띄우기 전 남은 메모리 1.2GB 아래면 1분씩 기다림. 기록: 같은 폴더 drive-3380.log (이 스크립트의 출력)
#   powershell -File drive-c.ps1 [-Part drivers|checks|all]
param([string]$Part = 'all')
$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE\.claude\worktrees\nostalgic-blackburn-048c73'
$env:BASE = 'http://localhost:3380'
$empty = Join-Path $env:TEMP 'integrate1007c-empty-profile-src'
New-Item -ItemType Directory -Force $empty | Out-Null
$env:KIG_PROFILE_SOURCE = $empty
$env:KIG_CLONE_PREFIX = 'kig-intc-'
Remove-Item Env:KIG_BREAK_APP -ErrorAction SilentlyContinue
function WaitMem { for ($i = 0; $i -lt 30; $i++) { $f = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB; if ($f -ge 1.2) { return }; "mem $([math]::Round($f,2))GB < 1.2 - wait 60s"; Start-Sleep 60 } }
if ($Part -eq 'all' -or $Part -eq 'drivers') {
  $runs = @(
    @{ c = 'student'; id = 's1-1' }, @{ c = 'adult'; id = 'a1-2' }, @{ c = 'phonics'; id = 'mv1-01' },
    @{ c = 'grammar1'; id = 'gh1-006' }, @{ c = 'grammar2'; id = 'gh2-007' }, @{ c = 'ld'; id = 'd001' }
  )
  foreach ($r in $runs) {
    WaitMem
    "=== drive-generic $($r.c) $($r.id) $(Get-Date -Format HH:mm:ss)"
    node docs/qa-2026-09-18/scripts/drive-generic.cjs --course $r.c --ids $r.id --viewports desktop,mobile --suffix -uifixc --port 9986 --redo 2>&1 | Select-Object -Last 14
    "exit $LASTEXITCODE"
  }
  WaitMem
  "=== drive-reading pr001 $(Get-Date -Format HH:mm:ss)"
  node docs/qa-2026-09-18/scripts/drive-reading.cjs --ids pr001 --viewports desktop,mobile --suffix -uifixc --port 9987 --no-resume 2>&1 | Select-Object -Last 16
  "exit $LASTEXITCODE"
  WaitMem
  "=== drive-passoff pg01-1 $(Get-Date -Format HH:mm:ss)"
  node docs/qa-2026-09-18/scripts/drive-passoff.cjs --ids pg01-1 --viewports desktop,mobile --suffix -uifixc --port 9988 --licence no --redo 2>&1 | Select-Object -Last 16
  "exit $LASTEXITCODE"
}
if ($Part -eq 'all' -or $Part -eq 'checks') {
  WaitMem
  "=== check-student-0927 $(Get-Date -Format HH:mm:ss)"
  node docs/qa-2026-09-18/scripts/check-student-0927.cjs --port 9989 2>&1 | Select-Object -Last 30
  "exit $LASTEXITCODE"
  WaitMem
  "=== gap-checks-0926 (M,S,P,R,W,O) $(Get-Date -Format HH:mm:ss)"
  node docs/qa-2026-09-18/scripts/gap-checks-0926.cjs --port 9986 --tag intc 2>&1 | Select-Object -Last 40
  "exit $LASTEXITCODE"
  # 통합이 바꾼 도구 줄(check-voca-0927 G1 — 'Step 2 퀴즈를 …') — PASS → 깨기(앱을 10-08 전 글로) FAIL → PASS
  WaitMem
  "=== check-voca-0927 pass $(Get-Date -Format HH:mm:ss)"
  node docs/qa-2026-09-18/scripts/check-voca-0927.cjs --port 9989 2>&1 | Select-Object -Last 14
  "exit $LASTEXITCODE"
  WaitMem
  "=== check-voca-0927 break (KIG_BREAK_APP=1008) $(Get-Date -Format HH:mm:ss)"
  $env:KIG_BREAK_APP = '1008'
  node docs/qa-2026-09-18/scripts/check-voca-0927.cjs --port 9989 2>&1 | Select-Object -Last 14
  "exit $LASTEXITCODE"
  Remove-Item Env:KIG_BREAK_APP -ErrorAction SilentlyContinue
  WaitMem
  "=== check-voca-0927 repass $(Get-Date -Format HH:mm:ss)"
  node docs/qa-2026-09-18/scripts/check-voca-0927.cjs --port 9989 2>&1 | Select-Object -Last 14
  "exit $LASTEXITCODE"
}
"=== done $(Get-Date -Format HH:mm:ss)"
