create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  billing_interval text not null,
  price_kobo integer not null default 0,
  currency text not null default 'NGN',
  ai_token_limit integer,
  provider_limits jsonb,
  paystack_plan_code text,
  is_active boolean not null default true,
  is_custom boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_id uuid not null references public.plans(id),
  status text not null default 'trial',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  paystack_subscription_code text unique,
  paystack_email_token text,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subscription_id uuid references public.subscriptions(id),
  plan_id uuid references public.plans(id),
  status text not null,
  amount_kobo integer not null,
  currency text not null default 'NGN',
  provider text not null default 'paystack',
  provider_reference text not null unique,
  provider_transaction_id text,
  channel text,
  paid_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments(user_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subscription_id uuid references public.subscriptions(id),
  status text not null,
  amount_kobo integer not null,
  currency text not null default 'NGN',
  provider_invoice_code text unique,
  due_at timestamptz,
  paid_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invoices_user_id_idx on public.invoices(user_id);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'paystack',
  event_type text not null,
  provider_event_id text unique,
  raw jsonb not null,
  created_at timestamptz not null default now()
);
