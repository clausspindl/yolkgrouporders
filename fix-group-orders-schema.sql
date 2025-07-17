-- Fix group_orders table schema to match the code expectations
-- This migration updates the table structure to match the TypeScript types

-- First, create a backup of existing data
CREATE TABLE IF NOT EXISTS group_orders_backup AS SELECT * FROM group_orders;

-- Drop the existing table
DROP TABLE IF EXISTS group_orders CASCADE;

-- Recreate the table with the correct schema
CREATE TABLE group_orders (
  id TEXT PRIMARY KEY,
  budget DECIMAL(10,2) NOT NULL,
  team_size INTEGER NOT NULL,
  deadline TEXT,
  venue TEXT,
  time TEXT,
  delivery_type TEXT CHECK (delivery_type IN ('delivery', 'collection')),
  delivery_address TEXT,
  payment_method TEXT DEFAULT 'card' CHECK (payment_method IN ('card', 'invoice')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'waiting_for_payment', 'finalized')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE group_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view group orders" ON group_orders
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create group orders" ON group_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Order creators can update their orders" ON group_orders
  FOR UPDATE USING (auth.uid() = created_by);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE group_orders;

-- Create trigger for updated_at
CREATE TRIGGER update_group_orders_updated_at 
  BEFORE UPDATE ON group_orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_orders_created_by ON group_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_group_orders_status ON group_orders(status);
CREATE INDEX IF NOT EXISTS idx_group_orders_id ON group_orders(id); 