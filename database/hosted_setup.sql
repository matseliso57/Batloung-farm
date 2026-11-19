-- Batloung Farm: ONE-FILE SETUP FOR A HOSTED MySQL DATABASE
-- Run this once, with the hosted database already selected (no CREATE DATABASE / USE lines).

-- ===== from database/schema.sql =====
-- Batloung Farm Distribution System: schema
-- Requires MySQL 8.0.16+ (CHECK constraints are enforced from that version)
-- NOTE: on hosted MySQL with a fixed database name, delete the CREATE DATABASE and USE lines.

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id    INT AUTO_INCREMENT PRIMARY KEY,
  business_name  VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  phone          VARCHAR(20)  NOT NULL UNIQUE,
  province ENUM('Gauteng','Free State','KwaZulu-Natal','Western Cape','Eastern Cape',
                'Limpopo','Mpumalanga','North West','Northern Cape') NOT NULL,
  address        VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS fruits (
  fruit_id    INT AUTO_INCREMENT PRIMARY KEY,
  fruit_name  VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  status      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS vendors (
  vendor_id         INT AUTO_INCREMENT PRIMARY KEY,
  vendor_name       VARCHAR(100) NOT NULL,
  phone_number      VARCHAR(20)  NOT NULL UNIQUE,
  location          VARCHAR(100) NOT NULL,
  registration_date DATE NOT NULL,
  latitude          DECIMAL(9,6) NULL,   -- map pin (optional)
  longitude         DECIMAL(9,6) NULL,
  CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE TABLE IF NOT EXISTS purchases (
  purchase_id   INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id   INT NOT NULL,
  purchase_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_amount  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS purchase_details (
  purchase_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id    INT NOT NULL,
  fruit_id       INT NOT NULL,
  quantity       INT NOT NULL CHECK (quantity > 0),
  unit_cost      DECIMAL(10,2) NOT NULL CHECK (unit_cost > 0),
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id) ON DELETE CASCADE,
  FOREIGN KEY (fruit_id)    REFERENCES fruits(fruit_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sales (
  sale_id        INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id      INT NOT NULL,
  sale_date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_status ENUM('PAID','PARTIALLY_PAID','UNPAID') NOT NULL DEFAULT 'UNPAID',
  total_amount   DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid    DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  CHECK (amount_paid <= total_amount),
  FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_details (
  sales_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id        INT NOT NULL,
  fruit_id       INT NOT NULL,
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  quantity       INT NOT NULL CHECK (quantity > 0),
  unit_price     DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
  FOREIGN KEY (sale_id)  REFERENCES sales(sale_id) ON DELETE CASCADE,
  FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id) ON DELETE RESTRICT
);

-- One row per fruit AND packaging size: separate stock and separate price for SMALL/MEDIUM/LARGE
CREATE TABLE IF NOT EXISTS stock (
  stock_id            INT AUTO_INCREMENT PRIMARY KEY,
  fruit_id            INT NOT NULL,
  packaging_size      ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  available_quantity  INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  selling_price       DECIMAL(10,2) NOT NULL CHECK (selling_price > 0),
  low_stock_threshold INT NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  UNIQUE KEY uq_fruit_size (fruit_id, packaging_size),
  FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id) ON DELETE RESTRICT
);

-- Extra table (9th) for payment management in Part D
CREATE TABLE IF NOT EXISTS payments (
  payment_id     INT AUTO_INCREMENT PRIMARY KEY,
  sale_id        INT NOT NULL,
  amount         DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method ENUM('CASH','MOBILE_MONEY') NOT NULL,
  payment_date   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE
);

-- Administrator logins (passwords are stored as scrypt hashes, never in plain text)
CREATE TABLE IF NOT EXISTS admins (
  admin_id      INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL DEFAULT 'Administrator',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== from database/seed.sql =====
INSERT INTO suppliers (business_name, contact_person, phone, province, address) VALUES
('Highveld Fresh Produce', 'Thabo Mokoena',  '+27110001111', 'Gauteng',      '12 Market Rd, Johannesburg'),
('Free State Orchards',    'Anna van Wyk',   '+27510002222', 'Free State',   'Farm 4, Bloemfontein'),
('Limpopo Tropical Farms', 'Sipho Maluleke', '+27150003333', 'Limpopo',      'R71, Tzaneen'),
('Cape Grape Growers',     'Lerato Naidoo',  '+27210004444', 'Western Cape', '5 Vine Lane, Paarl');

INSERT INTO fruits (fruit_name, description) VALUES
('Apples',  'Fresh red and green apples'),
('Bananas', 'Ripe yellow bananas'),
('Oranges', 'Juicy Valencia oranges'),
('Mangoes', 'Sweet seasonal mangoes'),
('Grapes',  'Seedless table grapes');

INSERT INTO vendors (vendor_name, phone_number, location, registration_date, latitude, longitude) VALUES
('Mpho Street Fruits',  '+26658001001', 'Maseru Central', '2026-01-10', -29.316700, 27.483300),
('Palesa Fresh Stall',  '+26658001002', 'Maseru West',    '2026-02-14', -29.305000, 27.455000),
('Tumelo Market Stand', '+26658001003', 'Ha Thetsane',    '2026-03-05', -29.338000, 27.462000),
('Neo Roadside Fruits', '+26658001004', 'Maseru East',    '2026-04-20', -29.325000, 27.510000);

-- One stock row per fruit x size, each size with a different selling price
INSERT INTO stock (fruit_id, packaging_size, available_quantity, selling_price, low_stock_threshold)
SELECT f.fruit_id, s.sz, 0,
       CASE s.sz WHEN 'SMALL' THEN 80 WHEN 'MEDIUM' THEN 140 ELSE 200 END, 10
FROM fruits f
CROSS JOIN (SELECT 'SMALL' AS sz UNION SELECT 'MEDIUM' UNION SELECT 'LARGE') s;

UPDATE stock SET selling_price = selling_price + 40 WHERE fruit_id = 4;   -- mangoes cost more
UPDATE stock SET available_quantity = 40 WHERE packaging_size = 'SMALL';
UPDATE stock SET available_quantity = 30 WHERE packaging_size = 'MEDIUM';
UPDATE stock SET available_quantity = 25 WHERE packaging_size = 'LARGE';
UPDATE stock SET available_quantity = 6  WHERE fruit_id = 1 AND packaging_size = 'LARGE'; -- 10-vs-6 demo
UPDATE stock SET available_quantity = 4  WHERE fruit_id = 2 AND packaging_size = 'SMALL'; -- low stock demo

INSERT INTO purchases (supplier_id, purchase_date, total_amount) VALUES
(1, '2026-10-28 09:00:00', 5600.00),
(2, '2026-10-30 11:30:00', 6200.00);
INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES
(1, 1, 30, 120.00, 'LARGE'), (1, 1, 40, 50.00, 'SMALL'),
(2, 2, 50, 80.00, 'MEDIUM'), (2, 4, 20, 110.00, 'MEDIUM');

INSERT INTO sales (vendor_id, sale_date, payment_status, total_amount, amount_paid) VALUES
(1, '2026-11-03 10:15:00', 'PAID',           1600.00, 1600.00),
(2, '2026-11-05 14:00:00', 'PARTIALLY_PAID', 2300.00, 1000.00),
(3, '2026-11-07 09:30:00', 'UNPAID',         1600.00,    0.00);
INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES
(1, 1, 'SMALL',  10,  80.00), (1, 1, 'LARGE',  4, 200.00),
(2, 2, 'MEDIUM', 10, 140.00), (2, 4, 'MEDIUM', 5, 180.00),
(3, 3, 'SMALL',  20,  80.00);
INSERT INTO payments (sale_id, amount, payment_method, payment_date) VALUES
(1, 1600.00, 'CASH', '2026-11-03 10:20:00'),
(2, 1000.00, 'MOBILE_MONEY', '2026-11-05 14:05:00');
