-- StackFlow initial schema.
-- Every table carries created_at/updated_at (audited by JPA) and a surrogate BIGSERIAL key.

create table users (
    id            bigserial primary key,
    email         varchar(255) not null,
    password_hash varchar(100) not null,
    full_name     varchar(120) not null,
    role          varchar(20)  not null,
    enabled       boolean      not null default true,
    created_at    timestamptz  not null,
    updated_at    timestamptz  not null,
    constraint uq_users_email unique (email),
    constraint ck_users_role check (role in ('ADMIN', 'STAFF'))
);

-- Refresh tokens are stored hashed; the raw value never touches the database.
create table refresh_tokens (
    id         bigserial primary key,
    user_id    bigint      not null references users (id) on delete cascade,
    token_hash varchar(64) not null,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint uq_refresh_tokens_hash unique (token_hash)
);
create index idx_refresh_tokens_user on refresh_tokens (user_id);
create index idx_refresh_tokens_expires_at on refresh_tokens (expires_at);

create table products (
    id          bigserial primary key,
    name        varchar(160)   not null,
    description varchar(1000),
    category    varchar(80)    not null,
    sku         varchar(64)    not null,
    price       numeric(12, 2) not null,
    active      boolean        not null default true,
    created_at  timestamptz    not null,
    updated_at  timestamptz    not null,
    constraint uq_products_sku unique (sku),
    constraint ck_products_price_positive check (price > 0)
);
-- The catalog list filters by category and sorts by recency; this covers the common query.
create index idx_products_category_created_at on products (category, created_at desc);
create index idx_products_active on products (active);

create table stock_items (
    id                  bigserial primary key,
    product_id          bigint      not null references products (id) on delete cascade,
    quantity            integer     not null default 0,
    low_stock_threshold integer     not null default 10,
    version             bigint      not null default 0,
    created_at          timestamptz not null,
    updated_at          timestamptz not null,
    constraint uq_stock_items_product unique (product_id),
    constraint ck_stock_items_quantity_non_negative check (quantity >= 0),
    constraint ck_stock_items_threshold_non_negative check (low_stock_threshold >= 0)
);
-- Expression index: the low-stock report asks for quantity <= low_stock_threshold, which no
-- single-column index can serve.
create index idx_stock_items_headroom on stock_items ((quantity - low_stock_threshold));

create table stock_movements (
    id                 bigserial primary key,
    stock_item_id      bigint      not null references stock_items (id) on delete cascade,
    delta              integer     not null,
    resulting_quantity integer     not null,
    reason             varchar(32) not null,
    reference_id       bigint,
    note               varchar(255),
    created_by         bigint references users (id),
    created_at         timestamptz not null,
    updated_at         timestamptz not null
);
create index idx_stock_movements_item_created_at on stock_movements (stock_item_id, created_at desc);

create table orders (
    id             bigserial primary key,
    order_number   varchar(32)    not null,
    customer_name  varchar(160)   not null,
    customer_email varchar(255),
    status         varchar(20)    not null,
    total_amount   numeric(12, 2) not null default 0,
    notes          varchar(500),
    created_by     bigint references users (id),
    created_at     timestamptz    not null,
    updated_at     timestamptz    not null,
    constraint uq_orders_number unique (order_number),
    constraint ck_orders_status check (status in ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'))
);
-- The order list is almost always "status X, newest first" — one composite index serves both the
-- filter and the sort, so Postgres never has to sort the whole table.
create index idx_orders_status_created_at on orders (status, created_at desc);
create index idx_orders_created_at on orders (created_at desc);

create table order_items (
    id           bigserial primary key,
    order_id     bigint         not null references orders (id) on delete cascade,
    product_id   bigint         not null references products (id),
    product_name varchar(160)   not null,
    sku          varchar(64)    not null,
    quantity     integer        not null,
    unit_price   numeric(12, 2) not null,
    created_at   timestamptz    not null,
    updated_at   timestamptz    not null,
    constraint ck_order_items_quantity_positive check (quantity > 0)
);
create index idx_order_items_order on order_items (order_id);
create index idx_order_items_product on order_items (product_id);

create table order_status_history (
    id          bigserial primary key,
    order_id    bigint      not null references orders (id) on delete cascade,
    from_status varchar(20),
    to_status   varchar(20) not null,
    changed_by  bigint references users (id),
    note        varchar(255),
    created_at  timestamptz not null,
    updated_at  timestamptz not null
);
create index idx_order_status_history_order on order_status_history (order_id, created_at desc);
