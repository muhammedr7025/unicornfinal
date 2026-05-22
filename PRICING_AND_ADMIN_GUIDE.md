# Unicorn Valves — Complete Pricing Relations & Admin Features Guide

## TABLE OF CONTENTS
1. [Product Component Architecture](#product-component-architecture)
2. [Pricing Relations & Component Connections](#pricing-relations--component-connections)
3. [Quote Generation Workflow](#quote-generation-workflow)
4. [Cost Calculation Pipeline](#cost-calculation-pipeline)
5. [Final Price Calculation (10-Step Chain)](#final-price-calculation-10-step-chain)
6. [Admin Features Comprehensive Guide](#admin-features-comprehensive-guide)
7. [Data Flow Diagrams](#data-flow-diagrams)

---

## PRODUCT COMPONENT ARCHITECTURE

A **valve product** is constructed from 12 components + optional accessories:

### **Manufactured Components (Weight-Based)**
These are components purchased by weight and include material costs + machining.

| Component | Basis | Material | Lookup Table | Notes |
|-----------|-------|----------|--------------|-------|
| **Body** | Weight | Body/Bonnet material | `body_weights` | Cost = weight × price_per_kg + body_machining |
| **Bonnet** | Weight | Body/Bonnet material | `bonnet_weights` | Cost = weight × price_per_kg + bonnet_machining |
| **Plug** | Weight | Plug material | `plug_weights` | Cost = weight × price_per_kg + plug_machining |
| **Seat** | Weight | Seat material | `seat_weights` | Cost = weight × price_per_kg + seat_machining |
| **Stem** | Weight | Stem material | Stem weight lookup + fixed price | Cost = (weight × price_per_kg) OR fixed_price depending on config |
| **Cage** | Weight | Cage material | `cage_weights` | Cost = (weight × price_per_kg + cage_machining) × cage_quantity (1-3) |
| **Seal Ring** | Fixed Price | N/A | `seal_ring_prices` | Cost = fixed_price (no weight) |
| **Pilot Plug** | Weight | Plug material | `pilot_plug_weights` | Cost = weight × plug_material_price (optional) |

### **Accessory Components (Fixed Price)**
These are bought-out items with fixed pricing.

| Component | Basis | Lookup Table | Notes |
|-----------|-------|--------------|-------|
| **Actuator** | Fixed Price | `actuator_models` | Optional; lookup by type → series → model → standard/special |
| **Handwheel** | Fixed Price | `handwheel_prices` | Optional; lookup by type → series → model → standard/special |
| **Tubing** | Custom/Preset | `tubing_presets` | Optional; per-product line items |
| **Testing** | Custom/Preset | `testing_presets` | Optional; per-product line items |
| **Accessories** | Custom | `product_accessories` | Per-product line items with unit_price × quantity |

---

## PRICING RELATIONS & COMPONENT CONNECTIONS

### **Master Data Dependencies**

```
VALVE CONFIGURATION SELECTION
├── Series (series table)
│   ├── series_id → links to all weight/price tables
│   ├── has_cage (boolean) → determines if cage component visible
│   └── has_seal_ring (boolean) → determines if seal ring visible
├── Size (e.g., "DN50", "2 inch")
│   └── Used in weight lookups (body, bonnet, plug, etc.)
├── Rating (e.g., "Class 150", "PN16")
│   └── Used in weight lookups
├── End Connect Type (e.g., "Flanged", "Screwed")
│   └── Links to body_weights AND body_machining lookup
├── Bonnet Type (e.g., "Bolted", "Welded")
│   └── Links to bonnet_weights AND bonnet_machining lookup
└── Trim Type (e.g., "Standard", "Reduced")
    └── Links to plug, seat, stem, cage machining (all use trim_type as type_key)

MATERIAL SELECTION (determines weight-based costs)
├── Body/Bonnet Material → materials table (BodyBonnet group)
│   └── price_per_kg applied to body weight + bonnet weight
├── Plug Material → materials table (Plug group)
│   └── price_per_kg applied to plug weight + pilot plug weight (if selected)
├── Seat Material → materials table (Seat group)
│   └── price_per_kg applied to seat weight
├── Stem Material → materials table (Stem group)
│   ├── weight lookup + stem_fixed_prices table
│   └── Stem can be: weight-based OR fixed-price (depends on config)
└── Cage Material → materials table (Cage group) [if series.has_cage = true]
    └── price_per_kg applied to cage weight × cage_quantity

OPTIONAL COMPONENTS
├── Seal Ring Type (if series.has_seal_ring = true)
│   └── seal_ring_prices lookup: by series_id, seal_type, size, rating
├── Pilot Plug (boolean toggle)
│   └── pilot_plug_weights lookup: by series_id, size, rating
├── Actuator (boolean toggle)
│   ├── actuator_type → series → model → standard_special
│   └── actuator_models table lookup
└── Handwheel (boolean toggle)
    ├── handwheel_type → series → model → standard_special
    └── handwheel_prices table lookup

MACHINING COSTS (component-level manufacturing)
├── Applied to: body, bonnet, plug, seat, stem, cage
├── Lookup fields: component, series_id, size, rating, type_key, material_id
├── type_key values:
│   ├── body → end_connect_type
│   ├── bonnet → bonnet_type
│   └── plug, seat, stem, cage → trim_type
└── machining_prices table: fixed_price per component configuration

LINE ITEMS (per-product, optional)
├── Tubing Items (preset or custom)
│   ├── Preset: tubing_presets by series_id, size, rating
│   └── Custom: user-entered with price
├── Testing Items (preset or custom)
│   ├── Preset: testing_presets by series_id, size, rating
│   └── Custom: user-entered with price
└── Accessories (custom only)
    └── per-product with unit_price × quantity
```

### **Key Pricing Constraints**

1. **Normal Customer** → commission_pct = 0 (enforced by DB constraint)
2. **Dealer Customer** → commission_pct >= 0 (optional, applied in pricing)
3. **Cage Quantity** → affects cage cost: cost × cage_quantity (1, 2, or 3)
4. **Stem** → can be weight-based OR fixed-price (config-dependent)
5. **International** → is_international (computed from country != 'India')
   - INR pricing applies for domestic
   - USD conversion applies for international (using exchange_rate for display only)
6. **Tax** → 18% GST for India, 0% for international

---

## QUOTE GENERATION WORKFLOW

### **Entry Point: `/employee/new-quote` Page**

The quote creation is a **5-Step Wizard** with client-side state management (Zustand store).

#### **STEP 0: Customer & Project Details**

**Form Fields:**
- `customer_id` (select from customers table)
- `project_name` (required, text)
- `enquiry_id` (required, text)
- `custom_quote_number` (optional; if blank, auto-generate UV/FY/NNNN)
- `pricing_mode` (toggle: standard | project)
  - Standard: uses global standard_margins
  - Project: uses global project_margins (competitive pricing)

**Store Updates:**
```typescript
store.setQuoteSettings({
  customer_id, customer_name, project_name, enquiry_id, pricing_mode
})
```

**Validation:**
- customer_id required
- project_name must be non-empty
- enquiry_id must be non-empty

---

#### **STEP 1: Products (Valve Configuration)**

**Add Product Flow:**
1. Click "Add Product" → new ProductConfig object created with UUID
2. Configure each product:
   - **Valve Config Selection:** Series → Size → Rating → End Connect → Bonnet Type → Trim Type
   - **Material Selections:** Body/Bonnet, Plug, Seat, Stem, Cage materials
   - **Optional Components:** Seal ring type, pilot plug toggle, actuator/handwheel toggle
   - **Cage Quantity:** 1, 2, or 3 (multiplier for cage cost)
   - **Tag Number:** Optional identifier for this product
   - **Quantity:** How many units of this configuration

**Actions Available:**
- **Add Product:** Insert new empty ProductConfig
- **Duplicate Product:** Clone existing product (clears tag_number)
- **Remove Product:** Delete from cart
- **Update Product:** Change any field via store.updateProduct()

**State in Zustand Store:**
```typescript
products: ProductConfig[] = [
  {
    id, tag_number, quantity,
    series_id, series_name, size, rating, end_connect_type, bonnet_type, trim_type,
    body_bonnet_material_id, plug_material_id, seat_material_id, stem_material_id, cage_material_id,
    cage_quantity, seal_ring_type,
    has_pilot_plug, has_actuator, actuator_model_id, has_handwheel, handwheel_model_id,
    discount_pct,
    // Costs (populated after Calculate Price)
    body_cost, bonnet_cost, plug_cost, seat_cost, stem_cost, cage_cost, seal_ring_cost,
    pilot_plug_cost, actuator_cost, handwheel_cost,
    tubing_items, testing_items, accessories,
    unit_price, line_total,
    pricing_warnings, has_pricing_errors
  }
]
```

**Validation on Advance:**
- At least 1 product must exist
- Each product must have:
  - series_id, size, rating, end_connect_type, bonnet_type, trim_type
  - body_bonnet_material_id, plug_material_id, seat_material_id, stem_material_id
  - quantity >= 1
  - If has_actuator=true: actuator_model_id must be set
  - If has_handwheel=true: handwheel_model_id must be set
  - unit_price > 0 (must click "Calculate Price" first)
  - No has_pricing_errors=true

---

#### **STEP 2: Line Items & Pricing Parameters**

**Line Items (Per Product):**
1. **Tubing Items:** Can select presets (from tubing_presets table) or add custom
   - Preset: loaded by series_id, size, rating
   - Custom: user enters item_name, price
   - Display: [item_name] - ₹[price]
   - Action: Add, Remove, duplicate, clear all

2. **Testing Items:** Can select presets or add custom
   - Preset: loaded by series_id, size, rating
   - Custom: user enters item_name, price
   - Display: [item_name] - ₹[price]
   - Action: Add, Remove, duplicate, clear all

3. **Accessories:** Only custom (no presets)
   - User enters: item_name, unit_price, quantity
   - Display: [item_name] - ₹[unit_price] × [qty] = ₹[line_total]
   - Action: Add, Remove, modify quantity, clear all

**Pricing Parameters:**
```typescript
// Margins (apply to ALL products)
mfg_profit_pct: number   // Manufacturing profit
bo_profit_pct: number    // Bought-out profit
neg_margin_pct: number   // Negotiation margin

// Per-product discount
discount_pct: number     // Applied after all margins/commission
```

**Margin Application:**
- Margins loaded from global_settings on page load
- Auto-switch margins when pricing_mode changes (standard ↔ project)
- User can manually override margins
- "Apply to All" button: replicate discount_pct from current product to all others

**Pricing Calculation:**
- User clicks "Calculate Price" button per product
- Button disabled if:
  - Series, Size, Rating not selected
  - End Connect, Bonnet Type, Trim Type not selected
  - Any required material not selected
  - Actuator/Handwheel selected but model not fully configured

---

#### **STEP 3: Terms & Conditions**

**Quote-Level Settings:**
```typescript
// Pricing Type
pricing_type: 'ex-works' | 'for-site' | 'custom'

// Freight (for-site only)
freight_price: number

// Custom Pricing (custom only)
custom_pricing_title: string   // e.g., "Service Charge", "Delivery"
custom_pricing_price: number

// Packing
packing_price: number

// Validity & Delivery
validity_days: number          // Default: 30
delivery_text: string          // "Within 4 weeks from order", etc.

// Payment Terms (must sum to 100%)
payment_advance_pct: number    // Default: 30%
payment_approval_pct: number   // Default: 0%
payment_despatch_pct: number   // Default: 70%

// Warranty
warranty_shipment_months: number      // Default: 18
warranty_installation_months: number  // Default: 12

// Commission (for dealers only)
agent_commission_pct: number   // Applied during pricing if > 0

// General Notes
notes: string
```

**Pricing Type Logic:**
- **ex-works:** No freight, no custom items
  - Subtotal = product_subtotal + packing
- **for-site:** Includes freight, no custom items
  - Subtotal = product_subtotal + freight + packing
- **custom:** No freight, includes custom items
  - Subtotal = product_subtotal + custom_item_price + packing

**Validation:**
- packing_price > 0
- delivery_text non-empty
- If pricing_type='for-site': freight_price > 0
- If pricing_type='custom': custom_pricing_title non-empty
- Payment terms must sum to exactly 100%

---

#### **STEP 4: Review & Save**

**Display Summary:**
- Product list with unit_price, quantity, line_total per product
- Product subtotal (sum of all line_total)
- + Freight (if for-site) / + Custom item (if custom)
- + Packing
- = Subtotal
- + Tax (18% for India, 0% for international)
- = Grand Total

**Actions:**
- **Save Draft:** Insert into DB with status='draft'
- **Send Quote:** Insert into DB with status='sent'
  - Both trigger same save flow (user can change status later)

**Final Validations Before Save:**
- All Step 0-3 validations
- No products with pricing_errors
- All required fields filled

---

## COST CALCULATION PIPELINE

### **The "Calculate Price" Button Workflow**

When user clicks "Calculate Price" for a product, the system:

#### **Phase 1: Diagnostic Data Collection**

For each component, lookup fails are tracked with warnings:

```typescript
// Weight Lookups
body_weight = await select weight_kg from body_weights WHERE series_id=?, size=?, rating=?, end_connect_type=?
bonnet_weight = await select weight_kg from bonnet_weights WHERE series_id=?, size=?, rating=?, bonnet_type=?
plug_weight = await select weight_kg from plug_weights WHERE series_id=?, size=?, rating=?
seat_weight = await select weight_kg from seat_weights WHERE series_id=?, size=?, rating=?
stem_weight = if stem_material_id THEN await select weight_kg from stem_weights WHERE ...
cage_weight = if cage_material_id THEN await select weight_kg from cage_weights WHERE ...
seal_ring_price = if seal_ring_type THEN await select fixed_price from seal_ring_prices WHERE ...
pilot_plug_weight = if has_pilot_plug THEN await select weight_kg from pilot_plug_weights WHERE ...
actuator_price = if actuator_model_id THEN await select fixed_price from actuator_models WHERE id=?
handwheel_price = if handwheel_model_id THEN await select fixed_price from handwheel_prices WHERE id=?

// Each missing lookup → add warning to warnings[] array
```

#### **Phase 2: Material Price Lookup**

```typescript
// From materials table (grouped by material_group)
body_bonnet_material_price = find(materials['BodyBonnet'], id=body_bonnet_material_id).price_per_kg
plug_material_price = find(materials['Plug'], id=plug_material_id).price_per_kg
seat_material_price = find(materials['Seat'], id=seat_material_id).price_per_kg
stem_material_price = find(materials['Stem'], id=stem_material_id).price_per_kg
cage_material_price = find(materials['Cage'], id=cage_material_id).price_per_kg

// Each missing material → add warning
```

#### **Phase 3: Machining Cost Lookup**

**Critical: Machining requires 6 lookups** (one per component)

```typescript
// For each component, lookup machining_prices with:
// - component (body, bonnet, plug, seat, stem, cage)
// - series_id
// - size, rating
// - type_key (determines variant):
//   - body: end_connect_type
//   - bonnet: bonnet_type
//   - plug, seat, stem, cage: trim_type
// - material_id

FOR component IN [body, bonnet, plug, seat, stem, cage]:
  machining_cost[component] = await select fixed_price from machining_prices WHERE
    component=?, series_id=?, size=?, rating=?, type_key=?, material_id=?
  
  IF not found THEN
    machining_cost[component] = 0
    warnings.push(`⚠ [Component] machining not found (type="${type_key}", size=${size}, rating=${rating})`)
```

#### **Phase 4: Component Cost Calculation**

```typescript
// Weight-based components
body_cost = body_weight * body_bonnet_material_price + machining_cost[body]
bonnet_cost = bonnet_weight * body_bonnet_material_price + machining_cost[bonnet]
plug_cost = plug_weight * plug_material_price + machining_cost[plug]
seat_cost = seat_weight * seat_material_price + machining_cost[seat]
stem_cost = stem_weight * stem_material_price + machining_cost[stem]
cage_cost = (cage_weight * cage_material_price + machining_cost[cage]) * cage_quantity

// Fixed-price components
seal_ring_cost = seal_ring_price (if seal_ring_type selected)
pilot_plug_cost = pilot_plug_weight * plug_material_price (if has_pilot_plug)
actuator_cost = actuator_price (if actuator_model_id)
handwheel_cost = handwheel_price (if handwheel_model_id)

// Line item aggregates
tubing_total = sum(tubing_items[*].price)
testing_total = sum(testing_items[*].price)
accessories_total = sum(accessories[*].unit_price * accessories[*].quantity)
```

#### **Phase 5: Critical Error Validation**

Critical errors prevent pricing from being used:

```typescript
const criticalErrors = [];

// Body must have both weight AND machining
if (!body_weight) criticalErrors.push('Body weight data missing')
if (body_cost === 0) criticalErrors.push('Body material price is ₹0')
if (machining_cost[body] === 0) criticalErrors.push('Body machining cost missing')

// Bonnet must have both weight AND machining
if (!bonnet_weight) criticalErrors.push('Bonnet weight data missing')
if (bonnet_cost === 0) criticalErrors.push('Bonnet material price is ₹0')
if (machining_cost[bonnet] === 0) criticalErrors.push('Bonnet machining cost missing')

// Optional components only validated if selected
if (plug_material_id && machining_cost[plug] === 0) criticalErrors.push('Plug machining missing')
if (seat_material_id && machining_cost[seat] === 0) criticalErrors.push('Seat machining missing')
if (stem_material_id && machining_cost[stem] === 0) criticalErrors.push('Stem machining missing')
if (cage_material_id && machining_cost[cage] === 0) criticalErrors.push('Cage machining missing')
if (seal_ring_type && !seal_ring_price) criticalErrors.push(`Seal Ring (${seal_ring_type}) not found`)
if (actuator_model_id && !actuator_price) criticalErrors.push('Actuator price not found')
if (handwheel_model_id && !handwheel_price) criticalErrors.push('Handwheel price not found')

IF criticalErrors.length > 0:
  has_pricing_errors = true
  Show error toast (blocks save)
ELSE:
  has_pricing_errors = false
  Proceed to pricing calculation
```

#### **Phase 6: Call Pricing Engine**

```typescript
const componentCosts = {
  body, bonnet, plug, seat, stem, cage,
  sealRing, pilotPlug, tubing, testing,
  actuator, handwheel, accessories
};

const pricingParams = {
  mfgProfitPct: store.mfg_profit_pct,
  boProfitPct: store.bo_profit_pct,
  negMarginPct: store.neg_margin_pct,
  commissionPct: store.agent_commission_pct,
  discountPct: product.discount_pct,
  quantity: product.quantity
};

const result = calculateProductPrice(componentCosts, pricingParams);
// Returns: { mfgCost, mfgCostWithProfit, boCost, boCostWithProfit,
//            unitCost, afterNegMargin, afterCommission, afterDiscount,
//            unitPrice, lineTotal }
```

#### **Phase 7: Update Store**

```typescript
store.updateProduct(productId, {
  body_cost, bonnet_cost, plug_cost, seat_cost, stem_cost, cage_cost,
  seal_ring_cost, pilot_plug_cost, actuator_cost, handwheel_cost,
  unit_price: result.unitPrice,
  line_total: result.lineTotal,
  pricing_warnings: [...warnings, ...criticalErrors],
  has_pricing_errors: criticalErrors.length > 0
});
```

#### **Phase 8: User Feedback**

- **Critical errors found:** Error toast with 15s duration, error list
- **Warnings found (no errors):** Warning toast with descriptions
- **All data found:** Success toast with calculated unit_price

---

## FINAL PRICE CALCULATION (10-STEP CHAIN)

### **The Canonical Pricing Engine** (`lib/pricingEngine.ts`)

This is a **pure function** with NO database calls or side effects.

```typescript
function calculateProductPrice(
  costs: ComponentCosts,     // All 12 components (₹0 if missing)
  params: PricingParams      // Profit margins, commission, discount, quantity
): PricingResult
```

### **The 10-Step Calculation Chain**

```
STEP 1: Component Costs Provided
  ├── body, bonnet, plug, seat, stem, cage
  ├── sealRing, pilotPlug, tubing, testing
  ├── actuator, handwheel, accessories
  └── Each is either: calculated cost OR ₹0 if missing

STEP 2: Manufacturing Cost (mfgCost)
  mfgCost = body + bonnet + plug + seat + stem + cage + sealRing + pilotPlug + tubing + testing + actuator + handwheel

STEP 3: Apply Manufacturing Profit (mfgCostWithProfit)
  mfgCostWithProfit = applyMarginOnPrice(mfgCost, mfgProfitPct)
  
  Formula: sellingPrice = cost ÷ (1 − margin% ÷ 100)
  Example: cost=₹75,000, margin=25% → ₹75,000 ÷ (1 - 0.25) = ₹100,000
  
  Proof: Profit = ₹100,000 − ₹75,000 = ₹25,000 = 25% of selling price ✓

STEP 4: Bought-out Cost (boCost)
  boCost = accessories (ONLY accessories, never included in mfgCost)

STEP 5: Apply Bought-out Profit (boCostWithProfit)
  IF boCost > 0:
    boCostWithProfit = applyMarginOnPrice(boCost, boProfitPct)
  ELSE:
    boCostWithProfit = 0

STEP 6: Unit Cost (unitCost)
  unitCost = mfgCostWithProfit + boCostWithProfit

STEP 7: Apply Negotiation Margin (afterNegMargin)
  afterNegMargin = applyMarginOnPrice(unitCost, negMarginPct)
  
  Negotiation margin applies to BOTH manufactured + bought-out cost

STEP 8: Apply Agent Commission (afterCommission)
  IF commissionPct > 0:
    afterCommission = applyMarginOnPrice(afterNegMargin, commissionPct)
    (Only for dealer customers; normal customers have 0)
  ELSE:
    afterCommission = afterNegMargin

STEP 9: Apply Discount & Round (unitPrice)
  IF discountPct > 0:
    afterDiscount = afterCommission × (1 − discountPct ÷ 100)
  ELSE:
    afterDiscount = afterCommission
  
  unitPrice = roundToNearest10(afterDiscount)  // CEILING, not standard round

STEP 10: Line Total (lineTotal)
  lineTotal = roundToNearest10(unitPrice × quantity)
```

### **Key Formulas**

**Margin-on-Selling-Price (NOT Markup):**
```
sellingPrice = cost ÷ (1 − margin% ÷ 100)

Clamping:
  - If margin >= 100% → return cost unchanged (prevents division by zero)
  - If cost <= 0 → return 0

Negative margins are clamped to 0
```

**Rounding Rule:**
```
roundToNearest10(value) = Math.ceil(value ÷ 10) × 10

Examples:
  ₹1000 → ₹1000
  ₹1001 → ₹1010
  ₹1009 → ₹1010
  ₹1234 → ₹1240
```

**Discount Calculation:**
```
afterDiscount = afterCommission × (1 − discountPct ÷ 100)

Example:
  afterCommission = ₹10,000
  discountPct = 10%
  afterDiscount = ₹10,000 × 0.9 = ₹9,000
  (10% OFF, not 10% MARGIN)
```

### **Quote Total Calculation**

After all products are priced, calculate quote-level totals:

```typescript
function calculateQuoteTotal(
  products: Array<{ lineTotal: number }>,
  pricingType: string,        // 'ex-works' | 'for-site' | 'custom'
  freightPrice: number,       // ₹0 unless for-site
  customItems: Array<{ price: number }>,  // Only if custom
  packingPrice: number,
  isInternational: boolean    // Determines tax rate
): QuoteTotalResult
```

**Calculation:**
```
Step 1: Product Subtotal
  productSubtotal = SUM(products[*].lineTotal)

Step 2: Add Quote-Level Items
  subtotal = productSubtotal
  
  IF pricingType === 'for-site':
    subtotal += freightPrice
  
  IF pricingType === 'custom':
    subtotal += SUM(customItems[*].price)
  
  subtotal += packingPrice

Step 3: Calculate Tax
  IF isInternational:
    taxRate = 0%  (no GST for international)
  ELSE:
    taxRate = 18%  (GST for India)
  
  taxAmount = subtotal × taxRate

Step 4: Grand Total
  grandTotal = subtotal + taxAmount

RETURN { productSubtotal, subtotal, taxAmount, grandTotal }
```

### **Currency Conversion (Display Only)**

```typescript
function convertToUSD(amountINR: number, exchangeRate: number): number {
  return Math.round(amountINR ÷ exchangeRate)
}

Notes:
  - Exchange rate stored in global_settings
  - Used for PDF/Excel display ONLY
  - All calculations happen in INR
  - Math.round() used (not floor or ceil)
```

---

## ADMIN FEATURES COMPREHENSIVE GUIDE

### **1. ADMIN DASHBOARD** (`/admin/dashboard`)

**Purpose:** System overview and metrics

**Features:**
- Total quotes count (all statuses)
- Total revenue (sum of grand_total_inr)
- Quote status breakdown chart
- Recent quotes list (last 10)
- Quick actions: View Customers, View Pricing, View All Quotes

**Data Source:**
- Queries: quotes, quote_products (with joins to customers and profiles)
- Real-time calculations of totals

---

### **2. CUSTOMERS MANAGEMENT** (`/admin/customers`)

**Purpose:** Manage customer master data

**Features:**

#### **View Customers**
- Table with columns: Name, Company, Email, Phone, Country, Customer Type, Commission %
- Search: by name or company
- Sort: by created_at (newest first)
- Row actions: Edit, Delete
- Total count display

#### **Add Customer**
Dialog form with fields:
```typescript
{
  name: string (required),
  company: string (optional),
  email: string (optional),
  phone: string (optional),
  address: string (optional),
  country: string (default: 'India'),
  customer_type: 'normal' | 'dealer' (default: 'normal'),
  commission_pct: number (default: 0),
  gstin: string (optional)
}
```

**Validation:**
- Normal customers: commission_pct forced to 0 (enforced by form)
- Dealer customers: commission_pct >= 0
- created_by automatically set to current user
- is_international computed from country != 'India'

#### **Edit Customer**
- Opens dialog with pre-filled form
- Updates customer record (created_by unchanged)
- Validation same as Add

#### **Delete Customer**
- Confirmation dialog required
- Cascades to quotes (RLS prevents orphan data)

**Database:**
- Table: `customers`
- RLS Policy: Readable by all authenticated users, writable by creators

---

### **3. EMPLOYEES MANAGEMENT** (`/admin/employees`)

**Purpose:** Manage user accounts and roles

**Features:**

#### **View Employees**
- Table with columns: Email, Full Name, Role, Active Status
- Search: by email or name
- Filter: by role (admin/employee)
- Row actions: Edit, Deactivate/Activate, Delete

#### **Add Employee**
Dialog with fields:
```typescript
{
  email: string (required, must be valid email),
  full_name: string (required),
  password: string (required, min 6 chars),
  role: 'admin' | 'employee' (required),
  is_active: boolean (default: true)
}
```

**Flow:**
1. Create auth user via supabase.auth.admin.createUser()
2. Set user metadata: full_name, role
3. Create profile record in profiles table
4. Trigger auto-sends password reset email to new user

#### **Edit Employee**
- Change: full_name, role, is_active
- Email/password NOT editable (user must reset password if needed)

#### **Deactivate/Activate**
- Quick toggle of is_active flag
- Deactivated users cannot log in (checked by middleware)

#### **Delete Employee**
- Soft delete by setting is_active=false (preferred)
- Hard delete removes auth user + profile

**Database:**
- Table: `profiles` (extends auth.users)
- RLS Policy: Admins can manage all users

---

### **4. PRICING DATA MANAGEMENT** (`/admin/pricing`)

**Purpose:** Bulk manage all material costs, weights, and pricing data

**12 Tabs for Different Data Types:**
1. **Materials:** material_name, material_group, price_per_kg
2. **Series:** series_number, series_name, product_type, has_cage, has_seal_ring
3. **Body Weights:** series_id, size, rating, end_connect_type, weight_kg
4. **Bonnet Weights:** series_id, size, rating, bonnet_type, weight_kg
5. **Plug Weights:** series_id, size, rating, weight_kg
6. **Seat Weights:** series_id, size, rating, weight_kg
7. **Cage Weights:** series_id, size, rating, weight_kg
8. **Seal Ring Prices:** series_id, seal_type, size, rating, fixed_price
9. **Stem Weights:** series_id, size, rating, weight_kg
10. **Actuators:** type, series, model, standard_special, fixed_price
11. **Handwheels:** type, series, model, standard_special, fixed_price
12. **Pilot Plugs:** series_id, size, rating, weight_kg
13. **Testing Presets:** series_id, size, rating, test_name, price
14. **Tubing Presets:** series_id, size, rating, item_name, price

#### **Features per Tab:**

**1. Data Preview**
- Shows active records (is_active = true) from table
- Searchable across all columns
- Shows row count
- Sortable columns

**2. Upload (Bulk Import)**
- Accept Excel file (.xlsx, .xls)
- Validation: Check sheet names, required columns, data types
- Error reporting: Sheet name, row number, column, error message
- Success: Clears all old data, inserts new data atomically
- Confirmation dialog: "This will replace ALL pricing data. Continue?"

**3. Download Template**
- Excel file with correct sheets + headers pre-populated
- Users fill in data following template structure
- Download: `/api/pricing/template`

**4. Export**
- Export current active data as Excel
- File named: `pricing-data-YYYY-MM-DD.xlsx`
- Download: `/api/pricing/export`

**5. Inline Edit**
- Click pencil icon on row → Edit dialog
- Fields match table columns
- Type coercion: numbers, booleans
- Save: Updates record via Supabase
- Refresh preview on save

**6. Delete Single Row**
- Confirmation dialog required
- Delete via `/api/admin/delete-rows` API
- Refresh preview on delete

**7. Delete All in Tab**
- Confirmation dialog with count
- Warning: "This cannot be undone"
- Bulk delete via API
- Shows result: "Deleted X rows"

#### **Upload Validation Rules**

```
MATERIALS Sheet:
  Required columns: material_name, material_group, price_per_kg
  material_group IN ('BodyBonnet', 'Plug', 'Seat', 'Stem', 'Cage')
  price_per_kg >= 0 (numeric)

SERIES Sheet:
  Required columns: series_number, series_name, product_type, has_cage, has_seal_ring
  series_number unique
  has_cage, has_seal_ring are booleans (true/false or yes/no)

WEIGHT TABLES (body, bonnet, plug, seat, cage, pilot_plug, stem):
  Required columns: series_id, size, rating, [variant_field], weight_kg
  variant_field:
    - body_weights: end_connect_type
    - bonnet_weights: bonnet_type
    - plug/seat/cage/stem/pilot_plug_weights: (no variant)
  weight_kg > 0 (numeric)
  series_id must exist in series table
  Unique constraint per table

SEAL_RING_PRICES Sheet:
  Required: series_id, seal_type, size, rating, fixed_price
  fixed_price > 0
  series_id must exist
  Unique on (series_id, seal_type, size, rating)

STEM_FIXED_PRICES Sheet:
  Required: series_id, size, rating, material_id, fixed_price
  material_id must exist in materials
  fixed_price >= 0
  Unique on (series_id, size, rating, material_id)

ACTUATOR_MODELS / HANDWHEEL_PRICES:
  Required: type, series, model, standard_special, fixed_price
  standard_special IN ('standard', 'special')
  fixed_price > 0

TESTING_PRESETS / TUBING_PRESETS:
  Required: series_id, size, rating, [test_name|item_name], price
  series_id must exist
  price > 0
  Unique per series/size/rating/name
```

**API Endpoint:** `POST /api/pricing/upload`
- Accepts FormData with file
- Returns JSON: { success, message, details?: [{ sheet, row, column, error }] }
- Validates all sheets, reports ALL errors at once
- Transactional: all-or-nothing insert

---

### **5. MACHINING PRICING MANAGEMENT** (`/admin/machine-pricing`)

**Purpose:** Manage component-level machining costs

**Machining Components Tracked:** body, bonnet, plug, seat, stem, cage

**Features:**

#### **View Machining Prices**
- Table with columns:
  - Component (body/bonnet/plug/seat/stem/cage)
  - Series Number
  - Size
  - Rating
  - Type Key (end_connect_type for body, bonnet_type for bonnet, trim_type for others)
  - Material
  - Fixed Price (₹)
  - Actions (Edit, Delete)
- Search across all fields
- Filter by component
- Show count of entries

#### **Add Machining Price**
Dialog with form:
```typescript
{
  component: select (body, bonnet, plug, seat, stem, cage) [required],
  series_id: select from active series [required],
  size: text input [required],
  rating: text input [required],
  type_key: text input [optional, auto-filled based on component],
  material_id: select from materials [required],
  fixed_price: number >= 0 [required]
}
```

#### **Edit Machining Price**
- Pre-fills form with current values
- Updates record
- Same validation as Add

#### **Delete Single / Delete All**
- Confirmation required
- Bulk delete available with count

#### **Upload Machining Data (Bulk)**
- Template download: `/api/machining/template`
- Excel upload: `/api/machining/upload`
- Export: `/api/machining/export`
- Same validation rules as pricing tab

#### **Upload Validation**
```
MACHINING_PRICES Sheet:
  Required: component, series_id, size, rating, type_key, material_id, fixed_price
  component IN ('body', 'bonnet', 'plug', 'seat', 'stem', 'cage')
  type_key auto-populated based on component if blank:
    - 'body' OR 'bonnet' → type_key is end_connect_type or bonnet_type
    - others → type_key is trim_type
  series_id, material_id must exist
  fixed_price > 0
  Unique on (component, series_id, size, rating, type_key, material_id)
```

**API Endpoint:** `POST /api/machining/upload`

---

### **6. GLOBAL SETTINGS** (`/admin/settings`)

**Purpose:** Configure quote-level defaults and constants

**Settings Groups:**

#### **Standard Margins Card**
Fields:
```typescript
{
  mfg_profit_pct: number,      // Manufacturing profit % (0-99)
  bo_profit_pct: number,       // Bought-out profit % (0-99)
  neg_margin_pct: number       // Negotiation margin % (0-99)
}
```
- Applied to quotes with pricing_mode='standard'
- Loaded on quote wizard open
- Auto-switched when pricing_mode changes
- Save button: upserts to global_settings table with key='standard_margins'

#### **Project Margins Card**
Fields: Same as Standard Margins
- Applied to quotes with pricing_mode='project'
- Lower margins for competitive/project pricing
- Example: mfg=20%, bo=10%, neg=3% (vs. standard 25/15/5)

#### **Exchange Rate Card**
Field:
```typescript
{
  usd_to_inr: number  // 1 USD = ₹X
}
```
- Default: 83.5
- Used in PDF export for international customers
- Updated daily or when exchange rate changes
- Save button updates global_settings with key='exchange_rate'

#### **Company Information Card**
Fields:
```typescript
{
  name: string,       // "Unicorn Valves Pvt. Ltd."
  address: string,    // Full company address
  gstin: string       // GST Identification Number
}
```
- Displayed in PDF headers (CoverLetterPDF, CompleteQuotePDF)
- Used for formal quote documents
- Save button updates global_settings with key='company_info'

**Database:**
- Table: `global_settings` (key VARCHAR, value JSONB)
- Keys: standard_margins, project_margins, exchange_rate, company_info
- Upsert on save (insert if not exists, update if exists)

---

### **7. ALL QUOTES MANAGEMENT** (`/admin/quotes`)

**Purpose:** View and manage all quotes in the system

**Features:**

#### **Quote List**
- Columns: Quote Number, Customer Name, Amount (₹), Status, Created By, Created Date
- Search: by quote number or customer name
- Filter: by status (draft, sent, approved, rejected)
- Sort: by created_at descending (newest first)
- Total count display

#### **Quote Detail View** (`/admin/quotes/[id]`)

**Header Section:**
- Quote Number, Customer Name
- Status dropdown (admin can change status: draft → sent → approved/rejected)
- If status=draft: "Edit in Wizard" link (redirects to `/employee/quotes/[id]/edit`)

**Actions:**
- Download PDF (Complete quote with cover letter + price summary + T&C)
- Download Cover Letter (PDF only, no products)
- Download Excel (Products and line items)

**Quote Information Panel:**
- Quote Number, Status, Created By, Created Date
- Customer: Name, Company, Email, Address, Country
- Project: Project Name, Enquiry ID
- Pricing Type: Ex-works | For-site | Custom
- Pricing Mode: Standard | Project

**Products Table:**
- Columns: Tag, Quantity, Unit Price (₹), Line Total (₹), Series, Size, Rating
- Expandable rows showing materials, machining, actuator, handwheel, tubing, testing, accessories details

**Quote Totals:**
- Product Subtotal (₹)
- + Freight (if for-site)
- + Custom Item (if custom)
- + Packing
- = Subtotal
- + Tax (18% if India, 0% if international)
- = Grand Total

**Terms Section:**
- Validity: [N] days
- Delivery: [text]
- Payment: [Advance]% [+ Approval]% [+ Despatch]%
- Warranty: [N] months shipment, [N] months installation
- Notes: [text]

**RLS Security:**
- Admin sees all quotes
- Employee sees only own quotes (created_by = auth.uid)

---

## DATA FLOW DIAGRAMS

### **Quote Creation Data Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 0: Customer & Project (Client-Side Form)                  │
├─────────────────────────────────────────────────────────────────┤
│ User selects:                                                   │
│  - Customer (from customers table)                              │
│  - Project Name, Enquiry ID                                     │
│  - Pricing Mode (standard | project)                            │
│ Store updates: customer_id, project_name, pricing_mode          │
│ Load margins from global_settings based on pricing_mode        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ STEP 1: Products Configuration (Client-Side Wizard)            │
├──────────────────────────────────────────────────────────────────┤
│ For each product:                                               │
│  1. Select Series → filters Size/Rating/End Connect/Bonnet Type│
│  2. Select Materials (Body/Bonnet, Plug, Seat, Stem, Cage)    │
│  3. Select optional: Seal Ring, Pilot Plug, Actuator, Handwheel
│  4. Click "Calculate Price" Button                             │
│                                                                 │
│    ┌─────────────────────────────────────────┐                 │
│    │ CALCULATE PRICE LOGIC                   │                 │
│    ├─────────────────────────────────────────┤                 │
│    │ 1. Lookup all component weights from DB │                 │
│    │ 2. Lookup material prices from materials│                 │
│    │ 3. Lookup machining costs (6 queries)  │                 │
│    │ 4. Calculate component costs            │                 │
│    │ 5. Check for critical errors            │                 │
│    │ 6. Call pricingEngine.calculatePrice()  │                 │
│    │ 7. Update store with costs & pricing    │                 │
│    │ 8. Show success/warning/error toast     │                 │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
│ Store updates: products[] with costs & unit_price               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ STEP 2: Line Items & Pricing (Client-Side)                     │
├──────────────────────────────────────────────────────────────────┤
│ For each product:                                               │
│  - Add tubing items (preset from tubing_presets or custom)     │
│  - Add testing items (preset from testing_presets or custom)   │
│  - Add accessories (custom with unit_price × qty)              │
│                                                                 │
│ Quote-level pricing:                                            │
│  - Set mfg_profit_pct, bo_profit_pct, neg_margin_pct           │
│  - Set per-product discount_pct (can "apply to all")           │
│                                                                 │
│ Store updates: products[*].tubing_items, testing_items,         │
│                accessories, discount_pct, margins               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ STEP 3: Terms & Conditions (Client-Side)                       │
├──────────────────────────────────────────────────────────────────┤
│ Set quote-level fields:                                        │
│  - Pricing Type: ex-works | for-site | custom                 │
│  - Freight (if for-site), Custom Item (if custom)             │
│  - Packing, Validity Days, Delivery Text                       │
│  - Payment Terms (advance%, approval%, despatch%)              │
│  - Warranty (shipment months, installation months)             │
│  - Notes                                                        │
│                                                                 │
│ Store updates: pricing_type, freight_price, packing_price,     │
│                validity_days, delivery_text, etc.              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ STEP 4: Review & Save (Server-Side DB Insert)                  │
├──────────────────────────────────────────────────────────────────┤
│ 1. Validate all form data                                       │
│ 2. Calculate quote totals using pricingEngine.calculateTotal() │
│ 3. Generate quote number (UV/FY-YY/NNNN) if not custom         │
│ 4. Insert QUOTE record:                                        │
│    - quote_number, customer_id, created_by, status (draft)    │
│    - pricing_mode, pricing_type                                │
│    - All terms & conditions fields                             │
│    - Computed totals: subtotal_inr, tax_amount_inr, grand_total│
│                                                                 │
│ 5. For each product, insert QUOTE_PRODUCT record:             │
│    - series_id, size, rating, materials, machining cost breakdown
│    - all pricing params snapshot (mfg%, bo%, neg%, commission%) │
│    - unit_price_inr, line_total_inr                           │
│    - description (for PDF)                                     │
│                                                                 │
│ 6. For each product, insert LINE ITEMS:                        │
│    - product_tubing_items (if any tubing items)               │
│    - product_testing_items (if any testing items)             │
│    - product_accessories (if any accessories)                  │
│                                                                 │
│ 7. Redirect to quote view page                                 │
└─────────────────────────────────────────────────────────────────┘
```

### **Pricing Calculation Data Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│ USER CLICKS "CALCULATE PRICE"                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ FETCH COMPONENT WEIGHTS FROM DATABASE                           │
├─────────────────────────────────────────────────────────────────┤
│ SELECT weight_kg FROM body_weights WHERE                        │
│   series_id = ? AND size = ? AND rating = ?                    │
│   AND end_connect_type = ?                                      │
│                                                                 │
│ (Similar for bonnet, plug, seat, stem, cage, pilot_plug)      │
│                                                                 │
│ If NOT FOUND → add warning to warnings[]                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ FETCH MATERIAL PRICES                                           │
├─────────────────────────────────────────────────────────────────┤
│ For each material_group (BodyBonnet, Plug, Seat, Stem, Cage):  │
│   Find material by id in materials[]                           │
│   Extract price_per_kg                                          │
│                                                                 │
│ If NOT FOUND → add warning                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ FETCH MACHINING COSTS (6 QUERIES)                              │
├─────────────────────────────────────────────────────────────────┤
│ FOR EACH component IN [body, bonnet, plug, seat, stem, cage]:  │
│   SELECT fixed_price FROM machining_prices WHERE:              │
│     component = 'body' (etc.)                                  │
│     AND series_id = ?                                          │
│     AND size = ? AND rating = ?                                │
│     AND type_key = {end_connect_type | bonnet_type | trim_type}│
│     AND material_id = ?                                        │
│     AND is_active = true                                       │
│                                                                 │
│   If NOT FOUND:                                                │
│     - machining_cost[component] = 0                            │
│     - add warning: "Component machining not found"             │
│                                                                 │
│ Log full breakdown to console.table()                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ CALCULATE COMPONENT COSTS                                       │
├─────────────────────────────────────────────────────────────────┤
│ body_cost       = body_weight × body_bonnet_material_price      │
│                  + machining_cost[body]                         │
│                                                                 │
│ bonnet_cost     = bonnet_weight × body_bonnet_material_price    │
│                  + machining_cost[bonnet]                       │
│                                                                 │
│ plug_cost       = plug_weight × plug_material_price             │
│                  + machining_cost[plug]                         │
│                                                                 │
│ seat_cost       = seat_weight × seat_material_price             │
│                  + machining_cost[seat]                         │
│                                                                 │
│ stem_cost       = stem_weight × stem_material_price             │
│                  + machining_cost[stem]                         │
│                                                                 │
│ cage_cost       = (cage_weight × cage_material_price            │
│                  + machining_cost[cage])                        │
│                  × cage_quantity                                │
│                                                                 │
│ sealRing_cost   = seal_ring_fixed_price (if exists)           │
│ pilotPlug_cost  = pilot_plug_weight × plug_material_price      │
│ actuator_cost   = actuator_fixed_price (if exists)             │
│ handwheel_cost  = handwheel_fixed_price (if exists)            │
│                                                                 │
│ tubing_total    = SUM(tubing_items[*].price)                   │
│ testing_total   = SUM(testing_items[*].price)                  │
│ accessories_total = SUM(accessories[*].unit_price × qty)       │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ VALIDATE CRITICAL DATA (BLOCK IF ERRORS)                        │
├─────────────────────────────────────────────────────────────────┤
│ For BODY: must have BOTH weight AND machining costs             │
│   If body_weight missing → error: "Body weight missing"         │
│   If body_cost == 0 → error: "Body material price is ₹0"       │
│   If machining[body] == 0 → error: "Body machining missing"    │
│                                                                 │
│ For BONNET: same checks as body                                │
│                                                                 │
│ For OPTIONAL components: only validate if selected             │
│   If plug selected & machining[plug] == 0 → error              │
│   If seal_ring selected & price not found → error              │
│   If actuator selected & price not found → error               │
│                                                                 │
│ IF ANY critical errors:                                        │
│   → has_pricing_errors = TRUE                                  │
│   → Show error toast (blocks quote save)                        │
│   → Return and wait for fix                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     NO CRITICAL ERRORS
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ CALL PRICING ENGINE (Pure Function)                             │
├─────────────────────────────────────────────────────────────────┤
│ componentCosts = {                                              │
│   body, bonnet, plug, seat, stem, cage,                        │
│   sealRing, pilotPlug, tubing, testing,                        │
│   actuator, handwheel, accessories                              │
│ }                                                               │
│                                                                 │
│ pricingParams = {                                              │
│   mfgProfitPct: store.mfg_profit_pct,                          │
│   boProfitPct: store.bo_profit_pct,                            │
│   negMarginPct: store.neg_margin_pct,                          │
│   commissionPct: store.agent_commission_pct,                   │
│   discountPct: product.discount_pct,                           │
│   quantity: product.quantity                                    │
│ }                                                               │
│                                                                 │
│ result = calculateProductPrice(componentCosts, pricingParams)  │
│ Returns: {                                                      │
│   unitPrice,     // Final price rounded to ₹10                 │
│   lineTotal,     // unitPrice × quantity rounded to ₹10        │
│   + all intermediate values (mfgCost, unitCost, etc.)          │
│ }                                                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ UPDATE ZUSTAND STORE                                            │
├─────────────────────────────────────────────────────────────────┤
│ store.updateProduct(productId, {                               │
│   body_cost, bonnet_cost, plug_cost, seat_cost,               │
│   stem_cost, cage_cost, seal_ring_cost, pilot_plug_cost,      │
│   actuator_cost, handwheel_cost,                              │
│   unit_price: result.unitPrice,                               │
│   line_total: result.lineTotal,                               │
│   pricing_warnings: [...warnings],                             │
│   has_pricing_errors: false                                    │
│ })                                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ USER FEEDBACK                                                   │
├─────────────────────────────────────────────────────────────────┤
│ IF warnings.length > 0:                                         │
│   Show YELLOW toast (15s duration):                             │
│   "Price: ₹[unitPrice] — but [N] data gap(s) found"           │
│   Description: List of all warnings                             │
│ ELSE:                                                           │
│   Show GREEN toast:                                             │
│   "Price calculated: ₹[unitPrice] — all data found ✓"          │
│                                                                 │
│ User can now proceed to next step or edit & recalculate       │
└─────────────────────────────────────────────────────────────────┘
```

---

## SUMMARY

This document covers:

1. **Product Architecture:** 12 components with clear lookup tables and dependencies
2. **Pricing Relations:** How materials, weights, machining, and accessories connect
3. **Quote Generation:** 5-step wizard with client-side state management
4. **Cost Pipeline:** Complete lookup and calculation flow with error handling
5. **10-Step Pricing:** Margin-on-selling-price formula with defensive guards
6. **Admin Features:** 7 major admin sections covering all master data management

**Key Principles:**
- **Pure pricing engine:** No side effects, testable, reusable
- **Defensive data validation:** Critical errors block usage, warnings inform user
- **Client-side state:** Zustand store for smooth UX, server inserts atomically
- **Role-based access:** Admin full control, employees create own quotes
- **Audit trail:** All costs, margins, and parameters saved in quote_products snapshot

