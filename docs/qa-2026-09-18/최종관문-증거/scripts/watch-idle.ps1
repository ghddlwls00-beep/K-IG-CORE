# Wait until the sweep has started all 52 units AND a worker clone is idle (no drive-generic on g0-w<n>),
# or a page logs problems, or the orchestrator ends. Exit 0 with the idle worker list; 1 on problem lines. ASCII-only.
param([int]$max = 50)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$s = "C:\Users\ghddl\AppData\Local\Temp\claude\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE\b138581d-6e8d-498e-b217-99c4c524c08a\scratchpad\s7"
$seen = @{}
foreach ($w in 1..3) { $seen[$w] = @(Get-Content "$s\gate15-w$w.log" -Encoding UTF8).Count }
$t0 = Get-Date
while ($true) {
  Start-Sleep -Seconds 30
  $hits = @()
  foreach ($w in 1..3) {
    $all = @(Get-Content "$s\gate15-w$w.log" -Encoding UTF8)
    if ($all.Count -gt $seen[$w]) {
      $new = $all[$seen[$w]..($all.Count - 1)]; $seen[$w] = $all.Count
      foreach ($l in $new) { if ($l -match ' [1-9]\d* problem|offline|visit error|Error:|ERR_|gave up|giving up') { $hits += "w$w | $l" } }
    }
  }
  if ($hits.Count) { "[$(Get-Date -Format 'HH:mm:ss')] PROBLEM LINES"; $hits | Select-Object -First 20; exit 1 }
  $orch = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'gate0-sweep3b\.cjs' })
  if (-not $orch.Count) { "[$(Get-Date -Format 'HH:mm:ss')] orchestrator ended"; exit 0 }
  $j = Get-Content "$s\gate0-state3b.json" -Raw -Encoding UTF8 | ConvertFrom-Json
  $started = @($j.units.PSObject.Properties).Count
  if ($started -ge 52) {
    $drv = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'drive-generic\.cjs' })
    $idle = @(1..3 | Where-Object { $n = $_; -not @($drv | Where-Object { $_.CommandLine -match "g0-w$n(\s|$)" }).Count })
    if ($idle.Count) {
      "[$(Get-Date -Format 'HH:mm:ss')] all units started - idle workers: $($idle -join ',')"
      foreach ($w in 1..3) { "w$w | " + (Get-Content "$s\gate15-w$w.log" -Tail 1 -Encoding UTF8) }
      exit 0
    }
  }
  if (((Get-Date) - $t0).TotalMinutes -ge $max) { break }
}
"[$(Get-Date -Format 'HH:mm:ss')] no idle worker yet after $max min"
foreach ($w in 1..3) { "w$w | " + (Get-Content "$s\gate15-w$w.log" -Tail 1 -Encoding UTF8) }
