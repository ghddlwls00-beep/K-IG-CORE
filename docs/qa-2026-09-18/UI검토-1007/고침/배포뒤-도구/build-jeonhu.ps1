# 전후.html 만들기 — 10가지 '지금(전)' · '고친 뒤' 사진을 나란히(base64). 스크립트 없음. 앱 · 내용 안 건드림.
Add-Type -AssemblyName System.Drawing
$root = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73/docs/qa-2026-09-18"
$R = "$root/out/ui-1007"
$A = "$R/after-prod"
$outHtml = "$root/UI검토-1007/전후.html"

function Get-B64([string]$path, [int]$w) {
  $img = [System.Drawing.Image]::FromFile($path)
  try {
    if ($img.Width -lt $w) { $w = $img.Width }
    $h = [int][Math]::Round($img.Height * $w / $img.Width)
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 78L
    $ms = New-Object IO.MemoryStream
    $bmp.Save($ms, $codec, $ep)
    $bmp.Dispose()
    return [Convert]::ToBase64String($ms.ToArray())
  } finally { $img.Dispose() }
}
function Esc([string]$s) { return [Net.WebUtility]::HtmlEncode($s) }

$script:missing = @()
function Fig([string]$path, [int]$w, [string]$label, [string]$cap, [string]$kind) {
  # kind: before | after
  $cls = "fig $kind"
  if (-not $path -or -not (Test-Path $path)) {
    if ($path) { $script:missing += $path }
    return "<figure class=`"$cls`" style=`"width:${w}px`"><div class=`"badge $kind`">$label</div><div class=`"none`" style=`"width:${w}px`">사진 없음</div><figcaption>$(Esc $cap)</figcaption></figure>"
  }
  $b = Get-B64 $path ($w * 2)
  return "<figure class=`"$cls`" style=`"width:${w}px`"><div class=`"badge $kind`">$label</div><img alt=`"$(Esc $cap)`" width=`"$w`" src=`"data:image/jpeg;base64,$b`"><figcaption>$(Esc $cap)</figcaption></figure>"
}
function Row([string]$title, [int]$w, [string]$bp, [string]$bc, [string]$ap, [string]$ac) {
  $b = Fig $bp $w "지금(전)" $bc "before"
  $a = Fig $ap $w "고친 뒤" $ac "after"
  return "<div class=`"rowtitle`">$(Esc $title)</div><div class=`"pair`">$b$a</div>"
}

$items = @()

$items += @{ n = 1; t = "STUDENT · ADULT 강의 끝 — '다음 강의'가 완료 전부터 검정이던 것"; v = "PASS"
  line = "완료 전에는 '이 강의 학습 완료'(회색 · 꺼짐) + 이유 한 줄 + 테두리 '다음 강의'. 완료한 뒤에만 '다음 강의'가 검정이고 한 화면에 하나뿐입니다."
  rows = @(
    (Row "휴대폰 · 완료 전(s11-4)" 300 "$R/verify/endbar_phone__student_s11-4_end.jpg" "전 — 꺼진 완료 아래 검은 '다음 강의'" "$A/verify/endbar_student_s11-4_phone.jpg" "뒤 — 회색 완료 + 이유 + 테두리 '다음 강의'"),
    (Row "휴대폰 · 완료한 강의(s1-1)" 300 "$R/verify/endbar_phone__student_s1-1_end.jpg" "전 — 검은 '다음 강의'가 둘" "$A/verify/endbar_student_s1-1_phone.jpg" "뒤 — '학습 완료함' 테두리 + 검은 '다음 강의' 하나"),
    (Row "데스크톱 · 완료 전(a1-2)" 600 "$R/verify/endbar_desktop__adult_a1-2_end.jpg" "전" "$A/verify/endbar_adult_a1-2_desktop.jpg" "뒤")
  ) }

$items += @{ n = 2; t = "이용권을 살 길이 없던 것('구매 안내' → 구매 링크 준비 중)"; v = "PASS"
  line = "판매처 주소를 정하기 전까지 '구매 안내'를 숨겨 막다른 길을 없앴습니다. 잠김 화면에는 검은 '이용권 등록' 하나, 이용권 창에는 '구매 링크 준비 중'이 없습니다."
  rows = @(
    (Row "휴대폰 · 잠김 화면(a2-1)" 300 "$R/밝음/phone/free_adult_a2-1/open-1.jpg" "전 — '이용권 등록' + '구매 안내'" "$A/verify/lock_adult_a2-1_light_phone.jpg" "뒤 — '이용권 등록' 하나"),
    (Row "휴대폰 · 이용권 창(사기 전)" 300 "$R/verify/pfl02-cf01-modal-buy-light-phone.jpg" "전 — '구매 링크 준비 중'" "$A/verify/licensemodal_free_light_phone.jpg" "뒤 — 안내 줄 없음"),
    (Row "데스크톱 · 이용권 창(어둠)" 600 "$R/verify/pfl02-cf01-modal-buy-dark-desktop.jpg" "전" "$A/verify/licensemodal_free_dark_desktop.jpg" "뒤")
  ) }

$items += @{ n = 3; t = "이용권 창 두 쪽이 예전 모양이던 것"; v = "PASS"
  line = "그림 문자 · 영어 대문자 라벨 · 고정폭 한글 · 12px 미만 글 · 28px 닫기가 사라지고 한 상자 안 선으로 나눈 줄이 됐습니다('VIP' 말은 둠)."
  rows = @(
    (Row "휴대폰 · 이용권 있는 사람(코드는 가림)" 300 "$R/verify/license_modal_licensed_phone_masked.jpg" "전 — 상자 안 상자 · 이모지" "$A/verify/licensemodal_licensed_light_phone.jpg" "뒤 — 한 상자 · 선 줄 · 44px 닫기"),
    (Row "휴대폰 · 사기 전(어둠)" 300 "$R/어둠/phone/free_adult_a2-1/license-modal-1.jpg" "전" "$A/어둠/phone/free_adult_a2-1/license-modal-1.jpg" "뒤"),
    (Row "데스크톱 · 사기 전(어둠)" 600 "$R/어둠/desktop/free_adult_a2-1/license-modal-1.jpg" "전 — 열쇠 그림 · 영어 라벨 · '구매 링크 준비 중'" "$A/어둠/desktop/free_adult_a2-1/license-modal-1.jpg" "뒤 — 선 아이콘 · 한 상자 · 안내 줄 없음"),
    (Row "데스크톱 · 이용권 있는 사람(어둠 · 코드는 가림)" 600 "" "전 — 산 뒤 데스크톱 전 사진은 없음(위 휴대폰 전 사진이 같은 창)" "$A/verify/licensemodal_licensed_dark_desktop.jpg" "뒤")
  ) }

$items += @{ n = 4; t = "STUDENT 무료 체험 단추가 카드 밖으로 넘치던 것"; v = "PASS"
  line = "둘째 단추가 긴 이름에서 '…'로 끝나고 카드 안에 들어옵니다(넘침 390 +19px → 0 · 360 +49px → 0)."
  rows = @(
    (Row "휴대폰 390 · 이용권 없음" 300 "$R/verify/v2new-freecard_student-phone.jpg" "전" "$A/verify/freecard_student_phone.jpg" "뒤"),
    (Row "작은 폰 360 · 이용권 없음" 300 "$R/verify/v2new-freecard_student-small.jpg" "전" "$A/verify/freecard_student_small.jpg" "뒤"),
    (Row "데스크톱 1366 · 이용권 없음(넘침은 휴대폰 폭에서만 있었음 — 데스크톱 전 사진은 없음)" 600 "" "전 — 없음" "$A/verify/freecard_student_desktop.jpg" "뒤 — 카드 안 · 넘침 0")
  ) }

$items += @{ n = 5; t = "GRAMMAR I · II — 아무것도 안 해도 '학습 완료'가 켜지던 것"; v = "PASS"
  line = "1단계에서 한 문제를 확인하기 전에는 '이 강의 학습 완료'가 꺼져 있고 '1단계에서 한 문제를 확인하면 완료할 수 있어요.' 한 줄이 나옵니다."
  rows = @(
    (Row "휴대폰 · GRAMMAR I 06강 처음" 300 "$R/밝음/phone/grammar1_gh1-006/end-1.jpg" "전 — 검게 켜진 완료" "$A/밝음/phone/grammar1_gh1-006/end-1.jpg" "뒤 — 꺼짐 + 이유 한 줄"),
    (Row "데스크톱 · GRAMMAR I 06강 처음" 600 "$R/밝음/desktop/grammar1_gh1-006/end-1.jpg" "전" "$A/밝음/desktop/grammar1_gh1-006/end-1.jpg" "뒤")
  ) }

$items += @{ n = 6; t = "목록 맨 위 '처음부터'가 끝낸 강의를 가리키던 것"; v = "PASS"
  line = "이 기기에 기록이 없어도 끝낸 강의는 건너뛰어 '다음 강의 · 아직 안 끝낸 첫 강의'를 가리킵니다(STUDENT s1-1 완료 → s1-2 · PASS-OFF 3/67 → pg02-1)."
  rows = @(
    (Row "휴대폰 · PASS-OFF 목록 맨 위" 300 "$R/verify/pg_list_settled_phone.jpg" "전 — '처음부터'" "$A/verify/top_passoff-grammar_phone.jpg" "뒤 — '다음 강의 · Be동사의 현재형'"),
    (Row "휴대폰 · STUDENT 목록 맨 위(s1-1 완료 기록)" 300 "$R/밝음/phone/student/open-1.jpg" "전" "$A/verify/top_student_phone.jpg" "뒤 — '다음 강의 · Part 2 …'"),
    (Row "데스크톱 · STUDENT 목록 맨 위(뒤만 — 데스크톱 전 사진은 없음)" 600 "" "전 — 없음(위 휴대폰 전 사진이 같은 단추)" "$A/verify/top_student_desktop.jpg" "뒤 — '다음 강의 · Part 2 …'")
  ) }

$items += @{ n = 7; t = "과정 소개 글이 과장 · 사실과 달랐던 것"; v = "PASS"
  line = "6과정 소개 글이 하는 일대로 한 줄이 됐습니다('완벽한 청취력을 완성합니다' 같은 말이 없어짐 — 운영 HTML 6곳에서 새 글 6/6 · 옛 글 0 확인)."
  rows = @(
    (Row "휴대폰 · LISTENING 목록 머리" 300 "$R/밝음/phone/ld/open-1.jpg" "전" "$A/밝음/phone/ld/open-1.jpg" "뒤"),
    (Row "데스크톱 · VOCA 목록 머리" 600 "$R/밝음/desktop/phonics/open-1.jpg" "전" "$A/밝음/desktop/phonics/open-1.jpg" "뒤")
  ) }

$items += @{ n = 8; t = "'챕터 전체 파트 듣기' 상자만 호박색 · 작은 글이던 것"; v = "PASS"
  line = "강의 줄과 같은 한 줄('이 장 전체 듣기 · 강의 6개 이어서', 14px · 높이 52px)이 됐고 호박색 · 이모지가 없습니다."
  rows = @(
    (Row "휴대폰 · STUDENT 1장 펼침" 300 "$R/verify/chapteraudio_phone_light_student.jpg" "전 — 호박색 상자" "$A/verify/chapteraudio_student_phone.jpg" "뒤 — 강의 줄과 같은 한 줄"),
    (Row "데스크톱 · STUDENT 1장 펼침" 600 "$R/밝음/desktop/student/expanded-1.jpg" "전" "$A/밝음/desktop/student/expanded-1.jpg" "뒤")
  ) }

$items += @{ n = 9; t = "READING 3단계 '영어 · 한글'이 두 줄로 꺾이던 것"; v = "PASS"
  line = "세 칸이 글 폭만큼 늘어 '영어 · 한글'이 한 줄(83px, 높이 44px)입니다 — 390 · 360 · 1366 모두."
  rows = @(
    (Row "휴대폰 · READING 001회 3단계" 300 "$R/밝음/phone/reading_pr001/step3-1.jpg" "전 — 두 줄" "$A/밝음/phone/reading_pr001/step3-1.jpg" "뒤 — 한 줄"),
    (Row "데스크톱 · READING 001회 3단계" 600 "$R/밝음/desktop/reading_pr001/step3-1.jpg" "전" "$A/밝음/desktop/reading_pr001/step3-1.jpg" "뒤")
  ) }

$items += @{ n = 10; t = "이용권 있는 사람에게 목록이 잠깐 '무료 · 자물쇠'로 보이던 것"; v = "PASS"
  line = "이용권 쿠키가 있으면 확인이 끝날 때까지 '무료 카드 · 자물쇠' 대신 빈 자리를 둡니다. 열고 0.5초 · 0.7초 · 1.3초 사진 모두 무료 띠 · 자물쇠가 없습니다."
  rows = @(
    (Row "휴대폰 · PASS-OFF 목록, 열고 0.5초(확인 중 빈 자리)" 300 "$R/verify/pg1_flash_1_248ms.jpg" "전 — 0.25초: '무료 · 자물쇠'" "$A/verify/flash/passoff-grammar_phone_r1_2.jpg" "뒤 — 0.47초: 빈 자리, 무료 띠 없음"),
    (Row "휴대폰 · 확인이 끝난 뒤" 300 "$R/verify/pg_list_settled_phone.jpg" "전 — 0.6초 뒤" "$A/verify/flash/passoff-grammar_phone_r1_6.jpg" "뒤 — 1.3초 뒤"),
    (Row "휴대폰 · STUDENT 목록, 열고 0.25초 · 0.5초" 300 "$R/verify/student1_flash_1_255ms.jpg" "전 — 0.26초: '무료로 먼저 해 보기' 카드 · 자물쇠" "$A/verify/flash/student_phone_r1_2.jpg" "뒤 — 0.53초: 빈 자리, 무료 카드 · 자물쇠 없음"),
    (Row "데스크톱 · STUDENT 목록, 열고 0.5초(뒤만 — 데스크톱 전 사진은 없음)" 600 "" "전 — 데스크톱 전 사진은 없음(위 휴대폰 전 사진이 같은 화면)" "$A/verify/flash/student_desktop_r1_2.jpg" "뒤 — 확인 중 빈 자리")
  ) }

$sb = New-Object Text.StringBuilder
[void]$sb.AppendLine(@"
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UI 손질 전후</title>
<style>
:root{--bg:#f8f6f2;--card:#ffffff;--ink:#16171a;--soft:#5c5a56;--line:#e4e0d8;--gold:#9a7a3c;--ok:#1d6b3a;--okbg:#e5f2e9;--bad:#b3261e;--chip:#f1ede6}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#111114;--card:#1a1a1f;--ink:#f2f0ec;--soft:#a9a49c;--line:#2e2e35;--gold:#c9a45c;--ok:#7fd69a;--okbg:#18301f;--bad:#ff8a80;--chip:#24242a}}
:root[data-theme="dark"]{--bg:#111114;--card:#1a1a1f;--ink:#f2f0ec;--soft:#a9a49c;--line:#2e2e35;--gold:#c9a45c;--ok:#7fd69a;--okbg:#18301f;--bad:#ff8a80;--chip:#24242a}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-size:16px;line-height:1.65}
main{max-width:1300px;margin:0 auto;padding:32px 16px 64px}
h1{font-size:26px;line-height:1.3;margin:0 0 8px}
.muted{color:var(--soft);font-size:14px}
.verdict{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:16px 0 8px;font-size:17px}
.item{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px 18px;margin:20px 0}
.item h2{margin:0 0 6px;font-size:19px;line-height:1.4}
.tag{display:inline-block;font-size:13px;font-weight:700;border-radius:8px;padding:2px 10px;margin-right:8px;background:var(--okbg);color:var(--ok)}
.tag.fail{background:#fde8e6;color:var(--bad)}
.line{margin:6px 0 4px}
.rowtitle{margin:18px 0 6px;font-size:14px;color:var(--soft);font-weight:500}
.pair{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
figure{margin:0;max-width:100%}
figure img{display:block;max-width:100%;height:auto;border:1px solid var(--line);border-radius:12px}
.badge{display:inline-block;font-size:13px;font-weight:700;border-radius:8px;padding:1px 10px;margin-bottom:6px}
.badge.before{background:var(--chip);color:var(--soft)}
.badge.after{background:var(--okbg);color:var(--ok)}
.none{height:120px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--line);border-radius:12px;color:var(--soft);font-size:14px;max-width:100%}
figcaption{font-size:13px;color:var(--soft);margin-top:4px}
</style>
</head>
<body>
<main>
<h1>UI 손질 10가지 — 전 · 후 사진</h1>
<p class="muted">2026-10-07 밤 · 운영 사이트(https://k-ig-core.vercel.app, 배포 da191e5e)를 휴대폰 390 · 작은 폰 360 · 데스크톱 1366으로 찍은 사진입니다. 왼쪽 '지금(전)'은 고치기 전 운영(970fa371), 오른쪽 '고친 뒤'는 오늘 배포된 운영입니다. 같은 AI 계열이 찍고 보았습니다 — 독립 검수가 아닙니다.</p>
<div class="verdict"><b>10가지 모두 운영에서 확인됐습니다.</b> 표시는 사진과 화면 숫자(단추 수 · 글자 크기 · 넘침 · 무료 띠 · 자물쇠)를 함께 본 결과입니다. 한 가지만 사진으로 못 본 것이 있습니다: 기간제 이용권에서 '2장은 이 장을 마치면 열려요.'가 '다음 강의' 자리에 나오는 줄(이용권 사본이 올패스라 그 줄이 나올 일이 없음). '지금(전)' 사진은 고치기 전 운영을 찍어 둔 것뿐이라, 그때 안 찍은 데스크톱 화면은 '사진 없음' 칸으로 두고 '고친 뒤'만 보입니다(4 · 6 · 10번, 3번 한 곳).</div>
"@)
foreach ($it in $items) {
  $tag = if ($it.v -eq "PASS") { "<span class=`"tag`">확인됨</span>" } else { "<span class=`"tag fail`">$($it.v)</span>" }
  [void]$sb.AppendLine("<section class=`"item`" id=`"i$($it.n)`"><h2>$($it.n). $(Esc $it.t)</h2><div>$tag</div><p class=`"line`">$(Esc $it.line)</p>")
  foreach ($r in $it.rows) { [void]$sb.AppendLine($r) }
  [void]$sb.AppendLine("</section>")
}
[void]$sb.AppendLine("</main></body></html>")
[IO.File]::WriteAllText($outHtml, $sb.ToString(), (New-Object Text.UTF8Encoding($false)))
"size=" + [math]::Round((Get-Item $outHtml).Length / 1MB, 2) + "MB"
if ($script:missing.Count) { "MISSING:"; $script:missing | Select-Object -Unique }
