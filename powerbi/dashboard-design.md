# Sales Analytics Dashboard — Design Specification

> **Status:** Approved layout  
> **Purpose:** Portfolio-grade sales performance analytics — actionable, not decorative.  
> **Audience:** Sales managers, regional leads, product owners.  
> **Data source:** MySQL `products` + `sales` (star schema).  
> **Mode:** Import (recommended for learning); DirectQuery optional later.

---

## Design Philosophy

| Principle | Application |
|-----------|-------------|
| **Insight-first** | Every visual answers a business question |
| **Filter-driven** | Global slicers shape the entire page consistently |
| **Visual hierarchy** | Filters → KPIs → Main Analytics → Secondary → Operations & Geography |
| **Modern SaaS aesthetic** | Clean whitespace, flat cards, muted palette, single accent |
| **No duplication** | Insight cards removed — KPIs and charts already convey the same information |
| **Laptop-optimized** | Fits 15.6" screen (1366×768) with minimal scrolling |

---

## Approved Page Layout

Single executive dashboard. Content max-width **1280px**, centered on wider screens.

```
┌───────────────────────────────────────────────┐
│ Filters                                        │
│ [Date Range] [State] [Category] [Product]     │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│ Revenue │ Orders │ AOV │ Growth │ Top Product │
└───────────────────────────────────────────────┘

┌──────────────────────┬────────────────────────┐
│                      │                        │
│    Revenue Trend     │ Revenue by Category    │
│    (Hero · Line)     │      (Donut)           │
│                      │                        │
└──────────────────────┴────────────────────────┘

┌──────────────────────┬────────────────────────┐
│ Revenue by State     │ Top Products (Top 10)  │
└──────────────────────┴────────────────────────┘

┌──────────────────────┬────────────────────────┐
│ Top Cities (Top 10)  │ Recent Sales           │
└──────────────────────┴────────────────────────┘
```

### Section breakdown

| Section | Visuals | Role |
|---------|---------|------|
| **Filters** | Date Range, State, Category, Product | Global context for all visuals |
| **KPI Cards** | 5 equal cards in one row | Headline metrics at a glance |
| **Main Analytics** | Revenue Trend + Revenue by Category | Trajectory + portfolio mix |
| **Secondary Analytics** | Revenue by State + Top Products | Geography + SKU ranking |
| **Operations & Geography** | Top Cities + Recent Sales | Micro-markets + transaction proof |

### Removed elements (duplication)

| Removed | Covered by |
|---------|------------|
| Top City KPI | **Top Cities** chart shows full ranking; #1 is visually obvious |
| Best Performing Product card | **Top Product** KPI + **Top Products** chart |
| Best Performing State card | **Revenue by State** chart |
| Product Contribution % card | **Top Products** chart (bar length = share) |
| Category Contribution % card | **Revenue by Category** donut |

---

## Data Model (Power BI)

### Tables & Relationship

```
products[product_id]  ──1:*──>  sales[product_id]
```

| Table | Role | Key columns |
|-------|------|-------------|
| `products` | Dimension | `product_id`, `product_name`, `category` |
| `sales` | Fact | `sale_id`, `product_id`, `quantity`, `unit_price`, `total_sales`, `state`, `city`, `sale_date`, `created_at` |

### Supporting date table (recommended)

Create `dim_date` in Power Query or DAX calendar table linked to `sales[sale_date]` for proper time intelligence and Date Range slicer.

| Column | Purpose |
|--------|---------|
| `Date` | Join to `sales.sale_date` |
| `Year`, `Quarter`, `Month`, `MonthName` | Trend axis hierarchy |

### Hide from report view

- `product_id`, `sale_id` (use names in visuals)
- `created_at` (operational only; hidden from slicers unless audit view added later)

---

## Filters Section

All slicers use **Sync Slicers** across the page. Category cascades to Product.

| Filter | Source field | Type | Business use |
|--------|--------------|------|--------------|
| **Date Range** | `dim_date[Date]` or `sales[sale_date]` | Between / Relative date | Focus on period: MTD, QTD, custom range |
| **State** | `sales[state]` | Multi-select dropdown | Regional performance comparison |
| **Category** | `products[category]` | Multi-select dropdown | Portfolio mix analysis |
| **Product** | `products[product_name]` | Search slicer / combobox | Drill into SKU performance |

**UX:**

- Horizontal filter strip in dedicated top section
- Light background panel (`#F9FAFB`) with 1px border — Stripe-style filter bar
- **Clear all** visible only when ≥ 1 filter is active
- Optional period label in page header: *"Jan 1 – Jun 7, 2026"*

---

## KPI Cards

Five equal cards in one row. Each shows **label** + **primary value** + **subtitle** where noted.

| KPI | Business question | Measure / logic | Display format |
|-----|-------------------|-----------------|----------------|
| **Total Revenue** | How much did we sell? | `SUM(sales[total_sales])` | Currency `$#,##0` |
| **Total Orders** | How many transactions? | `COUNTROWS(sales)` | `#,##0` |
| **Average Order Value** | What is typical deal size? | `[Total Revenue] / [Total Orders]` | Currency `$#,##0.00` |
| **Revenue Growth %** | Are we growing vs prior period? | Period-over-period % (see DAX below) | `%+0.0%;-0.0%` with ▲/▼ |
| **Top Product** | What drives revenue most? | Product with max revenue in filter context | Name + `$` revenue subtitle |

### DAX — Core measures

```dax
Total Revenue = SUM ( sales[total_sales] )

Total Orders = COUNTROWS ( sales )

Average Order Value =
DIVIDE ( [Total Revenue], [Total Orders], 0 )
```

### DAX — Top Product (card)

```dax
Top Product Revenue =
MAXX (
    VALUES ( products[product_name] ),
    CALCULATE ( [Total Revenue] )
)

Top Product Name =
VAR TopRev = [Top Product Revenue]
RETURN
    CALCULATE (
        SELECTEDVALUE ( products[product_name] ),
        FILTER (
            ALL ( products[product_name] ),
            CALCULATE ( [Total Revenue] ) = TopRev
        )
    )
```

### DAX — Revenue Growth %

Compares selected date range to **equal-length prior period** (standard SaaS metric).

```dax
Revenue Prior Period =
VAR MinDate = MIN ( sales[sale_date] )
VAR MaxDate = MAX ( sales[sale_date] )
VAR Days = DATEDIFF ( MinDate, MaxDate, DAY ) + 1
VAR PriorEnd = MinDate - 1
VAR PriorStart = PriorEnd - Days + 1
RETURN
    CALCULATE (
        [Total Revenue],
        sales[sale_date] >= PriorStart,
        sales[sale_date] <= PriorEnd
    )

Revenue Growth % =
VAR Current = [Total Revenue]
VAR Prior = [Revenue Prior Period]
RETURN
    DIVIDE ( Current - Prior, Prior, BLANK () )
```

**Card formatting:**

- KPI value: 24–28px semibold
- Growth %: green (`#059669`) if positive, red (`#DC2626`) if negative
- Equal card widths (~20% each), 1px border, 6px radius, no drop shadow

---

## Main Analytics Area

### Revenue Trend (Hero — left column, ~55%)

| Attribute | Value |
|-----------|-------|
| **Question** | Is revenue growing, flat, or declining? |
| **Type** | Line chart |
| **X-axis** | `dim_date[MonthName]` or `sale_date` (daily if range < 90 days) |
| **Y-axis** | `[Total Revenue]` |
| **Height** | ~280px |
| **Insight** | Spot seasonality, spikes, and slowdowns |
| **Action** | Investigate dips; reinforce growth periods |

**Design notes:** Single accent line (`#5B5BD6`). No area gradient. Horizontal grid lines only. Dynamic grain: daily < 60 days, monthly > 180 days.

---

### Revenue by Category (Donut — right column, ~45%)

| Attribute | Value |
|-----------|-------|
| **Question** | Which product lines carry the business? |
| **Type** | Donut chart |
| **Legend** | `products[category]` |
| **Values** | `[Total Revenue]` |
| **Height** | ~280px (matches Revenue Trend) |
| **Insight** | Portfolio concentration and category mix |
| **Action** | Balance underperforming categories or protect leaders |

**Design notes:** Center label shows `[Total Revenue]`. Max 6 slices; group remainder as "Other." Direct labels on slices > 5%.

---

## Secondary Analytics Area

### Revenue by State (left column, 50%)

| Attribute | Value |
|-----------|-------|
| **Question** | Which regions contribute most? |
| **Type** | Horizontal bar chart |
| **Axis** | `sales[state]` |
| **Values** | `[Total Revenue]` |
| **Height** | ~240px |
| **Sort** | Descending by revenue |
| **Insight** | Geographic strongholds vs whitespace |
| **Action** | Target marketing spend by state |

**Design notes:** Top bar uses accent fill; others muted gray. Revenue value at bar end. Horizontal bars preferred over map (works internationally, readable on laptop).

---

### Top Products — Top 10 (right column, 50%)

| Attribute | Value |
|-----------|-------|
| **Question** | Which SKUs drive the most revenue? |
| **Type** | Horizontal bar chart |
| **Y-axis** | `products[product_name]` |
| **X-axis** | `[Total Revenue]` |
| **Height** | ~240px |
| **Filter** | Top 10 by revenue |
| **Insight** | Pareto effect — few products often drive most revenue |
| **Action** | Promote, bundle, or protect top SKUs |

---

## Operations & Geography Area

### Top Cities — Top 10 (left column, 50%)

| Attribute | Value |
|-----------|-------|
| **Question** | Which cities outperform within selected states? |
| **Type** | Horizontal bar chart |
| **Y-axis** | `sales[city]` (display as `City, State`) |
| **X-axis** | `[Total Revenue]` |
| **Height** | ~260px |
| **Filter** | Top 10; respects State slicer |
| **Insight** | Micro-market demand pockets |
| **Action** | Local campaigns or rep assignment |

---

### Recent Sales Table (right column, 50%)

**Purpose:** Ground-truth verification — connects React data entry to dashboard aggregates.

| Column | Source | Format | Priority |
|--------|--------|--------|----------|
| Sale Date | `sales[sale_date]` | Short date | High |
| Product | `products[product_name]` | Text | High |
| Total Sales | `sales[total_sales]` | Currency | High |
| State | `sales[state]` | Text | Medium |
| City | `sales[city]` | Text | Medium |

**Settings:**

- Sort: `sale_date` DESC, then `sale_id` DESC
- Row limit: **Top 10–15** (compact to fit beside Top Cities without scrolling)
- Row height: ~36px; horizontal dividers only (no zebra)
- Title: "Recent Sales" + muted "Last 15" badge
- No totals row (transaction detail, not summary)

**Business use:** Validate new React entries appear after refresh; investigate outliers.

---

## Chart Sizing (15.6" Laptop)

Target viewport: **1366×768**. Page height budget ~720px content to minimize scrolling.

| Visual | Width | Height | Section |
|--------|-------|--------|---------|
| Filter bar | 100% | ~56px | Filters |
| KPI cards (×5) | 20% each | ~80px | KPIs |
| Revenue Trend | ~55% | ~280px | Main Analytics |
| Revenue by Category | ~45% | ~280px | Main Analytics |
| Revenue by State | 50% | ~240px | Secondary Analytics |
| Top Products | 50% | ~240px | Secondary Analytics |
| Top Cities | 50% | ~260px | Operations & Geography |
| Recent Sales | 50% | ~260px | Operations & Geography |

**Section gaps:** 16px between rows, 24px between major sections.

---

## Visual Theme (Modern SaaS)

| Element | Value |
|---------|-------|
| Page background | `#F9FAFB` |
| Card background | `#FFFFFF` |
| Card border | `#E5E7EB` 1px (flat, no shadow) |
| Primary accent | `#5B5BD6` — line chart, top bars, active filters |
| Text primary | `#111827` |
| Text secondary | `#6B7280` |
| Positive / negative | `#059669` / `#DC2626` |
| Corner radius | 6px |
| Typography | Segoe UI / Inter; KPI 24–28px semibold |

**Avoid:** 3D effects, insight duplicate cards, gauge widgets, pie charts with >6 slices.

---

## Visual Hierarchy (Reading Order)

```
1. Filters              → "What period and scope am I viewing?"
2. KPI row              → "What are the headline numbers?"
3. Revenue Trend        → "What's the trajectory?"
4. Revenue by Category  → "What's the mix?"
5. Revenue by State     → "Where geographically?"
6. Top Products         → "Which SKUs?"
7. Top Cities           → "Which micro-markets?"
8. Recent Sales         → "Show me the proof"
```

---

## Insight-to-Action Matrix

| If the user sees… | Likely action |
|-------------------|---------------|
| Revenue Growth % negative | Review pricing, weak states, or underperforming categories |
| One category > 60% of donut | Reduce portfolio concentration risk |
| Single product dominates Top Products | Diversify promotions or pricing |
| Revenue Trend dip in a month | Cross-check Recent Sales for data gaps or real slowdown |
| High AOV, low Total Orders | Focus on volume generation |
| Low AOV, high Total Orders | Upsell bundles or premium products |
| One state leads by wide margin | Replicate regional playbook elsewhere |

---

## SQL Queries (Analytics Layer)

Stored in `database/analytics/` for learning; Power BI can use the same logic. **No SQL changes required** for this layout update — existing queries already support all visuals.

| File | Supports visual |
|------|-----------------|
| `monthly_revenue.sql` | Revenue Trend |
| `sales_by_category.sql` | Revenue by Category |
| `sales_by_state.sql` | Revenue by State |
| `top_products.sql` | Top Products |
| `top_cities.sql` | Top Cities |
| `recent_sales.sql` | Recent Sales |

---

## Build Checklist

- [ ] Connect MySQL → Import `products`, `sales`
- [ ] Create relationship `products[product_id]` → `sales[product_id]`
- [ ] Add `dim_date` and link to `sales[sale_date]`
- [ ] Create DAX measures (folder: `_Metrics`)
- [ ] Build filter section with sync slicers
- [ ] Add 5 KPI cards (Revenue, Orders, AOV, Growth %, Top Product)
- [ ] Main Analytics: Revenue Trend + Category donut (50/50 row)
- [ ] Secondary Analytics: State + Top Products (50/50 row)
- [ ] Operations & Geography: Top Cities + Recent Sales (50/50 row)
- [ ] Apply theme colors and flat card styling
- [ ] Verify minimal scroll on 1366×768
- [ ] Test: enter sale in React → Refresh → verify KPIs and table

---

## Out of Scope

- Duplicated insight cards
- Top City KPI (Top Cities chart is sufficient)
- Random / decorative charts
- Inventory, CRM, or ERP screens
- Real-time streaming (Import refresh is sufficient for learning)
- Multiple report pages (single executive page; drill-through is Phase 2)
