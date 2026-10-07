# 고침2 배포 뒤(dc68238e) 운영 드라이버 — 이용권 사본 · 운영 · --suffix -uipdb · 포트 9961~9963 · 사본 ui1007-pd3-s/-r/-p
# 도구(scripts/*)는 안 바꾸고 그대로 부름. 진도 바꾸는 누름은 드라이버의 완료 켜기 · 끄기 짝뿐.
$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE\.claude\worktrees\nostalgic-blackburn-048c73'
Remove-Item Env:BASE -ErrorAction SilentlyContinue
function WaitMem { for ($i = 0; $i -lt 30; $i++) { $f = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB; if ($f -ge 1.2) { return }; "mem $([math]::Round($f,2))GB < 1.2 - wait 60s"; Start-Sleep 60 } }
$runs = @(
  @{ c = 'student'; id = 's1-1,s11-4' }, @{ c = 'adult'; id = 'a1-2,a6-2' }, @{ c = 'grammar1'; id = 'gh1-006' },
  @{ c = 'grammar2'; id = 'gh2-007' }, @{ c = 'phonics'; id = 'mv1-01' }, @{ c = 'ld'; id = 'd001' }
)
foreach ($r in $runs) {
  WaitMem
  "=== drive-generic $($r.c) $($r.id) $(Get-Date -Format HH:mm:ss)"
  node docs/qa-2026-09-18/scripts/drive-generic.cjs --course $r.c --ids $r.id --viewports desktop,mobile,small --suffix -uipdb --port 9961 --clone ui1007-pd3-s 2>&1 | Select-Object -Last 14
  "exit $LASTEXITCODE"
}
WaitMem
"=== drive-reading pr001,pr154 $(Get-Date -Format HH:mm:ss)"
node docs/qa-2026-09-18/scripts/drive-reading.cjs --ids pr001,pr154 --viewports desktop,mobile,small --suffix -uipdb --clone ui1007-pd3-r --port 9962 --no-resume 2>&1 | Select-Object -Last 16
"exit $LASTEXITCODE"
WaitMem
"=== drive-passoff pg01-1 $(Get-Date -Format HH:mm:ss)"
node docs/qa-2026-09-18/scripts/drive-passoff.cjs --ids pg01-1 --viewports desktop,mobile,small --suffix -uipdb --clone ui1007-pd3-p --port 9963 2>&1 | Select-Object -Last 16
"exit $LASTEXITCODE"
"=== done $(Get-Date -Format HH:mm:ss)"
