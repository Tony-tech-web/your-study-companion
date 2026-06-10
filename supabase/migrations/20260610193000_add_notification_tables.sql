create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null unique,
  platform text not null,
  device_id text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_push_tokens_user_id_idx
  on public.device_push_tokens(user_id);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  planner_reminders boolean not null default true,
  chat_messages boolean not null default true,
  news_updates boolean not null default true,
  billing_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
