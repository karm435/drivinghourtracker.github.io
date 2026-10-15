#!/bin/zsh
# Exports the website's images and clips from the design captures in the Xcode project.
# Run from anywhere: zsh Website/tools/build-assets.sh
# Needs cwebp (brew install webp), ffmpeg (brew install ffmpeg) and sips (macOS).
set -euo pipefail

here="${0:A:h}"
site="$here/.."
design="$site/../Driving hour tracker/Design"
raw="$design/Store Assets/Raw"
img="$site/assets/img"
video="$site/assets/video"
icons="$site/assets/icons"
mkdir -p "$img" "$video" "$icons"

phone() { cwebp -quiet -q 82 -resize 880 0 "$1" -o "$img/$2.webp"; }
pad()   { cwebp -quiet -q 82 -resize 1032 0 "$1" -o "$img/$2.webp"; }
keep()  { cwebp -quiet -q 90 "$1" -o "$img/$2.webp"; }

# iPhone captures (1320 x 2868, shown at 440 x 956 pt)
phone "$raw/iphone-recording.png"           iphone-recording
phone "$raw/iphone-progress.png"            iphone-progress
phone "$raw/iphone-logbook.png"             iphone-logbook
phone "$raw/iphone-route-map.png"           iphone-route-map
phone "$raw/iphone-drive-details.png"       iphone-drive-details
phone "$raw/iphone-start-sheet.png"         iphone-start-sheet
phone "$raw/iphone-pdf.png"                 iphone-pdf
phone "$raw/iphone-data-tools.png"          iphone-data-tools
phone "$raw/v2/iphone-lockscreen-live.png"  iphone-lockscreen-live
phone "$raw/v2/iphone-lockscreen-clean.png" iphone-lockscreen-clean
phone "$raw/v2/iphone-home-live.png"        iphone-home-live

# iPad captures (2064 x 2752)
pad "$raw/v2/ipad-recording.png" ipad-recording
pad "$raw/ipad-logbook.png"      ipad-logbook
pad "$raw/ipad-route-map.png"    ipad-route-map

# iPhone Duo device captures with transparent backgrounds, and the Apple Watch screens
keep "$raw/v2/duo-open-progress.png"    duo-open-progress
keep "$raw/v2/duo-folded-recording.png" duo-folded-recording
keep "$raw/v2/watch-recording.png"      watch-recording
keep "$raw/v2/watch-start.png"          watch-start
keep "$raw/v2/watch-dashboard.png"      watch-dashboard
keep "$raw/v2/watch-autostop.png"       watch-autostop

# The exported PDF report's first page
cwebp -quiet -q 80 -resize 800 0 "$design/Store Assets/Source/assets/report-page-1.png" -o "$img/report-page-1.webp"

# App icon: favicon, touch icon, and the flat SVG for the page
sips -s format png -z 180 180 "$design/AppIcon/Hours-iOS-Default-1024@1x.png" --out "$icons/apple-touch-icon.png" >/dev/null
sips -s format png -z 32 32   "$design/AppIcon/Hours-iOS-Default-1024@1x.png" --out "$icons/favicon-32.png" >/dev/null
sips -s format png -z 192 192 "$design/AppIcon/Hours-iOS-Default-1024@1x.png" --out "$icons/icon-192.png" >/dev/null
cp "$design/Store Assets/Source/assets/app-icon-flat.svg" "$icons/app-icon.svg"

# Share image: the search-results creative, cropped to 1.91:1
ffmpeg -v error -y -i "$design/Store Assets/Creative/Search results 3840x2560.png" \
  -vf "crop=3840:2010:0:0,scale=1200:628" -q:v 3 "$img/og-image.jpg"

# Clips from the App Preview, silent, 660 px wide
clip() { ffmpeg -v error -y -i "$1" -an -vf "scale=660:-2" -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart "$video/$2.mp4"; }
clip "$raw/v2/preview-clips/i4-map.mp4"      route-map
clip "$raw/v2/preview-clips/i2-start.mp4"    start-drive
clip "$raw/v2/preview-clips/i5-progress.mp4" progress

ls -la "$img" "$video" "$icons"
