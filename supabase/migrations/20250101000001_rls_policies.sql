-- Enable Row Level Security on all tables
alter table public.customers enable row level security;
alter table public.conversation enable row level security;
alter table public.reservations enable row level security;
alter table public.vacation_periods enable row level security;
alter table public.notification_events enable row level security;
alter table public.inbound_message_queue enable row level security;
alter table public.app_config enable row level security;

-- Create policies for authenticated users (admin access)
-- These policies allow full access for authenticated users
-- You can customize these based on your specific authorization requirements

-- Customers policies
create policy "Authenticated users can view customers"
  on public.customers for select
  to authenticated
  using (true);

create policy "Authenticated users can insert customers"
  on public.customers for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update customers"
  on public.customers for update
  to authenticated
  using (true);

create policy "Authenticated users can delete customers"
  on public.customers for delete
  to authenticated
  using (true);

-- Conversation policies
create policy "Authenticated users can view conversations"
  on public.conversation for select
  to authenticated
  using (true);

create policy "Authenticated users can insert conversations"
  on public.conversation for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update conversations"
  on public.conversation for update
  to authenticated
  using (true);

create policy "Authenticated users can delete conversations"
  on public.conversation for delete
  to authenticated
  using (true);

-- Reservations policies
create policy "Authenticated users can view reservations"
  on public.reservations for select
  to authenticated
  using (true);

create policy "Authenticated users can insert reservations"
  on public.reservations for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update reservations"
  on public.reservations for update
  to authenticated
  using (true);

create policy "Authenticated users can delete reservations"
  on public.reservations for delete
  to authenticated
  using (true);

-- Vacation periods policies
create policy "Authenticated users can view vacation periods"
  on public.vacation_periods for select
  to authenticated
  using (true);

create policy "Authenticated users can insert vacation periods"
  on public.vacation_periods for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update vacation periods"
  on public.vacation_periods for update
  to authenticated
  using (true);

create policy "Authenticated users can delete vacation periods"
  on public.vacation_periods for delete
  to authenticated
  using (true);

-- Notification events policies
create policy "Authenticated users can view notification events"
  on public.notification_events for select
  to authenticated
  using (true);

create policy "Authenticated users can insert notification events"
  on public.notification_events for insert
  to authenticated
  with check (true);

-- Inbound message queue policies (system access only for most operations)
create policy "Service role can manage message queue"
  on public.inbound_message_queue for all
  to service_role
  using (true);

create policy "Authenticated users can view message queue"
  on public.inbound_message_queue for select
  to authenticated
  using (true);

-- App config policies
create policy "Authenticated users can view config"
  on public.app_config for select
  to authenticated
  using (true);

create policy "Authenticated users can update config"
  on public.app_config for update
  to authenticated
  using (true);

create policy "Authenticated users can insert config"
  on public.app_config for insert
  to authenticated
  with check (true);

-- Allow service role full access to all tables (for API routes and Edge Functions)
create policy "Service role has full access to customers"
  on public.customers for all
  to service_role
  using (true);

create policy "Service role has full access to conversations"
  on public.conversation for all
  to service_role
  using (true);

create policy "Service role has full access to reservations"
  on public.reservations for all
  to service_role
  using (true);

create policy "Service role has full access to vacation periods"
  on public.vacation_periods for all
  to service_role
  using (true);

create policy "Service role has full access to notification events"
  on public.notification_events for all
  to service_role
  using (true);

create policy "Service role has full access to app config"
  on public.app_config for all
  to service_role
  using (true);

-- Enable Realtime for specific tables
alter publication supabase_realtime add table public.customers;
alter publication supabase_realtime add table public.conversation;
alter publication supabase_realtime add table public.reservations;
alter publication supabase_realtime add table public.vacation_periods;
alter publication supabase_realtime add table public.notification_events;
