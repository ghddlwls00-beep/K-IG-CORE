# Re-run the GRAMMAR I / II sweeps after the native-dialog fix in lib/harness.cjs.
#
# The first attempt recorded 2,568 "timeout Emulation.*" visits and only 22 usable ones, because
# GrammarLearningView opens window.confirm() from its reset control and the harness never answered
# it, which blocks the renderer and every later CDP command. harness.cjs now dismisses dialogs.
#
# Three slots: the machine has 7.9 GB of RAM and one headless Edge sweep takes ~1.3 GB.
# GRAMMAR pages carry ~145 audio controls each, so a page x viewport visit takes minutes, not
# seconds — expect this to run overnight. Every job resumes from what is already in
# out/features/<course>*.jsonl, so it is safe to stop and start again.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot          # docs/qa-2026-09-18
$out  = Join-Path $root "out"
$log  = Join-Path $out "run-grammar.log"
$drv  = Join-Path $PSScriptRoot "drive-generic.cjs"

function Note($m) { "$((Get-Date).ToString('s')) $m" | Tee-Object -FilePath $log -Append }

$jobs = @(
  @{ name = "grammar1-a"; args = @("--course", "grammar1", "--shard", "1/2", "--port", "9611") },
  @{ name = "grammar1-b"; args = @("--course", "grammar1", "--shard", "2/2", "--port", "9612") },
  @{ name = "grammar2";   args = @("--course", "grammar2", "--port", "9613") }
)

Note "run-grammar begin (3 slots)"
foreach ($j in $jobs) {
  $jlog = Join-Path $out "job-$($j.name).log"
  $p = Start-Process -FilePath "node" -ArgumentList (@($drv) + $j.args) `
       -RedirectStandardOutput $jlog -RedirectStandardError "$jlog.err" `
       -WindowStyle Hidden -PassThru
  Note "start $($j.name) pid $($p.Id) -> $jlog"
  Start-Sleep -Seconds 25      # stagger: two Edge instances opening at once time out on Page.enable
}
Note "all jobs launched"
