$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE\.claude\worktrees\nostalgic-blackburn-048c73'
$env:BASE = 'http://localhost:3370'
function WaitMem { for ($i = 0; $i -lt 30; $i++) { $f = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB; if ($f -ge 1.2) { return }; "mem $([math]::Round($f,2))GB < 1.2 - wait 60s"; Start-Sleep 60 } }
$runs = @(
  @{ c = 'student'; id = 's1-1' }, @{ c = 'adult'; id = 'a1-2' }, @{ c = 'phonics'; id = 'mv1-01' },
  @{ c = 'grammar1'; id = 'gh1-006' }, @{ c = 'grammar2'; id = 'gh2-007' }, @{ c = 'ld'; id = 'd001' }
)
foreach ($r in $runs) {
  WaitMem
  "=== drive-generic $($r.c) $($r.id) $(Get-Date -Format HH:mm:ss)"
  node docs/qa-2026-09-18/scripts/drive-generic.cjs --course $r.c --ids $r.id --viewports desktop,mobile --suffix -uifix-int --port 9981 2>&1 | Select-Object -Last 12
  "exit $LASTEXITCODE"
}
WaitMem
"=== drive-reading pr001 $(Get-Date -Format HH:mm:ss)"
node docs/qa-2026-09-18/scripts/drive-reading.cjs --ids pr001 --viewports desktop,mobile --suffix -uifix-int --port 9982 --no-resume 2>&1 | Select-Object -Last 15
"exit $LASTEXITCODE"
WaitMem
"=== drive-passoff pg01-1 $(Get-Date -Format HH:mm:ss)"
node docs/qa-2026-09-18/scripts/drive-passoff.cjs --ids pg01-1 --viewports desktop,mobile --suffix -uifix-int --port 9983 --licence no 2>&1 | Select-Object -Last 15
"exit $LASTEXITCODE"
"=== done $(Get-Date -Format HH:mm:ss)"
