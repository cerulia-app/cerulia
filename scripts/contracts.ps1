param(
    [Parameter(Mandatory = $true)]
    [string]$Version,
    [string]$Channel = "next",
    [string]$OutputRoot = ".artifacts/contracts",
    [string]$GitSha = "",
    [string]$GitTag = ""
)

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$resolvedRoot = [System.IO.Path]::GetFullPath($root)
$resolvedOutputRoot = [System.IO.Path]::GetFullPath((Join-Path $root $OutputRoot))
$normalizedRoot = $resolvedRoot.TrimEnd([char[]]"\\/")
$rootBoundary = $normalizedRoot + [System.IO.Path]::DirectorySeparatorChar

if ($resolvedOutputRoot -ne $normalizedRoot -and -not $resolvedOutputRoot.StartsWith($rootBoundary, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "OutputRoot must stay within the repository root."
}

if ($Version.Contains("..") -or $Version.IndexOfAny([char[]]"\\/:") -ge 0) {
    throw "Version must be a single path segment."
}

$outputDirectory = Join-Path $resolvedOutputRoot $Version

if ([string]::IsNullOrWhiteSpace($GitSha)) {
    $GitSha = (git -C $root rev-parse HEAD).Trim()
}

if ([string]::IsNullOrWhiteSpace($GitTag)) {
    $gitTagResult = (& git -C $root describe --tags --exact-match 2>$null)
    if ($LASTEXITCODE -eq 0) {
        $GitTag = ($gitTagResult | Out-String).Trim()
    }
    else {
        $GitTag = ""
    }
}

$args = @(
    "./cmd/contracts",
    "-out", $outputDirectory,
    "-version", $Version,
    "-channel", $Channel,
    "-git-sha", $GitSha
)

if (-not [string]::IsNullOrWhiteSpace($GitTag)) {
    $args += @("-git-tag", $GitTag)
}

Push-Location $root
try {
    & go run $args
}
finally {
    Pop-Location
}