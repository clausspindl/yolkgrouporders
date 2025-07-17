-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create company_profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  company_address TEXT,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  contact_person TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create group_orders table
CREATE TABLE IF NOT EXISTS group_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  venue TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  delivery_time TIME NOT NULL,
  budget DECIMAL(10,2) NOT NULL,
  team_size INTEGER NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_order_items table
CREATE TABLE IF NOT EXISTS group_order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_order_id UUID REFERENCES group_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_price DECIMAL(10,2) NOT NULL,
  product_category TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  added_by TEXT DEFAULT 'anonymous',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_order_items ENABLE ROW LEVEL SECURITY;

-- Company profiles policies
CREATE POLICY "Users can view their own company profile" ON company_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company profile" ON company_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company profile" ON company_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Group orders policies
CREATE POLICY "Anyone can view group orders" ON group_orders
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create group orders" ON group_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Order creators can update their orders" ON group_orders
  FOR UPDATE USING (auth.uid() = created_by);

-- Group order items policies
CREATE POLICY "Anyone can view group order items" ON group_order_items
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert group order items" ON group_order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update group order items" ON group_order_items
  FOR UPDATE USING (true);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE company_profiles;
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

-- Create triggers for updated_at
CREATE TRIGGER update_company_profiles_updated_at 
  BEFORE UPDATE ON company_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_orders_updated_at 
  BEFORE UPDATE ON group_orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 