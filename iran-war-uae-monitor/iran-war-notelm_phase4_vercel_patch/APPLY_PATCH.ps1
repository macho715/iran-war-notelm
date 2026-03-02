param(
  [string]$RepoPath = ".",
  [switch]$Backup
)

$ErrorActionPreference = "Stop"

$PatchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = (Resolve-Path $RepoPath).Path

$targets = @(
  ".github",
  "iran-war-uae-monitor",
  "dashboard",
  "requirements.txt",
  "PHASE4_SETUP.md"
)

if ($Backup) {
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $backupPath = Join-Path $RepoRoot ("_backup_phase4_patch_" + $stamp)
  New-Item -ItemType Directory -Path $backupPath | Out-Null
  foreach ($t in $targets) {
    $src = Join-Path $RepoRoot $t
    if (Test-Path $src) {
      $dst = Join-Path $backupPath $t
      Copy-Item -Path $src -Destination $dst -Recurse -Force
    }
  }
  Write-Host ("Backup created: " + $backupPath)
}

foreach ($t in $targets) {
  $src = Join-Path $PatchRoot $t
  if (!(Test-Path $src)) { continue }
  $dst = Join-Path $RepoRoot $t
  Copy-Item -Path $src -Destination $dst -Recurse -Force
}

Write-Host "✅ Phase4+Vercel patch applied."
Write-Host "Next: open PHASE4_SETUP.md"
