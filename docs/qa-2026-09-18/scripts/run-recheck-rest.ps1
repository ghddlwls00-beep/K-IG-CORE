# Starts the READING/VOCA/STUDENT half of the audio re-check once a browser slot frees.
#
# Three headless Edge instances starting at once left this 7.9 GB machine with about 1 GB free and
# the third failed with "headless Edge did not open its debugging port". Two at a time is what it
# actually holds, so this waits rather than competing.
$ErrorActionPreference = "Continue"
$root    = Split-Path -Parent $PSScriptRoot
$out     = Join-Path $root "out"
$scripts = $PSScriptRoot
$log     = Join-Path $out "run-queue.log"
function Note($m) { "$((Get-Date).ToString('s')) [recheck-rest] $m" | Tee-Object -FilePath $log -Append }
function AuditJobs { Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'qa-2026-09-18' } }

Note "waiting for a free slot"
while ((AuditJobs | Measure-Object).Count -ge 2) { Start-Sleep -Seconds 60 }
$jlog = Join-Path $out "job-recheck-rest.log"
$p = Start-Process -FilePath "node" -ArgumentList @(
  (Join-Path $scripts "recheck-audio.cjs"), "--course", "reading,phonics,student", "--suffix", "-rest", "--port", "9633"
) -RedirectStandardOutput $jlog -RedirectStandardError "$jlog.err" -WindowStyle Hidden -PassThru
Note "start pid $($p.Id)"
