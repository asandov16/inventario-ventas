-- Catalog guard (F2 DoD, ADR-023): every function exposed through the API must be SECURITY
-- DEFINER, pin search_path, check permissions first and be closed to anon. A new RPC that
-- forgets any of this fails here.
begin;
select plan(6);

create temporary table api_functions as
select
    p.oid,
    p.proname as name,
    p.prosecdef as is_definer,
    coalesce(array_to_string(p.proconfig, ','), '') as config,
    p.prosrc as body
from pg_proc as p
inner join pg_namespace as n on n.oid = p.pronamespace
left join pg_depend as d on d.objid = p.oid and d.deptype = 'e'
where n.nspname = 'public' and p.prokind = 'f' and d.objid is null;

select ok((select count(*) from api_functions) >= 20, 'the catalog sees the public RPCs');

select is(
    (select array_agg(name order by name) from api_functions where not is_definer),
    null, 'every public RPC is SECURITY DEFINER'
);
select is(
    (select array_agg(name order by name) from api_functions where config not like '%search_path=""%'),
    null, 'every public RPC pins an empty search_path'
);
select is(
    (select array_agg(name order by name) from api_functions
     where body not like '%private.require_permission(%' and name not in ('ping', 'get_my_profile')),
    null, 'every public RPC calls require_permission, except the ADR-023 exceptions'
);
select is(
    (select array_agg(name order by name) from api_functions
     where has_function_privilege('anon', oid, 'execute') and name <> 'ping'),
    null, 'anon can execute only ping()'
);
select is(
    (select array_agg(name order by name) from api_functions
     where not has_function_privilege('authenticated', oid, 'execute')),
    null, 'every public RPC is executable by authenticated users'
);

select * from finish();
rollback;
