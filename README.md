# Driving Hour Tracker website

The website for Driving Hour Tracker, a learner driver logbook app for iPhone, iPad, Apple Watch, Android and Wear OS: https://drivinghourtracker.karmafy.com.au/

Static HTML, CSS and JavaScript, served with GitHub Pages.

## Pages

- `/` presents the app for both platforms, with a feature-by-platform table.
- `/android/` is the landing page for the Android app (Google Play listing: `com.karmaacademy.drivinghourstracker_driverly`).
- `/privacy/` and `/support/` cover both platforms, with the sections that differ labelled iPhone or Android.

## Assets

`tools/build-assets.sh` exports the images and clips: the iPhone, iPad and Apple Watch captures from the iOS project's `Design` folder, and the Android captures from the Android repo's `store/raw/phone/`, which are shown in a plain phone outline (`.aphone` in `site.css`), never an iPhone frame.

`assets/badges/` holds the official store badges, unaltered: Apple's "Download on the App Store" (developer.apple.com/app-store/marketing/guidelines) and Google's "Get it on Google Play" (play.google.com/badges, the English web badge). Both are shown at the same height, side by side.
