-- Revenue Trend: monthly aggregation for line charts
-- Filters: apply date range, state, category, product in WHERE or via BI slicers

SELECT
    DATE_FORMAT(s.sale_date, '%Y-%m-01') AS month_start,
    YEAR(s.sale_date)                    AS sale_year,
    MONTH(s.sale_date)                   AS sale_month,
    SUM(s.total_sales)                   AS total_revenue,
    COUNT(s.sale_id)                     AS total_orders
FROM sales s
INNER JOIN products p ON s.product_id = p.product_id
GROUP BY
    DATE_FORMAT(s.sale_date, '%Y-%m-01'),
    YEAR(s.sale_date),
    MONTH(s.sale_date)
ORDER BY month_start;
