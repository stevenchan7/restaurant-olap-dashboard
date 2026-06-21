-- Seed restaurant tables (10 tables)
INSERT INTO restaurant_tables (table_number, capacity) VALUES
  ('T1', 2), ('T2', 2), ('T3', 4), ('T4', 4), ('T5', 4),
  ('T6', 6), ('T7', 6), ('T8', 8), ('T9', 8), ('T10', 10)
ON CONFLICT (table_number) DO NOTHING;

-- Seed menu items
INSERT INTO menu_items (name, price, category, description) VALUES
  -- Appetizers
  ('Spring Rolls',          35000,  'appetizer',  'Crispy vegetable spring rolls with sweet chili sauce'),
  ('Chicken Satay',         45000,  'appetizer',  'Grilled chicken skewers with peanut sauce'),
  ('Soup of the Day',       30000,  'appetizer',  'Chef''s daily soup selection'),
  ('Garlic Bread',          25000,  'appetizer',  'Toasted bread with garlic butter and herbs'),

  -- Main Course
  ('Nasi Goreng',           55000,  'main',       'Indonesian fried rice with egg and chicken'),
  ('Mie Goreng',            50000,  'main',       'Stir-fried noodles with vegetables and prawns'),
  ('Grilled Salmon',        125000, 'main',       'Atlantic salmon with lemon butter sauce'),
  ('Beef Rendang',          85000,  'main',       'Slow-cooked beef in coconut and spice'),
  ('Chicken Parmigiana',    95000,  'main',       'Breaded chicken with tomato sauce and cheese'),
  ('Veggie Stir Fry',       45000,  'main',       'Seasonal vegetables in oyster sauce'),

  -- Drinks
  ('Iced Tea',              15000,  'drink',      'Sweetened iced tea'),
  ('Fresh Juice',           25000,  'drink',      'Orange, watermelon, or mango'),
  ('Coffee',                20000,  'drink',      'Hot or iced Americano'),
  ('Bintang Beer',          45000,  'drink',      'Local Indonesian lager 330ml'),

  -- Desserts
  ('Es Cendol',             30000,  'dessert',    'Iced coconut milk with pandan jelly'),
  ('Chocolate Lava Cake',   55000,  'dessert',    'Warm chocolate cake with vanilla ice cream'),
  ('Pisang Goreng',         25000,  'dessert',    'Fried banana with palm sugar and coconut')
ON CONFLICT DO NOTHING;
