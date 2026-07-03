# Item Cost Calculator Backend Task Checklist

Backend-only implementation plan from the PRD. UI/Stitch work is out of scope for this file. Each feature checklist includes its matching unit test checklist so we can implement one section at a time, run tests, and only mark completed work when it passes.

## Rules For Future Work

- [ ] Work on backend only until the Stitch UI is ready.
  - [ ] Unit test: backend modules can run without React screens.
- [ ] Implement one checkbox group per prompt unless the user asks for a bigger batch.
  - [ ] Unit test: related tests are scoped to the selected group.
- [ ] Every backend feature must have a unit test before it is marked complete.
  - [ ] Unit test: each completed group has a matching test file or test case.
- [ ] Use local JSON files as the source of truth.
  - [ ] Unit test: service state survives reloading from disk.
- [ ] Treat raw materials as cost references, not inventory stock.
  - [ ] Unit test: creating a product does not reduce any raw material quantity.
- [ ] Products must reference raw materials by hidden ID, not by name.
  - [ ] Unit test: renaming a raw material does not break existing product ingredients.

## Suggested Backend Structure

- [ ] Create src/backend/domain for pure business logic.
  - [ ] Unit test: domain imports do not require Electron, browser APIs, or UI code.
- [ ] Create src/backend/storage for local folder and JSON file access.
  - [ ] Unit test: storage runs against a temporary folder.
- [ ] Create src/backend/services for app operations.
  - [ ] Unit test: services combine validation, calculation, and storage correctly.
- [ ] Create src/backend/ipc for Electron IPC handlers.
  - [ ] Unit test: IPC handlers delegate to services and do not duplicate business logic.
- [ ] Create src/shared for shared types, constants, result objects, and error codes.
  - [ ] Unit test: shared types/constants can be imported from backend and renderer-safe code.

## Phase 1: Backend Test Foundation

### 1.1 Test Runner

- [x] Add a backend-friendly unit test runner.
  - [x] Unit test: a sample backend test passes.
- [x] Configure tests for a Node environment.
  - [x] Unit test: a test can create and remove a temporary folder.
- [x] Add a backend test script to package.json.
  - [x] Unit test: running the script discovers backend tests.
- [x] Add a clear naming convention for backend tests.
  - [x] Unit test: files matching the convention are executed.
- [x] Add test helpers for temporary app data folders.
  - [x] Unit test: helper creates an isolated folder for each test.

### 1.2 Result And Error Shape

- [x] Define success result shape: ok true with data.
  - [x] Unit test: successful service result matches the shape.
- [x] Define failure result shape: ok false with error.
  - [x] Unit test: failed service result matches the shape.
- [x] Define stable backend error codes.
  - [x] Unit test: validation errors include machine-readable codes.
- [x] Define human-readable messages for UI display later.
  - [x] Unit test: every error code maps to a non-empty message.
- [x] Expected user mistakes should return failure results, not uncaught exceptions.
  - [x] Unit test: invalid raw material input returns ok false.

## Phase 2: Local Data Folder

### 2.1 Folder Resolution

- [x] Resolve default folder to Desktop/Item Cost Calculator.
  - [x] Unit test: given a fake desktop path, resolver returns the correct app folder.
- [x] Keep folder resolution isolated in one function.
  - [x] Unit test: services can receive a custom folder path for tests.
- [x] Support future data folder override through settings or dependency injection.
  - [x] Unit test: override folder is used when provided.

### 2.2 First Launch Initialization

- [x] Create the app data folder if missing.
  - [x] Unit test: initialization creates the missing folder.
- [x] Create backups subfolder if missing.
  - [x] Unit test: initialization creates the backups folder.
- [x] Preserve existing app folder contents.
  - [x] Unit test: initialization does not delete unknown files.
- [x] Preserve existing data files.
  - [x] Unit test: initialization does not overwrite existing JSON files.

### 2.3 Required JSON Files

- [x] Create raw_materials.json with an empty array when missing.
  - [x] Unit test: missing raw materials file is created as an empty array.
- [x] Create products.json with an empty array when missing.
  - [x] Unit test: missing products file is created as an empty array.
- [x] Create settings.json with default settings when missing.
  - [x] Unit test: missing settings file contains currency.usdToLbp equal to 90000.
- [x] Verify all required files after initialization.
  - [x] Unit test: initialization succeeds only when all required paths exist.
- [x] Return a structured file error if initialization fails.
  - [x] Unit test: simulated write failure returns a permission/save error.

## Phase 3: Data Models

### 3.1 Raw Material Model

- [x] Define RawMaterial.id, example RM-0001.
  - [x] Unit test: missing ID fails saved-object validation.
- [x] Define RawMaterial.name.
  - [x] Unit test: missing name fails validation.
- [x] Define baseUnit: kg, g, L, ml, piece, pack, custom.
  - [x] Unit test: unsupported base unit fails validation.
- [x] Define purchaseQuantity and purchaseUnit.
  - [x] Unit test: missing purchase quantity or unit fails validation.
- [x] Define purchasePriceUSD and purchasePriceLBP.
  - [x] Unit test: normalized material has both purchase price fields.
- [x] Define costPerBaseUnitUSD and costPerBaseUnitLBP.
  - [x] Unit test: normalized material has both cost-per-unit fields.
- [x] Define optional customConversions for cup, tbsp, tsp.
  - [x] Unit test: material without custom conversions remains valid.
- [x] Define optional notes, defaulting to empty string.
  - [x] Unit test: omitted notes become an empty string.
- [x] Define createdAt and updatedAt ISO timestamps.
  - [x] Unit test: invalid timestamp fails validation.

### 3.2 Product Model

- [x] Define Product.id, example PR-0001.
  - [x] Unit test: missing ID fails saved-object validation.
- [x] Define Product.name.
  - [x] Unit test: missing name fails validation.
- [x] Define ingredients array.
  - [x] Unit test: missing ingredients array fails validation.
- [x] Define ingredient rawMaterialId.
  - [x] Unit test: ingredient without raw material ID fails validation.
- [x] Define ingredient quantity and unit.
  - [x] Unit test: quantity must be positive and unit must be supported.
- [x] Define ingredient convertedQuantity and convertedUnit.
  - [x] Unit test: saved ingredient includes converted amount and unit.
- [x] Define ingredient portionCostUSD and portionCostLBP.
  - [x] Unit test: saved ingredient includes both portion costs.
- [x] Define totalCostUSD and totalCostLBP.
  - [x] Unit test: saved product includes numeric total costs.
- [x] Define createdAt and updatedAt ISO timestamps.
  - [x] Unit test: invalid timestamp fails validation.

### 3.3 Settings Model

- [x] Define currency.usdToLbp.
  - [x] Unit test: settings without exchange rate fail validation.
- [x] Define dataFolder display value.
  - [x] Unit test: settings can store the visible data folder path.
- [x] Define appVersion.
  - [x] Unit test: settings can store app version.
- [x] Provide default settings.
  - [x] Unit test: default settings include usdToLbp 90000.

## Phase 4: ID Generation

### 4.1 Raw Material IDs

- [x] Generate first raw material ID as RM-0001.
  - [x] Unit test: empty raw material list generates RM-0001.
- [x] Generate next ID by scanning existing raw materials.
  - [x] Unit test: RM-0001 and RM-0002 generate RM-0003.
- [x] Ignore malformed IDs safely.
  - [x] Unit test: malformed IDs do not crash generation.
- [x] Preserve raw material ID on edit.
  - [x] Unit test: editing RM-0001 keeps RM-0001.

### 4.2 Product IDs

- [x] Generate first product ID as PR-0001.
  - [x] Unit test: empty product list generates PR-0001.
- [x] Generate next ID by scanning existing products.
  - [x] Unit test: PR-0001 and PR-0002 generate PR-0003.
- [x] Ignore malformed IDs safely.
  - [x] Unit test: malformed IDs do not crash generation.
- [x] Preserve product ID on edit.
  - [x] Unit test: editing PR-0001 keeps PR-0001.

## Phase 5: Currency Engine

### 5.1 Conversion

- [x] Convert USD to LBP using exchange rate.
  - [x] Unit test: 20 USD at 90000 becomes 1800000 LBP.
- [x] Convert LBP to USD using exchange rate.
  - [x] Unit test: 1800000 LBP at 90000 becomes 20 USD.
- [x] Read rate from settings/defaults instead of scattering hardcoded values.
  - [x] Unit test: custom test rate changes output.
- [x] Reject zero exchange rate.
  - [x] Unit test: rate 0 returns validation error.
- [x] Reject negative exchange rate.
  - [x] Unit test: rate -90000 returns validation error.

### 5.2 Rounding And Stored Values

- [x] Decide USD display rounding to 2 decimals.
  - [x] Unit test: display formatter rounds USD to 2 decimals.
- [x] Preserve enough internal precision for calculations.
  - [x] Unit test: portion cost can keep values like 0.192.
- [x] Round LBP display values to whole LBP.
  - [x] Unit test: LBP formatter returns whole-number display values.
- [x] Store money values as numbers, not formatted strings.
  - [x] Unit test: saved JSON uses numeric currency fields.

## Phase 6: Unit Conversion Engine

### 6.1 Supported Units

- [x] Support weight units kg and g.
  - [x] Unit test: both are recognized as weight units.
- [x] Support volume units L and ml.
  - [x] Unit test: both are recognized as volume units.
- [x] Support count units piece and pack.
  - [x] Unit test: both are recognized as count units.
- [x] Support custom measuring units cup, tbsp, tsp.
  - [x] Unit test: all three are recognized as custom conversion units.
- [x] Support custom as a base unit label.
  - [x] Unit test: material with custom base unit validates when required fields exist.

### 6.2 Weight Conversion

- [x] Convert kg to g.
  - [x] Unit test: 1 kg becomes 1000 g.
- [x] Convert g to kg.
  - [x] Unit test: 1000 g becomes 1 kg.
- [x] Convert weight ingredient to raw material base weight unit.
  - [x] Unit test: 240 g becomes 0.24 kg for base kg.
- [x] Reject weight-to-volume conversion without custom conversion.
  - [x] Unit test: g to ml returns missing conversion error.

### 6.3 Volume Conversion

- [x] Convert L to ml.
  - [x] Unit test: 1 L becomes 1000 ml.
- [x] Convert ml to L.
  - [x] Unit test: 1000 ml becomes 1 L.
- [x] Convert volume ingredient to raw material base volume unit.
  - [x] Unit test: 250 ml becomes 0.25 L for base L.
- [x] Reject volume-to-weight conversion without custom conversion.
  - [x] Unit test: ml to g returns missing conversion error.

### 6.4 Count Conversion

- [x] Convert piece to piece directly.
  - [x] Unit test: 3 piece remains 3 piece.
- [x] Convert pack to pack directly.
  - [x] Unit test: 2 pack remains 2 pack.
- [x] Reject piece to kg without custom conversion.
  - [x] Unit test: piece to kg returns missing conversion error.
- [x] Reject pack to piece unless a future rule exists.
  - [x] Unit test: pack to piece returns missing conversion error.

### 6.5 Custom Food Conversions

- [x] Store cup conversion per raw material.
  - [x] Unit test: flour 1 cup = 120 g validates.
- [x] Store tbsp conversion per raw material.
  - [x] Unit test: flour 1 tbsp = 8 g validates.
- [x] Store tsp conversion per raw material.
  - [x] Unit test: flour 1 tsp = 2.7 g validates.
- [x] Convert custom unit to base unit through target unit.
  - [x] Unit test: 2 cups flour with 1 cup = 120 g becomes 0.24 kg.
- [x] Reject custom unit when conversion is missing.
  - [x] Unit test: using cup without cup conversion returns missing conversion error.
- [x] Reject zero custom conversion amount.
  - [x] Unit test: 1 cup = 0 g fails validation.
- [x] Reject negative custom conversion amount.
  - [x] Unit test: 1 cup = -120 g fails validation.
- [x] Reject unsupported custom conversion target unit.
  - [x] Unit test: 1 cup = 120 unknownUnit fails validation.

## Phase 7: Raw Materials

### 7.1 Add Raw Material Validation

- [x] Reject empty name.
  - [x] Unit test: blank name returns RAW_MATERIAL_NAME_REQUIRED.
- [x] Trim name whitespace.
  - [x] Unit test: input with spaces saves as Flour.
- [x] Reject quantity equal to zero.
  - [x] Unit test: quantity 0 returns PURCHASE_QUANTITY_INVALID.
- [x] Reject negative quantity.
  - [x] Unit test: quantity -1 returns PURCHASE_QUANTITY_INVALID.
- [x] Reject missing price.
  - [x] Unit test: missing price returns PURCHASE_PRICE_REQUIRED.
- [x] Reject negative price.
  - [x] Unit test: price -20 returns PURCHASE_PRICE_INVALID.
- [x] Reject unsupported base unit.
  - [x] Unit test: base unit stone returns BASE_UNIT_UNSUPPORTED.
- [x] Reject unsupported purchase unit.
  - [x] Unit test: purchase unit boxful returns PURCHASE_UNIT_UNSUPPORTED.
- [x] Warn or fail on duplicate raw material name.
  - [x] Unit test: adding Flour twice returns duplicate name warning or error.
- [x] Compare duplicate names case-insensitively.
  - [x] Unit test: adding flour when Flour exists returns duplicate warning or error.

### 7.2 Raw Material Price Normalization

- [x] Normalize USD purchase price.
  - [x] Unit test: 20 USD stores purchasePriceUSD 20.
- [x] Calculate LBP from USD.
  - [x] Unit test: 20 USD stores purchasePriceLBP 1800000.
- [x] Normalize LBP purchase price.
  - [x] Unit test: 1800000 LBP stores purchasePriceLBP 1800000.
- [x] Calculate USD from LBP.
  - [x] Unit test: 1800000 LBP stores purchasePriceUSD 20.
- [x] Reject unsupported currency.
  - [x] Unit test: EUR returns CURRENCY_UNSUPPORTED.

### 7.3 Cost Per Base Unit

- [x] Calculate cost when purchase unit equals base unit.
  - [x] Unit test: 25 kg for 20 USD stores 0.8 USD per kg.
- [x] Calculate cost when purchase unit converts to base unit.
  - [x] Unit test: 25000 g for 20 USD, base kg, stores 0.8 USD per kg.
- [x] Calculate LBP cost per base unit.
  - [x] Unit test: 0.8 USD per kg stores 72000 LBP per kg.
- [x] Reject incompatible purchase unit.
  - [x] Unit test: purchase unit ml, base kg, returns conversion error.

### 7.4 Create Raw Material Service

- [x] Create material from valid input.
  - [x] Unit test: valid flour input returns a raw material object.
- [x] Assign new ID.
  - [x] Unit test: first material gets RM-0001.
- [x] Set createdAt and updatedAt.
  - [x] Unit test: created material has valid timestamps.
- [x] Save material to raw_materials.json.
  - [x] Unit test: file contains the new material after create.
- [x] Preserve existing materials.
  - [x] Unit test: adding sugar does not remove flour.

### 7.5 Update Raw Material Service

- [x] Load existing material by ID.
  - [x] Unit test: updating RM-0001 finds correct record.
- [x] Return not found for unknown ID.
  - [x] Unit test: RM-9999 returns RAW_MATERIAL_NOT_FOUND.
- [x] Preserve ID and createdAt.
  - [x] Unit test: edited material keeps ID and original creation time.
- [x] Update updatedAt.
  - [x] Unit test: edited material has newer update time.
- [x] Recalculate prices and cost per unit.
  - [x] Unit test: changing price from 20 USD to 25 USD updates cost per unit.
- [x] Rename without breaking product references.
  - [x] Unit test: product ingredient still references RM-0001 after rename.
- [x] Reject duplicate name against other materials.
  - [x] Unit test: renaming sugar to flour returns duplicate error.
- [x] Allow unchanged name on same record.
  - [x] Unit test: editing flour without changing name succeeds.

### 7.6 Raw Material Read Services

- [x] List all raw materials.
  - [x] Unit test: list returns all file records.
- [x] Sort list predictably.
  - [x] Unit test: returned order is stable.
- [x] Get material by ID.
  - [x] Unit test: detail returns RM-0001.
- [x] Return not found for missing material.
  - [x] Unit test: missing ID returns RAW_MATERIAL_NOT_FOUND.
- [x] Search raw materials by name.
  - [x] Unit test: flo returns Flour.
- [x] Search case-insensitively.
  - [x] Unit test: FLO returns Flour.

## Phase 8: Products

### 8.1 Product Input Cleanup

- [x] Trim product name.
  - [x] Unit test: input with spaces saves as Chocolate Cake.
- [x] Remove fully empty final ingredient row.
  - [x] Unit test: final blank row is ignored.
- [x] Keep partially filled rows for validation.
  - [x] Unit test: material with no quantity returns row error.
- [x] Normalize quantity to number.
  - [x] Unit test: string 2 becomes number 2.
- [x] Reject invalid number text.
  - [x] Unit test: abc returns quantity error.

### 8.2 Product Validation

- [x] Reject empty product name.
  - [x] Unit test: blank name returns PRODUCT_NAME_REQUIRED.
- [x] Reject product with no ingredients.
  - [x] Unit test: only empty rows returns PRODUCT_INGREDIENTS_REQUIRED.
- [x] Reject material with missing quantity.
  - [x] Unit test: flour with empty quantity returns INGREDIENT_QUANTITY_REQUIRED.
- [x] Reject quantity with missing material.
  - [x] Unit test: quantity 2 with no material returns INGREDIENT_MATERIAL_REQUIRED.
- [x] Reject zero quantity.
  - [x] Unit test: quantity 0 returns INGREDIENT_QUANTITY_INVALID.
- [x] Reject negative quantity.
  - [x] Unit test: quantity -2 returns INGREDIENT_QUANTITY_INVALID.
- [x] Reject unknown raw material ID.
  - [x] Unit test: RM-9999 returns missing raw material error.
- [x] Reject missing unit.
  - [x] Unit test: missing unit returns INGREDIENT_UNIT_REQUIRED.
- [x] Reject duplicate raw material.
  - [x] Unit test: flour selected twice returns duplicate ingredient error.
- [x] Detect duplicate by ID, not name.
  - [x] Unit test: renamed flour still counts as same raw material.
- [x] Reject missing conversion.
  - [x] Unit test: using cup without cup conversion returns missing conversion error.

### 8.3 Available Ingredient Units

- [x] Include base unit.
  - [x] Unit test: flour base kg includes kg.
- [x] Include compatible weight unit.
  - [x] Unit test: flour base kg includes g.
- [x] Include compatible volume unit.
  - [x] Unit test: milk base L includes ml.
- [x] Include configured custom units only.
  - [x] Unit test: flour with cup conversion includes cup.
- [x] Exclude missing custom units.
  - [x] Unit test: flour without tsp conversion excludes tsp.
- [x] Include count unit for count-based material.
  - [x] Unit test: eggs base piece includes piece.

### 8.4 Ingredient Portion Cost

- [x] Calculate cost in base unit.
  - [x] Unit test: 1 kg flour at 0.80 USD per kg costs 0.80 USD.
- [x] Calculate cost in smaller compatible unit.
  - [x] Unit test: 500 g flour costs 0.40 USD.
- [x] Calculate cost with cup conversion.
  - [x] Unit test: 2 cups flour with 1 cup = 120 g costs 0.192 USD.
- [x] Calculate cost with tbsp conversion.
  - [x] Unit test: 1 tbsp flour with 1 tbsp = 8 g costs 0.0064 USD.
- [x] Calculate cost with tsp conversion.
  - [x] Unit test: 1 tsp flour with 1 tsp = 2.7 g costs 0.00216 USD.
- [x] Calculate cost for pieces.
  - [x] Unit test: 3 pieces eggs at 0.15 USD per piece costs 0.45 USD.
- [x] Store converted quantity and unit.
  - [x] Unit test: 2 cups flour stores 0.24 kg.
- [x] Store USD and LBP portion costs.
  - [x] Unit test: calculated ingredient includes both portion cost fields.

### 8.5 Product Total

- [x] Sum USD portion costs.
  - [x] Unit test: ingredient USD costs sum to product USD total.
- [x] Sum LBP portion costs.
  - [x] Unit test: ingredient LBP costs sum to product LBP total.
- [x] Calculate LBP total from USD if needed.
  - [x] Unit test: 4.82 USD becomes 433800 LBP.
- [x] Store totals as numbers.
  - [x] Unit test: saved totals are numeric.
- [x] Recalculate using latest raw material costs.
  - [x] Unit test: changing flour price changes recalculated product total.

### 8.6 Create Product Service

- [x] Create product from valid input.
  - [x] Unit test: valid cake input returns product object.
- [x] Assign new product ID.
  - [x] Unit test: first product gets PR-0001.
- [x] Set createdAt and updatedAt.
  - [x] Unit test: created product has valid timestamps.
- [x] Save product to products.json.
  - [x] Unit test: file contains new product after create.
- [x] Preserve existing products.
  - [x] Unit test: adding cookies does not remove cake.

### 8.7 Update Product Service

- [x] Load existing product by ID.
  - [x] Unit test: updating PR-0001 finds correct record.
- [x] Return not found for unknown ID.
  - [x] Unit test: PR-9999 returns PRODUCT_NOT_FOUND.
- [x] Preserve ID and createdAt.
  - [x] Unit test: edited product keeps ID and original creation time.
- [x] Update updatedAt.
  - [x] Unit test: edited product has newer update time.
- [x] Recalculate ingredient and total costs on save.
  - [x] Unit test: changing ingredient quantity updates costs.
- [x] Use latest raw material prices.
  - [x] Unit test: product edit after material price change uses new price.
- [x] Save updated product to products.json.
  - [x] Unit test: file contains updated values.

### 8.8 Product Read Services

- [x] List all products.
  - [x] Unit test: list returns all file records.
- [x] Include ingredient count for card/list data.
  - [x] Unit test: cake with 3 ingredients reports count 3.
- [x] Get product by ID.
  - [x] Unit test: detail returns PR-0001.
- [x] Return not found for missing product.
  - [x] Unit test: missing ID returns PRODUCT_NOT_FOUND.
- [x] Search products by name.
  - [x] Unit test: cake returns Chocolate Cake.
- [x] Search case-insensitively.
  - [x] Unit test: CAKE returns Chocolate Cake.
- [x] Resolve current raw material names for detail view.
  - [x] Unit test: ingredient RM-0001 includes current material name.
- [x] Flag missing raw material references.
  - [x] Unit test: deleted material reference returns missing material warning.

## Phase 9: Delete And Missing References

### 9.1 Raw Material Delete

- [x] Add delete service after UI confirmation is planned.
  - [x] Unit test: delete removes selected raw material by ID.
- [x] Return not found for unknown raw material.
  - [x] Unit test: deleting RM-9999 returns RAW_MATERIAL_NOT_FOUND.
- [x] Choose policy for deleting materials used by products.
  - [x] Unit test: chosen policy is enforced.
- [x] If delete is allowed, show missing reference in products.
  - [x] Unit test: product detail reports missing material after deletion.
- [x] If delete is blocked, return dependency error.
  - [x] Unit test: material used by product returns RAW_MATERIAL_IN_USE.

### 9.2 Product Delete

- [x] Add product delete service after UI confirmation is planned.
  - [x] Unit test: delete removes selected product by ID.
- [x] Return not found for unknown product.
  - [x] Unit test: deleting PR-9999 returns PRODUCT_NOT_FOUND.
- [x] Preserve raw materials when product is deleted.
  - [x] Unit test: deleting cake does not delete flour, sugar, or eggs.

### 9.3 Missing Material Recovery

- [x] Detect missing material during product detail load.
  - [x] Unit test: missing material creates MISSING_RAW_MATERIAL warning.
- [x] Detect missing material during recalculation.
  - [x] Unit test: recalculation fails clearly when material is missing.
- [x] Support removing missing ingredient.
  - [x] Unit test: removing missing ingredient then saving succeeds.
- [x] Support replacing missing ingredient.
  - [x] Unit test: replacement recalculates product successfully.

## Phase 10: JSON Storage

### 10.1 Reading

- [x] Read raw materials JSON.
  - [x] Unit test: parsed raw material array is returned.
- [x] Read products JSON.
  - [x] Unit test: parsed product array is returned.
- [x] Read settings JSON.
  - [x] Unit test: parsed settings object is returned.
- [x] Return error for missing file.
  - [x] Unit test: missing file returns file missing error.
- [x] Return error for invalid JSON.
  - [x] Unit test: corrupted JSON returns invalid JSON error.
- [x] Do not erase corrupted data automatically.
  - [x] Unit test: corrupted file remains untouched after failed read.

### 10.2 Writing

- [x] Write raw materials JSON safely.
  - [x] Unit test: output is valid JSON array.
- [x] Write products JSON safely.
  - [x] Unit test: output is valid JSON array.
- [x] Write settings JSON safely.
  - [x] Unit test: output is valid JSON object.
- [x] Format JSON with indentation.
  - [x] Unit test: written file is human-readable.
- [x] Return save error on write failure.
  - [x] Unit test: simulated write failure returns file save error.

### 10.3 Backups

- [x] Create backup before overwriting raw_materials.json.
  - [x] Unit test: raw material update creates timestamped backup.
- [x] Create backup before overwriting products.json.
  - [x] Unit test: product update creates timestamped backup.
- [x] Create backup before overwriting settings.json if settings are editable.
  - [x] Unit test: settings update creates timestamped backup.
- [x] Use timestamped backup names.
  - [x] Unit test: name matches raw_materials_YYYY-MM-DD_HH-mm.json style.
- [x] Backup contains previous contents.
  - [x] Unit test: backup has old data, not new data.

## Phase 11: Settings Backend

### 11.1 Load Settings

- [x] Load settings from file.
  - [x] Unit test: settings service returns exchange rate.
- [x] Merge missing settings with defaults.
  - [x] Unit test: missing app version receives default value.
- [x] Reject invalid exchange rate.
  - [x] Unit test: negative rate returns validation error.
- [x] Return data folder display path.
  - [x] Unit test: settings include Desktop/Item Cost Calculator.

### 11.2 Update Settings

- [x] Support exchange rate update, even if UI keeps it fixed for Version 1.0.
  - [x] Unit test: valid exchange rate update saves.
- [x] Return warning when exchange rate changes.
  - [x] Unit test: changed rate returns affected-values warning.
- [x] Use updated rate for future conversions.
  - [x] Unit test: currency conversion uses new rate after save.
- [x] Preserve data folder setting.
  - [x] Unit test: exchange rate update does not erase data folder.

## Phase 12: Electron Backend Boundary

### 12.1 IPC Channels

- [x] Add initialize app channel.
  - [x] Unit test: handler calls initialization service.
- [x] Add list/create/update/detail raw material channels.
  - [x] Unit test: each handler passes input to the matching service.
- [x] Add delete raw material channel if delete is included.
  - [x] Unit test: handler passes ID to delete service.
- [x] Add list/create/update/detail product channels.
  - [x] Unit test: each handler passes input to the matching service.
- [x] Add delete product channel if delete is included.
  - [x] Unit test: handler passes ID to delete service.
- [x] Add load/update settings channels.
  - [x] Unit test: handlers call settings service.

### 12.2 Preload API

- [x] Expose safe backend methods through preload.
  - [x] Unit test: preload exposes only approved app methods.
- [x] Do not expose generic filesystem access to renderer.
  - [x] Unit test: API has no generic readFile or writeFile method.
- [x] Return promises from async calls.
  - [x] Unit test: exposed methods return promises.
- [x] Keep API names stable for future Stitch UI integration.
  - [x] Unit test: expected API keys exist.

### 12.3 Electron Security

- [x] Enable context isolation.
  - [x] Unit/config test: window config has contextIsolation true.
- [x] Disable node integration in renderer.
  - [x] Unit/config test: window config has nodeIntegration false.
- [x] Validate renderer input again in backend services.
  - [x] Unit test: invalid IPC input is rejected by backend validation.

## Phase 13: Live Draft Calculations

### 13.1 Product Draft Calculation

- [x] Add calculate-product-draft service that does not save.
  - [x] Unit test: valid draft returns totals without writing file.
- [x] Reuse save-product calculation engine.
  - [x] Unit test: draft and saved product totals match.
- [x] Return row-level validation errors.
  - [x] Unit test: missing conversion error includes ingredient row index.
- [x] Ignore fully empty final row.
  - [x] Unit test: empty final row does not block draft calculation.
- [x] Detect duplicate ingredients in draft.
  - [x] Unit test: duplicate flour rows return duplicate error.

### 13.2 Raw Material Draft Calculation

- [x] Add calculate-raw-material-draft service that does not save.
  - [x] Unit test: valid draft returns price and cost-per-unit calculations without writing file.
- [x] Reuse create/update raw material normalization logic.
  - [x] Unit test: draft and saved material calculations match.
- [x] Return validation errors for incomplete drafts.
  - [x] Unit test: missing quantity returns validation error without writing file.

## Phase 14: Full Backend Scenarios

### 14.1 Happy Path

- [x] Initialize app data folder and files.
  - [x] Unit test: required files exist after initialization.
- [x] Add flour.
  - [x] Unit test: flour saves with correct cost per kg.
- [x] Add sugar.
  - [x] Unit test: sugar saves with correct cost per base unit.
- [x] Add eggs.
  - [x] Unit test: eggs save with correct cost per piece.
- [x] Create cake product.
  - [x] Unit test: cake saves with flour, sugar, and eggs.
- [x] Use mixed units in cake.
  - [x] Unit test: cups, grams, and pieces all calculate correctly.
- [x] Verify ingredient portion costs.
  - [x] Unit test: each ingredient has positive USD and LBP portion cost.
- [x] Verify total cost.
  - [x] Unit test: total equals sum of portion costs.
- [x] Simulate close and reopen.
  - [x] Unit test: new service instance loads saved data from disk.
- [x] Verify ID references still work after reload.
  - [x] Unit test: cake ingredients resolve current raw material records by ID.

### 14.2 Break Tests

- [x] Try saving raw material with empty name.
  - [x] Unit test: save fails and file is unchanged.
- [x] Try saving raw material with negative quantity.
  - [x] Unit test: save fails and file is unchanged.
- [x] Try saving product with duplicate raw material.
  - [x] Unit test: save fails and file is unchanged.
- [x] Try saving product with missing conversion.
  - [x] Unit test: save fails and file is unchanged.
- [x] Try loading corrupted raw materials JSON.
  - [x] Unit test: invalid JSON error is returned and file is not overwritten.
- [x] Try saving when storage write fails.
  - [x] Unit test: file save error is returned.

## Phase 15: Implementation Order

- [x] Step 1: Test runner and backend test structure.
  - [x] Unit test: sample backend test passes.
- [x] Step 2: Shared result helpers, error codes, and constants.
  - [x] Unit test: result helpers and error messages pass.
- [x] Step 3: Data folder initialization.
  - [x] Unit test: folders and required files are created.
- [x] Step 4: JSON read/write storage.
  - [x] Unit test: temp-folder read/write tests pass.
- [x] Step 5: Settings defaults and currency engine.
  - [x] Unit test: USD/LBP conversion tests pass.
- [x] Step 6: Unit conversion engine.
  - [x] Unit test: weight, volume, count, and custom conversion tests pass.
- [x] Step 7: Raw material validation and calculations.
  - [x] Unit test: raw material validation and cost-per-unit tests pass.
- [x] Step 8: Raw material services.
  - [x] Unit test: create, list, detail, update, and search tests pass.
- [x] Step 9: Product validation and calculations.
  - [x] Unit test: ingredient and total cost tests pass.
- [x] Step 10: Product services.
  - [x] Unit test: create, list, detail, update, and search tests pass.
- [x] Step 11: Live draft calculations.
  - [x] Unit test: draft calculations match saved calculations.
- [x] Step 12: Backups.
  - [x] Unit test: backup tests pass.
- [x] Step 13: Delete and missing-reference behavior.
  - [x] Unit test: delete policy and missing reference tests pass.
- [x] Step 14: Electron IPC and preload API.
  - [x] Unit test: IPC/preload contract tests pass.
- [x] Step 15: Full backend scenario tests.
  - [x] Unit test: full success criteria scenario passes.

## Prompt Template For Future Coding Steps

Implement the next unchecked backend task group from outputs/backend-task-checklist.md.

Scope:
- Only implement the selected group and the unit tests directly attached to it.
- Do not work on UI.
- Keep the code testable without React screens.
- Use the existing project structure and patterns if they exist.
- After coding, run the related tests.
- If tests pass, mark the implemented checklist items as complete in outputs/backend-task-checklist.md.
- If tests fail, fix the code or explain the blocker clearly.

## Definition Of Done For Each Group

- [ ] Feature behavior is implemented.
  - [ ] Unit test: related feature test passes.
- [ ] Attached unit tests are implemented.
  - [ ] Unit test: test file exists for the group.
- [ ] Attached unit tests pass.
  - [ ] Unit test: selected group test command exits successfully.
- [ ] Existing related tests still pass.
  - [ ] Unit test: nearby backend tests still pass.
- [ ] No UI work is mixed in.
  - [ ] Unit test: backend test does not import React page components.
- [ ] Local JSON behavior is preserved.
  - [ ] Unit test: saved data can be reloaded.
- [ ] Errors are structured for future UI display.
  - [ ] Unit test: failures include code and message.
- [ ] Checklist is updated only after passing tests.
  - [ ] Unit test: completed checkboxes correspond to passing implementation work.
