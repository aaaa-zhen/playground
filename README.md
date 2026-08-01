# Playground

Spring-physics interaction demos.

## Structure

- `index.html` + `spring-number.js` — main page
  - **FlexibleFolder** — a folder-resize gesture (web port of an Android view)
  - **Spring Number** — a per-digit spring roller
  - **Word Spring** — an iOS-inspired word-by-word text reveal
- `demos/` — standalone demos: springs (`slider`, `slider-fling`, `spring-euler-lab`), rope (`rope`, `pull-cord`, `lanyard`), liquid (`metaball-three-ways`, `liquid-connector-sdf`), UI motion (`grid`, `ios-app-open`, `sound-wave`)
- `assets/` — recordings

Render architecture (render-on-demand scheduler + fixed-step springs) inspired by [@_chenglou](https://x.com/_chenglou).

**Live:** https://aaaa-zhen.github.io/playground/
