#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT
for ARCH in arm64 x86_64; do
  xcrun swiftc -O -target "$ARCH-apple-macos14.0" "$ROOT/native/StartupBridge.swift" -o "$BUILD/$ARCH"
done
lipo -create "$BUILD/arm64" "$BUILD/x86_64" -output "$ROOT/native/startup-bridge"
codesign --force --sign - "$ROOT/native/startup-bridge"
