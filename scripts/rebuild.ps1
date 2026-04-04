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

Push-Location $root
try {
    go run ./cmd/rebuild
}
finally {
    Pop-Location
}