CREATE TABLE IF NOT EXISTS page_categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  organization_id BIGINT NOT NULL,
  category_code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  description TEXT,
  category_type VARCHAR(40),
  parent_category_id BIGINT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  icon VARCHAR(255),
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT,
  canonical_path VARCHAR(500),
  metadata JSONB,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Unique constraints per tenant + organization for active records
CREATE UNIQUE INDEX IF NOT EXISTS uq_pc_code
ON page_categories(tenant_id, organization_id, category_code)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pc_slug
ON page_categories(tenant_id, organization_id, slug)
WHERE deleted_at IS NULL;

-- Performance and lookup indexes scoped by tenant_id + organization_id
CREATE INDEX IF NOT EXISTS idx_pc_scope
ON page_categories(tenant_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_pc_parent
ON page_categories(tenant_id, organization_id, parent_category_id);

CREATE INDEX IF NOT EXISTS idx_pc_status
ON page_categories(tenant_id, organization_id, status);

CREATE INDEX IF NOT EXISTS idx_pc_name
ON page_categories(tenant_id, organization_id, name);
