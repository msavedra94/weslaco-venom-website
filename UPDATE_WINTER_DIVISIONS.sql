-- Review before running. Adds new separate boys/girls winter divisions without touching existing registrations.
insert into public.venom_divisions(name,season,capacity,active,fee_cents,pricing_announced_at) values
 ('Boys 6U 7v7','Winter',15,false,null,null),
 ('Boys 8U 7v7','Winter',15,false,null,null),
 ('Boys 10U 7v7','Winter',15,false,null,null),
 ('Girls 8U 7v7','Winter',15,false,null,null),
 ('Girls 10U 7v7','Winter',15,false,null,null)
on conflict(name,season) do nothing;
-- Close obsolete unsegmented 7v7 divisions, preserving any historical records.
update public.venom_divisions set active=false
where season='Winter' and name in ('6U 7v7','8U 7v7','10U 7v7','12U 7v7','14U 7v7');
-- NOTE: all new divisions remain inactive until capacities are approved and registration is ready.
