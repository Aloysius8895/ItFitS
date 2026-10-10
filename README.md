# Fitted Mobile

A React Native + Expo + TypeScript prototype based on the original **Fitted App** design in `references/html/`. The app keeps the original FIT, COMPARE, TRY ON, BODY, and REVIEW flow, typography, colors, charts, and English copy.

## Run

Install Node.js and npm, then run from the repository root:

```powershell
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone. Your phone and computer should be on the same network. For a browser preview, run `npm run web` from `mobile/`.

If `localhost:8000` shows **Directory listing**, that is the old HTML file server. Start Expo from `mobile/` and open the URL shown in its terminal, usually `http://localhost:8081`.

On Windows, Chrome Device Mode can preview an iPhone 17 Pro Max sized viewport: open the Expo web app, press `F12`, then `Ctrl+Shift+M`, and add a custom `440 × 956` device with DPR `3`. This previews screen size only. A native iOS Simulator requires macOS; an iPhone with Expo Go can test the iOS app on Windows.

## Project structure

| Path | Purpose |
| --- | --- |
| `mobile/src/app/` | Five screens and navigation |
| `mobile/src/features/catalog/` | Demo products and size charts |
| `mobile/src/features/fit/` | Fit scoring, chart, and original demo data |
| `mobile/src/features/state/` | Local app state |
| `mobile/src/features/reviews/` | Review types |
| `mobile/src/features/ui/` | Shared design components |
| `mobile/assets/` | Fonts and Expo assets |
| `references/html/` | Unmodified original HTML prototypes |
| `references/screenshots/` and `references/uploads/` | Original visual references |
| `docs/` | Design and future integration notes |

## Demo behavior

For the default 92 cm chest profile, the merino sweater recommends **M** with a fit score of **91**. Choosing **XL** keeps M as the recommendation while the compare and try-on screens show the selected XL fit as oversized. The selected size never silently changes back to the recommendation.

Fit predictions are local demo calculations. The try-on photo uses a size-dependent silhouette overlay, not an AI-generated garment image. Reviews are stored on the device and do not train a model yet. Photos returned by the system picker may use a temporary cache path; select the photo again if it disappears after restarting the app.

## Camera

In Expo Go, open **TRY ON → TAKE PHOTO** (or **RETAKE**). Allow camera access, switch between front and back cameras if needed, then take a photo. Choose **USE THIS PHOTO** to update the TRY ON preview, **RETAKE** to try again, or **CANCEL** to keep your previous photo. **FROM ALBUM** still opens the photo picker.

Captured photos also use the app cache and may need to be taken again if that cache is cleared. Actual camera capture and permission prompts must be checked on a physical phone. Web camera access requires a secure context such as localhost or HTTPS; an HTTP LAN address may be blocked by the browser.
