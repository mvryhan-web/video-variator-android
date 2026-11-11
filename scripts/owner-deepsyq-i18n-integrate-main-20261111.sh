#!/usr/bin/env bash
# Integrate only approved multilingual display assets onto the newest DEV main.
# Preserve every other file (including Worker, Stripe, Home design and pricing).
set -euo pipefail
repo_root="$(pwd)"
target="/tmp/deepsyq-i18n-current-main"
git fetch origin deepsyq-platform
git worktree add -B owner-i18n-main-integration "$target" origin/deepsyq-platform
test "$(find "$repo_root/app/src/main/assets/i18n" -maxdepth 1 -name '*.json' | wc -l)" -eq 35
mkdir -p "$target/app/src/main/assets/i18n"
cp "$repo_root/app/src/main/assets/i18n/"*.json "$target/app/src/main/assets/i18n/"
cp "$repo_root/app/src/main/assets/deepsyq-page-i18n.js" "$target/app/src/main/assets/"
(
 cd "$target"
 python3 "$repo_root/scripts/inject-deepsyq-i18n.py"
 git diff --check
 git add app/src/main/assets/*.html app/src/main/assets/deepsyq-page-i18n.js app/src/main/assets/i18n
 python3 - <<'PY'
import subprocess
paths=subprocess.check_output(['git','diff','--cached','--name-only'],text=True).splitlines()
prefix='app/src/main/assets/'
allowed=(prefix+'deepsyq-page-i18n.js',)
for name in paths:
 assert name.startswith(prefix),name
 assert name.endswith('.html') or name in allowed or name.startswith(prefix+'i18n/'),name
print('DEEPSYQ_I18N_EXACT_GIT_SCOPE',len(paths))
PY
 git config user.name "DEEPSYQ i18n integration"
 git config user.email "github-actions[bot]@users.noreply.github.com"
 if git diff --cached --quiet;then echo "I18N_ALREADY_INTEGRATED";exit 0;fi
 git commit -m "feat(i18n): RU FR ES display translation on 33 pages, 404 and all plan cards, no layout changes"
 git push origin HEAD:deepsyq-platform
)
