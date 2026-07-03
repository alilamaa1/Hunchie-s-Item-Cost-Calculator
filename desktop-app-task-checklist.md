# Item Cost Calculator Desktop App Checklist

Desktop application implementation plan using the finished backend and the extracted Stitch UI reference.

## Rules

- [x] Keep the Stitch export as visual reference, not production logic.
- [x] Use React, Vite, Electron, and the existing local JSON backend.
- [x] Do not add inventory, supplier, accounting, labor, packaging, retail margin, cloud sync, or PDF/export features.
- [x] Keep the first screen as the real Home screen.
- [x] Use the preload API for renderer/backend communication.
- [x] Keep renderer code away from raw filesystem access.

## Phase A: Desktop Runtime

- [x] Add Vite React app entry.
- [x] Add Electron main process.
- [x] Add Electron preload bridge.
- [x] Load Vite dev server in development.
- [x] Load built `dist/index.html` in production.
- [x] Reuse backend initialization and service modules.

## Phase B: UI Recreation

- [x] Recreate Stitch-style sidebar navigation.
- [x] Recreate Stitch-style header/search area.
- [x] Recreate Home screen.
- [x] Recreate Raw Materials list/cards.
- [x] Add Raw Material form.
- [x] Raw Material detail view.
- [x] Edit Raw Material form.
- [x] Recreate Products list/cards.
- [x] Product detail view.
- [x] Product Builder screen.
- [x] Edit Product flow.
- [x] Settings screen.
- [x] Use the Stitch color palette and card language.
- [x] Replace inventory wording with raw material wording.

## Phase C: Backend Wiring

- [x] Initialize local data folder on app load.
- [x] Load raw materials from backend.
- [x] Save raw materials through backend.
- [x] Update raw materials through backend.
- [x] Delete raw materials through backend.
- [x] Load products from backend.
- [x] Save products through backend.
- [x] Update products through backend.
- [x] Delete products through backend.
- [x] Load settings from backend.
- [x] Calculate raw material drafts through backend.
- [x] Calculate product drafts through backend.
- [x] Surface backend validation errors in the UI.

## Phase D: Verification

- [x] Backend tests pass.
- [x] Production renderer build passes.
- [x] Desktop dev command is available.
- [ ] Manual visual verification in a running Electron window.

## Verification Blocker

- [ ] Electron runtime launch verification is blocked in this environment because Electron's Windows binary download repeatedly timed out or reset during install.
- [x] npm install completed for package dependencies.
- [x] `npm.cmd run test:backend` passes.
- [x] `npm.cmd run build` passes.
- [ ] After Electron binary download succeeds, run `npm.cmd run electron:dev` and complete the manual acceptance flow below.

## Manual Acceptance Flow

- [ ] Open the Windows desktop app.
- [ ] Add flour as a raw material.
- [ ] Add sugar as a raw material.
- [ ] Add eggs as a raw material.
- [ ] Create a cake product.
- [ ] Select flour, sugar, and eggs.
- [ ] Enter quantities in different units.
- [ ] See live ingredient costs.
- [ ] See total product cost.
- [ ] Close the app.
- [ ] Reopen it.
- [ ] See all data still saved correctly.
