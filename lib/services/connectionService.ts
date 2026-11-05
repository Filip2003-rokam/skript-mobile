import { supabase } from '../supabase';
import { getSession } from './authService';

export async function countIncoming(eventId: string): Promise<number> {
  const session = await getSession();
  if (!session) throw new Error('Nisi prijavljen.');
  const { count, error } = await supabase
    .from('connections')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('receiver_id', session.user.id)
    .eq('status', 'pending');
  if (error) throw error;
  return count ?? 0;
}
