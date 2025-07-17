-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create group_orders table
CREATE TABLE IF NOT EXISTS group_orders (
  id TEXT PRIMARY KEY,
  budget DECIMAL(10,2) NOT NULL,
  team_size INTEGER NOT NULL,
  deadline TEXT NOT NULL,
  venue TEXT NOT NULL,
  time TEXT NOT NULL,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('delivery', 'collection')),
  delivery_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_order_items table
CREATE TABLE IF NOT EXISTS group_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_order_id TEXT NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  product_category TEXT NOT NULL,
  product_image TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_spent DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_order_items_group_order_id ON group_order_items(group_order_id);
CREATE INDEX IF NOT EXISTS idx_group_order_items_person_name ON group_order_items(person_name);
CREATE INDEX IF NOT EXISTS idx_group_order_items_product_id ON group_order_items(product_id);

-- Enable Row Level Security
ALTER TABLE group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for group_orders table
CREATE POLICY "Allow public read access to group orders" ON group_orders
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to group orders" ON group_orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to group orders" ON group_orders
  FOR UPDATE USING (true);

-- Create policies for group_order_items table
CREATE POLICY "Allow public read access to group order items" ON group_order_items
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to group order items" ON group_order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to group order items" ON group_order_items
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to group order items" ON group_order_items
  FOR DELETE USING (true);

-- Enable real-time for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE group_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE group_order_items;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_group_orders_updated_at 
  BEFORE UPDATE ON group_orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_order_items_updated_at 
  BEFORE UPDATE ON group_order_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 