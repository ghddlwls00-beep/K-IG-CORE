# After the A/B: (1) re-press the one audio control that failed under build load (d112-1) (2) re-visit STUDENT s17-1 desktop
# (3) live tile dictation on the script pages d078-1 / d197-1 (desktop + mobile) - 3 browsers at most - then recount gates 0/5/6/9/10/11.
# ASCII-only strings.
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$repo = "C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE"
$s = "C:\Users\ghddl\AppData\Local\Temp\claude\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE\b138581d-6e8d-498e-b217-99c4c524c08a\scratchpad\s7"
Set-Location $repo
function Stamp($m) { "[$(Get-Date -Format 'HH:mm:ss')] $m" }
$busy = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'measure-perf' })
if ($busy.Count) { Stamp "perf still running - stop"; exit 3 }
$env:KIG_PROFILE_SOURCE = "$env:TEMP\kig-audit-g15-source"
$env:KIG_CLONE_PREFIX = "kig-audit-g15-"
$p = @()
$p += Start-Process -FilePath "node" -ArgumentList @("docs/qa-2026-09-18/scripts/recheck-audio.cjs", "--from", "$s\recheck-part8.jsonl", "--suffix", "-g15f8", "--port", "9608") -WorkingDirectory $repo -RedirectStandardOutput "$s\recheck-part8.txt" -RedirectStandardError "$s\recheck-part8.err" -NoNewWindow -PassThru
$p += Start-Process -FilePath "node" -ArgumentList @("$s\tile-live-check.cjs", "--ids", "d078-1,d197-1", "--viewport", "desktop", "--port", "9666") -WorkingDirectory $repo -RedirectStandardOutput "$s\tile-live-script-desktop.txt" -RedirectStandardError "$s\tile-live-script-desktop.err" -NoNewWindow -PassThru
Remove-Item Env:KIG_PROFILE_SOURCE -ErrorAction SilentlyContinue
Remove-Item Env:KIG_CLONE_PREFIX -ErrorAction SilentlyContinue
$suf = "-g15-desktop-s2of2"; $k = 1
while (Test-Path "docs\qa-2026-09-18\out\features\student$suf.jsonl") { $k++; $suf = "-g15-desktop-s2of2-r$k" }
$p += Start-Process -FilePath "node" -ArgumentList @("docs/qa-2026-09-18/scripts/drive-generic.cjs", "--course", "student", "--viewports", "desktop", "--suffix", $suf, "--port", "9711", "--clone", "g0-w1", "--ids", "s17-1") -WorkingDirectory $repo -RedirectStandardOutput "$s\s17-1-revisit.txt" -RedirectStandardError "$s\s17-1-revisit.err" -NoNewWindow -PassThru
$p | Wait-Process
Stamp "d112-1 re-press"; Get-Content "$s\recheck-part8.txt" -Encoding UTF8 -Tail 2
Stamp "tile live script pages desktop"; Get-Content "$s\tile-live-script-desktop.txt" -Encoding UTF8 -Tail 2
Stamp "s17-1 desktop revisit ($suf)"; Get-Content "$s\s17-1-revisit.txt" -Encoding UTF8 -Tail 3
$env:KIG_PROFILE_SOURCE = "$env:TEMP\kig-audit-g15-source"
$env:KIG_CLONE_PREFIX = "kig-audit-g15-"
node "$s\tile-live-check.cjs" --ids "d078-1,d197-1" --viewport mobile --port 9667 2>&1 | ForEach-Object { "$_" } | Select-Object -Last 2
Remove-Item Env:KIG_PROFILE_SOURCE -ErrorAction SilentlyContinue
Remove-Item Env:KIG_CLONE_PREFIX -ErrorAction SilentlyContinue
Stamp "recount"
node "$s\recheck-plan.cjs" --count "$s\recheck-targets-final2.jsonl" | Select-Object -First 6
& "$s\post-sweep-g15.ps1" | Select-Object -Last 8
node "$s\final-tail-list.cjs" | Select-Object -First 4
Stamp "done"
