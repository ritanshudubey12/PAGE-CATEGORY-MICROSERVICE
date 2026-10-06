# Triostack Page Category API Microservice

Production-grade, multi-tenant **Page Category API Microservice** built with TypeScript, Node.js, Express, and PostgreSQL.

---

## 📌 Architecture Overview

```
 CLIENT / FRONTEND
       │
       ▼
 BFF / API GATEWAY
   - JWT authentication & verification
   - User authorization
   - Organization selection
       │
       │  Authorization: Bearer <BRR_TOKEN>
       │  X-Tenant-Id: <BIGINT>
       │  X-Organization-Id: <BIGINT>
       │  X-User-Id: <BIGINT | null>
       ▼
 PAGE CATEGORY SERVICE (This Microservice)
   - Internal BRR Bearer token validation
   - Strict Tenant & Organization isolation
   - Hierarchy & cycle-safe tree validation
   - BIGINT string precision handling
   - Soft-delete & parent deletion protection
   - Bulk CSV / XLSX import & bulk delete
       │
       ▼
 POSTGRESQL DATABASE
   - BIGINT identifiers
   - Scoped unique constraints
   - Indexed hierarchy & metadata JSONB
```

---

## 🔐 Authentication & Header Contract

Every request to `/api/v1/page-categories/*` **must** include the following headers:

| Header Name | Type | Mandatory | Description |
|---|---|---|---|
| `Authorization` | `Bearer <BRR_TOKEN>` | **Yes** | Internal service-to-service token (configured via `BRR_TOKEN`). |
| `X-Tenant-Id` | `BIGINT string` | **Yes** | Tenant ID (e.g. `1001`). Strict row isolation scope. |
| `X-Organization-Id` | `BIGINT string` | **Yes** | Organization ID (e.g. `5001`). Strict row isolation scope. |
| `X-User-Id` | `BIGINT string` | No | Optional acting user ID for audit (`created_by`, `updated_by`). |

> ⚠️ **Note:** `tenant_id` and `organization_id` are **never** trusted from request bodies or spreadsheet files. BFF headers are strictly authoritative.

---

## 🗄️ Data Model (`page_categories`)

| Field | PostgreSQL Type | Required | Description |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | Primary Key | Identity identifier (returned as string to API callers). |
| `tenant_id` | `BIGINT` | Yes | Multi-tenant scoping. |
| `organization_id`| `BIGINT` | Yes | Organization scoping. |
| `category_code` | `VARCHAR(50)` | Yes | Business code, unique per tenant + organization. |
| `name` | `VARCHAR(150)` | Yes | Display name. |
| `slug` | `VARCHAR(180)` | Yes | URL-friendly unique slug per tenant + organization. |
| `description` | `TEXT` | No | Category description. |
| `category_type` | `VARCHAR(40)` | No | E.g., `PRODUCT`, `SERVICE`, `BLOG`, `LANDING`. |
| `parent_category_id` | `BIGINT` | No | Parent category ID (`NULL` for root categories). |
| `status` | `VARCHAR(30)` | Yes | `ACTIVE` or `INACTIVE` (default `ACTIVE`). |
| `icon` | `VARCHAR(255)` | No | UI icon identifier. |
| `image_url` | `TEXT` | No | Valid image URL. |
| `display_order` | `INTEGER` | Yes | Ordering in navigation/lists (default `0`). |
| `seo_title` | `VARCHAR(255)` | No | SEO meta title. |
| `seo_description` | `TEXT` | No | SEO meta description. |
| `seo_keywords` | `TEXT` | No | SEO keywords. |
| `canonical_path` | `VARCHAR(500)` | No | Canonical URL path. |
| `metadata` | `JSONB` | No | Extensible key-value metadata. |
| `created_by` | `BIGINT` | No | Audit: user ID who created the record. |
| `updated_by` | `BIGINT` | No | Audit: user ID who last updated the record. |
| `created_at` | `TIMESTAMPTZ` | Yes | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | Yes | Last update timestamp. |
| `deleted_at` | `TIMESTAMPTZ` | No | Soft-delete timestamp. |

---

## 🚀 API Catalogue

### 1. Health & Readiness Probes (Unauthenticated)
- `GET /health` -> Liveness check (`{ "success": true, "status": "UP" }`)
- `GET /ready` -> PostgreSQL readiness check (`{ "success": true, "status": "READY", "database": "CONNECTED" }`)

### 2. Category Operations (Protected)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/page-categories` | Create a new category |
| `GET` | `/api/v1/page-categories` | List, search (`q`), filter (`status`, `category_type`, `parent_category_id`), sort and paginate categories |
| `GET` | `/api/v1/page-categories/tree` | Full nested category hierarchy tree (`children: [...]`) |
| `GET` | `/api/v1/page-categories/roots` | Retrieve all root categories (`parent_category_id IS NULL`) |
| `GET` | `/api/v1/page-categories/:id` | Get single category by ID |
| `GET` | `/api/v1/page-categories/:id/children`| Get direct child categories |
| `GET` | `/api/v1/page-categories/code/:categoryCode` | Get single category by `category_code` |
| `PATCH`| `/api/v1/page-categories/:id` | Update category fields |
| `PATCH`| `/api/v1/page-categories/:id/status` | Update lifecycle status (`ACTIVE` / `INACTIVE`) |
| `DELETE`| `/api/v1/page-categories/:id` | Soft delete category (restricted if active children exist) |
| `POST` | `/api/v1/page-categories/bulk-import` | Multipart CSV / XLSX bulk import (`mode=atomic` or `mode=partial`) |
| `POST` | `/api/v1/page-categories/bulk-delete` | Bulk soft delete categories (`{ "ids": ["101", "102"] }`) |

---

## ⚡ Quick Start

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Run Database Migration
```bash
npm run migrate
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Run Test Suite
```bash
# Run all unit, integration, and security tests
npm test

# Run specific suites
npm run test:unit
npm run test:integration
npm run test:security
```

---

## 🐳 Docker Deployment

### Start with Docker Compose
```bash
docker-compose up -d --build
```
This boots up:
- PostgreSQL 16 on port `5432` with auto-migration.
- Page Category Service on port `4000` with health check.
