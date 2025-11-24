-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- Create users table (managed by Supabase Auth)
-- This integrates with auth.users

-- Create customers table
create table public.customers (
  wa_id text primary key,
  customer_name text,
  age integer,
  age_recorded_at date,
  document jsonb,
  is_blocked boolean not null default false,
  is_favorite boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create conversation table
create table public.conversation (
  id bigserial primary key,
  wa_id text not null references public.customers(wa_id) on delete cascade,
  role text,
  message text,
  date text,
  time text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create reservations table
create table public.reservations (
  id bigserial primary key,
  wa_id text not null references public.customers(wa_id) on delete cascade,
  date text not null,
  time_slot text not null,
  type integer not null check (type in (0, 1)),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create vacation_periods table
create table public.vacation_periods (
  id bigserial primary key,
  start_date date not null,
  end_date date,
  duration_days integer check (duration_days is null or duration_days >= 1),
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint ck_vacation_start_before_end check (end_date is null or start_date <= end_date)
);

-- Create notification_events table
create table public.notification_events (
  id bigserial primary key,
  event_type text not null,
  ts_iso text not null,
  data text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create inbound_message_queue table
create table public.inbound_message_queue (
  id bigserial primary key,
  message_id text,
  wa_id text,
  payload text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  locked_at timestamp with time zone
);

-- Create app_config table
create table public.app_config (
  id bigserial primary key,
  config_data text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for customers
create index idx_customers_wa_id on public.customers(wa_id);
create index idx_customers_wa_id_trgm on public.customers using gin (wa_id gin_trgm_ops);
create index idx_customers_name_trgm on public.customers using gin (customer_name gin_trgm_ops);

-- Create indexes for conversation
create index idx_conversation_wa_id on public.conversation(wa_id);
create index idx_conversation_wa_id_date_time on public.conversation(wa_id, date, time);

-- Create indexes for reservations
create index idx_reservations_wa_id on public.reservations(wa_id);
create index idx_reservations_date_time on public.reservations(date, time_slot);
create index idx_reservations_status on public.reservations(status);
create index idx_reservations_wa_id_status on public.reservations(wa_id, status);
create index idx_reservations_date_time_status on public.reservations(date, time_slot, status);
create index idx_reservations_wa_id_updated_at on public.reservations(wa_id, updated_at);

-- Create indexes for vacation_periods
create index idx_vacations_start on public.vacation_periods(start_date);
create index idx_vacations_end on public.vacation_periods(end_date);

-- Create indexes for notification_events
create index idx_notification_events_type_ts on public.notification_events(event_type, ts_iso);
create index idx_notification_events_created_at on public.notification_events(created_at);

-- Create indexes for inbound_message_queue
create index idx_inbound_message_queue_message_id on public.inbound_message_queue(message_id);
create index idx_inbound_message_queue_wa_id on public.inbound_message_queue(wa_id);
create index idx_inbound_queue_status_created on public.inbound_message_queue(status, created_at);
create index idx_inbound_message_queue_locked_at on public.inbound_message_queue(locked_at);
create unique index uq_inbound_message_queue_message_id_not_null on public.inbound_message_queue(message_id) where message_id is not null;

-- Create Arabic normalization function for better fuzzy matching
create or replace function normalize_arabic(text) returns text as $$
begin
  return translate($1,
    'أإآٱةىَُِّْ',
    'اااا' || 'ه' || 'ي' || ''
  );
end;
$$ language plpgsql immutable;

-- Create normalized name index
create index idx_customers_name_normalized_trgm on public.customers using gin (normalize_arabic(customer_name) gin_trgm_ops);

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_customers_updated_at
  before update on public.customers
  for each row
  execute function public.handle_updated_at();

create trigger handle_reservations_updated_at
  before update on public.reservations
  for each row
  execute function public.handle_updated_at();

create trigger handle_vacation_periods_updated_at
  before update on public.vacation_periods
  for each row
  execute function public.handle_updated_at();

create trigger handle_inbound_message_queue_updated_at
  before update on public.inbound_message_queue
  for each row
  execute function public.handle_updated_at();

create trigger handle_app_config_updated_at
  before update on public.app_config
  for each row
  execute function public.handle_updated_at();
