-- ============================================================================
-- Sales Analytics Learning Project
-- Dimension Table: products
-- ============================================================================
-- Purpose : Master list of sellable products (dropdown source + PBI slicers)
-- Pattern : Dimension table in a star schema
-- ============================================================================

CREATE TABLE products (
    product_id    INT            NOT NULL AUTO_INCREMENT,
    product_name  VARCHAR(100)   NOT NULL,
    category      VARCHAR(50)    NOT NULL,

    -- Primary Key
    CONSTRAINT pk_products PRIMARY KEY (product_id),

    -- Business Rules
    CONSTRAINT uq_products_product_name UNIQUE (product_name),
    CONSTRAINT chk_products_product_name_not_empty
        CHECK (CHAR_LENGTH(TRIM(product_name)) > 0),
    CONSTRAINT chk_products_category_not_empty
        CHECK (CHAR_LENGTH(TRIM(category)) > 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Product dimension — one row per product';

-- Indexes
CREATE INDEX idx_products_category ON products (category);
