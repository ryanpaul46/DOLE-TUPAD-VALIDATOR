-- Database Indexing Strategy for DOLE TUPAD Validator
-- Execute these indexes to optimize query performance

-- Primary search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_name ON uploaded_beneficiaries USING gin(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_id_number ON uploaded_beneficiaries (id_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_province ON uploaded_beneficiaries (province);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_municipality ON uploaded_beneficiaries (city_municipality);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_project_series ON uploaded_beneficiaries (project_series);

-- Composite indexes for common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_province_sex ON uploaded_beneficiaries (province, sex);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_project_age ON uploaded_beneficiaries (project_series, age);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_created_at ON uploaded_beneficiaries (created_at DESC);

-- User table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users (role);

-- Performance monitoring indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_stats ON uploaded_beneficiaries (province, sex, age) WHERE age IS NOT NULL;

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_active ON uploaded_beneficiaries (id, name) WHERE name IS NOT NULL AND name != '';

-- Analyze tables after index creation
ANALYZE uploaded_beneficiaries;
ANALYZE users;