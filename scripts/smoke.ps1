param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$EnvFile = ".env.local",
    [string]$ActorDid = "did:plc:smoke",
    [string]$RulesetManifestRef = "",
    [string]$RulesetNSID = "app.cerulia.rules.core",
    [string]$RequestIdPrefix = "smoke",
	[switch]$ReadOnly,
    [switch]$UseInsecureDirect
)

function Import-EnvFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    Get-Content $Path | ForEach-Object {
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

function Get-Sha256Hex {
    param([byte[]]$Bytes)

    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = $sha.ComputeHash($Bytes)
    }
    finally {
        $sha.Dispose()
    }

    return ([System.BitConverter]::ToString($hash).Replace("-", "").ToLowerInvariant())
}

function New-CeruliaSignedHeaders {
    param(
        [string]$Actor,
        [string[]]$PermissionSets,
        [string]$Method,
        [string]$Path,
        [string]$RawQuery,
        [string]$Body,
        [string]$Secret
    )

    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
    $nonce = [guid]::NewGuid().ToString("N")
    $sortedPermissionSets = $PermissionSets | Sort-Object
    $bodyDigest = Get-Sha256Hex ([System.Text.Encoding]::UTF8.GetBytes($Body))
    $operation = $Path.TrimStart("/").Replace("xrpc/", "")
    $canonical = @(
        $Actor,
        ($sortedPermissionSets -join ","),
        $timestamp,
        $nonce,
        $operation,
        $Method.ToUpperInvariant(),
        "/" + $Path.TrimStart("/"),
        $RawQuery,
        $bodyDigest
    ) -join "`n"

    $hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($Secret))
    try {
        $signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($canonical))
    }
    finally {
        $hmac.Dispose()
    }

    return @{
        "X-Cerulia-Actor-Did" = $Actor
        "X-Cerulia-Permission-Sets" = ($sortedPermissionSets -join ",")
        "X-Cerulia-Auth-Timestamp" = $timestamp
        "X-Cerulia-Auth-Nonce" = $nonce
        "X-Cerulia-Auth-Signature" = ([System.BitConverter]::ToString($signatureBytes).Replace("-", "").ToLowerInvariant())
    }
}

function New-CeruliaHeaders {
    param(
        [string]$Actor,
        [string[]]$PermissionSets,
        [string]$Method,
        [string]$Path,
        [string]$RawQuery,
        [string]$Body,
        [switch]$AllowInsecureDirect
    )

    if ($AllowInsecureDirect) {
        return @{
            "X-Cerulia-Actor-Did" = $Actor
            "X-Cerulia-Permission-Sets" = (($PermissionSets | Sort-Object) -join ",")
        }
    }

    if ([string]::IsNullOrWhiteSpace($env:AUTH_TRUSTED_PROXY_HMAC_SECRET)) {
        throw "AUTH_TRUSTED_PROXY_HMAC_SECRET is required unless -UseInsecureDirect is specified."
    }

    return New-CeruliaSignedHeaders -Actor $Actor -PermissionSets $PermissionSets -Method $Method -Path $Path -RawQuery $RawQuery -Body $Body -Secret $env:AUTH_TRUSTED_PROXY_HMAC_SECRET
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Import-EnvFile -Path (Join-Path $root $EnvFile)

if (-not $UseInsecureDirect -and [string]::IsNullOrWhiteSpace($env:AUTH_TRUSTED_PROXY_HMAC_SECRET) -and ($env:APP_ENV -eq "development" -or $env:APP_ENV -eq "test") -and ([string]::IsNullOrWhiteSpace($env:AUTH_ALLOW_INSECURE_DIRECT) -or $env:AUTH_ALLOW_INSECURE_DIRECT -eq "true")) {
    $UseInsecureDirect = $true
}

$ready = Invoke-RestMethod -Method Get -Uri "$BaseUrl/readyz"
if ($ready.status -ne "ready") {
    throw "readyz failed: $($ready | ConvertTo-Json -Depth 5 -Compress)"
}

$publicList = Invoke-RestMethod -Method Get -Uri "$BaseUrl/xrpc/app.cerulia.rpc.listPublications?mode=public"
if ($null -eq $publicList.items) {
    throw "public listPublications response did not include items"
}

if ($ReadOnly) {
    Write-Warning "Authenticated mutation smoke was skipped because -ReadOnly was specified."
    return
}

if ([string]::IsNullOrWhiteSpace($RulesetManifestRef)) {
    throw "RulesetManifestRef is required unless -ReadOnly is specified."
    return
}

$permissionSets = @(
    "app.cerulia.authCoreReader",
    "app.cerulia.authCoreWriter"
)

$createBody = @{
    title = "Smoke Campaign"
    visibility = "unlisted"
    rulesetNsid = $RulesetNSID
    rulesetManifestRef = $RulesetManifestRef
    defaultReusePolicyKind = "same-campaign-default"
    stewardDids = @($ActorDid)
    requestId = "$RequestIdPrefix-create-campaign"
} | ConvertTo-Json -Compress

$createHeaders = New-CeruliaHeaders -Actor $ActorDid -PermissionSets $permissionSets -Method "POST" -Path "/xrpc/app.cerulia.rpc.createCampaign" -RawQuery "" -Body $createBody -AllowInsecureDirect:$UseInsecureDirect
$createHeaders["Content-Type"] = "application/json"
$createResponse = Invoke-RestMethod -Method Post -Uri "$BaseUrl/xrpc/app.cerulia.rpc.createCampaign" -Headers $createHeaders -Body $createBody

if ($createResponse.resultKind -ne "accepted" -or $createResponse.emittedRecordRefs.Count -ne 1) {
    throw "createCampaign smoke failed: $($createResponse | ConvertTo-Json -Depth 5 -Compress)"
}

$campaignRef = $createResponse.emittedRecordRefs[0]
$query = "campaignRef=$([System.Uri]::EscapeDataString($campaignRef))&mode=owner-steward"
$viewHeaders = New-CeruliaHeaders -Actor $ActorDid -PermissionSets $permissionSets -Method "GET" -Path "/xrpc/app.cerulia.rpc.getCampaignView" -RawQuery $query -Body "" -AllowInsecureDirect:$UseInsecureDirect
$viewResponse = Invoke-RestMethod -Method Get -Uri "$BaseUrl/xrpc/app.cerulia.rpc.getCampaignView?$query" -Headers $viewHeaders

if ($viewResponse.mode -ne "owner-steward" -or $viewResponse.campaign.campaignRef -ne $campaignRef) {
    throw "getCampaignView smoke failed: $($viewResponse | ConvertTo-Json -Depth 5 -Compress)"
}