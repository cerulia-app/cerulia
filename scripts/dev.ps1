param(
    [string]$EnvFile = ".env.local"
)

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $root $EnvFile

if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
            return
        }

        $parts = $line.Split("=", 2)
        if ($parts.Count -ne 2) {
            return
        }

        [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
    }
}

if ([string]::IsNullOrWhiteSpace($env:APP_ENV)) {
    [Environment]::SetEnvironmentVariable("APP_ENV", "development", "Process")
}

if (($env:APP_ENV -eq "development" -or $env:APP_ENV -eq "test") -and [string]::IsNullOrWhiteSpace($env:AUTH_ALLOW_INSECURE_DIRECT)) {
    [Environment]::SetEnvironmentVariable("AUTH_ALLOW_INSECURE_DIRECT", "true", "Process")
}

Push-Location $root
try {
    go run ./cmd/api
}
finally {
    Pop-Location
}