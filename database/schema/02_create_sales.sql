USE sales_analytics;
-- ============================================================================
-- Sales Analytics Learning Project
-- Fact Table: sales
-- ============================================================================
-- Purpose : One row per sales transaction (measures + context for analytics)
-- Pattern : Fact table in a star schema
-- Depends : products (run 01_create_products.sql first)
-- ============================================================================

CREATE TABLE sales (
    sale_id       INT            NOT NULL AUTO_INCREMENT,
    customer_name VARCHAR(100)   NOT NULL,
    product_id    INT            NOT NULL,
    quantity      INT            NOT NULL,
    unit_price    DECIMAL(10, 2) NOT NULL,
    total_sales   DECIMAL(12, 2) NOT NULL,
    state         VARCHAR(50)    NOT NULL,
    city          VARCHAR(100)   NOT NULL,
    sale_date     DATE           NOT NULL,
    created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Primary Key
    CONSTRAINT pk_sales PRIMARY KEY (sale_id),

    -- Foreign Key
    CONSTRAINT fk_sales_product_id
        FOREIGN KEY (product_id)
        REFERENCES products (product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Business Rules
    CONSTRAINT chk_sales_customer_name_not_empty
        CHECK (CHAR_LENGTH(TRIM(customer_name)) > 0),
    CONSTRAINT chk_sales_quantity_positive
        CHECK (quantity > 0),
    CONSTRAINT chk_sales_unit_price_non_negative
        CHECK (unit_price >= 0),
    CONSTRAINT chk_sales_total_sales_non_negative
        CHECK (total_sales >= 0),
    CONSTRAINT chk_sales_state_not_empty
        CHECK (CHAR_LENGTH(TRIM(state)) > 0),
    CONSTRAINT chk_sales_city_not_empty
        CHECK (CHAR_LENGTH(TRIM(city)) > 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Sales fact — transactional grain, one row per sale';

-- Indexes (analytics query patterns)
CREATE INDEX idx_sales_product_id  ON sales (product_id);
CREATE INDEX idx_sales_sale_date   ON sales (sale_date);
CREATE INDEX idx_sales_state       ON sales (state);
CREATE INDEX idx_sales_created_at  ON sales (created_at);

-- Composite index for common Power BI filters (date + geography)
CREATE INDEX idx_sales_date_state  ON sales (sale_date, state);

USE sales_analytics;

SHOW TABLES;

DESCRIBE sales;