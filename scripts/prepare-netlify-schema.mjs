// Generates a schema-only baseline from the verified pre-stabilisation inventory.
// No manuscript data, email addresses or account IDs are written into migrations.
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const root = process.argv[2] ?? '.local-backups/2026-09-09-pre-deploy'
const { snapshot } = JSON.parse(await readFile(`${root}/application-snapshot.json`, 'utf8')).rows[0]
const { inventory, preflight } = JSON.parse(await readFile(`${root}/catalog.json`, 'utf8'))
assert.equal(snapshot.sequences.length, 0)
assert.equal(snapshot.views.length, 0)
const quote = s => '"' + s.replaceAll('"', '""') + '"'
const literal = s => "'" + s.replaceAll("'", "''") + "'"
const adapt = s => s.replace(/\bauth\./g, 'studio_auth.').replace(/\banon\b/g, 'studio_anon').replace(/\bauthenticated\b/g, 'studio_authenticated').replace(/\bservice_role\b/g, 'netlifydb_owner')
const sql = [`-- Studio baseline: schema only, preserving the verified workshop invariants.
-- Application rows and identity mappings are imported privately after rehearsal.
begin;
set local search_path = public;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='studio_anon') then create role studio_anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='studio_authenticated') then create role studio_authenticated nologin; end if;
end $$;
grant studio_anon, studio_authenticated to current_user;
create schema studio_auth;
revoke all on schema studio_auth from public;
create table studio_auth.users (
 id uuid primary key,
 identity_id uuid unique,
 email text not null,
 email_confirmed_at timestamptz,
 blocked boolean not null default false,
 created_at timestamptz not null default now()
);
create unique index studio_users_email_unique on studio_auth.users(lower(email));
create function studio_auth.uid() returns uuid language sql stable set search_path='' as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
revoke all on function studio_auth.uid() from public;
grant usage on schema studio_auth to studio_anon,studio_authenticated;
grant execute on function studio_auth.uid() to studio_anon,studio_authenticated;`]
for (const type of preflight.enums) sql.push(`create type public.${quote(type.typname)} as enum (${type.labels.map(literal).join(',')});`)
sql.push(...snapshot.create_tables)
for (const fn of inventory.functions) if (fn.name !== 'rls_auto_enable') sql.push(fn.definition + ';')
for (const c of [...snapshot.constraints].sort((a,b) => Number(a.kind==='f')-Number(b.kind==='f'))) sql.push(c.ddl)
sql.push(...snapshot.indexes)
for (const t of inventory.triggers) sql.push(t.definition + ';')
for (const table of inventory.tables) if (table.rls) sql.push(`alter table public.${quote(table.name)} enable row level security;`)
for (const p of inventory.policies) sql.push(`create policy ${quote(p.policyname)} on public.${quote(p.tablename)} as ${p.permissive} for ${p.cmd} to ${p.roles.map(r=>r==='public'?'PUBLIC':quote(r)).join(',')} ${p.qual?'using ('+p.qual+')':''} ${p.with_check?'with check ('+p.with_check+')':''};`)
for (const g of inventory.grants) sql.push(`grant ${g.privilege_type} on public.${quote(g.table_name)} to ${g.grantee==='PUBLIC'?'PUBLIC':quote(g.grantee)};`)
const stabilisation = await readFile('supabase/migrations/20260909064353_workshop_stabilisation.sql','utf8')
sql.push(stabilisation.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,''))
sql.push('commit;')
const destination = 'netlify/database/migrations/001_workshop-baseline'
await mkdir(destination, {recursive:true})
await writeFile(`${destination}/migration.sql`,adapt(sql.join('\n\n'))+'\n')
console.log('Prepared schema-only Netlify migration.')
