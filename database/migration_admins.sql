-- Run ONCE on a database created before the login feature.
-- (Fresh installs using the updated schema.sql already have this table.)
USE batloung_farm;

CREATE TABLE IF NOT EXISTS admins (
  admin_id      INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,          -- scrypt hash, never the real password
  full_name     VARCHAR(100) NOT NULL DEFAULT 'Administrator',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The first admin is created automatically when the server starts, from
-- ADMIN_USERNAME and ADMIN_PASSWORD in your .env file.
SELECT * FROM admins;
