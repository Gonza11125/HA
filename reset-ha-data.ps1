# Reset Home Assistant test data to real values
$HA_URL = "http://192.168.254.39:8123"
$HA_TOKEN = "JNWT83CQ"

$headers = @{
    "Authorization" = "Bearer $HA_TOKEN"
    "Content-Type" = "application/json"
}

# Real test data
$resetValues = @(
    @{ entity = "input_number.test_vykon"; value = "2500"; unit = "W" },
    @{ entity = "input_number.vyroba_dnes"; value = "18.5"; unit = "kWh" },
    @{ entity = "input_number.baterie"; value = "65"; unit = "%" },
    @{ entity = "input_number.nabijeni_napeti_baterie_stridace"; value = "48.2"; unit = "V" }
)

Write-Host "Resetting test data..." -ForegroundColor Cyan

foreach ($item in $resetValues) {
    $uri = "$HA_URL/api/states/$($item.entity)"
    $body = @{ state = $item.value } | ConvertTo-Json
    
    try {
        Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body | Out-Null
        Write-Host "[OK] $($item.entity) = $($item.value) $($item.unit)" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $($item.entity)" -ForegroundColor Red
    }
}

Write-Host "Done! Data reset complete." -ForegroundColor Cyan
