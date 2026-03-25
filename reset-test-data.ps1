# Reset Home Assistant test data to realistic values

$HA_URL = "http://homeassistant.local:8123"
$HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2NjRkNjJiYzRjMjg0NjEwYjE3ZWRlMWEzMmMzMjA3NSIsImlhdCI6MTc3MjU1NjgxOSwiZXhwIjoyMDg3OTE2ODE5fQ.wB4M6aRIYsiwFm79hzNsQZjScB04vRL30n5PVX-GtBU"

if ([string]::IsNullOrWhiteSpace($HA_TOKEN) -or $HA_TOKEN.Length -lt 20) {
    Write-Host "[ERROR] Home Assistant token is missing or too short." -ForegroundColor Red
    Write-Host "        Create a Long-Lived Access Token in HA profile and paste it into $HA_TOKEN." -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $HA_TOKEN"
    "Content-Type" = "application/json"
}

$targets = @(
    @{ entity = "input_number.test_vykon"; value = 2500 },
    @{ entity = "input_number.vyroba_dnes"; value = 18.5 },
    @{ entity = "input_number.baterie"; value = 65 },
    @{ entity = "input_number.nabijeni_napeti_baterie_stridace"; value = 48.2 }
)

Write-Host "Resetting Home Assistant test values..." -ForegroundColor Cyan

try {
    $apiCheck = Invoke-WebRequest -Uri "$HA_URL/api/" -Headers $headers -Method GET -UseBasicParsing -TimeoutSec 8 -ErrorAction Stop
} catch {
    Write-Host "[ERROR] Cannot connect to Home Assistant API at $HA_URL" -ForegroundColor Red
    Write-Host "        Detail: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "        Check HA URL/port and that Home Assistant is running." -ForegroundColor Red
    exit 1
}

if ($apiCheck.StatusCode -ne 200) {
    Write-Host "[ERROR] Home Assistant API returned status $($apiCheck.StatusCode)." -ForegroundColor Red
    Write-Host "        Verify that the token has API permissions." -ForegroundColor Red
    exit 1
}

$ok = 0
$fail = 0

foreach ($item in $targets) {
    $body = @{ entity_id = $item.entity; value = $item.value } | ConvertTo-Json
    try {
        Invoke-WebRequest -Uri "$HA_URL/api/services/input_number/set_value" -Method POST -Headers $headers -Body $body -UseBasicParsing -ErrorAction Stop | Out-Null
        Write-Host "[OK] $($item.entity) = $($item.value)" -ForegroundColor Green
        $ok++
    } catch {
        Write-Host "[FAIL] $($item.entity)" -ForegroundColor Red
        Write-Host "       $($_.Exception.Message)" -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host "Done. Success: $ok, Failed: $fail" -ForegroundColor Cyan
Write-Host "Refresh dashboard (Ctrl+F5)." -ForegroundColor Yellow

if ($fail -gt 0) {
    exit 1
}
