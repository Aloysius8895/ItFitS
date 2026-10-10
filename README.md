# ItFitS

A React Native + Expo + TypeScript app based on the original **Fitted App** design in `references/html/`, backed by the FastAPI service in `model/backend/`. The app keeps the original FIT, COMPARE, TRY ON, BODY, and REVIEW flow, typography, colors, charts, and English copy.

## Run

Start the backend first (one terminal, from the repository root):

```powershell
cd model
py -3.13 -m venv .venv                            # first time only
.venv\Scripts\pip install -r requirements.txt     # first time only
.venv\Scripts\uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` lets a phone on the same Wi-Fi reach it; allow Python through Windows Firewall when asked. To render AI try-on images, put `GEMINI_API_KEY=...` (or `GRAFILAB_API_KEY=...`) in `model/.env`; without a key everything else works and TRY ON shows the size silhouette.

Then start the app (second terminal):

```powershell
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone. Your phone and computer should be on the same network. For a browser preview, run `npm run web` from `mobile/`.

The app finds the backend automatically: in the browser it uses the same host on port 8000; in Expo Go it uses your computer's LAN address from the Expo dev server. To point it elsewhere, set `EXPO_PUBLIC_API_URL=http://<ip>:8000` before `npx expo start`. The header shows **MODEL ONLINE** or **OFFLINE**. When offline, the app falls back to an on-device size-chart calculation.

The old HTML frontend in `model/frontend/` is no longer used.

### Mock selling platform

`mock/` is a second Expo app: a marketplace ("Mock Store") rebuilt from the HTML mock on the `Mock_Sell_With_transition` branch. The original pages are kept in `mock/reference/`; the branch itself is not merged, because it does not contain `mobile/`. Product photos are in `mock/product/`. Run each app in its own terminal, from the repository root (run `npm install` in `mock/` once first):

```powershell
npm run mock    # Mock Store (Expo) on port 8082
npm run app     # ItFitS (Expo) on port 8081
```

Open the Mock Store in Expo Go (scan its QR code), go Home → a product → the yellow **TRY ON** button (or the green "Try on · Check my size" badge on the photo). Expo Go switches to ItFitS on its TRY ON screen (`exp://<computer IP>:8081/--/try-on`), with the product photo already set as the garment and the size chosen in the store selected. Both dev servers must be running on the same computer. In a browser (press `w` in both terminals) the same button opens `http://<host>:8081/try-on`. Set `EXPO_PUBLIC_ITFITS_PORT` if ItFitS runs on another port.

### Deployed on Vercel

| Project | URL | Deploy from |
| --- | --- | --- |
| `itfits`: ItFitS web app + backend (`/api`, `api/index.py`) | https://itfits-five.vercel.app | repository root |
| `itfits-mock`: Mock Store web app | https://itfits-mock.vercel.app | `mock/` |

Both live in the `chill-chill` Vercel team. To redeploy after changes (Vercel CLI, logged in with `npx vercel login`):

```powershell
npx vercel deploy --prod                 # from the repository root: itfits
cd mock; npx vercel deploy --prod        # Mock Store
```

Settings: `GRAFILAB_API_KEY` (secret) on `itfits`; `EXPO_PUBLIC_ITFITS_URL=https://itfits-five.vercel.app` on `itfits-mock` (used at build time for the TRY ON button). On Vercel, reviews are stored in `/tmp` and are lost when the function restarts, and automatic retraining is off. Only the web versions are deployed; Expo Go still runs against the local dev servers.

On Windows, Chrome Device Mode can preview an iPhone 17 Pro Max sized viewport: open the Expo web app, press `F12`, then `Ctrl+Shift+M`, and add a custom `440 × 956` device with DPR `3`. This previews screen size only. A native iOS Simulator requires macOS; an iPhone with Expo Go can test the iOS app on Windows.

## Project structure

| Path | Purpose |
| --- | --- |
| `mobile/src/app/` | Five tabs, camera, and the add/edit item screen (`product.tsx`) |
| `mobile/src/features/api/` | Backend client and photo upload resizing |
| `mobile/src/features/catalog/` | Demo products and size-chart types |
| `mobile/src/features/fit/` | `useFit` (backend fit results), offline fallback, chart |
| `mobile/src/features/state/` | App state: profile, custom items, purchases, reviews, backend status |
| `mobile/src/features/reviews/` | Review types |
| `mobile/src/features/ui/` | Shared design components |
| `mobile/assets/` | Fonts and Expo assets |
| `references/html/` | Unmodified original HTML prototypes |
| `references/screenshots/` and `references/uploads/` | Original visual references |
| `model/backend/` | FastAPI: `app_routes.py` (mobile API), `app_fit.py`, `similar.py`, `tryon.py`, `feedback.py` |
| `ruler/` | Size charts, one CSV per chart (height/weight ranges or garment measurements). The app uses the first chart. See `ruler/README.md` |
| `model/models/` | Trained fit model and metadata |
| `data/` | Merged review data (`flowfit_integrated.csv`, used for similar bodies) and the training package (`data/training/`, not in git) |
| `docs/` | Design and future integration notes |

## Backend API (`/api/app`)

| Endpoint | Method | Used by |
| --- | --- | --- |
| `/charts` | GET | App start: size charts read from `ruler/` (re-read on every call, so no restart is needed) |
| `/fit` | POST | FIT, COMPARE, BODY: per-size verdict (too tight / fitted / relaxed / oversize), score, zone ease, recommendation by fit preference, similar-body feedback |
| `/tryon` | POST | TRY ON: AI image for the selected size (Grafilab / Gemini), drawn only from the garment photo uploaded on TRY ON (required) |
| `/purchases` | POST | TRY ON → I BOUGHT SIZE: stores the prediction for later comparison |
| `/reviews` | POST | REVIEW: 1–9 rating (1–3 too small, 4–6 fits, 7–9 too big) + trouble spots; triggers retraining when enough reviews disagree |
| `/status` | GET | Header and REVIEW: model version, accuracy, retrain progress |

## Men's and women's data

All labelled fit reviews in the merged data (Rent the Runway, ModCloth) come from women, so they cannot be resampled into balance. The fit model's nudge and the similar-body chart are only used for profiles set to **WOMAN**. Other profiles get a size-chart-only verdict with **LOW** confidence, and the app says so. Every review records the profile's sex, and accuracy is tracked per sex, so men's reviews can be weighted up when the model is retrained.

## App flow

1. **BODY:** height, weight, chest, waist, hip, shoulder, optional age; who you size for (woman / man); fit preference (fitted / regular / relaxed / oversize).
2. **FIT → + ADD ITEM:** product photo, category, cut, fabric stretch, and the brand's size chart in cm.
3. **FIT / COMPARE:** the recommended size, a score and verdict for every size, and per-zone ease. Picking another size never silently changes the recommendation.
4. **TRY ON:** take or choose a full-body photo, then **GENERATE AI TRY-ON** for the selected size. The image is labelled as a reference only.
5. **I BOUGHT SIZE …** → **REVIEW:** rate the fit and mark trouble spots. The backend compares the review with its prediction and retrains the fit model when at least 20 pending reviews exist and 20% disagree. The new model replaces the old one only if hold-out accuracy does not drop by more than 3 points.

For the default profile (92 cm chest, regular preference) the merino sweater recommends **M**; **XL** shows as oversize. Sample purchases in REVIEW are marked SAMPLE and stay on the device. Photos returned by the system picker may use a temporary cache path; select the photo again if it disappears after restarting the app.

## Camera

In Expo Go, open **TRY ON → TAKE PHOTO** (or **RETAKE**). Allow camera access, switch between front and back cameras if needed, then take a photo. Choose **USE THIS PHOTO** to update the TRY ON preview, **RETAKE** to try again, or **CANCEL** to keep your previous photo. **FROM ALBUM** still opens the photo picker.

Captured photos also use the app cache and may need to be taken again if that cache is cleared. Actual camera capture and permission prompts must be checked on a physical phone. Web camera access requires a secure context such as localhost or HTTPS; an HTTP LAN address may be blocked by the browser.
