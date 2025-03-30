-- Supabase SQL schema for scheduled posts

-- Create the scheduled_posts table
create table public.scheduled_posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  scheduled_for timestamp with time zone not null,
  caption text not null,
  tags text[] null,
  images text[] not null,
  listing_id text not null,
  status text not null default 'scheduled'::text 
    check (status in ('scheduled', 'published', 'failed', 'cancelled')),
  carousel_container_id text null,
  media_container_ids text[] null,
  error_message text null,
  user_id text not null,
  metadata jsonb null
);

-- Create indexes for faster queries
create index scheduled_posts_status_idx on public.scheduled_posts (status);
create index scheduled_posts_scheduled_for_idx on public.scheduled_posts (scheduled_for);
create index scheduled_posts_user_id_idx on public.scheduled_posts (user_id);

-- Enable RLS (Row Level Security)
alter table public.scheduled_posts enable row level security;

-- Create policies for authenticated users
create policy "Users can view their own scheduled posts"
  on public.scheduled_posts for select
  using (auth.uid() = user_id);
  
create policy "Users can insert their own scheduled posts"
  on public.scheduled_posts for insert
  with check (auth.uid() = user_id);
  
create policy "Users can update their own scheduled posts"
  on public.scheduled_posts for update
  using (auth.uid() = user_id);
  
create policy "Users can delete their own scheduled posts"
  on public.scheduled_posts for delete
  using (auth.uid() = user_id);

-- Create a function to automatically update the status of posts at their scheduled time
-- This is just an example - for production, you'd likely want a separate service/worker
create or replace function process_scheduled_posts()
returns void
language plpgsql
as $$
begin
  -- Update status of posts that should have been published but weren't
  update public.scheduled_posts
  set status = 'failed',
      error_message = 'Failed to post at scheduled time'
  where status = 'scheduled'
    and scheduled_for < now() - interval '1 hour';
  
  -- In a real implementation, you'd likely use a cron job or worker service
  -- to actually post to Instagram at the scheduled time
end;
$$; 