#!/usr/bin/env bash
# ============================================================
#  Jog.DEV - Auto Push (cara token dari Git Credential Manager)
#  Dipanggil oleh pi AI setelah selesai mengedit file, agar
#  otomatis git add -> commit -> push -> GitHub Action deploy.
#
#  Penggunaan:
#    ./auto-push.sh "<keterangan commit>"
# ============================================================
set -e

cd "$(dirname "$0")/.."

MSG="${1:-auto-deploy: update}"
MSG="auto-deploy: ${MSG}"
MSG="${MSG//\"/}"

echo ">> git add -A"
git add -A
if git diff --cached --quiet; then
  echo ">> Tidak ada perubahan untuk di-commit. Selesai."
  exit 0
fi

echo ">> git commit -m \"$MSG\""
git commit -m "$MSG"

# Ambil token valid dari Git Credential Manager (cara yang tadi):
TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
if [ -z "$TOKEN" ]; then
  echo "!! Tidak dapat mengambil token dari Git Credential Manager."
  echo "   Jalankan manual: git push origin main"
  exit 1
fi

echo ">> git push (via token credential manager)"
git push "https://jogboy-web:${TOKEN}@github.com/jogboy-web/jogdev-website.git" main

echo "==> Done. GitHub Action akan auto-deploy ke Cloudflare Pages."
