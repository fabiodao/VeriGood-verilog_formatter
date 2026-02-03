$lines = Get-Content expected/10_parameter_alignment.v
$line17 = $lines[16]
$line19 = $lines[18]

Write-Host "Line 17: $line17"
Write-Host "Line 19: $line19"

$pos17 = $line17.IndexOf(')')
$pos19 = $line19.IndexOf(')')

Write-Host "Line 17: ) at column $pos17"
Write-Host "Line 19: ) at column $pos19"

if ($pos17 -eq $pos19) {
    Write-Host "PASS: ALIGNED!" -ForegroundColor Green
} else {
    Write-Host "FAIL: NOT ALIGNED" -ForegroundColor Red
}
