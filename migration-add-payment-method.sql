-- Migration: Add payment_method field to group_orders table

-- Add payment_method column to group_orders table
ALTER TABLE group_orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'card' CHECK (payment_method IN ('card', 'invoice'));

-- Update existing orders to have a default payment method
UPDATE group_orders 
SET payment_method = 'card' 
WHERE payment_method IS NULL; 