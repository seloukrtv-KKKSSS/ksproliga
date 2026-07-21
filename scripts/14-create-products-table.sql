-- Create products table for KS Shop
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  old_price NUMERIC(10, 2),
  images TEXT[] NOT NULL DEFAULT '{}',
  badge VARCHAR(50),
  instagram_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial sample products for KS Shop if empty
INSERT INTO products (title, description, price, old_price, images, badge, instagram_url, is_available, sort_order)
SELECT 
  'Офіційний М''яч KS LIGA Pro 2025',
  'Професійний футбольний м''яч із термосклеєними панелями та сертифікатом FIFA Quality Pro. Чудове зчеплення з полем за будь-якої погоди.',
  1490,
  1800,
  ARRAY['https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80'],
  'ХІТ',
  'https://www.instagram.com/ks_fan.shop/',
  true,
  1
WHERE NOT EXISTS (SELECT 1 FROM products);

INSERT INTO products (title, description, price, old_price, images, badge, instagram_url, is_available, sort_order)
SELECT 
  'Ігрова Форма KS LIGA Official Kit',
  'Легка дихальна техніка тканини з технологією Dri-FIT. Сучасний ергономічний крій, стійкість до багаторазового прання.',
  1250,
  1500,
  ARRAY['https://images.unsplash.com/photo-1580086319619-3ed498161c77?w=800&auto=format&fit=crop&q=80'],
  'НОВИНКА',
  'https://www.instagram.com/ks_fan.shop/',
  true,
  2
WHERE NOT EXISTS (SELECT 1 FROM products WHERE title = 'Ігрова Форма KS LIGA Official Kit');

INSERT INTO products (title, description, price, old_price, images, badge, instagram_url, is_available, sort_order)
SELECT 
  'Фірмове Худі KS LIGA Black Edition',
  'Тепле та стильне худі з високоякісної бавовни з флісовим утепленням. Об''ємний капюшон та фірмова вишивка логотипу.',
  1650,
  NULL,
  ARRAY['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80'],
  'ТОП',
  'https://www.instagram.com/ks_fan.shop/',
  true,
  3
WHERE NOT EXISTS (SELECT 1 FROM products WHERE title = 'Фірмове Худі KS LIGA Black Edition');
