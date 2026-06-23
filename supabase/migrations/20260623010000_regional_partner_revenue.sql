create table if not exists public.regional_partners (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null,
  legal_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  default_country text,
  default_revenue_share_bps integer not null default 2000 check (default_revenue_share_bps between 0 and 10000),
  status text not null default 'prospect' check (status in ('prospect','active','paused','ended')),
  payout_notes text,
  admin_notes text,
  created_by_admin_id uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.regional_partner_campaigns (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.regional_partners(id) on delete cascade,
  campaign_name text not null,
  country_code text not null,
  country_label text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  revenue_share_bps integer not null check (revenue_share_bps between 0 and 10000),
  revenue_share_months integer not null default 6 check (revenue_share_months between 1 and 36),
  status text not null default 'draft' check (status in ('draft','active','paused','ended')),
  attribution_rule text not null default 'country_signup_window',
  notes text,
  created_by_admin_id uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists regional_partner_campaigns_country_window_idx
  on public.regional_partner_campaigns(country_code, starts_at, ends_at);

create table if not exists public.user_partner_attributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  partner_id uuid not null references public.regional_partners(id) on delete cascade,
  campaign_id uuid references public.regional_partner_campaigns(id) on delete set null,
  country_code text not null,
  attribution_source text not null default 'regional_window',
  attributed_at timestamptz not null default now(),
  revenue_share_until timestamptz not null,
  admin_override boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, campaign_id)
);

create index if not exists user_partner_attributions_user_idx
  on public.user_partner_attributions(user_id);

create index if not exists user_partner_attributions_partner_idx
  on public.user_partner_attributions(partner_id);

create table if not exists public.regional_partner_revenue_ledger (
  id uuid primary key default gen_random_uuid(),
  country_revenue_ledger_id uuid references public.country_revenue_ledger(id) on delete cascade,
  purchase_transaction_id uuid references public.purchase_transactions(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  partner_id uuid not null references public.regional_partners(id) on delete cascade,
  campaign_id uuid references public.regional_partner_campaigns(id) on delete set null,
  country_code text,
  currency text not null default 'USD',
  gross_amount_cents integer not null default 0,
  net_revenue_cents integer not null default 0,
  partner_share_bps integer not null check (partner_share_bps between 0 and 10000),
  partner_earned_cents integer not null default 0,
  status text not null default 'accrued' check (status in ('accrued','payable','paid','voided')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_revenue_ledger_id, partner_id)
);

create index if not exists regional_partner_revenue_partner_idx
  on public.regional_partner_revenue_ledger(partner_id, occurred_at desc);

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.regional_partners(id) on delete cascade,
  payout_period_start date,
  payout_period_end date,
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','approved','paid','cancelled')),
  payment_reference text,
  admin_note text,
  paid_at timestamptz,
  created_by_admin_id uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_portal_users (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.regional_partners(id) on delete cascade,
  auth_user_id uuid unique,
  email text not null,
  full_name text,
  role text not null default 'partner_owner' check (role in ('partner_owner','partner_viewer')),
  status text not null default 'invited' check (status in ('invited','active','disabled')),
  last_login_at timestamptz,
  created_by_admin_id uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(partner_id, email)
);

create or replace function public.fm_is_active_admin()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.status = 'active'
  );
$$;

create or replace function public.partner_portal_partner_id()
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select ppu.partner_id
  from public.partner_portal_users ppu
  where ppu.auth_user_id = auth.uid()
    and ppu.status = 'active'
  limit 1;
$$;

create or replace function public.fm_user_country_code(p_user public.users)
returns text
language sql
stable
as $$
  select upper(nullif(trim(coalesce(
    to_jsonb(p_user)->>'country_code',
    to_jsonb(p_user)->>'canonical_country',
    to_jsonb(p_user)->>'country',
    'Unknown'
  )), ''));
$$;

create or replace function public.apply_regional_partner_attribution()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_country_code text;
  v_signup_at timestamptz;
  v_campaign record;
begin
  v_country_code := public.fm_user_country_code(new);
  v_signup_at := coalesce(new.created_at, now());

  for v_campaign in
    select rpc.*
    from public.regional_partner_campaigns rpc
    join public.regional_partners rp on rp.id = rpc.partner_id
    where rpc.status = 'active'
      and rp.status = 'active'
      and upper(trim(rpc.country_code)) = v_country_code
      and v_signup_at >= rpc.starts_at
      and v_signup_at <= rpc.ends_at
    order by rpc.starts_at desc
    limit 1
  loop
    insert into public.user_partner_attributions (
      user_id,
      partner_id,
      campaign_id,
      country_code,
      attribution_source,
      attributed_at,
      revenue_share_until
    )
    values (
      new.id,
      v_campaign.partner_id,
      v_campaign.id,
      v_country_code,
      'regional_window',
      v_signup_at,
      v_signup_at + make_interval(months => v_campaign.revenue_share_months)
    )
    on conflict (user_id, campaign_id) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists users_apply_regional_partner_attribution on public.users;
create trigger users_apply_regional_partner_attribution
after insert on public.users
for each row
execute function public.apply_regional_partner_attribution();

create or replace function public.create_regional_partner_revenue_from_country_ledger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_attr record;
  v_partner_earned_cents integer;
begin
  for v_attr in
    select
      upa.partner_id,
      upa.campaign_id,
      rpc.revenue_share_bps
    from public.user_partner_attributions upa
    join public.regional_partner_campaigns rpc on rpc.id = upa.campaign_id
    join public.regional_partners rp on rp.id = upa.partner_id
    where upa.user_id = new.user_id
      and upa.revenue_share_until >= new.created_at
      and rp.status = 'active'
      and rpc.status in ('active','ended')
    order by upa.attributed_at desc
    limit 1
  loop
    v_partner_earned_cents := round(new.net_revenue_cents * (v_attr.revenue_share_bps::numeric / 10000))::integer;

    insert into public.regional_partner_revenue_ledger (
      country_revenue_ledger_id,
      purchase_transaction_id,
      user_id,
      partner_id,
      campaign_id,
      country_code,
      currency,
      gross_amount_cents,
      net_revenue_cents,
      partner_share_bps,
      partner_earned_cents,
      status,
      occurred_at,
      metadata
    )
    values (
      new.id,
      new.purchase_transaction_id,
      new.user_id,
      v_attr.partner_id,
      v_attr.campaign_id,
      new.country_code,
      new.currency,
      new.gross_amount_cents,
      new.net_revenue_cents,
      v_attr.revenue_share_bps,
      v_partner_earned_cents,
      'accrued',
      new.created_at,
      jsonb_build_object('source_country_revenue_ledger_id', new.id)
    )
    on conflict (country_revenue_ledger_id, partner_id) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists country_revenue_create_regional_partner_revenue on public.country_revenue_ledger;
create trigger country_revenue_create_regional_partner_revenue
after insert on public.country_revenue_ledger
for each row
execute function public.create_regional_partner_revenue_from_country_ledger();

alter table public.regional_partners enable row level security;
alter table public.regional_partner_campaigns enable row level security;
alter table public.user_partner_attributions enable row level security;
alter table public.regional_partner_revenue_ledger enable row level security;
alter table public.partner_payouts enable row level security;
alter table public.partner_portal_users enable row level security;

drop policy if exists "admins manage regional partners" on public.regional_partners;
create policy "admins manage regional partners" on public.regional_partners
for all to authenticated using (public.fm_is_active_admin()) with check (public.fm_is_active_admin());

drop policy if exists "partners read own partner profile" on public.regional_partners;
create policy "partners read own partner profile" on public.regional_partners
for select to authenticated using (id = public.partner_portal_partner_id());

drop policy if exists "admins manage regional campaigns" on public.regional_partner_campaigns;
create policy "admins manage regional campaigns" on public.regional_partner_campaigns
for all to authenticated using (public.fm_is_active_admin()) with check (public.fm_is_active_admin());

drop policy if exists "partners read own campaigns" on public.regional_partner_campaigns;
create policy "partners read own campaigns" on public.regional_partner_campaigns
for select to authenticated using (partner_id = public.partner_portal_partner_id());

drop policy if exists "admins manage partner attributions" on public.user_partner_attributions;
create policy "admins manage partner attributions" on public.user_partner_attributions
for all to authenticated using (public.fm_is_active_admin()) with check (public.fm_is_active_admin());

drop policy if exists "admins read regional partner revenue" on public.regional_partner_revenue_ledger;
create policy "admins read regional partner revenue" on public.regional_partner_revenue_ledger
for select to authenticated using (public.fm_is_active_admin());

drop policy if exists "partners read own regional partner revenue" on public.regional_partner_revenue_ledger;
create policy "partners read own regional partner revenue" on public.regional_partner_revenue_ledger
for select to authenticated using (partner_id = public.partner_portal_partner_id());

drop policy if exists "admins manage partner payouts" on public.partner_payouts;
create policy "admins manage partner payouts" on public.partner_payouts
for all to authenticated using (public.fm_is_active_admin()) with check (public.fm_is_active_admin());

drop policy if exists "partners read own payouts" on public.partner_payouts;
create policy "partners read own payouts" on public.partner_payouts
for select to authenticated using (partner_id = public.partner_portal_partner_id());

drop policy if exists "admins manage partner portal users" on public.partner_portal_users;
create policy "admins manage partner portal users" on public.partner_portal_users
for all to authenticated using (public.fm_is_active_admin()) with check (public.fm_is_active_admin());

drop policy if exists "partners read own portal user" on public.partner_portal_users;
create policy "partners read own portal user" on public.partner_portal_users
for select to authenticated using (auth_user_id = auth.uid() and status = 'active');

grant select, insert, update, delete on public.regional_partners to authenticated;
grant select, insert, update, delete on public.regional_partner_campaigns to authenticated;
grant select, insert, update, delete on public.user_partner_attributions to authenticated;
grant select on public.regional_partner_revenue_ledger to authenticated;
grant select, insert, update, delete on public.partner_payouts to authenticated;
grant select, insert, update, delete on public.partner_portal_users to authenticated;

create or replace function public.admin_get_country_revenue_summary(
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  country text,
  registrations bigint,
  verified_users bigint,
  paying_users bigint,
  gross_revenue_cents bigint,
  platform_fee_cents bigint,
  processor_fee_cents bigint,
  spark_cost_cents bigint,
  refund_amount_cents bigint,
  net_revenue_cents bigint,
  active_partner_count bigint,
  partner_payable_cents bigint
)
language sql
security definer
set search_path = public, auth
as $$
  with guard as (select public.fm_is_active_admin() as allowed),
  user_summary as (
    select
      public.fm_user_country_code(u) as country,
      count(*) as registrations,
      count(*) filter (where coalesce(to_jsonb(u)->>'verification_status', '') in ('verified','approved')) as verified_users,
      count(*) filter (where coalesce(to_jsonb(u)->>'subscription_tier', 'free') <> 'free') as paying_users
    from public.users u, guard g
    where g.allowed
      and (p_start_date is null or u.created_at >= p_start_date::timestamptz)
      and (p_end_date is null or u.created_at < (p_end_date + 1)::timestamptz)
    group by 1
  ),
  revenue_summary as (
    select
      coalesce(crl.country_code, 'Unknown') as country,
      sum(crl.gross_amount_cents)::bigint as gross_revenue_cents,
      sum(crl.platform_fee_cents)::bigint as platform_fee_cents,
      sum(crl.processor_fee_cents)::bigint as processor_fee_cents,
      sum(crl.spark_cost_cents)::bigint as spark_cost_cents,
      sum(crl.refund_amount_cents)::bigint as refund_amount_cents,
      sum(crl.net_revenue_cents)::bigint as net_revenue_cents
    from public.country_revenue_ledger crl, guard g
    where g.allowed
      and (p_start_date is null or crl.created_at >= p_start_date::timestamptz)
      and (p_end_date is null or crl.created_at < (p_end_date + 1)::timestamptz)
    group by 1
  ),
  partner_summary as (
    select
      coalesce(rprl.country_code, 'Unknown') as country,
      count(distinct rprl.partner_id)::bigint as active_partner_count,
      sum(rprl.partner_earned_cents) filter (where rprl.status in ('accrued','payable'))::bigint as partner_payable_cents
    from public.regional_partner_revenue_ledger rprl, guard g
    where g.allowed
      and (p_start_date is null or rprl.occurred_at >= p_start_date::timestamptz)
      and (p_end_date is null or rprl.occurred_at < (p_end_date + 1)::timestamptz)
    group by 1
  ),
  countries as (
    select country from user_summary
    union select country from revenue_summary
    union select country from partner_summary
  )
  select
    c.country,
    coalesce(us.registrations, 0)::bigint,
    coalesce(us.verified_users, 0)::bigint,
    coalesce(us.paying_users, 0)::bigint,
    coalesce(rs.gross_revenue_cents, 0)::bigint,
    coalesce(rs.platform_fee_cents, 0)::bigint,
    coalesce(rs.processor_fee_cents, 0)::bigint,
    coalesce(rs.spark_cost_cents, 0)::bigint,
    coalesce(rs.refund_amount_cents, 0)::bigint,
    coalesce(rs.net_revenue_cents, 0)::bigint,
    coalesce(ps.active_partner_count, 0)::bigint,
    coalesce(ps.partner_payable_cents, 0)::bigint
  from countries c
  left join user_summary us using (country)
  left join revenue_summary rs using (country)
  left join partner_summary ps using (country)
  order by coalesce(rs.net_revenue_cents, 0) desc, coalesce(us.registrations, 0) desc, c.country;
$$;

create or replace function public.admin_get_partner_revenue_summary(
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  partner_id uuid,
  partner_name text,
  status text,
  default_country text,
  active_campaigns bigint,
  attributed_users bigint,
  gross_revenue_cents bigint,
  net_revenue_cents bigint,
  partner_earned_cents bigint,
  paid_cents bigint,
  pending_payout_cents bigint
)
language sql
security definer
set search_path = public, auth
as $$
  with guard as (select public.fm_is_active_admin() as allowed),
  campaign_summary as (
    select partner_id, count(*) filter (where status = 'active')::bigint as active_campaigns
    from public.regional_partner_campaigns, guard g
    where g.allowed
    group by partner_id
  ),
  attribution_summary as (
    select partner_id, count(distinct user_id)::bigint as attributed_users
    from public.user_partner_attributions, guard g
    where g.allowed
      and (p_start_date is null or attributed_at >= p_start_date::timestamptz)
      and (p_end_date is null or attributed_at < (p_end_date + 1)::timestamptz)
    group by partner_id
  ),
  revenue_summary as (
    select
      partner_id,
      sum(gross_amount_cents)::bigint as gross_revenue_cents,
      sum(net_revenue_cents)::bigint as net_revenue_cents,
      sum(partner_earned_cents)::bigint as partner_earned_cents,
      sum(partner_earned_cents) filter (where status in ('accrued','payable'))::bigint as pending_payout_cents
    from public.regional_partner_revenue_ledger, guard g
    where g.allowed
      and (p_start_date is null or occurred_at >= p_start_date::timestamptz)
      and (p_end_date is null or occurred_at < (p_end_date + 1)::timestamptz)
    group by partner_id
  ),
  payout_summary as (
    select partner_id, sum(amount_cents) filter (where status = 'paid')::bigint as paid_cents
    from public.partner_payouts, guard g
    where g.allowed
    group by partner_id
  )
  select
    rp.id,
    rp.partner_name,
    rp.status,
    rp.default_country,
    coalesce(cs.active_campaigns, 0)::bigint,
    coalesce(ats.attributed_users, 0)::bigint,
    coalesce(rs.gross_revenue_cents, 0)::bigint,
    coalesce(rs.net_revenue_cents, 0)::bigint,
    coalesce(rs.partner_earned_cents, 0)::bigint,
    coalesce(ps.paid_cents, 0)::bigint,
    coalesce(rs.pending_payout_cents, 0)::bigint
  from guard g
  cross join public.regional_partners rp
  left join campaign_summary cs on cs.partner_id = rp.id
  left join attribution_summary ats on ats.partner_id = rp.id
  left join revenue_summary rs on rs.partner_id = rp.id
  left join payout_summary ps on ps.partner_id = rp.id
  where g.allowed
  order by coalesce(rs.partner_earned_cents, 0) desc, rp.partner_name;
$$;

create or replace function public.partner_get_my_revenue_summary(
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  partner_id uuid,
  partner_name text,
  default_country text,
  active_campaigns bigint,
  attributed_users bigint,
  gross_revenue_cents bigint,
  platform_fee_cents bigint,
  net_revenue_cents bigint,
  partner_earned_cents bigint,
  paid_cents bigint,
  pending_payout_cents bigint
)
language sql
security definer
set search_path = public, auth
as $$
  with my_partner as (select public.partner_portal_partner_id() as partner_id),
  campaign_summary as (
    select count(*) filter (where status = 'active')::bigint as active_campaigns
    from public.regional_partner_campaigns rpc, my_partner mp
    where rpc.partner_id = mp.partner_id
  ),
  attribution_summary as (
    select count(distinct user_id)::bigint as attributed_users
    from public.user_partner_attributions upa, my_partner mp
    where upa.partner_id = mp.partner_id
  ),
  revenue_summary as (
    select
      sum(rprl.gross_amount_cents)::bigint as gross_revenue_cents,
      0::bigint as platform_fee_cents,
      sum(rprl.net_revenue_cents)::bigint as net_revenue_cents,
      sum(rprl.partner_earned_cents)::bigint as partner_earned_cents,
      sum(rprl.partner_earned_cents) filter (where rprl.status in ('accrued','payable'))::bigint as pending_payout_cents
    from public.regional_partner_revenue_ledger rprl, my_partner mp
    where rprl.partner_id = mp.partner_id
      and (p_start_date is null or rprl.occurred_at >= p_start_date::timestamptz)
      and (p_end_date is null or rprl.occurred_at < (p_end_date + 1)::timestamptz)
  ),
  payout_summary as (
    select sum(amount_cents) filter (where status = 'paid')::bigint as paid_cents
    from public.partner_payouts pp, my_partner mp
    where pp.partner_id = mp.partner_id
  )
  select
    rp.id,
    rp.partner_name,
    rp.default_country,
    coalesce(cs.active_campaigns, 0)::bigint,
    coalesce(ats.attributed_users, 0)::bigint,
    coalesce(rs.gross_revenue_cents, 0)::bigint,
    coalesce(rs.platform_fee_cents, 0)::bigint,
    coalesce(rs.net_revenue_cents, 0)::bigint,
    coalesce(rs.partner_earned_cents, 0)::bigint,
    coalesce(ps.paid_cents, 0)::bigint,
    coalesce(rs.pending_payout_cents, 0)::bigint
  from my_partner mp
  join public.regional_partners rp on rp.id = mp.partner_id
  cross join campaign_summary cs
  cross join attribution_summary ats
  cross join revenue_summary rs
  cross join payout_summary ps
  where mp.partner_id is not null;
$$;

revoke all on function public.admin_get_country_revenue_summary(date, date) from public;
revoke all on function public.admin_get_partner_revenue_summary(date, date) from public;
revoke all on function public.partner_get_my_revenue_summary(date, date) from public;
grant execute on function public.admin_get_country_revenue_summary(date, date) to authenticated;
grant execute on function public.admin_get_partner_revenue_summary(date, date) to authenticated;
grant execute on function public.partner_get_my_revenue_summary(date, date) to authenticated;
