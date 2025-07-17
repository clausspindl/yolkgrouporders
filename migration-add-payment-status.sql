-- Migration: Add 'waiting_for_payment' status to group_orders table

-- First, drop the existing check constraint
ALTER TABLE group_orders DROP CONSTRAINT IF EXISTS group_orders_status_check;

-- Add the new check constraint with the additional status
ALTER TABLE group_orders ADD CONSTRAINT group_orders_status_check 
  CHECK (status IN ('draft', 'waiting_for_payment', 'finalized'));

-- Update any existing 'finalized' orders to 'waiting_for_payment' if they haven't been paid yet
-- (This is optional - you can run this if you want to update existing orders)
-- UPDATE group_orders SET status = 'waiting_for_payment' WHERE status = 'finalized'; 