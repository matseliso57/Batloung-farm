-- Batloung Farm Distribution System: schema
-- Requires MySQL 8.0.16+ (CHECK constraints are enforced from that version)
-- NOTE: on hosted MySQL with a fixed database name, delete the CREATE DATABASE and USE lines.

CREATE DATABASE IF NOT EXISTS batloung_farm
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE batloung_farm;

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
