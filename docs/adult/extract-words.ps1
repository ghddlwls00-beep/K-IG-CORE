# ADULT 단어 — PPT 의 '핵심 어휘·표현' 슬라이드를 그대로 뽑는다 (2026-10-02, 사장님 "어덜트 섹션에서 단어 학습법 만들자").
# 슬라이드마다: 제목(… Key Words …) · 머리줄(English Expression | 한국어 뜻 | 품사 · 용법) · 그 뒤로 "N. 표현" / 뜻 / "품사 · 쓰임" 세 줄씩.
# 결과: docs/adult/ppt-어휘.json  { note, files: { "<파일>": [{ n, word, meaning, pos, usage }, …] } }
# 강의에 붙이는 것은 scripts/build-adult-content.mjs (쓰임이 든 문장의 강의로).
#   powershell -File docs/adult/extract-words.ps1 [-Source "<PPT 폴더>"]
param([string]$Source = (Join-Path $env:USERPROFILE "Desktop\랩실 성인 학습 자료"))
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$out = [ordered]@{}
foreach ($file in Get-ChildItem $Source -Filter *.pptx | Sort-Object { [int]($_.BaseName -replace '\D.*$', '') }, Name) {
  $zip = [IO.Compression.ZipFile]::OpenRead($file.FullName)
  try {
    $slides = $zip.Entries | Where-Object FullName -match '^ppt/slides/slide\d+\.xml$' | Sort-Object { [int]($_.Name -replace '\D', '') }
    $words = New-Object System.Collections.ArrayList
    foreach ($entry in $slides) {
      $reader = New-Object IO.StreamReader($entry.Open(), [Text.Encoding]::UTF8)
      $xml = $reader.ReadToEnd(); $reader.Close()
      $paras = @([regex]::Matches($xml, '<a:p>.*?</a:p>') | ForEach-Object {
          [Net.WebUtility]::HtmlDecode((([regex]::Matches($_.Value, '<a:t>([^<]*)</a:t>') | ForEach-Object { $_.Groups[1].Value }) -join '')).Trim()
        } | Where-Object { $_ -ne '' })
      if ($paras.Count -eq 0 -or $paras[0] -notmatch 'Key Words') { continue }
      $rest = @($paras | Select-Object -Skip 1)
      if ($rest[0] -ne 'English Expression') { throw "$($file.Name) $($entry.Name): no header row '$($rest[0])'" }
      $rest = @($rest | Select-Object -Skip 3)
      if ($rest.Count % 3 -ne 0) { throw "$($file.Name) $($entry.Name): $($rest.Count) cells, not rows of three" }
      for ($i = 0; $i -lt $rest.Count; $i += 3) {
        if ($rest[$i] -notmatch '^(\d+)\.\s+(.+)$') { throw "$($file.Name) $($entry.Name): word cell '$($rest[$i])'" }
        $n = [int]$Matches[1]; $word = $Matches[2]
        if ($rest[$i + 1] -notmatch '[가-힣]') { throw "$($file.Name) #${n}: meaning without Hangul '$($rest[$i + 1])'" }
        $parts = $rest[$i + 2] -split ' · ', 2
        if ($parts.Count -ne 2) { throw "$($file.Name) #${n}: usage cell '$($rest[$i + 2])'" }
        [void]$words.Add([ordered]@{ n = $n; word = $word; meaning = $rest[$i + 1]; pos = $parts[0]; usage = $parts[1] })
      }
    }
    $out[$file.Name] = $words
  } finally { $zip.Dispose() }
}
$doc = [ordered]@{
  note  = "PPT 의 핵심 어휘·표현 슬라이드 그대로 — 바탕화면 '랩실 성인 학습 자료' 의 각 PPT, 번호 · 표현 · 한국어 뜻 · 품사 · 쓰임 (2026-10-02, docs/adult/extract-words.ps1). 강의에는 scripts/build-adult-content.mjs 가 붙인다."
  files = $out
}
$json = $doc | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText((Join-Path $PSScriptRoot "ppt-어휘.json"), $json + "`n", (New-Object Text.UTF8Encoding($false)))
"words: " + (($out.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum) + " in " + $out.Count + " files"
