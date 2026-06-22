-- ============================================
-- BLOG & CONTENT MARKETING SYSTEM
-- Migration: 0005_blog_schema.sql
-- ============================================

-- Blog Categories
CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📝',
  color TEXT DEFAULT '#7c3aed',
  post_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_categories_slug ON blog_categories(slug);

-- Blog Tags
CREATE TABLE blog_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_tags_slug ON blog_tags(slug);

-- Blog Authors (extends users)
CREATE TABLE blog_authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  post_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_authors_slug ON blog_authors(slug);

-- Blog Posts
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  author_id UUID REFERENCES blog_authors(id) ON DELETE SET NULL,
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  tags JSONB DEFAULT '[]',
  seo_title TEXT,
  seo_description TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  read_time_minutes INT DEFAULT 5,
  is_featured BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX idx_blog_posts_featured ON blog_posts(is_featured);
CREATE INDEX idx_blog_posts_trending ON blog_posts(is_trending);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_created ON blog_posts(created_at DESC);

-- Blog Post Tags Junction
CREATE TABLE blog_post_tags (
  post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Newsletter Subscribers
CREATE TABLE blog_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  source TEXT DEFAULT 'blog',
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX idx_blog_subscribers_email ON blog_subscribers(email);
CREATE INDEX idx_blog_subscribers_status ON blog_subscribers(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_subscribers ENABLE ROW LEVEL SECURITY;

-- Public read for published posts
CREATE POLICY "Anyone can read published blog posts"
  ON blog_posts FOR SELECT
  USING (status = 'published');

-- Admin full access for blog posts
CREATE POLICY "Admins can manage all blog posts"
  ON blog_posts FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- Public read for categories
CREATE POLICY "Anyone can read blog categories"
  ON blog_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage blog categories"
  ON blog_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- Public read for tags
CREATE POLICY "Anyone can read blog tags"
  ON blog_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage blog tags"
  ON blog_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- Public read for authors
CREATE POLICY "Anyone can read blog authors"
  ON blog_authors FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage blog authors"
  ON blog_authors FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- Public read for post tags
CREATE POLICY "Anyone can read blog post tags"
  ON blog_post_tags FOR SELECT
  USING (true);

-- Newsletter subscribers - insert only for public
CREATE POLICY "Anyone can subscribe to newsletter"
  ON blog_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage subscribers"
  ON blog_subscribers FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- ============================================
-- UPDATE TRIGGER
-- ============================================

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Default categories
INSERT INTO blog_categories (name, slug, description, emoji, color) VALUES
  ('Wedding Photography', 'wedding-photography', 'Tips and guides for capturing perfect wedding moments', '💍', '#ec4899'),
  ('Birthday Photography', 'birthday-photography', 'Creative ideas for birthday photo collections', '🎂', '#f97316'),
  ('Corporate Events', 'corporate-events', 'Professional event photography for businesses', '🏢', '#3b82f6'),
  ('Event Marketing', 'event-marketing', 'Strategies to market your events effectively', '📣', '#8b5cf6'),
  ('Photo Sharing', 'photo-sharing', 'Best practices for sharing event photos', '📸', '#10b981'),
  ('QR Code Galleries', 'qr-code-galleries', 'Using QR codes to create instant photo galleries', '📱', '#6366f1'),
  ('AI Face Search', 'ai-face-search', 'How AI powers instant face recognition in events', '🤖', '#f59e0b'),
  ('Event Planning', 'event-planning', 'Complete guides for planning unforgettable events', '📅', '#14b8a6'),
  ('Photography Business', 'photography-business', 'Grow your photography business with Snapsy', '💼', '#64748b'),
  ('Product Updates', 'product-updates', 'Latest features and updates from the Snapsy team', '🚀', '#7c3aed');

-- Default author
INSERT INTO blog_authors (name, slug, bio, avatar_url) VALUES
  ('Snapsy Team', 'snapsy-team', 'The Snapsy product and content team, sharing expert tips on event photography and photo sharing.', 'https://ui-avatars.com/api/?name=Snapsy+Team&background=7c3aed&color=fff&size=200'),
  ('Ananya Sharma', 'ananya-sharma', 'Wedding photographer and event storyteller. Passionate about capturing authentic moments.', 'https://ui-avatars.com/api/?name=Ananya+Sharma&background=ec4899&color=fff&size=200'),
  ('Rahit Verma', 'rahit-verma', 'Event technology enthusiast and QR gallery pioneer.', 'https://ui-avatars.com/api/?name=Rahit+Verma&background=3b82f6&color=fff&size=200'),
  ('Deo Malik', 'deo-malik', 'AI researcher specializing in computer vision for event photography.', 'https://ui-avatars.com/api/?name=Deo+Malik&background=10b981&color=fff&size=200');

-- Default tags
INSERT INTO blog_tags (name, slug) VALUES
  ('QR Code', 'qr-code'),
  ('Wedding', 'wedding'),
  ('AI', 'ai'),
  ('Face Search', 'face-search'),
  ('Photo Gallery', 'photo-gallery'),
  ('Event Photography', 'event-photography'),
  ('Tips & Tricks', 'tips-tricks'),
  ('How To', 'how-to'),
  ('Product', 'product'),
  ('Photography', 'photography'),
  ('Corporate', 'corporate'),
  ('Birthday', 'birthday'),
  ('Guest Photos', 'guest-photos'),
  ('Digital Camera', 'digital-camera'),
  ('Photo Sharing', 'photo-sharing');
