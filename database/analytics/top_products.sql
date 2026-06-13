-- Top Products: revenue ranking with contribution %

SELECT
    p.product_name,
    p.category,
    SUM(s.total_sales) AS total_revenue,
    COUNT(s.sale_id)   AS total_orders,
    ROUND(
        SUM(s.total_sales) * 100.0 / SUM(SUM(s.total_sales)) OVER (),
        2
    ) AS product_contribution_pct
FROM sales s
INNER JOIN products p ON s.product_id = p.product_id
GROUP BY p.product_name, p.category
ORDER BY total_revenue DESC;
