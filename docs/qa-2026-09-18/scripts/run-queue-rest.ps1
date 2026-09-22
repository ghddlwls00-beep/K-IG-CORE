# The rest of the machine work, in the order that finishes soonest.
#
# Replaces run-queue.ps1 for the remainder. The first queue took the slot that freed and gave it
# to the STUDENT dictation re-run, which left GRAMMAR II sitting at 70 lessons NOT TESTED — and
# the audit cannot be called complete while anything is NOT TESTED (command §17). GRAMMAR II is
# therefore first in line here.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File docs\qa-2026-09-18\scripts\run-queue-rest.ps1
#
# Safe to stop and start again: every job resumes from what is already recorded.
$ErrorActionPreference = "Continue"
$root    = Split-Path -Parent $PSScriptRoot
$out     = Join-Path $root "out"
$scripts = $PSScriptRoot
$log     = Join-Path $out "run-queue.log"

function Note($m) { "$((Get-Date).ToString('s')) [rest] $m" | Tee-Object -FilePath $log -Append }
function AuditJobs { Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'qa-2026-09-18' } }
function WaitForSlot($keepBelow) { while ((AuditJobs | Measure-Object).Count -ge $keepBelow) { Start-Sleep -Seconds 60 } }
function Launch($name, $argList) {
  $jlog = Join-Path $out "job-$name.log"
  $p = Start-Process -FilePath "node" -ArgumentList $argList -RedirectStandardOutput $jlog -RedirectStandardError "$jlog.err" -WindowStyle Hidden -PassThru
  Note "start $name pid $($p.Id)"
  Start-Sleep -Seconds 25
}

Note "run-queue-rest begin ($((AuditJobs | Measure-Object).Count) job(s) running)"

# 1. GRAMMAR II — the only course with lessons still NOT TESTED.
if ((AuditJobs | Where-Object { $_.CommandLine -match 'course grammar2' } | Measure-Object).Count -eq 0) {
  WaitForSlot 3
  Launch "grammar2" @((Join-Path $scripts "drive-generic.cjs"), "--course", "grammar2", "--port", "9613")
}

# 1b. GRAMMAR's automatic grading, over every lesson again. A targeted re-run of three lessons
#     overwrote out/grammar-exam.json, so the full 282-lesson result has to be taken again —
#     report-facts.cjs caught the file claiming 3 lessons where the report would have said 282.
WaitForSlot 3
Launch "grammar-exam" @((Join-Path $scripts "check-grammar-exam.cjs"), "--port", "9640")

# 2. Every paid clip, fetched with the licence: there, audio, and the right length.
WaitForSlot 3
Launch "audio-licensed" @((Join-Path $scripts "audio-check.cjs"), "--licensed", "--port", "9630")

# 3. The audio cases held back as RETEST, re-checked one at a time on a fresh page.
WaitForSlot 3
Launch "recheck-audio" @((Join-Path $scripts "recheck-audio.cjs"), "--port", "9631")

# 4. Site-wide behaviour the common driver still owes: long session, slow network, responsive.
WaitForSlot 3
Launch "common-ef" @((Join-Path $scripts "drive-common.cjs"), "--only", "E,F", "--port", "9632")

# 5. Speed, measured only once nothing else is running — otherwise the numbers describe this queue.
WaitForSlot 1
Note "machine quiet — measuring performance"
& node (Join-Path $scripts "measure-perf.cjs") *>> (Join-Path $out "job-perf.log")
& node (Join-Path $scripts "measure-perf.cjs") --licensed *>> (Join-Path $out "job-perf.log")

# 6. Fold everything into the numbers the report quotes.
& node (Join-Path $scripts "analyze-features.cjs") --top 25 *>> (Join-Path $out "job-analyze.log")
& node (Join-Path $scripts "build-coverage.cjs")            *>> (Join-Path $out "job-analyze.log")
& node (Join-Path $scripts "check-integrity.cjs")           *>> (Join-Path $out "job-analyze.log")
& node (Join-Path $scripts "report-facts.cjs")              *>> (Join-Path $out "job-analyze.log")

Note "run-queue-rest done — out\job-analyze.log 에 최종 집계"
