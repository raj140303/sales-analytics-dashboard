-- Top Cities: micro-market performance

SELECT
    s.city,
    s.state,
    SUM(s.total_sales) AS total_revenue,
    COUNT(s.sale_id)   AS total_orders
FROM sales s
INNER JOIN products p ON s.product_id = p.product_id
GROUP BY s.city, s.state
ORDER BY total_revenue DESC;
