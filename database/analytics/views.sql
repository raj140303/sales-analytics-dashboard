USE sales_analytics;

-- =====================================================
-- SQL Views for Power BI / Portfolio Analytics
-- Project: Sales Analytics Learning System
-- Purpose: Prepare reusable SQL-based analytics layer
-- =====================================================


-- =====================================================
-- 1. Enriched Sales View
-- Combines sales transactions with product master data.
-- This is the main base view for analysis.
-- =====================================================

CREATE OR REPLACE VIEW vw_sales_enriched AS
SELECT
    s.sale_id,
    s.customer_name,
    s.product_id,
    p.product_name,
    p.category,
    s.quantity,
    s.unit_price,
    s.total_sales,
    TRIM(s.state) AS state,
    LOWER(TRIM(s.state)) AS state_key,
    TRIM(s.city) AS city,
    LOWER(TRIM(s.city)) AS city_key,
    s.sale_date,
    YEAR(s.sale_date) AS sale_year,
    MONTH(s.sale_date) AS sale_month_number,
    DATE_FORMAT(s.sale_date, '%Y-%m-01') AS month_start,
    DATE_FORMAT(s.sale_date, '%b %Y') AS sale_month,
    s.created_at
FROM sales s
INNER JOIN products p
    ON s.product_id = p.product_id;


-- =====================================================
-- 2. KPI Summary View
-- Provides overall business KPIs.
-- =====================================================

CREATE OR REPLACE VIEW vw_kpi_summary AS
SELECT
    SUM(total_sales) AS total_revenue,
    COUNT(*) AS total_orders,
    ROUND(SUM(total_sales) / COUNT(*), 2) AS average_order_value,
    COUNT(DISTINCT customer_name) AS unique_customers,
    COUNT(DISTINCT product_id) AS products_sold,
    MIN(sale_date) AS first_sale_date,
    MAX(sale_date) AS latest_sale_date
FROM sales;


-- =====================================================
-- 3. Monthly Sales View
-- Used for monthly revenue trend.
-- =====================================================

CREATE OR REPLACE VIEW vw_monthly_sales AS
SELECT
    DATE_FORMAT(sale_date, '%Y-%m-01') AS month_start,
    DATE_FORMAT(sale_date, '%b %Y') AS sale_month,
    YEAR(sale_date) AS sale_year,
    MONTH(sale_date) AS sale_month_number,
    SUM(total_sales) AS monthly_revenue,
    COUNT(*) AS total_orders,
    SUM(quantity) AS total_units_sold,
    ROUND(SUM(total_sales) / COUNT(*), 2) AS average_order_value
FROM sales
GROUP BY
    DATE_FORMAT(sale_date, '%Y-%m-01'),
    DATE_FORMAT(sale_date, '%b %Y'),
    YEAR(sale_date),
    MONTH(sale_date)
ORDER BY month_start;


-- =====================================================
-- 4. Product Performance View
-- Shows revenue/order performance for every product.
-- Includes products with no sales also.
-- =====================================================

CREATE OR REPLACE VIEW vw_product_performance AS
SELECT
    p.product_id,
    p.product_name,
    p.category,
    COUNT(s.sale_id) AS total_orders,
    COALESCE(SUM(s.quantity), 0) AS total_units_sold,
    COALESCE(SUM(s.total_sales), 0) AS total_revenue,
    ROUND(COALESCE(AVG(s.unit_price), 0), 2) AS average_unit_price,
    MAX(s.sale_date) AS latest_sale_date
FROM products p
LEFT JOIN sales s
    ON p.product_id = s.product_id
GROUP BY
    p.product_id,
    p.product_name,
    p.category
ORDER BY total_revenue DESC;


-- =====================================================
-- 5. Category Performance View
-- Shows category-wise revenue and order performance.
-- =====================================================

CREATE OR REPLACE VIEW vw_category_performance AS
SELECT
    p.category,
    COUNT(s.sale_id) AS total_orders,
    COALESCE(SUM(s.quantity), 0) AS total_units_sold,
    COALESCE(SUM(s.total_sales), 0) AS total_revenue,
    ROUND(COALESCE(SUM(s.total_sales) / COUNT(s.sale_id), 0), 2) AS average_order_value
FROM products p
LEFT JOIN sales s
    ON p.product_id = s.product_id
GROUP BY
    p.category
ORDER BY total_revenue DESC;


-- =====================================================
-- 6. State Performance View
-- Groups states case-insensitively using state_key.
-- Example: gujarat / Gujarat / GUJARAT grouped together.
-- =====================================================

CREATE OR REPLACE VIEW vw_state_performance AS
SELECT
    LOWER(TRIM(state)) AS state_key,
    MIN(TRIM(state)) AS state,
    COUNT(*) AS total_orders,
    SUM(quantity) AS total_units_sold,
    SUM(total_sales) AS total_revenue,
    ROUND(SUM(total_sales) / COUNT(*), 2) AS average_order_value,
    COUNT(DISTINCT customer_name) AS unique_customers
FROM sales
GROUP BY
    LOWER(TRIM(state))
ORDER BY total_revenue DESC;


-- =====================================================
-- 7. City Performance View
-- Groups cities case-insensitively using city_key.
-- =====================================================

CREATE OR REPLACE VIEW vw_city_performance AS
SELECT
    LOWER(TRIM(state)) AS state_key,
    MIN(TRIM(state)) AS state,
    LOWER(TRIM(city)) AS city_key,
    MIN(TRIM(city)) AS city,
    COUNT(*) AS total_orders,
    SUM(quantity) AS total_units_sold,
    SUM(total_sales) AS total_revenue,
    ROUND(SUM(total_sales) / COUNT(*), 2) AS average_order_value,
    COUNT(DISTINCT customer_name) AS unique_customers
FROM sales
GROUP BY
    LOWER(TRIM(state)),
    LOWER(TRIM(city))
ORDER BY total_revenue DESC;


-- =====================================================
-- 8. Products Without Sales View
-- Shows products available in product master but never sold.
-- =====================================================

CREATE OR REPLACE VIEW vw_products_without_sales AS
SELECT
    p.product_id,
    p.product_name,
    p.category
FROM products p
LEFT JOIN sales s
    ON p.product_id = s.product_id
WHERE s.sale_id IS NULL
ORDER BY
    p.category,
    p.product_name;


-- =====================================================
-- 9. Product-State Performance View
-- Useful for comparing product performance across states.
-- =====================================================

CREATE OR REPLACE VIEW vw_product_state_performance AS
SELECT
    p.product_id,
    p.product_name,
    p.category,
    LOWER(TRIM(s.state)) AS state_key,
    MIN(TRIM(s.state)) AS state,
    COUNT(s.sale_id) AS total_orders,
    SUM(s.quantity) AS total_units_sold,
    SUM(s.total_sales) AS total_revenue,
    ROUND(SUM(s.total_sales) / COUNT(s.sale_id), 2) AS average_order_value
FROM sales s
INNER JOIN products p
    ON s.product_id = p.product_id
GROUP BY
    p.product_id,
    p.product_name,
    p.category,
    LOWER(TRIM(s.state))
ORDER BY
    p.product_name,
    total_revenue DESC;


-- =====================================================
-- 10. Category-State Performance View
-- Useful for category performance by geography.
-- =====================================================

CREATE OR REPLACE VIEW vw_category_state_performance AS
SELECT
    p.category,
    LOWER(TRIM(s.state)) AS state_key,
    MIN(TRIM(s.state)) AS state,
    COUNT(s.sale_id) AS total_orders,
    SUM(s.quantity) AS total_units_sold,
    SUM(s.total_sales) AS total_revenue,
    ROUND(SUM(s.total_sales) / COUNT(s.sale_id), 2) AS average_order_value
FROM sales s
INNER JOIN products p
    ON s.product_id = p.product_id
GROUP BY
    p.category,
    LOWER(TRIM(s.state))
ORDER BY
    p.category,
    total_revenue DESC;