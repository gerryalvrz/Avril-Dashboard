#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: ./scripts/startup-agent-generator.sh \"<startup-name>\" \"<roles-json>\""
  exit 1
fi

STARTUP_NAME="$1"
ROLES_JSON="$2"

node ./script/startup-agent-generator.mjs "$STARTUP_NAME" "$ROLES_JSON"
