-- Run this ONCE on a database that was created before the map feature.
-- (Fresh installs using the updated schema.sql already have these columns.)
USE batloung_farm;

ALTER TABLE vendors
  ADD COLUMN latitude  DECIMAL(9,6) NULL,
  ADD COLUMN longitude DECIMAL(9,6) NULL,
  ADD CONSTRAINT chk_vendor_lat CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
  ADD CONSTRAINT chk_vendor_lng CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

-- Approximate sample pins around Maseru (you can move them on the map later)
UPDATE vendors SET latitude = -29.316700, longitude = 27.483300 WHERE vendor_name = 'Mpho Street Fruits';
UPDATE vendors SET latitude = -29.305000, longitude = 27.455000 WHERE vendor_name = 'Palesa Fresh Stall';
UPDATE vendors SET latitude = -29.338000, longitude = 27.462000 WHERE vendor_name = 'Tumelo Market Stand';
UPDATE vendors SET latitude = -29.325000, longitude = 27.510000 WHERE vendor_name = 'Neo Roadside Fruits';

SELECT vendor_id, vendor_name, latitude, longitude FROM vendors;
