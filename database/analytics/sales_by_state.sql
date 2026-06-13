-- Revenue by State: regional performance

SELECT
    s.state,
    SUM(s.total_sales) AS total_revenue,
    COUNT(s.sale_id)   AS total_orders,
    ROUND(AVG(s.total_sales), 2) AS avg_order_value
FROM sales s
INNER JOIN products p ON s.product_id = p.product_id
GROUP BY s.state
ORDER BY total_revenue DESC;
