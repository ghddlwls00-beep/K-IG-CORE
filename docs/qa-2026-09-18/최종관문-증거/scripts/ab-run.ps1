# Gate 12 A/B (7-3 method): old build (d2b50ca, before the gate deploys) vs new build (HEAD = app of 397f1e8), both `next start`
# from detached worktrees with the same (empty) env, measured ALONE with measure-perf 4g-phone (anonymous - localhost gets no licence
# cookie), alternating old/new twice, then production anonymous for the same pages. Waits for the audio recheck to finish first.
# ASCII-only strings.
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$repo = "C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE"
$s = "C:\Users\ghddl\AppData\Local\Temp\claude\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE\b138581d-6e8d-498e-b217-99c4c524c08a\scratchpad\s7"
function Stamp($m) { "[$(Get-Date -Format 'HH:mm:ss')] $m" }
$pages = "/student,/student/s1-1,/phonics/mv1-01,/grammar1/gh1-006,/grammar2/gh2-007,/ld/d001,/reading/pr001"
$env:NEXT_TELEMETRY_DISABLED = "1"
$srv = @()
foreach ($p in @(@("kig-wt-base", 3230), @("kig-wt-head", 3231))) {
  $d = Join-Path $env:TEMP $p[0]
  $srv += Start-Process -FilePath "node" -ArgumentList @("node_modules/next/dist/bin/next", "start", "-p", "$($p[1])") -WorkingDirectory $d -RedirectStandardOutput "$s\ab-server-$($p[0]).log" -RedirectStandardError "$s\ab-server-$($p[0]).err" -WindowStyle Hidden -PassThru
}
foreach ($port in 3230, 3231) {
  for ($i = 0; $i -lt 60; $i++) { try { $r = Invoke-WebRequest "http://localhost:$port/student/s1-1" -UseBasicParsing -TimeoutSec 20; if ($r.StatusCode -eq 200) { break } } catch {}; Start-Sleep -Seconds 2 }
  Stamp "server $port up: $($r.StatusCode) $($r.RawContentLength) B"
}
Stamp "waiting for the audio recheck / other audit browsers to finish"
for ($i = 0; $i -lt 240; $i++) {
  $busy = @(Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'recheck-audio|drive-generic|tile-live|new-clips-live|probe-missing') -or ($_.Name -eq 'msedge.exe' -and $_.CommandLine -match 'remote-debugging-port') })
  if (-not $busy.Count) { break }
  Start-Sleep -Seconds 10
}
Stamp "other audit browsers/drivers: $($busy.Count)"
if ($busy.Count) { Stamp "NOT ALONE - stop"; $srv | Stop-Process -Force -ErrorAction SilentlyContinue; exit 3 }
Set-Location $repo
foreach ($round in 1, 2) {
  foreach ($v in @(@("old", 3230), @("new", 3231))) {
    $env:BASE = "http://localhost:$($v[1])"
    Stamp "measure $($v[0]) round $round"
    node docs/qa-2026-09-18/scripts/measure-perf.cjs --only 4g-phone --runs 3 --pages $pages --tag "ab-$($v[0])-$round" 2>&1 | ForEach-Object { "$_" } | Select-Object -Last 8
  }
}
Remove-Item Env:BASE -ErrorAction SilentlyContinue
Stamp "measure production anonymous (same pages)"
node docs/qa-2026-09-18/scripts/measure-perf.cjs --only 4g-phone --runs 3 --pages $pages --tag "ab-prod-anon" 2>&1 | ForEach-Object { "$_" } | Select-Object -Last 8
$srv | Stop-Process -Force -ErrorAction SilentlyContinue
Stamp "servers stopped"
foreach ($round in 1, 2) { Stamp "old vs new round $round"; node "$s\perf-diff.cjs" "perf-anon-4g-phone-ab-old-$round.json" "perf-anon-4g-phone-ab-new-$round.json" | Select-Object -Last 3 }
Stamp "production anonymous vs production licensed (same pages)"
node "$s\perf-diff.cjs" "perf-anon-4g-phone-ab-prod-anon.json" "perf-licensed-4g-phone-final.json" | Select-Object -Last 10
Stamp "done"
