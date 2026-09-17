-- BB Store starter schema.
-- Run this in Supabase SQL Editor after creating your project.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('customer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'processing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_type as enum ('pickup', 'delivery');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash_on_pickup', 'gcash', 'maribank', 'bank_transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('unpaid', 'pending_verification', 'paid', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  unit text not null,
  stock integer not null default 0 check (stock >= 0),
  available boolean not null default true,
  is_daily_item boolean not null default false,
  active_date date,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  order_type public.order_type not null,
  delivery_address text,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  status public.order_status not null default 'pending',
  total numeric(10,2) not null check (total >= 0),
  payment_proof_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0)
);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fee numeric(10,2) not null default 0 check (fee >= 0),
  active boolean not null default true
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.delivery_zones enable row level security;

-- Public browsing for active products.
drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
  on public.products for select
  to anon, authenticated
  using (available = true);

-- Customers can see their own profile.
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Customers can read their own orders.
drop policy if exists "users can read own orders" on public.orders;
create policy "users can read own orders"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id);

-- Customers can read items belonging to their own orders.
drop policy if exists "users can read own order items" on public.order_items;
create policy "users can read own order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
      and o.user_id = auth.uid()
    )
  );

-- Anonymous/public order lookup should NOT directly read all order rows.
-- Implement secure order lookup through a server-side RPC/route that
-- validates the order number plus an additional secret such as phone/OTP.
