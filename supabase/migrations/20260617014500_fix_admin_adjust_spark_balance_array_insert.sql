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
  v_admin_auth_user_id uuid := auth.uid();
  v_admin_row_id uuid;
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
begin
  if v_admin_auth_user_id is null then
    raise exception 'admin access required';
  end if;

  select au.id, au.email
    into v_admin_row_id, v_admin_email
  from public.admin_users au
  where au.user_id = v_admin_auth_user_id
    and au.status = 'active'
  limit 1;

  if v_admin_row_id is null then
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
    'target_type', 'user',
    'target_id', v_user_id::text,
    'target_user_id', v_user_id,
    'target_email', email,
    'old_balance', v_old_balance,
    'adjustment', adjustment,
    'new_balance', v_new_balance,
    'reason', v_reason,
    'admin_user_id', v_admin_row_id,
    'admin_auth_user_id', v_admin_auth_user_id,
    'admin_email', v_admin_email
  );

  insert into public.admin_audit_logs (
    admin_user_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    v_admin_row_id,
    'spark_balance_adjusted',
    'user',
    v_user_id::text,
    v_audit_payload
  );

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
