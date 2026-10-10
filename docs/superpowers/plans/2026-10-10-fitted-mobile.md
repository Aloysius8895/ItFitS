# Fitted Mobile Implementation Plan

> **For agentic workers:** Execute these checked steps inline and verify each deliverable.

**Goal:** Build a runnable React Native + Expo + TypeScript shopping prototype with body profile, size comparison, visual try on, and reviews.

**Architecture:** Expo Router screens use feature modules for sample products, profile state, fit calculations, try on rendering, and review state. Local persistence keeps the prototype usable across restarts.

**Tech Stack:** React Native, Expo, Expo Router, TypeScript.

## Global Constraints

- Keep recommended size separate from selected size.
- Label all predictions and try on visuals as demonstrations.
- Keep the original HTML prototype in references.

---

### Task 1: Scaffold and archive

- [x] Create an Expo TypeScript app in `mobile/`.
- [x] Move original HTML, scripts, and images into `references/`.
- [x] Add root instructions for running the app.

### Task 2: Fit data and state

- [x] Define product, size, body profile, and review types in focused feature folders.
- [x] Create deterministic sample size scoring from body measurements and garment measurements.
- [x] Persist profile, selected size, and reviews locally.

### Task 3: Screens

- [x] Build product, fit, try on, body profile, and review screens.
- [x] Make a user's selected size drive fit copy and garment silhouette.
- [x] Show demo labels, form validation, and empty photo state.

### Task 4: Verification

- [x] Run TypeScript, ESLint, Expo Doctor, and web export checks.
- [x] Test the XL oversized case with focused tests and verify the review flow compiles and exports.
