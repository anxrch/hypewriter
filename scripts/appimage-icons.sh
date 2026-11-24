#!/usr/bin/env bash
# AppImage 전용 창 버튼 아이콘(symbolic PNG)을 src-tauri/appimage/icons/src/*.svg에서 다시 만든다.
# SVG가 아니라 PNG로 넣는 이유: AppImage에 묶인 옛 GTK는 symbolic SVG를 그릴 때 잔상이 겹쳐 그려진다.
# 파일명이 *.symbolic.png면 GTK가 검은 부분을 현재 글자색으로 다시 칠해 준다(밝은/어두운 테마 모두 대응).
# 필요: rsvg-convert (librsvg)
set -euo pipefail
cd "$(dirname "$0")/../src-tauri/appimage/icons"
for svg in src/*.svg; do
  name=$(basename "$svg" .svg)
  mkdir -p 16 32
  rsvg-convert -w 16 -h 16 -o "16/$name.symbolic.png" "$svg"
  rsvg-convert -w 32 -h 32 -o "32/$name.symbolic.png" "$svg"
done
