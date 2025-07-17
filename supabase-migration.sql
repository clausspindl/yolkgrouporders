-- Migration script to add created_by column and update policies
-- This script handles existing policies safely

-- Add created_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'group_orders' AND column_name = 'created_by') THEN
        ALTER TABLE group_orders ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'group_orders' AND column_name = 'status') THEN
        ALTER TABLE group_orders ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized'));
    END IF;
END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_group_orders_created_by ON group_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_group_orders_status ON group_orders(status);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert access to group orders" ON group_orders;
DROP POLICY IF EXISTS "Allow public update access to group orders" ON group_orders;

-- Create new policies
CREATE POLICY "Allow authenticated users to create group orders" ON group_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow creators to update their group orders" ON group_orders
  FOR UPDATE USING (auth.uid() = created_by);

-- Keep existing read policy (it should already exist)
-- CREATE POLICY "Allow public read access to group orders" ON group_orders
--   FOR SELECT USING (true); 