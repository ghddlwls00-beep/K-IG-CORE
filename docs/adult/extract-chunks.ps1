# ADULT 끊어 읽기 — PPT 의 '청크 단위 끊어읽기' 슬라이드를 그대로 뽑는다 (2026-10-02, 사장님 "어덜트 섹션에서 청크 학습법 하나 만들자").
# 슬라이드마다: 제목(… Chunk Reading …) · ▎ 소단원 · "N." 줄 · 그 뒤로 영어 덩어리 / 한국어 덩어리가 번갈아.
# 결과: docs/adult/ppt-청크.json  { note, files: { "<파일>": { "<N>": [[영어, 한국어], …] } } }
# 강의에 붙이는 것은 scripts/build-adult-content.mjs (현재 문장과 맞춰 봄 — 고친 문장은 거기서 덩어리를 다시 나눔).
#   powershell -File docs/adult/extract-chunks.ps1 [-Source "<PPT 폴더>"]
param([string]$Source = (Join-Path $env:USERPROFILE "Desktop\랩실 성인 학습 자료"))
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$out = [ordered]@{}
foreach ($file in Get-ChildItem $Source -Filter *.pptx | Sort-Object { [int]($_.BaseName -replace '\D.*$', '') }, Name) {
  $zip = [IO.Compression.ZipFile]::OpenRead($file.FullName)
  try {
    $slides = $zip.Entries | Where-Object FullName -match '^ppt/slides/slide\d+\.xml$' | Sort-Object { [int]($_.Name -replace '\D', '') }
    $sentences = [ordered]@{}
    foreach ($entry in $slides) {
      $reader = New-Object IO.StreamReader($entry.Open(), [Text.Encoding]::UTF8)
      $xml = $reader.ReadToEnd(); $reader.Close()
      $paras = @([regex]::Matches($xml, '<a:p>.*?</a:p>') | ForEach-Object {
          [Net.WebUtility]::HtmlDecode((([regex]::Matches($_.Value, '<a:t>([^<]*)</a:t>') | ForEach-Object { $_.Groups[1].Value }) -join '')).Trim()
        } | Where-Object { $_ -ne '' })
      if ($paras.Count -eq 0 -or $paras[0] -notmatch 'Chunk Reading') { continue }
      $n = $null; $pending = $null
      foreach ($p in $paras[1..($paras.Count - 1)]) {
        if ($p.StartsWith([string][char]0x258E)) { continue }  # ▎ 소단원
        if ($p -match '^(\d+)\.$') {
          if ($null -ne $pending) { throw "$($file.Name) #${n}: English chunk without Korean '$pending'" }
          $n = $Matches[1]; $sentences[$n] = New-Object System.Collections.ArrayList; continue
        }
        if ($null -eq $n) { throw "$($file.Name) $($entry.Name): chunk before a number '$p'" }
        if ($null -eq $pending) { $pending = $p }
        else {
          if ($p -notmatch '[가-힣]') { throw "$($file.Name) #${n}: Korean chunk without Hangul '$p'" }
          [void]$sentences[$n].Add(@($pending, $p)); $pending = $null
        }
      }
      if ($null -ne $pending) { throw "$($file.Name) #${n}: English chunk without Korean '$pending'" }
    }
    $out[$file.Name] = $sentences
  } finally { $zip.Dispose() }
}
$doc = [ordered]@{
  note  = "PPT 의 청크 단위 끊어읽기 슬라이드 그대로 — 바탕화면 '랩실 성인 학습 자료' 의 각 PPT, 문장 번호 → [영어 덩어리, 한국어 덩어리] (2026-10-02, docs/adult/extract-chunks.ps1). 강의에는 scripts/build-adult-content.mjs 가 붙인다."
  files = $out
}
$json = $doc | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText((Join-Path $PSScriptRoot "ppt-청크.json"), $json + "`n", (New-Object Text.UTF8Encoding($false)))
"chunks: " + (($out.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum) + " sentences in " + $out.Count + " files"
