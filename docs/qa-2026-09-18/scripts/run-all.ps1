# One scheduler for all remaining token-free work (replaces queue-sweeps.ps1 / post-sweeps.ps1).
# Keeps at most $Slots headless browsers busy (8 GB RAM: 3 is the ceiling — a 4th made
# Edge time out on start), longest jobs first, so the whole batch fits the 12-hour
# internet window of 2026-09-18/19. Every job is resumable; offline time is waited out
# by the scripts themselves, never recorded as failures.
#
# Phase 1  course sweeps (LISTENING split in 3 shards — it is the long pole)
# Phase 2  after ALL sweeps: audio isolation re-check, licensed clip check, common E/F
# Phase 3  performance, alone on a quiet machine
# Phase 4  summary
param([int]$Slots = 3)
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location (Split-Path -Parent $root)
$out = "docs/qa-2026-09-18/out"
$log = "$out/run-all.log"
function Note($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

function Sweep($course, $port, $shard) {
  $a = @("docs/qa-2026-09-18/scripts/drive-generic.cjs", "--course", $course, "--viewports", "desktop,mobile,tablet", "--tabs", "3", "--port", "$port")
  $name = $course
  if ($shard) { $a += @("--shard", $shard, "--suffix", "-s$($shard.Split('/')[0])"); $name = "$course-s$($shard.Split('/')[0])" }
  @{ name = $name; args = $a }
}
$phase1 = @(
  (Sweep "ld" 9521 "1/3"), (Sweep "ld" 9522 "2/3"), (Sweep "ld" 9523 "3/3"),
  (Sweep "phonics" 9530 $null), (Sweep "reading" 9510 $null), (Sweep "student" 9540 $null),
  (Sweep "grammar1" 9550 $null), (Sweep "grammar2" 9560 $null)
)
$phase2 = @(
  @{ name = "recheck-audio"; args = @("docs/qa-2026-09-18/scripts/recheck-audio.cjs", "--port", "9600") },
  @{ name = "audio-licensed"; args = @("docs/qa-2026-09-18/scripts/audio-check.cjs", "--licensed", "--port", "9610") },
  @{ name = "common-EF"; args = @("docs/qa-2026-09-18/scripts/drive-common.cjs", "--only", "E,F", "--port", "9570") }
)
$phase3 = @(
  @{ name = "perf-anon"; args = @("docs/qa-2026-09-18/scripts/measure-perf.cjs", "--runs", "3") },
  @{ name = "perf-licensed"; args = @("docs/qa-2026-09-18/scripts/measure-perf.cjs", "--runs", "3", "--licensed") },
  @{ name = "analyze"; args = @("docs/qa-2026-09-18/scripts/analyze-features.cjs", "--top", "30") }
)

function RunPhase($jobs, $slots) {
  $running = @()
  $queue = [System.Collections.ArrayList]@($jobs)
  while ($queue.Count -gt 0 -or $running.Count -gt 0) {
    $running = @($running | Where-Object { -not $_.proc.HasExited })
    while ($running.Count -lt $slots -and $queue.Count -gt 0) {
      $j = $queue[0]; $queue.RemoveAt(0)
      $p = Start-Process -FilePath "node" -ArgumentList $j.args -RedirectStandardOutput "$out/job-$($j.name).log" -RedirectStandardError "$out/job-$($j.name).err" -WindowStyle Hidden -PassThru
      Note "start $($j.name) pid $($p.Id)"
      $running += @{ name = $j.name; proc = $p }
      Start-Sleep -Seconds 20   # stagger browser start-ups (memory spike)
    }
    Start-Sleep -Seconds 30
  }
}
Note "run-all begin"
RunPhase $phase1 $Slots
Note "phase 1 (sweeps) done"
# a sweep that crashed leaves visits undone: one more pass over everything (resume skips the done)
RunPhase @((Sweep "ld" 9521 "1/3"), (Sweep "ld" 9522 "2/3"), (Sweep "ld" 9523 "3/3"), (Sweep "phonics" 9530 $null), (Sweep "reading" 9510 $null), (Sweep "student" 9540 $null), (Sweep "grammar1" 9550 $null), (Sweep "grammar2" 9560 $null)) $Slots
Note "phase 1b (resume pass) done"
RunPhase $phase2 $Slots
Note "phase 2 done"
RunPhase $phase3 1
Note "ALL DONE"
