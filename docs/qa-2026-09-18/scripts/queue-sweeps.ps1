# Runs the remaining course sweeps one after another in the background, so the machine
# never has more than three headless browsers at once (8 GB RAM).
#   chain A: waits for the accessibility check to finish, then VOCA, then STUDENT
#   chain B: waits for the READING sweep to finish, then GRAMMAR I, then GRAMMAR II
param([string]$Chain = "A")
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location (Split-Path -Parent $root)

function Wait-For($pattern) {
  while (Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match $pattern }) { Start-Sleep -Seconds 30 }
}
function Run-Sweep($course, $port) {
  $log = "docs/qa-2026-09-18/out/sweep-$course.log"
  $p = Start-Process -FilePath "node" -ArgumentList "docs/qa-2026-09-18/scripts/drive-generic.cjs","--course",$course,"--viewports","desktop,mobile,tablet","--tabs","3","--port",$port,"--max-play","60" -RedirectStandardOutput $log -RedirectStandardError "docs/qa-2026-09-18/out/sweep-$course.err" -WindowStyle Hidden -PassThru
  $p.WaitForExit()
}
if ($Chain -eq "A") {
  Wait-For "check-a11y"
  Run-Sweep "phonics" "9530"
  Run-Sweep "student" "9540"
} else {
  Wait-For "drive-generic.cjs --course reading"
  Run-Sweep "grammar1" "9550"
  Run-Sweep "grammar2" "9560"
}
