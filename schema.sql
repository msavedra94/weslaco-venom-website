-- NEW INSTALL: use this schema in a new Supabase project. For an existing project, see MIGRATE_EXISTING.sql.
create extension if not exists pgcrypto;
create table if not exists public.venom_divisions (
 id uuid primary key default gen_random_uuid(), name text not null, season text not null,
 capacity integer not null check(capacity>0), active boolean not null default false,
 fee_cents integer check(fee_cents is null or fee_cents>=0),
 pricing_announced_at timestamptz,
 unique(name,season),
 constraint pricing_consistency check ((fee_cents is null and pricing_announced_at is null) or (fee_cents is not null and pricing_announced_at is not null))
);
create table if not exists public.venom_reservations (
 id uuid primary key default gen_random_uuid(), division_id uuid not null references public.venom_divisions(id),
 guardian_name text not null, guardian_email text not null, guardian_phone text,
 player_name text not null, player_birthdate date not null,
 status text not null default 'reserved' check(status in ('reserved','paid','cancelled','expired')),
 created_at timestamptz not null default now(), expires_at timestamptz,
 payment_window_started_at timestamptz,
 last_reminder_at timestamptz, reminders_disabled boolean not null default false,
 manage_token_hash text not null, checkout_session_id text unique, paid_at timestamptz
);
create index if not exists venom_reservations_active_idx on public.venom_reservations(division_id,status,expires_at);
create index if not exists venom_reservations_due_idx on public.venom_reservations(status,expires_at,last_reminder_at);
alter table public.venom_divisions enable row level security;
alter table public.venom_reservations enable row level security;
create or replace function public.venom_reserve(
 p_division uuid,p_guardian text,p_email text,p_phone text,p_player text,p_birthdate date,p_hash text
) returns uuid language plpgsql security definer set search_path=public as $$
declare d public.venom_divisions%rowtype; n integer; rid uuid; started timestamptz; deadline timestamptz;
begin
 select * into d from public.venom_divisions where id=p_division and active=true for update;
 if not found then raise exception 'Division is not accepting reservations'; end if;
 select count(*) into n from public.venom_reservations
 where division_id=p_division and (status='paid' or (status='reserved' and (expires_at is null or expires_at>now())));
 if n>=d.capacity then raise exception 'Division is full'; end if;
 if d.pricing_announced_at is not null then started:=now();deadline:=started+interval '14 days';end if;
 insert into public.venom_reservations(division_id,guardian_name,guardian_email,guardian_phone,player_name,player_birthdate,manage_token_hash,payment_window_started_at,expires_at)
 values(p_division,p_guardian,lower(p_email),p_phone,p_player,p_birthdate,p_hash,started,deadline) returning id into rid;
 return rid;
end $$;
revoke all on function public.venom_reserve(uuid,text,text,text,text,date,text) from public,anon,authenticated;
-- Announce pricing transactionally: all EXISTING unpaid reservations start their 14-day clock together.
-- Use only after the payment mechanism is live and you are ready to accept payments.
create or replace function public.venom_announce_price(p_division uuid,p_fee_cents integer)
returns void language plpgsql security definer set search_path=public as $$
declare announced timestamptz := now();
begin
 if p_fee_cents is null or p_fee_cents < 0 then raise exception 'Invalid price'; end if;
 perform 1 from public.venom_divisions where id=p_division for update;
 if not found then raise exception 'Division not found'; end if;
 if exists(select 1 from public.venom_divisions where id=p_division and pricing_announced_at is not null) then
   raise exception 'Pricing already announced'; end if;
 update public.venom_divisions set fee_cents=p_fee_cents,pricing_announced_at=announced where id=p_division;
 update public.venom_reservations set payment_window_started_at=announced,expires_at=announced+interval '14 days',last_reminder_at=null
 where division_id=p_division and status='reserved' and payment_window_started_at is null;
end $$;
revoke all on function public.venom_announce_price(uuid,integer) from public,anon,authenticated;
insert into public.venom_divisions(name,season,capacity,active,fee_cents,pricing_announced_at) values
 ('Boys 6U 7v7','Winter',15,false,null,null),('Boys 8U 7v7','Winter',15,false,null,null),
 ('Boys 10U 7v7','Winter',15,false,null,null),('Girls 8U 7v7','Winter',15,false,null,null),
 ('Girls 10U 7v7','Winter',15,false,null,null),
 ('8U Big Man Challenge','Winter',15,false,null,null),
 ('10U Big Man Challenge','Winter',15,false,null,null),
 ('12U Big Man Challenge','Winter',15,false,null,null)
on conflict(name,season) do nothing;
