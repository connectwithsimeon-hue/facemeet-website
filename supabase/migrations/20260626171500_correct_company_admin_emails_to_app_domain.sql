create or replace function public.grant_preapproved_company_admin_access()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
begin
  if v_email in ('support@facemeet.app', 'hello@facemeet.app') then
    insert into public.admin_users (user_id, email, role, status)
    values (new.id, v_email, 'super_admin', 'active')
    on conflict (user_id) do update
      set email = excluded.email,
          role = 'super_admin',
          status = 'active',
          updated_at = now();
  end if;

  return new;
end;
$$;

delete from public.admin_users
where lower(email) in ('support@facemeet.com', 'hello@facemeet.com');

insert into public.admin_users (user_id, email, role, status)
select id, lower(email), 'super_admin', 'active'
from auth.users
where lower(email) in ('support@facemeet.app', 'hello@facemeet.app')
on conflict (user_id) do update
  set email = excluded.email,
      role = 'super_admin',
      status = 'active',
      updated_at = now();
