#!/bin/bash
# Run this script once to push the unpushed commits to GitHub.
# Usage: bash scripts/push-to-github.sh
#
# If you use SSH keys with GitHub:
#   git remote set-url origin git@github.com:Jonathangadeaharder/Notflix.git
#   git push origin master
#
# If you use HTTPS with a Personal Access Token:
#   git remote set-url origin https://<YOUR_GH_USERNAME>:<YOUR_PAT>@github.com/Jonathangadeaharder/Notflix.git
#   git push origin master
#
# Or simply run in your terminal (Git Credential Manager will prompt):
#   git push origin master

set -e
cd "$(git rev-parse --show-toplevel)"

echo "Unpushed commits:"
git log --oneline origin/master..HEAD 2>/dev/null || git log --oneline HEAD~3..HEAD

echo ""
echo "Run:  git push origin master"
