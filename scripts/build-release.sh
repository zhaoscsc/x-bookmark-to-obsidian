#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
EXT_STAGE="$DIST_DIR/x-bookmark-to-obsidian"
INSTALLER_STAGE="$DIST_DIR/x-bookmark-to-obsidian-installer"
EXT_ZIP="$DIST_DIR/x-bookmark-to-obsidian-extension.zip"
INSTALLER_ZIP="$DIST_DIR/x-bookmark-to-obsidian-installer.zip"

rm -rf "$DIST_DIR"
mkdir -p "$EXT_STAGE/icons" "$EXT_STAGE/native-host" "$INSTALLER_STAGE/native-host"

cp "$ROOT_DIR/manifest.json" "$EXT_STAGE/"
cp "$ROOT_DIR/background.js" "$EXT_STAGE/"
cp "$ROOT_DIR/content.js" "$EXT_STAGE/"
cp "$ROOT_DIR/content.css" "$EXT_STAGE/"
cp "$ROOT_DIR/popup.html" "$EXT_STAGE/"
cp "$ROOT_DIR/popup.js" "$EXT_STAGE/"
cp "$ROOT_DIR/popup.css" "$EXT_STAGE/"
cp "$ROOT_DIR/install.command" "$EXT_STAGE/"
cp "$ROOT_DIR/README.md" "$EXT_STAGE/"
cp "$ROOT_DIR/LICENSE" "$EXT_STAGE/"
cp "$ROOT_DIR/icons/icon16.png" "$EXT_STAGE/icons/"
cp "$ROOT_DIR/icons/icon48.png" "$EXT_STAGE/icons/"
cp "$ROOT_DIR/icons/icon128.png" "$EXT_STAGE/icons/"
cp "$ROOT_DIR/native-host/btl_file_writer.py" "$EXT_STAGE/native-host/"
cp "$ROOT_DIR/native-host/fetch_tweet.py" "$EXT_STAGE/native-host/"
cp "$ROOT_DIR/native-host/install-macos.sh" "$EXT_STAGE/native-host/"

cp "$ROOT_DIR/install.command" "$INSTALLER_STAGE/"
cp "$ROOT_DIR/README.md" "$INSTALLER_STAGE/"
cp "$ROOT_DIR/native-host/btl_file_writer.py" "$INSTALLER_STAGE/native-host/"
cp "$ROOT_DIR/native-host/fetch_tweet.py" "$INSTALLER_STAGE/native-host/"
cp "$ROOT_DIR/native-host/install-macos.sh" "$INSTALLER_STAGE/native-host/"

ditto -c -k --norsrc --keepParent "$EXT_STAGE" "$EXT_ZIP"
ditto -c -k --norsrc --keepParent "$INSTALLER_STAGE" "$INSTALLER_ZIP"

echo "Built release artifacts:"
echo "  $EXT_ZIP"
echo "  $INSTALLER_ZIP"
