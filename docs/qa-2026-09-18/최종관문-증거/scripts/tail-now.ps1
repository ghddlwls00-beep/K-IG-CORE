# Re-visit pages whose LATEST record (course x id x viewport) has problems (internet drops) on one idle worker clone.
# Usage: tail-now.ps1 -w <1-3>   (the worker must be idle: no drive-generic on clone g0-w<n>). ASCII-only strings.
param([int]$w = 1)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$repo = "C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE"
$s = "C:\Users\ghddl\AppData\Local\Temp\claude\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE\b138581d-6e8d-498e-b217-99c4c524c08a\scratchpad\s7"
Set-Location $repo
function Stamp($m) { "[$(Get-Date -Format 'HH:mm:ss')] $m" }
Remove-Item Env:KIG_PROFILE_SOURCE -ErrorAction SilentlyContinue
Remove-Item Env:KIG_CLONE_PREFIX -ErrorAction SilentlyContinue
$busy = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'drive-generic\.cjs' -and $_.CommandLine -match "g0-w$w(\s|$)" })
if ($busy.Count) { Stamp "worker $w clone is busy - not starting"; exit 3 }
$port = 9710 + $w
Stamp "== tail on g0-w$w (port $port)"
node "$s\final-tail-list.cjs" --json "$s\final-tail.json" | Select-Object -First 30
$ft = Get-Content "$s\final-tail.json" -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($g in $ft.groups.PSObject.Properties) {
  $cv = $g.Name.Split('|'); $ids = (@($g.Value) | Select-Object -Unique) -join ','
  # drive-generic refuses a non-empty record file: s2of2, then s2of2-r2, -r3 ... (all match the gate-count name rule)
  $suf = "-g15-$($cv[1])-s2of2"; $k = 1
  while (Test-Path "docs\qa-2026-09-18\out\features\$($cv[0])$suf.jsonl") { $k++; $suf = "-g15-$($cv[1])-s2of2-r$k" }
  $t0 = Get-Date
  Stamp "tail $($cv[0]) $($cv[1]) ids $ids suffix $suf"
  node docs/qa-2026-09-18/scripts/drive-generic.cjs --course $cv[0] --viewports $cv[1] --suffix $suf --port $port --clone "g0-w$w" --ids $ids 2>&1 | ForEach-Object { "$_" } | Select-Object -Last 5
  Stamp "tail exit $LASTEXITCODE - $([Math]::Round(((Get-Date) - $t0).TotalMinutes, 1)) min"
}
Stamp "== after the tail"
node "$s\final-tail-list.cjs" | Select-Object -First 10
