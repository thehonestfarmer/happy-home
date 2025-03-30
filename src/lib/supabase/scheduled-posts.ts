import { supabase } from './client';
import { Database } from './types';

/**
 * Type representing a scheduled post from the database
 */
export type ScheduledPost = Database['public']['Tables']['scheduled_posts']['Row'];

/**
 * Type for creating a new scheduled post
 */
export type ScheduledPostInsert = Database['public']['Tables']['scheduled_posts']['Insert'];

/**
 * Type for updating a scheduled post
 */
export type ScheduledPostUpdate = Database['public']['Tables']['scheduled_posts']['Update'];

/**
 * Fetch all scheduled posts
 */
export async function getScheduledPosts(): Promise<ScheduledPost[]> {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('Error fetching scheduled posts:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a specific scheduled post by ID
 */
export async function getScheduledPostById(id: string): Promise<ScheduledPost | null> {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Post not found
      return null;
    }
    console.error('Error fetching scheduled post:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new scheduled post
 */
export async function createScheduledPost(post: ScheduledPostInsert): Promise<ScheduledPost> {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert(post)
    .select()
    .single();

  if (error) {
    console.error('Error creating scheduled post:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing scheduled post
 */
export async function updateScheduledPost(id: string, updates: ScheduledPostUpdate): Promise<ScheduledPost> {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating scheduled post:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a scheduled post
 */
export async function deleteScheduledPost(id: string): Promise<void> {
  const { error } = await supabase
    .from('scheduled_posts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting scheduled post:', error);
    throw error;
  }
}

/**
 * Cancel a scheduled post
 */
export async function cancelScheduledPost(id: string): Promise<ScheduledPost> {
  return updateScheduledPost(id, {
    status: 'cancelled',
  });
} 