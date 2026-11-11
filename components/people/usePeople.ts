import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getConnected, getIncoming, getOutgoing, respond, sendRequest, type ConnectionPerson } from '../../lib/services/connectionService';
import { getEventBySlug, type EventRow } from '../../lib/services/eventService';
import { authErrorMessage } from '../../lib/services/authService';
import { getSuggestions, refreshSuggestions, type Suggestion } from '../../lib/services/matchService';
import { list, save, unsave, type SavedPerson } from '../../lib/services/savedService';
import { actionError } from './personBits';

export function usePeople(slug: string) {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [saved, setSaved] = useState<SavedPerson[]>([]);
  const [incoming, setIncoming] = useState<ConnectionPerson[]>([]);
  const [outgoing, setOutgoing] = useState<ConnectionPerson[]>([]);
  const [connected, setConnected] = useState<ConnectionPerson[]>([]);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshLock = useRef(false);

  useEffect(() => {
    setReady(false);
    setMissing(false);
    setError(null);
  }, [slug, attempt]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getEventBySlug(slug)
        .then(async (row) => {
          if (!active) return;
          if (!row) {
            setMissing(true);
            return;
          }
          const [nextSuggestions, nextSaved, nextIncoming, nextOutgoing, nextConnected] = await Promise.all([
            getSuggestions(row.id),
            list(row.id),
            getIncoming(row.id),
            getOutgoing(row.id),
            getConnected(row.id),
          ]);
          if (!active) return;
          setEvent(row);
          setSuggestions(nextSuggestions);
          setSaved(nextSaved);
          setIncoming(nextIncoming);
          setOutgoing(nextOutgoing);
          setConnected(nextConnected);
          setMissing(false);
          setError(null);
        })
        .catch((cause) => {
          if (active) setError(authErrorMessage(cause));
        })
        .finally(() => {
          if (active) setReady(true);
        });
      return () => {
        active = false;
      };
    }, [slug, attempt]),
  );

  async function refresh() {
    if (!event || refreshLock.current) return;
    refreshLock.current = true;
    setRefreshing(true);
    setRefreshError(null);
    try {
      setSuggestions(await refreshSuggestions(event.id));
    } catch (cause) {
      setRefreshError(actionError(cause));
    } finally {
      refreshLock.current = false;
      setRefreshing(false);
    }
  }

  async function connect(receiverId: string, message: string) {
    if (!event) return;
    await sendRequest(event.id, receiverId, message, 'match');
    setOutgoing(await getOutgoing(event.id));
  }

  async function toggleSave(userId: string) {
    if (!event) return;
    if (saved.some((person) => person.userId === userId)) await unsave(event.id, userId);
    else await save(event.id, userId);
    setSaved(await list(event.id));
  }

  async function answer(connectionId: string, status: 'accepted' | 'declined') {
    if (!event) return;
    await respond(connectionId, status);
    const [nextIncoming, nextConnected] = await Promise.all([getIncoming(event.id), getConnected(event.id)]);
    setIncoming(nextIncoming);
    setConnected(nextConnected);
  }

  return {
    event,
    suggestions,
    saved,
    incoming,
    outgoing,
    connected,
    ready,
    missing,
    error,
    refreshing,
    refreshError,
    retry: () => setAttempt((value) => value + 1),
    refresh,
    connect,
    toggleSave,
    answer,
  };
}
