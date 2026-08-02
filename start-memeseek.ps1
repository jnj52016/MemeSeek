$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath $PSScriptRoot
docker compose up -d --build

Write-Host 'MemeSeek 已启动： http://localhost:5173'

