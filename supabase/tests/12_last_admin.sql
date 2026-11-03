-- At least one active administrator must always remain (CU-15).
begin;
select plan(4);

select lives_ok(
    $$update public.profiles set active = false
      where id = (select id from auth.users where email = 'admin2@test.local')$$,
    'one of two admins can be deactivated'
);
select throws_ok(
    $$update public.profiles set active = false
      where id = (select id from auth.users where email = 'admin@test.local')$$,
    'P0001', 'last_admin_required', 'the last active admin cannot be deactivated'
);
select throws_ok(
    $$update public.profiles
      set role_id = (select id from public.roles where code = 'seller')
      where id = (select id from auth.users where email = 'admin@test.local')$$,
    'P0001', 'last_admin_required', 'the last active admin cannot lose the admin role'
);
select lives_ok(
    $$update public.profiles set full_name = 'Ximena L.'
      where id = (select id from auth.users where email = 'admin@test.local')$$,
    'other profile edits are allowed'
);

select * from finish();
rollback;
