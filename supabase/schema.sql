-- ============================================================
-- Household Budget — Supabase Schema
-- Run this in your Supabase SQL Editor (or as a migration)
-- ============================================================

-- Categories (parent groupings)
create table categories (
  id serial primary key,
  name text not null unique,
  type text not null check (type in ('expense', 'income')),
  icon text not null default '📦',
  sort_order int not null default 0
);

-- Subcategories (what users actually pick)
create table subcategories (
  id serial primary key,
  category_id int not null references categories(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  unique(category_id, name)
);

-- Monthly budget targets per subcategory
create table budgets (
  id serial primary key,
  subcategory_id int not null references subcategories(id) on delete cascade unique,
  monthly_amount numeric(10,2) not null default 0
);

-- Transactions (the main event)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  description text not null,
  amount numeric(10,2) not null,  -- negative = expense, positive = income
  location text,
  subcategory_id int references subcategories(id) on delete set null,
  entered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_transactions_date on transactions(date);
create index idx_transactions_date_month on transactions(date_trunc('month', date));
create index idx_transactions_subcategory on transactions(subcategory_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger transactions_updated_at
  before update on transactions
  for each row execute function update_updated_at();

-- ============================================================
-- Row Level Security
-- Both household members see everything. Just require auth.
-- ============================================================

alter table categories enable row level security;
alter table subcategories enable row level security;
alter table budgets enable row level security;
alter table transactions enable row level security;

-- Everyone authenticated can read all reference data
create policy "Authenticated read categories"
  on categories for select to authenticated using (true);

create policy "Authenticated read subcategories"
  on subcategories for select to authenticated using (true);

create policy "Authenticated read budgets"
  on budgets for select to authenticated using (true);

create policy "Authenticated manage budgets"
  on budgets for all to authenticated using (true) with check (true);

-- Transactions: full access for authenticated users
create policy "Authenticated read transactions"
  on transactions for select to authenticated using (true);

create policy "Authenticated insert transactions"
  on transactions for insert to authenticated with check (true);

create policy "Authenticated update transactions"
  on transactions for update to authenticated using (true) with check (true);

create policy "Authenticated delete transactions"
  on transactions for delete to authenticated using (true);

-- Categories/subcategories: full access for management
create policy "Authenticated manage categories"
  on categories for all to authenticated using (true) with check (true);

create policy "Authenticated manage subcategories"
  on subcategories for all to authenticated using (true) with check (true);

-- ============================================================
-- View: Monthly summary (budget vs actual by category)
-- ============================================================

create or replace view monthly_summary as
select
  date_trunc('month', t.date)::date as month,
  c.id as category_id,
  c.name as category_name,
  c.type as category_type,
  c.icon as category_icon,
  c.sort_order as category_sort,
  coalesce(sum(t.amount), 0) as actual_total,
  coalesce(
    (select sum(b.monthly_amount)
     from budgets b
     join subcategories s on s.id = b.subcategory_id
     where s.category_id = c.id),
    0
  ) as budget_total
from transactions t
join subcategories s on s.id = t.subcategory_id
join categories c on c.id = s.category_id
group by date_trunc('month', t.date), c.id, c.name, c.type, c.icon, c.sort_order;

-- ============================================================
-- View: Monthly summary by subcategory
-- ============================================================

create or replace view monthly_subcategory_summary as
select
  date_trunc('month', t.date)::date as month,
  s.id as subcategory_id,
  s.name as subcategory_name,
  c.id as category_id,
  c.name as category_name,
  c.type as category_type,
  coalesce(sum(t.amount), 0) as actual_total,
  coalesce(b.monthly_amount, 0) as budget_amount
from transactions t
join subcategories s on s.id = t.subcategory_id
join categories c on c.id = s.category_id
left join budgets b on b.subcategory_id = s.id
group by date_trunc('month', t.date), s.id, s.name, c.id, c.name, c.type, b.monthly_amount;
