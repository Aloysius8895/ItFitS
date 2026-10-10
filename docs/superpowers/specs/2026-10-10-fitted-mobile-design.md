# Fitted Mobile Prototype Design

## Goal

Build a runnable React Native + Expo + TypeScript prototype based on the original `references/html/Fitted App.dc.html` design. Keep its FIT, COMPARE, TRY ON, BODY, and REVIEW screens, English copy, typography, palette, large orange calls to action, charts, and bottom navigation.

## Core behavior

- The recommended size and selected size are separate. If the app recommends M and the user selects XL, comparison and try-on show XL as oversized.
- Local sample products, garment measurements, fit scores, and reviews are demo data. The image overlay is a visual guide, not an AI-generated try-on result.
- Body measurements can be edited and stored locally. Reviews are stored locally and do not train a model yet.

## Screens and data flow

1. **FIT:** Show the recommended size, score curve by size, evidence rows, and the large COMPARE call to action.
2. **COMPARE:** Select XS–XL; show the original overall-feel gauge, body-zone ease rows, and size-specific note.
3. **TRY ON:** Choose or take a photo; show the selected size, a size-dependent silhouette overlay, fit zones, and a clear demo label.
4. **BODY:** Show height, weight, similar-body size distribution, and measurements. Tapping values opens an editor.
5. **REVIEW:** Select a demo purchase, rate fit from 1 to 9, mark trouble spots, and view feedback history.

## Structure

`mobile/src/app/` contains screens and routing. `mobile/src/features/` contains product data, fit calculations, state, reviews, and shared design components. `mobile/assets/` contains fonts and Expo assets. `references/` keeps the unmodified original HTML and screenshots.

## Verification

Validate measurements, show a useful empty photo state, and keep recommendation separate from selection. Run tests for the M recommendation and XL oversized case, TypeScript, lint, Expo Doctor, and a web export.
