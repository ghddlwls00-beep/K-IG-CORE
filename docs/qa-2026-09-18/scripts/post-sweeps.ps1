# Local, token-free follow-up work that should run once every course sweep has finished.
# Started in the background on 2026-09-18 so the machine keeps working while the Claude
# weekly quota is exhausted (owner decision: wait for the 2026-09-21 05:00 KST reset).
#
#   1. isolation re-check of every play control the sweeps could not settle
#   2. licensed download + duration/SHA check of all 19,770 clips
#   3. common-feature areas E (long session) and F (responsive lists) again with the fixed harness
#   4. accessibility (light/dark, desktop/mobile, keyboard) if it has not finished
#   5. performance re-measured on a quiet machine (no sweeps running)
#   6. feature summary for the report
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location (Split-Path -Parent $root)
$out = "docs/qa-2026-09-18/out"

function Busy() {
  [bool](Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'drive-generic') -or ($_.Name -eq 'powershell.exe' -and $_.CommandLine -match 'queue-sweeps') })
}
while (Busy) { Start-Sleep -Seconds 60 }
"sweeps finished at $(Get-Date -Format s)" | Out-File -Append -Encoding utf8 "$out/post-sweeps.log"

function Step($name, $argList) {
  "== $name start $(Get-Date -Format s)" | Out-File -Append -Encoding utf8 "$out/post-sweeps.log"
  $p = Start-Process -FilePath "node" -ArgumentList $argList -RedirectStandardOutput "$out/post-$name.log" -RedirectStandardError "$out/post-$name.err" -WindowStyle Hidden -PassThru
  $p.WaitForExit()
  "== $name end $(Get-Date -Format s) exit $($p.ExitCode)" | Out-File -Append -Encoding utf8 "$out/post-sweeps.log"
}
Step "recheck-audio" @("docs/qa-2026-09-18/scripts/recheck-audio.cjs", "--port", "9600")
Step "audio-licensed" @("docs/qa-2026-09-18/scripts/audio-check.cjs", "--licensed", "--port", "9610")
Step "common-EF" @("docs/qa-2026-09-18/scripts/drive-common.cjs", "--only", "E,F", "--port", "9570")
if (-not (Test-Path "$out/a11y.json")) { Step "a11y" @("docs/qa-2026-09-18/scripts/check-a11y.cjs", "--port", "9580") }
Step "perf-anon" @("docs/qa-2026-09-18/scripts/measure-perf.cjs", "--runs", "3")
Step "perf-licensed" @("docs/qa-2026-09-18/scripts/measure-perf.cjs", "--runs", "3", "--licensed")
Step "analyze" @("docs/qa-2026-09-18/scripts/analyze-features.cjs", "--top", "30")
"ALL DONE $(Get-Date -Format s)" | Out-File -Append -Encoding utf8 "$out/post-sweeps.log"
