# 고침2 배포 뒤 운영 확인 — 남은 브라우저 일을 한 번에 하나씩(브라우저 하나 규칙). 앞 단계가 끝나야 다음 단계를 띄움.
# 쓰는 법: run-rest-prod-b.ps1 -T <이 파일이 있는 폴더(배포뒤-도구)>  — 한글 길이 .ps1 안 글로 있으면 PowerShell 5.1 이 깨뜨려 매개변수로 받음
param([string]$T, [string]$Only = '')
$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE\.claude\worktrees\nostalgic-blackburn-048c73'
Remove-Item Env:BASE -ErrorAction SilentlyContinue
function WaitMem { for ($i = 0; $i -lt 40; $i++) { $f = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB; if ($f -ge 1.2) { return }; "mem $([math]::Round($f,2))GB < 1.2 - wait 60s"; Start-Sleep 60 } }
function Step($name, $cmd) { WaitMem; "=== $name $(Get-Date -Format HH:mm:ss)"; & $cmd; "exit $LASTEXITCODE" }
Step 'verify lic modal' { node "$T/verify-prod-b.cjs" lic --only=modal 2>&1 | Select-Object -Last 6 }
Step 'verify free modalfree+adult3' { node "$T/verify-prod-b.cjs" free --only=modalfree,adult3 2>&1 | Select-Object -Last 10 }
Step 'probe-c-prod' { node "$T/probe-c-prod.cjs" 2>&1 | Select-Object -Last 30 }
Step 'capture free phone,desktop' { node "$T/capture-prod-b.cjs" --free --vp phone,desktop --theme light,dark 2>&1 | Select-Object -Last 8 }
Step 'capture free small' { node "$T/capture-prod-b.cjs" --free --vp small --only home,lists,lessons,extra --lists /student,/adult,/grammar2 --pages /adult/a1-2,/reading/pr001,/ld/d001,/grammar1/gh1-006,/phonics/mv1-01 2>&1 | Select-Object -Last 8 }
Step 'capture lic lists' { node "$T/capture-prod-b.cjs" --vp phone,desktop --only lists --theme light,dark 2>&1 | Select-Object -Last 8 }
Step 'capture lic lessons+map' { node "$T/capture-prod-b.cjs" --vp small,desktop --only lessons,extra --pages /adult/a6-2,/student/s11-4,/reading/pr154,/passoff-grammar/pg13-1 --extras "/passoff-grammar/map?topic=1" --theme light,dark 2>&1 | Select-Object -Last 8 }
"=== all done $(Get-Date -Format HH:mm:ss)"
