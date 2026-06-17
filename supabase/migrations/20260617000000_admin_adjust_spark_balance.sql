create or replace function public.admin_get_spark_credit_account(
  target_email text
)
returns table (
  user_id uuid,
  email text,
  first_name text,
  display_name text,
  spark_balance integer,
  account_status text,
  profile_visibility_status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_user_id uuid := auth.uid();
  v_target_email text := lower(trim(coalesce(target_email, '')));
begin
  if v_admin_user_id is null then
    raise exception 'admin access required';
  end if;

  if not exists (
    select 1
    from public.admin_users au
    where au.user_id = v_admin_user_id
      and au.status = 'active'
  ) then
    raise exception 'admin access required';
  end if;

  if v_target_email = '' or position('@' in v_target_email) <= 1 then
    raise exception 'invalid target email';
  end if;

  return query
  select
    u.id,
    u.email,
    u.first_name,
    coalesce(u.username, u.first_name, u.email),
    coalesce(u.spark_balance, 0),
    u.account_status,
    u.profile_visibility_status
  from public.users u
  where lower(u.email) = v_target_email
  limit 1;

  if not found then
    raise exception 'user not found';
  end if;
end;
$$;

create or replace function public.admin_adjust_spark_balance(
  target_email text,
  adjustment integer,
  reason text
)
returns table (
  email text,
  first_name text,
  display_name text,
  old_balance integer,
  adjustment_applied integer,
  new_balance integer,
  account_status text,
  profile_visibility_status text,
  adjustment_reason text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_user_id uuid := auth.uid();
  v_admin_email text;
  v_target_email text := lower(trim(coalesce(target_email, '')));
  v_reason text := trim(coalesce(reason, ''));
  v_user_id uuid;
  v_first_name text;
  v_display_name text;
  v_old_balance integer;
  v_new_balance integer;
  v_account_status text;
  v_profile_visibility_status text;
  v_audit_payload jsonb;
  v_columns text[] := array[]::text[];
  v_values text[] := array[]::text[];
begin
  if v_admin_user_id is null then
    raise exception 'admin access required';
  end if;

  select au.email
    into v_admin_email
  from public.admin_users au
  where au.user_id = v_admin_user_id
    and au.status = 'active'
  limit 1;

  if v_admin_email is null then
    raise exception 'admin access required';
  end if;

  if v_target_email = '' or position('@' in v_target_email) <= 1 then
    raise exception 'invalid target email';
  end if;

  if adjustment is null or adjustment = 0 then
    raise exception 'adjustment must be a non-zero integer';
  end if;

  if v_reason = '' then
    raise exception 'reason is required';
  end if;

  select
    u.id,
    u.email,
    u.first_name,
    coalesce(u.username, u.first_name, u.email),
    coalesce(u.spark_balance, 0),
    u.account_status,
    u.profile_visibility_status
  into
    v_user_id,
    email,
    v_first_name,
    v_display_name,
    v_old_balance,
    v_account_status,
    v_profile_visibility_status
  from public.users u
  where lower(u.email) = v_target_email
  for update;

  if v_user_id is null then
    raise exception 'user not found';
  end if;

  v_new_balance := v_old_balance + adjustment;

  if v_new_balance < 0 then
    raise exception 'spark balance cannot go below zero';
  end if;

  update public.users u
  set spark_balance = v_new_balance
  where u.id = v_user_id;

  v_audit_payload := jsonb_build_object(
    'action', 'spark_balance_adjusted',
    'target_user_id', v_user_id,
    'target_email', email,
    'old_balance', v_old_balance,
    'adjustment', adjustment,
    'new_balance', v_new_balance,
    'reason', v_reason,
    'admin_user_id', v_admin_user_id,
    'admin_email', v_admin_email
  );

  if to_regclass('public.admin_audit_logs') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'admin_audit_logs' and column_name = 'action'
    ) then
      v_columns := v_columns || 'action';
      v_values := v_values || quote_literal('spark_balance_adjusted');
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'admin_audit_logs' and column_name = 'admin_user_id'
    ) then
      v_columns := v_columns || 'admin_user_id';
      v_values := v_values || quote_literal(v_admin_user_id::text);
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'admin_audit_logs' and column_name = 'admin_email'
    ) then
      v_columns := v_columns || 'admin_email';
      v_values := v_values || quote_literal(v_admin_email);
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'admin_audit_logs' and column_name = 'target_user_id'
    ) then
      v_columns := v_columns || 'target_user_id';
      v_values := v_values || quote_literal(v_user_id::text);
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'admin_audit_logs' and column_name = 'target_email'
    ) then
      v_columns := v_columns || 'target_email';
      v_values := v_values || quote_literal(email);
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'admin_audit_logs' and column_name = 'reason'
    ) then
      v_columns := v_columns || 'reason';
      v_values := v_values || quote_literal(v_reason);
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'admin_audit_logs' and column_name = 'metadata'
    ) then
      v_columns := v_columns || 'metadata';
      v_values := v_values || quote_literal(v_audit_payload::text) || '::jsonb';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'admin_audit_logs' and column_name = 'details'
    ) then
      v_columns := v_columns || 'details';
      v_values := v_values || quote_literal(v_audit_payload::text) || '::jsonb';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'admin_audit_logs' and column_name = 'created_at'
    ) then
      v_columns := v_columns || 'created_at';
      v_values := v_values || 'now()';
    end if;

    if array_length(v_columns, 1) is not null then
      execute format(
        'insert into public.admin_audit_logs (%s) values (%s)',
        array_to_string(v_columns, ', '),
        array_to_string(v_values, ', ')
      );
    end if;
  end if;

  first_name := v_first_name;
  display_name := v_display_name;
  old_balance := v_old_balance;
  adjustment_applied := adjustment;
  new_balance := v_new_balance;
  account_status := v_account_status;
  profile_visibility_status := v_profile_visibility_status;
  adjustment_reason := v_reason;
  return next;
end;
$$;

revoke all on function public.admin_adjust_spark_balance(text, integer, text) from public;
grant execute on function public.admin_adjust_spark_balance(text, integer, text) to authenticated;

revoke all on function public.admin_get_spark_credit_account(text) from public;
grant execute on function public.admin_get_spark_credit_account(text) to authenticated;
