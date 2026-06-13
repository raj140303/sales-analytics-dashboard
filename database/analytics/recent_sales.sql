-- Recent Sales: operational table (last 20 transactions)

SELECT
    s.sale_id,
    s.sale_date,
    p.product_name,
    p.category,
    s.city,
    s.state,
    s.quantity,
    s.unit_price,
    s.total_sales,
    s.created_at
FROM sales s
INNER JOIN products p ON s.product_id = p.product_id
ORDER BY s.sale_date DESC, s.sale_id DESC
LIMIT 20;
