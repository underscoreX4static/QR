create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Insert the admin user (leshit.fr@gmail.com)
insert into admins (user_id) values ('7816c87a-9928-45c0-95c3-6ca769567333') on conflict do nothing;
