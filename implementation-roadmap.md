# Item Cost Calculator Implementation Roadmap

This document combines the supplied backend checklist with the provided Google Stitch UI export in `artisancalc.zip`. The UI export has been extracted to `_artisancalc_ui/` for reference only.

The goal is a real Windows desktop app using React, Vite, Electron, local JSON storage, and backend unit tests.

## Source Inputs

- `backend-task-checklist.md`: authoritative backend implementation checklist.
- `artisancalc.zip`: Stitch/Vite React UI export.
- Project brief: Item Cost Calculator is a production-cost calculator, not inventory, accounting, supplier, warehouse, or stock management software.

## UI Reference Summary

The Stitch export is a mock-data React app named `ArtisanCalc`. It provides useful visual direction but should not be treated as production app logic.

Keep these UI decisions:

- Left fixed sidebar on desktop, mobile drawer on small screens.
- Main sections: Home, Raw Materials, Products, Settings, and Product Builder.
- Warm off-white page background: `#faf9f6`.
- Main accent family: `#914853`, `#74313c`, `#d27d88`.
- Supporting neutrals: `#1a1c1a`, `#615e57`, `#867274`, `#efeeeb`, `#d8c1c2`.
- Card-based operational layout with soft shadows, clear spacing, and lucide icons.
- Home screen as the first screen, not a marketing page.
- Raw material cards showing name, base unit, USD cost, and LBP cost.
- Product builder with editable product name, ingredient rows, live costs, and sticky cost summary.
- Settings screen showing exchange rate and app data location.

Replace these UI behaviors:

- Replace localStorage with Electron IPC calls to the backend services.
- Replace demo initial data with empty JSON files on first launch.
- Replace `Inventory` language with `Raw Materials` because this app does not track stock.
- Remove supplier, stock, vendor, yield percentage, labor multiplier, packaging, retail margin, and export/spec-sheet behavior unless explicitly requested later.
- Replace demo IDs like `mat-...` and `prod-...` with hidden backend IDs like `RM-0001` and `PR-0001`.
- Replace name-based product ingredient lookup with hidden raw material ID references.
- Replace permissive unit fallback calculations with strict unit conversion errors.
- Replace UI-only validation with backend validation results.

## App Scope

The app answers one question:

> How much does this item cost me to produce?

Included:

- Raw material cost references.
- Product ingredient quantities.
- USD and LBP cost calculation.
- Fixed default exchange rate for Version 1.0: `1 USD = 90,000 LBP`.
- Local JSON persistence in `Desktop/Item Cost Calculator`.
- Data reload after closing and reopening the app.

Excluded:

- Inventory stock tracking.
- Supplier management.
- Purchase orders.
- Expiry dates.
- Accounting.
- Cloud sync.
- PDF/export features.
- Retail pricing/margins unless requested later.

## Target Architecture

```text
src/
  backend/
    domain/       Pure calculation, validation, ID, and conversion logic
    storage/      Data folder, JSON read/write, backups
    services/     App operations for raw materials, products, settings
    ipc/          Electron IPC handler registration
  electron/
    main/         Electron main process bootstrapping
    preload/      Safe renderer bridge
  renderer/
    components/   Recreated Stitch-style UI components
    views/        Home, raw materials, products, builder, settings
    app/          App state, routing, backend API hooks
  shared/
    result.mjs    Shared success/failure result helpers
    errors.mjs    Error codes and messages
    constants.mjs Shared units, currencies, defaults
tests/
  backend/
    helpers/      Temporary app data helpers
```

## Backend Implementation Order

Follow `backend-task-checklist.md` and only mark items complete when the code and attached tests pass.

1. Backend test foundation.
2. Shared result helpers, error codes, and constants.
3. Local data folder initialization.
4. JSON read/write storage.
5. Settings defaults and currency engine.
6. Unit conversion engine.
7. Raw material validation and cost normalization.
8. Raw material services.
9. Product validation and cost calculation.
10. Product services.
11. Live draft calculation services.
12. Backups.
13. Delete and missing-reference behavior.
14. Electron IPC and preload API.
15. Full happy-path and break scenario tests.

## UI Implementation Order

Start UI wiring only after the backend service contracts are stable enough for IPC.

1. Recreate app shell from the Stitch export: sidebar, header, main view area, responsive drawer.
2. Home screen:
   - Show counts from backend list calls.
   - Show direct actions for adding raw materials and creating products.
3. Raw Materials list:
   - Empty state with centered add action.
   - Card grid when data exists.
   - Cards open a detail view.
4. Add/Edit Raw Material:
   - Name.
   - Base unit.
   - Bought quantity and purchase unit.
   - Bought price and purchase currency.
   - Optional cup/tbsp/tsp conversions.
   - Optional notes.
   - Live draft cost preview when backend draft service exists.
5. Raw Material detail:
   - Read-only cost reference.
   - USD and LBP cost per base unit.
   - Edit action opens edit page.
6. Products list:
   - Empty state with create action.
   - Product cards show name, ingredient count, USD total, and LBP total.
7. Product Builder:
   - Product name at top.
   - First empty ingredient row appears automatically.
   - Filled row creates another empty row.
   - Final empty row ignored on save.
   - Duplicate raw materials blocked or highlighted.
   - Unit dropdown depends on selected raw material.
   - Live draft calculation from backend.
8. Product detail:
   - Read-only ingredient breakdown.
   - Current raw material names resolved by ID.
   - Missing references shown clearly.
9. Settings:
   - Exchange rate display.
   - Data folder display.
   - Optional exchange-rate editing with warning if enabled.

## Data Files

On first launch, create:

```text
Desktop/Item Cost Calculator/
  raw_materials.json
  products.json
  settings.json
  backups/
```

All app data should be read from and written to these JSON files. Money values are stored as numbers, never formatted strings.

## Key Backend Rules

- Raw materials are cost references, not stock.
- Product ingredients reference raw materials by hidden ID.
- Product costs recalculate from the latest raw material cost in Version 1.0.
- Custom cup/tbsp/tsp conversions are raw-material-specific.
- Missing conversions return clear structured errors.
- Expected user mistakes return `{ ok: false, error }`, not uncaught exceptions.
- Invalid or corrupted JSON must not be erased automatically.

## Acceptance Flow

The first full app milestone is complete when a user can:

1. Open the desktop app.
2. Add flour as a raw material.
3. Add sugar as a raw material.
4. Add eggs as a raw material.
5. Create a cake product.
6. Select flour, sugar, and eggs.
7. Enter quantities in different units.
8. See live ingredient costs.
9. See total product cost in USD and LBP.
10. Close the app.
11. Reopen it.
12. See all data still saved correctly.

## Current Start Point

Begin with backend phases 1.1 and 1.2:

- Add a backend-friendly test runner.
- Add temporary data folder test helpers.
- Add shared result helpers.
- Add stable error codes and UI-ready messages.
- Add a small backend validation surface proving expected user mistakes return failure results.

