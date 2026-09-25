# After the gate-15 sweep: gates 0/9/10 (gate-count), 6/11 (build-coverage), 7 screen evidence, features summary, gate-5 recheck targets.
# ASCII-only strings (PowerShell 5.1 misreads Korean in BOM-less scripts).
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$repo = "C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE"
$s = "C:\Users\ghddl\AppData\Local\Temp\claude\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE\b138581d-6e8d-498e-b217-99c4c524c08a\scratchpad\s7"
Set-Location $repo
$feat = "$repo\docs\qa-2026-09-18\out\features"
$names = @(Get-ChildItem $feat | Where-Object { $_.Name -match '^(student|phonics|grammar1|grammar2|ld|reading)-g(0|15)-(desktop|tablet|mobile)-s?\d+of\d+(-r\d+)*\.jsonl$' } | ForEach-Object { $_.Name })
"record files: $($names.Count)"
"== gate-count (gates 0, 5, 9, 10)"
# deploy2 = first gate-15 deploy (1ef7d36) · deploy3 = second (bf3f4b6, owner decisions) · deploy4 = third (397f1e8, speech forms)
node "$s\gate-count.cjs" --deploy 2026-09-24T06:09:22Z --deploy2 2026-09-24T21:19:30Z --changed "$s\expect-diff-deploy.json" --deploy3 2026-09-25T02:50:34Z --changed3 "$s\expect-diff-deploy3.json" --exam3 docs/qa-2026-09-18/out/grammar-exam-deploy3.json --titles3 docs/qa-2026-09-18/out/student-titles-live-after-deploy3.json --grading3 "$s\grading-pages-latest.json" --deploy4 2026-09-25T03:49:56Z --changed4 "$s\expect-diff-deploy4.json" --json "$s\gate-count-final.json" > "$s\gate-count-final.txt"
"exit $LASTEXITCODE"
"== build-coverage (gates 6, 11)"
node docs/qa-2026-09-18/scripts/build-coverage.cjs --files ($names -join ",") > "$s\coverage-final.txt"
"exit $LASTEXITCODE"
"== gate 7 screen evidence"
node "$s\gate7-evidence.cjs" --json "$s\gate7-final.json" > "$s\gate7-final.txt"
"exit $LASTEXITCODE"
"== latest records + analyze-features (gate 14 evidence)"
node "$s\gate-latest-records.cjs" "$s\gate-latest"
node docs/qa-2026-09-18/scripts/analyze-features.cjs --features-dir "$s\gate-latest" > "$s\analyze-final.txt"
"exit $LASTEXITCODE"
"== gate 5 recheck targets"
node "$s\gen-recheck-targets.cjs" --out "$s\recheck-targets-final.jsonl" > "$s\recheck-targets-final.txt"
"exit $LASTEXITCODE"
Get-Content "$s\recheck-targets-final.txt" | Select-Object -Last 6
