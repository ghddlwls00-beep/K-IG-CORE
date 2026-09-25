# Duration and inner silences (ffmpeg silencedetect, -35 dB, >= 0.12 s) of clip files - old vs new speech form.
# Usage: clip-pauses.ps1 key1,key2,...   ASCII-only strings.
param([string]$keys)
$d = "C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE\public\audio\azure-ava\v1"
$ff = (Get-Command ffmpeg).Source
foreach ($k in $keys.Split(',')) {
  $f = Join-Path $d "$k.mp3"
  if (-not (Test-Path $f)) { "$k : no local file"; continue }
  $out = & $ff -hide_banner -nostats -i $f -af "silencedetect=noise=-35dB:d=0.12" -f null - 2>&1 | ForEach-Object { "$_" }
  $dur = ($out | Select-String -Pattern 'Duration: (\d+):(\d+):([\d.]+)' | Select-Object -First 1)
  $secs = 0; if ($dur) { $m = $dur.Matches[0].Groups; $secs = [double]$m[1].Value * 3600 + [double]$m[2].Value * 60 + [double]$m[3].Value }
  $sil = @($out | Select-String -Pattern 'silence_end: ([\d.]+) \| silence_duration: ([\d.]+)' | ForEach-Object { $g = $_.Matches[0].Groups; "{0:N2}s@{1:N2}" -f [double]$g[2].Value, ([double]$g[1].Value - [double]$g[2].Value) })
  "$k : $("{0:N2}" -f $secs) s | silences: $($sil -join '  ')"
}
