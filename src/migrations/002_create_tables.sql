-- Menu items (reference data)
CREATE TABLE IF NOT EXISTS menu_items (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  description   TEXT,
  price         NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  category      VARCHAR(50),
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restaurant tables
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id            BIGSERIAL PRIMARY KEY,
  table_number  VARCHAR(20) UNIQUE NOT NULL,
  capacity      INT NOT NULL DEFAULT 4
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id            BIGSERIAL PRIMARY KEY,
  order_number  VARCHAR(30) UNIQUE NOT NULL,
  table_id      BIGINT REFERENCES restaurant_tables(id),
  status        order_status NOT NULL DEFAULT 'open',
  subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id  BIGINT NOT NULL REFERENCES menu_items(id),
  quantity      INT NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(12,2) NOT NULL,
  subtotal      NUMERIC(12,2) NOT NULL,
  status        item_status NOT NULL DEFAULT 'ordered',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order  ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);

-- Order item status history (audit trail)
CREATE TABLE IF NOT EXISTS order_item_status_history (
  id              BIGSERIAL PRIMARY KEY,
  order_item_id   BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  from_status     item_status,
  to_status       item_status NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_status_history_item
  ON order_item_status_history(order_item_id, changed_at);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id                BIGSERIAL PRIMARY KEY,
  order_id          BIGINT NOT NULL REFERENCES orders(id),
  method            payment_method NOT NULL,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status            payment_status NOT NULL DEFAULT 'pending',
  reference_number  VARCHAR(100),
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
