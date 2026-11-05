import { supabase } from '../supabase';
import { getSession } from './authService';

export async function getMyName(): Promise<string | null> {
  const session = await getSession();
  if (!session) throw new Error('Nisi prijavljen.');
  const { data, error } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
  if (error) throw error;
  const name = data?.full_name?.trim();
  return name ? name : null;
}
