-- The CX Automation Audit table, and the rules that let a public key write to it
-- without being able to read anything back.
--
-- Paste the whole file into the Supabase SQL editor once, after the project has
-- finished building. Running it twice is safe: it stops rather than overwriting.
--
-- Two tables, the same shape. `audits` is the booth. `audits_dev` is anything
-- opened over https, which is how the app tells them apart on its own (ADR-0011).
--
-- The 32 columns and their order match what the app writes and what the CSV on
-- each laptop contains, so the two can be compared after the event without
-- reformatting anything (ADR-0007).

create table public.audits (
  id                  uuid primary key,
  created_at          timestamptz not null,
  synced_at           timestamptz,

  -- what the visitor typed
  first_name          text,
  last_name           text,
  email               text,
  company             text,
  website             text,
  consent             boolean not null default false,

  -- what they tapped
  role                text,
  platform            text,
  migration_interest  text,          -- only asked of a visitor not on Shopify
  channels            text[],        -- more than one answer allowed
  automation_today    text,

  -- each banded answer, and the number it maps to in the maths
  tickets_band        text,
  tickets_value       integer,
  agents_band         text,
  agents_value        integer,
  traffic_band        text,
  traffic_value       integer,
  aov_band            text,
  aov_value           integer,

  score_band          text,
  plan_recommended    text,

  -- the figures the visitor was actually shown, so the list reads without
  -- re-running any maths
  cost_saved_annual   numeric,
  sa_revenue_annual   numeric,
  total_value_annual  numeric,
  return_multiple     numeric(10,2),

  booking             text,          -- null until they choose at the end
  test                boolean not null default false,
  device              text,          -- which laptop
  app_version         text
);

-- Same shape, copied rather than retyped so the two can never drift apart.
create table public.audits_dev (like public.audits including all);

comment on table public.audits is
  'One row per completed audit at the booth. Filter test = false for real leads.';
comment on table public.audits_dev is
  'The same, written by anything opened over https. Never real leads.';

-- ---------------------------------------------------------------------------
-- Permissions
--
-- The key the app carries is published in a public repository, so treat it as
-- known to everyone. These rules make it a letterbox: it can post an audit and
-- come back to set the booking outcome, and it can do nothing else. No reading,
-- no deleting. A leaked key cannot expose a single lead.
--
-- Updating is needed because the visitor chooses to book or to follow up after
-- the record has already been sent. That choice is written to the same row.
-- ---------------------------------------------------------------------------

alter table public.audits     enable row level security;
alter table public.audits_dev enable row level security;

revoke all on public.audits     from anon;
revoke all on public.audits_dev from anon;

grant insert, update on public.audits     to anon;
grant insert, update on public.audits_dev to anon;

create policy "anon may add an audit"
  on public.audits for insert to anon with check (true);

create policy "anon may set the booking outcome"
  on public.audits for update to anon using (true) with check (true);

create policy "anon may add an audit"
  on public.audits_dev for insert to anon with check (true);

create policy "anon may set the booking outcome"
  on public.audits_dev for update to anon using (true) with check (true);

-- Reading is left to signed-in Supabase users, which is how Angelo gets the
-- leads. No policy is granted to anon for select or delete, so neither is
-- possible with the key in the app.
