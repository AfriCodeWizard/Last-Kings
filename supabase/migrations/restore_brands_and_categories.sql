-- Restore Brands and Categories Migration
-- This migration restores all brands and categories from the product catalog
-- Run this after reset_system_data.sql to restore the catalog structure

-- Insert all categories
INSERT INTO categories (name) VALUES
  -- Liquor categories
  ('Beers/Lagers/Stouts'),
  ('Ciders/RTDs'),
  ('Whisky'),
  ('Vodka'),
  ('Gin'),
  ('Brandy'),
  ('Rum'),
  ('Wines'),
  ('Local Spirits'),
  ('Other Spirits'),
  -- Beverage categories
  ('Energy Drinks'),
  ('Soft Drinks'),
  ('Juices'),
  ('Water')
ON CONFLICT (name) DO NOTHING;

-- Insert all brands
INSERT INTO brands (name) VALUES
  -- Beers/Lagers/Stouts
  ('Tusker'),
  ('Lite'),
  ('Smooth'),
  ('Guinness'),
  ('Pilsner'),
  ('White Cap'),
  ('Manyatta'),
  ('Balozi'),
  ('Heineken'),
  -- Ciders/RTDs
  ('Hunters'),
  ('Savanna'),
  ('Black Ice'),
  ('Pineapple Punch'),
  ('Guarana'),
  -- Whisky
  ('J. Walker Red Label'),
  ('J. Walker Black Label'),
  ('Vat 69'),
  ('Bond 7'),
  ('County'),
  ('Napoleon'),
  ('Kenya Kane'),
  ('Kenya King'),
  ('Black & White'),
  ('Singleton'),
  -- Vodka
  ('Chrome'),
  ('Best Vodka'),
  ('Regular Vodka'),
  -- Gin
  ('Gilbey''s'),
  ('Gordon''s'),
  ('Best Gin Blue'),
  ('Gin/Vodka mix'),
  -- Brandy
  ('Viceroy'),
  ('Richot'),
  ('Meakins'),
  ('Mr Dowell'),
  -- Rum
  ('Captain Morgan'),
  ('Muckpit'),
  -- Wines
  ('4th Street'),
  ('Four Cousins'),
  ('Drostdyhof'),
  ('Caprice'),
  ('Casabuena'),
  -- Local Spirits
  ('Kibao'),
  ('KC Pineapple'),
  ('KC Ginger'),
  ('Triple Ace'),
  -- Other Spirits
  ('Bond'),
  ('Best Gin/Vodka'),
  -- Energy Drinks
  ('Red Bull'),
  ('Predator'),
  ('Monster'),
  -- Soft Drinks
  ('Coca-Cola'),
  ('Sprite'),
  ('Pepsi'),
  ('Minute Maid'),
  ('Soda'),
  -- Juices
  ('Delmonte 1L'),
  -- Water
  ('Water 1L')
ON CONFLICT (name) DO NOTHING;

