# Camera Integration Plan

Goal: Integrate origin/camera into the existing English Fitted TRY ON flow.

Keep the five tabs, original typography and colors, album picker, body measurements and selected size. The camera route is full-screen capture rather than a sixth tab.

- [x] Merge the camera branch and install its SDK 57 camera dependency.
- [x] Connect TAKE PHOTO and RETAKE to /camera. Confirming writes the photo URI to the shared profile and returns to TRY ON; cancelling preserves the old photo.
- [x] Mount preview only while focused. Changing lenses waits for readiness. Refresh permissions after returning from Settings.
- [x] Allow cancellation during photo review and show English permission errors.
- [x] Run lint, typecheck, tests and web/native bundle exports. All passed; two existing fit tests passed.
- [ ] Commit the merge and integration and push main.

Device checks still required: allow/deny camera permission, front/back capture, retake, confirm, cancel with an existing photo, reopen from TRY ON, return from Settings, album selection and unchanged size/profile values.
