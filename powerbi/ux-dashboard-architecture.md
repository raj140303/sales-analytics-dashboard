# Sales Analytics Dashboard — UX/UI Architecture

> **Status:** Approved layout  
> **Standard:** Portfolio-grade · Modern SaaS admin panel quality bar  
> **Constraint:** No duplicated insights · No decorative charts · Laptop-first (15.6")

---

## 1. Design Thesis

This dashboard uses a **structured grid layout** optimized for a 15.6" laptop. Each section has a clear role; visuals earn space only when they answer a distinct business question.

### Core narrative

> *"How is revenue performing, what is driving it, where is it coming from, and can I verify the underlying transactions?"*

### Removed elements (duplication)

| Removed | Covered by |
|---------|------------|
| Top City KPI | **Top Cities** chart — #1 city is the longest bar |
| Best Performing Product card | **Top Product** KPI + **Top Products** chart |
| Best Performing State card | **Revenue by State** chart |
| Product Contribution % card | **Top Products** chart (bar length = share) |
| Category Contribution % card | **Revenue by Category** donut |

---

## 2. Approved Layout

```
┌───────────────────────────────────────────────┐
│ Filters                                        │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│ Revenue │ Orders │ AOV │ Growth │ Top Product │
└───────────────────────────────────────────────┘

┌──────────────────────┬────────────────────────┐
│    Revenue Trend     │ Revenue by Category    │
│                      │      (Donut)           │
└──────────────────────┴────────────────────────┘

┌──────────────────────┬────────────────────────┐
│ Revenue by State     │ Top Products (Top 10)│
└──────────────────────┴────────────────────────┘

┌──────────────────────┬────────────────────────┐
│ Top Cities (Top 10)  │ Recent Sales           │
└──────────────────────┴────────────────────────┘
```

### Section map

| # | Section | Layout | Visual weight |
|---|---------|--------|---------------|
| 1 | Filters | Full width | Light, functional |
| 2 | KPI Cards | 5 equal columns | High — headline metrics |
| 3 | Main Analytics | 55% / 45% split | **Highest** — hero trend + mix |
| 4 | Secondary Analytics | 50% / 50% | Medium — geography + SKUs |
| 5 | Operations & Geography | 50% / 50% | Medium — cities + proof |

---

## 3. Visual Language

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-page` | `#F9FAFB` | Page canvas |
| `--bg-surface` | `#FFFFFF` | Cards, charts, table |
| `--border-subtle` | `#E5E7EB` | 1px card borders |
| `--text-primary` | `#111827` | Headlines, KPI values |
| `--text-secondary` | `#6B7280` | Labels, axis text |
| `--accent` | `#5B5BD6` | Primary series, top bars, active filters |
| `--accent-muted` | `#EEF2FF` | Selected filter chip background |
| `--positive` | `#059669` | Revenue Growth ▲ |
| `--negative` | `#DC2626` | Revenue Growth ▼ |

### Typography

| Role | Size | Weight |
|------|------|--------|
| Page title | 20px | 600 |
| KPI value | 24–28px | 600 |
| KPI label | 12px | 400 |
| Chart title | 14px | 500 |
| Section label | 11px | 500 uppercase |

### Spacing (8px base)

| Token | px | Use |
|-------|-----|-----|
| Section gap | 16–24 | Between layout rows |
| Card padding | 20–24 | Inside each visual container |
| Grid gap | 16 | Between side-by-side charts |
| Filter bar height | ~56 | Top filter section |

### Surfaces

- Flat cards: 1px border, 6px radius, no drop shadow
- Chart grid lines: horizontal only, `#F3F4F6`

---

## 4. Desktop Layout (15.6" Laptop)

**Target:** 1366×768 minimum · 1280px content max-width centered  
**Goal:** Full dashboard visible with **minimal scrolling** (~720px usable height)

### Chart sizing

| Visual | Width | Height |
|--------|-------|--------|
| Filters | 100% | ~56px |
| KPI cards (×5) | 20% each | ~80px |
| Revenue Trend | ~55% | ~280px |
| Revenue by Category | ~45% | ~280px |
| Revenue by State | 50% | ~240px |
| Top Products | 50% | ~240px |
| Top Cities | 50% | ~260px |
| Recent Sales | 50% | ~260px |

### Height budget (approximate)

| Section | Height |
|---------|--------|
| Filters | 56px |
| KPI row | 80px |
| Main Analytics | 280px |
| Secondary Analytics | 240px |
| Operations & Geography | 260px |
| Gaps (×4) | 64px |
| **Total** | **~980px** |

On 1366×768, user scrolls ~260px — acceptable for portfolio demo. To reduce further: shorten Recent Sales to 10 rows and lower chart heights by 20px each.

---

## 5. Filters Section

| Filter | Control | Notes |
|--------|---------|-------|
| Date Range | Between slicer with presets | Last 7d · 30d · MTD · QTD · Custom |
| State | Multi-select | Searchable if > 8 states |
| Category | Multi-select | Cascades Product list |
| Product | Search slicer | Filtered by Category |

**UX rules:**

- Dedicated full-width strip at top
- Clear all appears only when filters are active
- All slicers synced across page

---

## 6. KPI Cards

Five equal cards in one horizontal row.

| # | KPI | Display |
|---|-----|---------|
| 1 | Total Revenue | Currency, primary headline |
| 2 | Total Orders | Integer count |
| 3 | Average Order Value | Currency, 2 decimals |
| 4 | Revenue Growth % | Percentage with ▲/▼ and color |
| 5 | Top Product | Product name + revenue subtitle |

**Not included:** Top City — covered by Top Cities chart in Operations & Geography section.

---

## 7. Chart Justification

### Revenue Trend (Hero — Main Analytics, left)

| | |
|---|---|
| **Why it exists** | Only time-series visual on the dashboard |
| **Business question** | Is revenue growing, flat, or declining? |
| **Why it earns space** | Largest chart in the primary analytics row; anchors the narrative |

### Revenue by Category (Main Analytics, right)

| | |
|---|---|
| **Why it exists** | Shows portfolio mix in one glance |
| **Business question** | Which product lines carry the business? |
| **Why it earns space** | Pairs with trend to answer "how much" + "what mix"; replaces Category Contribution card |

### Revenue by State (Secondary Analytics, left)

| | |
|---|---|
| **Why it exists** | State-level geographic performance |
| **Business question** | Which regions contribute most? |
| **Why it earns space** | Longest bar = best state; replaces Best State insight card |

### Top Products — Top 10 (Secondary Analytics, right)

| | |
|---|---|
| **Why it exists** | SKU-level ranking below category view |
| **Business question** | Which products should we promote or protect? |
| **Why it earns space** | Bar length = contribution %; replaces Product Contribution card |

### Top Cities — Top 10 (Operations & Geography, left)

| | |
|---|---|
| **Why it exists** | City-level demand within states |
| **Business question** | Which micro-markets outperform? |
| **Why it earns space** | Replaces Top City KPI; shows full ranking not just #1 |

### Recent Sales (Operations & Geography, right)

| | |
|---|---|
| **Why it exists** | Row-level proof behind aggregates |
| **Business question** | Can I verify individual transactions? |
| **Why it earns space** | Only element showing transaction detail; critical for React → MySQL → PBI portfolio demo |

---

## 8. Visual Hierarchy

```
Filters           → scope
KPI row           → headline
Revenue Trend     → trajectory (hero)
Category donut    → mix
State bars        → geography
Top Products      → SKU leaders
Top Cities        → city leaders
Recent Sales      → proof
```

**Eye path:** Filters → KPIs left-to-right → Trend → Category → down to State/Products → Cities/Sales.

---

## 9. Responsive Strategy

### Desktop (≥ 1280px)

Approved layout as specified. 1280px max-width, centered.

### Tablet (768px – 1024px)

Single column, priority order preserved:

1. Filters (2×2 grid)
2. KPI strip (scroll horizontally or wrap 3+2)
3. Revenue Trend → Category → State → Products → Cities → Recent Sales (stacked full width)

### Mobile (< 768px)

1. Date Range exposed; other filters in "More filters" drawer
2. KPI cards: 2-column grid
3. Charts: stacked, accordions optional for Secondary and Operations sections
4. Recent Sales: show Date, Product, Total Sales only

---

## 10. Recent Sales Table UX

| Column | Desktop | Mobile |
|--------|---------|--------|
| Sale Date | ✓ | ✓ |
| Product | ✓ | ✓ |
| Total Sales | ✓ | ✓ |
| State | ✓ | — |
| City | ✓ | — |

- 10–15 rows max (fits beside Top Cities without excess scroll)
- Sort: `sale_date` DESC
- Sticky header within card
- Empty state: "No sales in this period"

---

## 11. Power BI Build Notes

- Canvas: 1280px wide with margins
- Group visuals into section background containers (subtle border)
- 5 separate KPI card visuals, equal width
- Main Analytics row: ~55/45 split for Trend vs Category
- Bottom row: 50/50 Top Cities vs Recent Sales
- Sync all slicers; cascade Category → Product
- Recent Sales: TopN filter, sort `sale_date` DESC

---

## 12. Decision Log

| Decision | Why |
|----------|-----|
| 5 KPIs, no Top City | Top Cities chart provides richer city ranking |
| Trend + Category in Main Analytics | Primary narrative pair: trajectory + mix |
| Cities + Sales in bottom row | Geography detail alongside operational proof |
| Equal KPI row | Approved layout; scannable headline strip |
| Horizontal bars over map | International-friendly; readable on laptop |
| Insight cards removed | Pure duplication of KPIs and charts |
| No SQL changes needed | Existing analytics queries support all visuals |

---

## 13. Approval Checklist

- [x] Approved wireframe layout
- [x] 5 KPI cards (no Top City)
- [x] Insight cards removed
- [x] Main / Secondary / Operations sections defined
- [x] 15.6" laptop sizing documented
- [x] Responsive strategies documented
- [ ] `.pbix` build (after seed data + API exist)
