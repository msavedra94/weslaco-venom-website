-- Safe division update for the schema already installed in Supabase.
-- Run this in SQL Editor. Does not remove any existing registration.
insert into public.venom_divisions(name,season,capacity,active,fee_cents,pricing_announced_at) values
 ('Boys 6U 7v7','Winter',15,false,null,null),
 ('Boys 8U 7v7','Winter',15,false,null,null),
 ('Boys 10U 7v7','Winter',15,false,null,null),
 ('Girls 8U 7v7','Winter',15,false,null,null),
 ('Girls 10U 7v7','Winter',15,false,null,null),
 ('8U Big Man Challenge','Winter',15,false,null,null),
 ('10U Big Man Challenge','Winter',15,false,null,null),
 ('12U Big Man Challenge','Winter',15,false,null,null)
on conflict(name,season) do nothing;
-- Keep all divisions closed until backend, email, payments and capacities are tested.
select name,capacity,active,fee_cents from public.venom_divisions where season='Winter' order by name;
