# After the gate-15 sweep: (1) re-visit pages whose latest record has problems (internet drops) (2) counts (post-sweep-g15.ps1)
# (3) new clips live + gate 5 audio recheck of the REMAINING targets in 3 parallel browsers (4) licensed missing-clip probe
# (5) gate 12 perf ALONE (no other audit browser). Skip parts already done early with -skip "1,3a" etc.
# ASCII-only strings (PowerShell 5.1 misreads Korean in BOM-less scripts). Run only when the sweep orchestrator has finished.
param([string]$skip = "")
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$repo = "C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE"
$s = "C:\Users\ghddl\AppData\Local\Temp\claude\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE\b138581d-6e8d-498e-b217-99c4c524c08a\scratchpad\s7"
Set-Location $repo
function Stamp($m) { "[$(Get-Date -Format 'HH:mm:ss')] $m" }
$sk = @($skip.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$left = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'gate0-sweep3b\.cjs|drive-generic\.cjs' })
if ($left.Count) { Stamp "sweep still running ($($left.Count) node) - stop"; exit 3 }
Remove-Item Env:KIG_PROFILE_SOURCE -ErrorAction SilentlyContinue
Remove-Item Env:KIG_CLONE_PREFIX -ErrorAction SilentlyContinue

if ($sk -notcontains "1") {
  Stamp "== 1 final tail (latest records with problems)"
  & "$s\tail-now.ps1" -w 1
}

Stamp "== 2 counts"
& "$s\post-sweep-g15.ps1"

$env:KIG_PROFILE_SOURCE = "$env:TEMP\kig-audit-g15-source"
$env:KIG_CLONE_PREFIX = "kig-audit-g15-"
if ($sk -notcontains "3a") {
  Stamp "== 3a new clips of the three gate deploys on production (licensed) + break"
  node "$s\new-clips-live.cjs" 2>&1 | ForEach-Object { "$_" } | Select-Object -Last 6
  Stamp "new-clips-live exit $LASTEXITCODE"
  node "$s\new-clips-live.cjs" --break 2>&1 | ForEach-Object { "$_" } | Select-Object -Last 3
  Stamp "new-clips-live --break exit $LASTEXITCODE (expect 1)"
}
if ($sk -notcontains "3b") {
  Stamp "== 3b tile dictation live (8 lessons x desktop/mobile) + break"
  $tl = @()
  $tl += Start-Process -FilePath "node" -ArgumentList @("$s\tile-live-check.cjs", "--ids", "d033,d078,d083,d086,d132,d197,d214,d244", "--viewport", "desktop", "--port", "9663") -WorkingDirectory $repo -RedirectStandardOutput "$s\tile-live-desktop.txt" -RedirectStandardError "$s\tile-live-desktop.err" -NoNewWindow -PassThru
  $tl += Start-Process -FilePath "node" -ArgumentList @("$s\tile-live-check.cjs", "--ids", "d033,d078,d083,d086,d132,d197,d214,d244", "--viewport", "mobile", "--port", "9664") -WorkingDirectory $repo -RedirectStandardOutput "$s\tile-live-mobile.txt" -RedirectStandardError "$s\tile-live-mobile.err" -NoNewWindow -PassThru
  $tl += Start-Process -FilePath "node" -ArgumentList @("$s\tile-live-check.cjs", "--ids", "d078,d197", "--viewport", "desktop", "--port", "9665", "--break") -WorkingDirectory $repo -RedirectStandardOutput "$s\tile-live-break.txt" -RedirectStandardError "$s\tile-live-break.err" -NoNewWindow -PassThru
  $tl | Wait-Process
  foreach ($n in 'desktop', 'mobile', 'break') { Stamp "tile-live $n"; Get-Content "$s\tile-live-$n.txt" -Encoding UTF8 | Select-Object -Last 3 }
}

Stamp "== 3c gate 5 recheck of the remaining targets (3 parallel, licensed clones)"
$ks = @(Get-ChildItem "docs\qa-2026-09-18\out" -Filter "recheck-audio-g15f*.jsonl" | ForEach-Object { if ($_.BaseName -match 'g15f(\d+)$') { [int]$Matches[1] } }) + @(Get-ChildItem $s -Filter "recheck-part*.jsonl" | ForEach-Object { if ($_.BaseName -match 'part(\d+)$') { [int]$Matches[1] } })
$next = 1; if ($ks.Count) { $next = ($ks | Measure-Object -Maximum).Maximum + 1 }
node "$s\recheck-plan.cjs" "$s\recheck-targets-final.jsonl" 2 $next
$procs = @()
for ($p = 0; $p -lt 2; $p++) {
  $k = $next + $p
  $f = "$s\recheck-part$k.jsonl"
  if (-not (Test-Path $f) -or -not (Get-Content $f -Encoding UTF8 | Where-Object { $_.Trim() })) { continue }
  $procs += Start-Process -FilePath "node" -ArgumentList @("docs/qa-2026-09-18/scripts/recheck-audio.cjs", "--from", $f, "--suffix", "-g15f$k", "--port", "$(9600 + $k)") -WorkingDirectory $repo -RedirectStandardOutput "$s\recheck-part$k.txt" -RedirectStandardError "$s\recheck-part$k.err" -NoNewWindow -PassThru
}
if ($procs.Count) { $procs | Wait-Process }
node "$s\recheck-plan.cjs" --count "$s\recheck-targets-final.jsonl" | Select-Object -First 40

if ($sk -notcontains "4") {
  Stamp "== 4 licensed missing-clip probe"
  # the 2026-09-21 result (389 asked, 387 404) is the evidence BUG-001-closed.md cites - keep a copy before the rerun overwrites it (out/ is not in git)
  $old = "docs\qa-2026-09-18\out\missing-clips-licensed.json"
  $keep = "docs\qa-2026-09-18\out\missing-clips-licensed-0921.json"
  if ((Test-Path $old) -and -not (Test-Path $keep)) { Copy-Item $old $keep; Stamp "kept old result as $keep" }
  node docs/qa-2026-09-18/scripts/probe-missing-clips.cjs 2>&1 | ForEach-Object { "$_" } | Select-Object -Last 6
  Stamp "probe exit $LASTEXITCODE"
}

Stamp "== 5 gate 12 perf ALONE"
$busy = @()
for ($i = 0; $i -lt 12; $i++) {
  $busy = @(Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'msedge.exe' -and $_.CommandLine -match 'remote-debugging-port') -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'drive-generic|recheck-audio|probe-missing|gate0-sweep|tile-live|new-clips-live') })
  if (-not $busy.Count) { break }
  Start-Sleep -Seconds 5
}
Stamp "other audit browsers/drivers before perf: $($busy.Count)"
if ($busy.Count) {
  $busy | ForEach-Object { "  $($_.Name) $($_.ProcessId) $(([string]$_.CommandLine).Substring(0, [Math]::Min(160, ([string]$_.CommandLine).Length)))" }
  Stamp "perf SKIPPED - not alone"
} else {
  node docs/qa-2026-09-18/scripts/measure-perf.cjs --licensed --only 4g-phone --runs 3 --tag final 2>&1 | ForEach-Object { "$_" } | Select-Object -Last 25
  Stamp "perf exit $LASTEXITCODE"
  node "$s\perf-sum.cjs" perf-licensed-4g-phone-prod-after-0924.json perf-licensed-4g-phone-g15b.json perf-licensed-4g-phone-final.json | Select-Object -Last 4
}
Remove-Item Env:KIG_PROFILE_SOURCE -ErrorAction SilentlyContinue
Remove-Item Env:KIG_CLONE_PREFIX -ErrorAction SilentlyContinue
Stamp "== done"
