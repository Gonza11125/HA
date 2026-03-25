# Reset Home Assistant test data to realistic values
# Author: Solar Portal
# Date: 2026-03-25

$HA_URL = "http://192.168.254.39:8123"
$HA_TOKEN = "JNWT83CQ"

$headers = @{
    "Authorization" = "Bearer $HA_TOKEN"
    "Content-Type" = "application/json"
}

# Define entities with realistic daily values
$entities = @(
    @{ id = "input_number.test_vykon"; value = "2500"; unit = "W"; desc = "Current Power" },
    @{ id = "input_number.vyroba_dnes"; value = "18.5"; unit = "kWh"; desc = "Daily Production" },
    @{ id = "input_number.baterie"; value = "65"; unit = "%"; desc = "Battery State" },
    @{ id = "input_number.nabijeni_napeti_baterie_stridace"; value = "48.2"; unit = "V"; desc = "Battery Voltage" }
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Home Assistant Test Data Reset Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($entity in $entities) {
    $uri = "$HA_URL/api/states/$($entity.id)"
    $body = @{
        state = $entity.value
        attributes = @{
            unit_of_measurement = $entity.unit
            friendly_name = $entity.desc
        }
    } | ConvertTo-Json
    
    try {
        Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body -ErrorAction Stop | Out-Null
        Write-Host "[OK]   $($entity.id)" -ForegroundColor Green
        Write-Host "       Value: $($entity.value) $($entity.unit)" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "[FAIL] $($entity.id)" -ForegroundColor Red
        Write-Host "       Error: $(($_.Exception.Message).Split("`n")[0])" -ForegroundColor Red
        $failCount++
    }
    Write-Host ""
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Results: $successCount OK, $failCount FAILED" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Refresh your browser (Ctrl+F5) to see the updated values." -ForegroundColor Yellow
