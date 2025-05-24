# Deploy script for GitHub Pages
Write-Host "Starting deployment process..." -ForegroundColor Green

# Check if we're on the gh-pages branch
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "gh-pages") {
    Write-Host "Switching to gh-pages branch..." -ForegroundColor Yellow
    git checkout gh-pages
}

# Stage all changes
Write-Host "Staging changes..." -ForegroundColor Green
git add .

# Commit changes
Write-Host "Committing changes..." -ForegroundColor Green
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Update: Automated deployment at $timestamp"

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Green
git push origin gh-pages

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Your changes should be live in a few minutes at: https://[your-github-username].github.io/[repository-name]/" -ForegroundColor Cyan 