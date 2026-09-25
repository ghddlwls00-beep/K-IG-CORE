# A/B builds for gate 12: old (d2b50ca, before the gate deploys) and new (HEAD, app = 397f1e8) in detached worktrees.
# Turbopack refuses a node_modules junction that points outside the project, so each worktree gets its own
# offline pnpm install (hard links from the local store). The junction is removed as a LINK only (Directory.Delete, non-recursive).
# No .env.local in either worktree - both builds run under the same (empty) env. ASCII-only strings.
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$s = "C:\Users\ghddl\AppData\Local\Temp\claude\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE\b138581d-6e8d-498e-b217-99c4c524c08a\scratchpad\s7"
$env:NEXT_TELEMETRY_DISABLED = "1"
foreach ($w in "kig-wt-base", "kig-wt-head") {
  $d = Join-Path $env:TEMP $w
  $nm = Join-Path $d "node_modules"
  $i = Get-Item $nm -Force -ErrorAction SilentlyContinue
  if ($i -and $i.LinkType -eq 'Junction') { [System.IO.Directory]::Delete($nm, $false); "[$w] junction removed: $(-not (Test-Path $nm))" }
  $t0 = Get-Date
  Push-Location $d
  pnpm install --offline --frozen-lockfile --ignore-scripts *> "$s\ab-install-$w.log"
  "[$w] pnpm install exit $LASTEXITCODE - $([Math]::Round(((Get-Date) - $t0).TotalSeconds)) s"
  Get-Content "$s\ab-install-$w.log" -Encoding UTF8 -Tail 3
  $t0 = Get-Date
  node node_modules/next/dist/bin/next build *> "$s\ab-build-$w.log"
  "[$w] next build exit $LASTEXITCODE - $([Math]::Round(((Get-Date) - $t0).TotalSeconds)) s"
  Get-Content "$s\ab-build-$w.log" -Encoding UTF8 -Tail 3
  Pop-Location
}
