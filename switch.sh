#!/bin/sh
# Switch the live site between the two versions.
#   ./switch.sh simple           one open form for everyone
#   ./switch.sh personal-links   one link per person, locks after submitting
set -e
cd "$(dirname "$0")"
case "$1" in
  simple|personal-links) ;;
  *) echo "Usage: ./switch.sh simple | personal-links"; exit 1 ;;
esac
cd "$1"
netlify deploy --prod --dir public
echo
echo "Live site is now the '$1' version: https://humandelta-gift.netlify.app"
