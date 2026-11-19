USE batloung_farm;

-- 1. Five most frequently sold fruits (by boxes)
SELECT f.fruit_name, SUM(sd.quantity) AS boxes_sold
FROM sales_details sd JOIN fruits f ON f.fruit_id = sd.fruit_id
GROUP BY f.fruit_id, f.fruit_name
ORDER BY boxes_sold DESC LIMIT 5;

-- 2. Total sales revenue in a date range (change the dates)
SELECT COALESCE(SUM(total_amount),0) AS total_revenue
FROM sales
WHERE sale_date >= '2026-11-01' AND sale_date < DATE_ADD('2026-11-30', INTERVAL 1 DAY);

-- 3. Vendor who purchased the highest number of boxes
SELECT v.vendor_id, v.vendor_name, SUM(sd.quantity) AS total_boxes
FROM sales s
JOIN sales_details sd ON sd.sale_id = s.sale_id
JOIN vendors v ON v.vendor_id = s.vendor_id
GROUP BY v.vendor_id, v.vendor_name
ORDER BY total_boxes DESC LIMIT 1;

-- 4. Current stock per fruit and packaging size
SELECT f.fruit_name, st.packaging_size, st.available_quantity
FROM stock st JOIN fruits f ON f.fruit_id = st.fruit_id
ORDER BY f.fruit_name, FIELD(st.packaging_size,'SMALL','MEDIUM','LARGE');

-- Manual transaction demo: the CHECK constraint stops negative stock, so we ROLLBACK.
-- Run the statements one at a time in Workbench.
BEGIN;
UPDATE stock SET available_quantity = available_quantity - 3  WHERE fruit_id = 3 AND packaging_size = 'SMALL';  -- ok
UPDATE stock SET available_quantity = available_quantity - 10 WHERE fruit_id = 1 AND packaging_size = 'LARGE';  -- fails (only 6)
ROLLBACK;
SELECT * FROM stock WHERE fruit_id IN (1,3);  -- unchanged
