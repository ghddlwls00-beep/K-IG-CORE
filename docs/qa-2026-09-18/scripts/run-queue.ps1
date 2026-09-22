# Runs the rest of the audit's MACHINE work unattended, in order, so the computer keeps going
# after the session that started it has stopped.
#
# It never runs more than three browser jobs at once: this machine has 7.9 GB of RAM and one
# headless Edge sweep takes about 1.3 GB. Every job resumes from what is already recorded, so
# stopping the computer and running this again loses nothing.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File docs\qa-2026-09-18\scripts\run-queue.ps1
#
# Progress: out\run-queue.log (and out\job-*.log per job).
$ErrorActionPreference = "Continue"
$root    = Split-Path -Parent $PSScriptRoot            # docs/qa-2026-09-18
$out     = Join-Path $root "out"
$scripts = $PSScriptRoot
$log     = Join-Path $out "run-queue.log"

function Note($m) { "$((Get-Date).ToString('s')) $m" | Tee-Object -FilePath $log -Append }

# A sweep job is a node process running one of our scripts. Claude's own node processes and the
# MCP servers must not be counted, or the queue would wait forever.
function Get-AuditJobs {
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match 'qa-2026-09-18' }
}

function Wait-ForFreeSlots($needed) {
  while ((Get-AuditJobs | Measure-Object).Count -gt (3 - $needed)) {
    Start-Sleep -Seconds 60
  }
}

function Start-Job($name, $argList) {
  $jlog = Join-Path $out "job-$name.log"
  $p = Start-Process -FilePath "node" -ArgumentList $argList `
       -RedirectStandardOutput $jlog -RedirectStandardError "$jlog.err" `
       -WindowStyle Hidden -PassThru
  Note "start $name pid $($p.Id)"
  Start-Sleep -Seconds 25        # stagger: two Edge instances opening together time out
  return $p
}

Note "run-queue begin ($((Get-AuditJobs | Measure-Object).Count) audit job(s) already running)"

# 1. GRAMMAR sweeps — usually already running; start whatever is missing.
if ((Get-AuditJobs | Where-Object { $_.CommandLine -match 'grammar1' } | Measure-Object).Count -eq 0) {
  Start-Job "grammar1-a" @((Join-Path $scripts "drive-generic.cjs"), "--course", "grammar1", "--shard", "1/2", "--port", "9611") | Out-Null
  Start-Job "grammar1-b" @((Join-Path $scripts "drive-generic.cjs"), "--course", "grammar1", "--shard", "2/2", "--port", "9612") | Out-Null
}
if ((Get-AuditJobs | Where-Object { $_.CommandLine -match 'grammar2' } | Measure-Object).Count -eq 0) {
  Start-Job "grammar2" @((Join-Path $scripts "drive-generic.cjs"), "--course", "grammar2", "--port", "9613") | Out-Null
}

# 2. Tap-dictation, re-taken. The old verdicts cannot be used: the driver used to tap tiles it had
#    already placed, which removes them, so it graded a sentence it had not actually assembled.
Wait-ForFreeSlots 1
Start-Job "ld-tiles2"      @((Join-Path $scripts "drive-generic.cjs"), "--course", "ld",      "--viewports", "desktop", "--suffix", "-tiles2", "--redo", "--port", "9621") | Out-Null
Wait-ForFreeSlots 1
Start-Job "student-tiles2" @((Join-Path $scripts "drive-generic.cjs"), "--course", "student", "--viewports", "desktop", "--suffix", "-tiles2", "--redo", "--port", "9622") | Out-Null

# 3. Every paid clip, fetched with the licence: is it there, is it audio, is it the right length.
Wait-ForFreeSlots 1
Start-Job "audio-licensed" @((Join-Path $scripts "audio-check.cjs"), "--licensed", "--port", "9630") | Out-Null

# 4. The audio cases held back as RETEST, re-checked one at a time.
Wait-ForFreeSlots 1
Start-Job "recheck-audio"  @((Join-Path $scripts "recheck-audio.cjs"), "--port", "9631") | Out-Null

# 5. Site-wide behaviour left over from the common driver.
Wait-ForFreeSlots 1
Start-Job "common-ef"      @((Join-Path $scripts "drive-common.cjs"), "--only", "E,F", "--port", "9632") | Out-Null

# 6. Speed, measured only once the machine is quiet — otherwise the numbers are about this queue.
Wait-ForFreeSlots 3
Note "machine quiet — measuring performance"
& node (Join-Path $scripts "measure-perf.cjs") *>> (Join-Path $out "job-perf.log")

# 7. Fold everything into the counts the report quotes, including the tool-suspect warnings.
& node (Join-Path $scripts "analyze-features.cjs") --top 25 *>> (Join-Path $out "job-analyze.log")
& node (Join-Path $scripts "check-integrity.cjs")            *>> (Join-Path $out "job-analyze.log")

Note "run-queue done — see out\job-analyze.log"
