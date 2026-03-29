-- ==================== PARKING ORDERS TABLE ====================
-- Run this SQL to create the parking_orders table for payment tracking
-- This table stores all parking reservation payment orders

CREATE TABLE IF NOT EXISTS `parking_orders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `booking_code` VARCHAR(50) UNIQUE NOT NULL,
  `order_id` VARCHAR(100) UNIQUE NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `status` ENUM('pending', 'confirmed', 'failed', 'cancelled') DEFAULT 'pending',
  `payment_method` VARCHAR(50) DEFAULT 'wspay',
  `transaction_id` VARCHAR(100),
  `authorization_code` VARCHAR(100),
  `parking_address` VARCHAR(255),
  `parking_space` VARCHAR(10),
  `vehicle` VARCHAR(50),
  `reservation_date` DATE,
  `start_time` TIME,
  `end_time` TIME,
  `metadata` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `payment_confirmed_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key to users table (adjust to your actual user table name)
  -- Uncomment if you have a users table with ID_korisnika
  -- FOREIGN KEY (`user_id`) REFERENCES `Korisnik`(`ID_korisnika`) ON DELETE CASCADE,
  
  -- Indexes for fast queries
  KEY `idx_user_id` (`user_id`),
  KEY `idx_booking_code` (`booking_code`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================== VIEW FOR ACTIVE RESERVATIONS ====================
-- Optional: Create a view to get active parking reservations
CREATE OR REPLACE VIEW `v_active_reservations` AS
SELECT 
  po.id,
  po.user_id,
  po.booking_code,
  po.parking_address,
  po.parking_space,
  po.vehicle,
  po.amount,
  po.status,
  po.reservation_date,
  po.start_time,
  po.end_time,
  po.created_at
FROM parking_orders po
WHERE po.status = 'confirmed'
  AND po.reservation_date >= CURDATE()
ORDER BY po.reservation_date, po.start_time;

-- ==================== INDEXES FOR PERFORMANCE ====================
-- These are created above, but here's reference documentation

-- Get all orders for a user
-- SELECT * FROM parking_orders WHERE user_id = ? ORDER BY created_at DESC;

-- Get order by booking code
-- SELECT * FROM parking_orders WHERE booking_code = ?;

-- Get all confirmed orders
-- SELECT * FROM parking_orders WHERE status = 'confirmed' ORDER BY created_at DESC;

-- Get today's parking reservations
-- SELECT * FROM parking_orders WHERE DATE(reservation_date) = CURDATE() AND status = 'confirmed';
