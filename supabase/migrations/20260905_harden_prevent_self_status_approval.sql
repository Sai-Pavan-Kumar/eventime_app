-- Migration: Harden prevent_self_status_approval trigger on public.events
-- Date: 2026-09-05
-- Purpose: Prevent regular users from manipulating is_featured, admin_notes, or approved_at

CREATE OR REPLACE FUNCTION public.prevent_self_status_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  is_admin boolean;
  link_hostname text;
  full_path text;
  is_trusted boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();

  if not coalesce(is_admin, false) then
    if TG_OP = 'INSERT' then
      link_hostname := lower(regexp_replace(coalesce(new.registration_link, ''), '^(?:https?://)?(?:www\.)?([^/?#]+).*$', '\1'));
      full_path := link_hostname || regexp_replace(coalesce(new.registration_link, ''), '^(?:https?://)?(?:www\.)?[^/?#]+', '');

      select exists (
        select 1 from public.verified_domains d
        where link_hostname = d.domain_name
           or full_path like (d.domain_name || '%')
      ) into is_trusted;

      if not is_trusted then
        new.status := 'pending';
      end if;

      -- Enforce admin-only fields on INSERT
      new.is_featured := false;
      new.admin_notes := null;
      new.approved_at := case when is_trusted then now() else null end;

    elsif TG_OP = 'UPDATE' then
      -- Enforce admin-only fields on UPDATE
      new.status := old.status;
      new.is_featured := old.is_featured;
      new.admin_notes := old.admin_notes;
      new.approved_at := old.approved_at;
    end if;
  end if;

  return new;
end;
$function$;
