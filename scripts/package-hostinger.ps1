$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$output = Join-Path $root 'output/hostinger'
[IO.Directory]::CreateDirectory($output) | Out-Null
$destination = Join-Path $output ('zentro-urbano-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.zip')
$paths = @(
    'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'next.config.ts',
    'next-env.d.ts', 'tsconfig.json', 'postcss.config.mjs', 'eslint.config.mjs',
    'HOSTINGER_DEPLOY.md', 'CONFIGURACION.env.example',
    'scripts/database-cli.mjs', 'scripts/database-migrations.mjs', 'scripts/start-hostinger.mjs',
    'database/mysql/001_zentro_urbano_core.sql',
    'database/mysql/002_property_exchange_rate.sql',
    'database/mysql/003_publication_review.sql'
)
foreach ($folder in @('src', 'public')) {
    $paths += Get-ChildItem -LiteralPath (Join-Path $root $folder) -Recurse -File |
        ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\', '/') }
}

# Whitelist deployable sources; reject links and accidentally embedded credentials.
foreach ($relative in $paths) {
    $file = Get-Item -LiteralPath (Join-Path $root $relative)
    if ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked source rejected: $relative" }
    if ($relative -match '(^|/)(\.env[^/]*|storage|node_modules|\.git|\.next|output)(/|$)' -or $relative -match '\.(log|pem|key|zip)$') {
        throw "Private or generated source rejected: $relative"
    }
    if ($file.Extension -in @('.ts', '.tsx', '.js', '.mjs', '.json', '.sql', '.md', '.yaml')) {
        $content = [IO.File]::ReadAllText($file.FullName)
        if ($content -match 'shpat_[A-Za-z0-9]+|GOCSPX-[A-Za-z0-9_-]+|-----BEGIN .*PRIVATE KEY-----|mysql://[^\s]+:[^\s]+@') {
            throw "Possible embedded credential: $relative"
        }
    }
}

$package = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
# Database operations remain a separate, reviewed step; never seed on deployment.
$package.scripts.PSObject.Properties.Remove('db:seed')
$package.scripts.PSObject.Properties.Remove('test')
$package.scripts.PSObject.Properties.Remove('start:preview')
$package.scripts.start = 'node scripts/start-hostinger.mjs'
$stream = [IO.File]::Open($destination, [IO.FileMode]::CreateNew)
$archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($relative in $paths) {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $root $relative), $relative.Replace('\', '/'), [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    $entry = $archive.CreateEntry('package.json')
    $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($false))
    try { $writer.Write(($package | ConvertTo-Json -Depth 20)) } finally { $writer.Dispose() }
} finally {
    $archive.Dispose()
    $stream.Dispose()
}

$check = [IO.Compression.ZipFile]::OpenRead($destination)
try {
    $names = @($check.Entries | ForEach-Object { $_.FullName })
    foreach ($required in @('package.json', 'pnpm-lock.yaml', 'src/app/page.tsx', 'src/app/api/publication-requests/route.ts', 'src/app/admin/solicitudes/[id]/decision/route.ts', 'database/mysql/003_publication_review.sql', 'scripts/database-cli.mjs', 'scripts/start-hostinger.mjs', 'CONFIGURACION.env.example', 'public/images/family-rental/family-atlas.webp')) {
        if ($required -notin $names) { throw "Missing ZIP entry: $required" }
    }
    if ($names.Count -ne ($paths.Count + 1)) { throw 'ZIP entry count mismatch' }
    [PSCustomObject]@{ Zip = $destination; Files = $names.Count; SizeMB = [Math]::Round((Get-Item -LiteralPath $destination).Length / 1MB, 2) }
} finally { $check.Dispose() }
