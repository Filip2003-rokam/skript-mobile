import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getConnected, getIncoming, getOutgoing, respond, type ConnectionPerson } from '../../lib/services/connectionService';
import { getEventBySlug, type EventRow } from '../../lib/services/eventService';
import { authErrorMessage } from '../../lib/services/authService';
import { expressInterest, listMine, removeInterest, skipPerson, type InterestPerson } from '../../lib/services/interestService';
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
  const [openInterests, setOpenInterests] = useState<InterestPerson[]>([]);
  const [skipped, setSkipped] = useState<InterestPerson[]>([]);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshLock = useRef(false);
  const loadedSlug = useRef<string | null>(null);

  useEffect(() => {
    if (loadedSlug.current !== slug) {
      loadedSlug.current = null;
      setEvent(null);
      setSuggestions([]);
      setSaved([]);
      setIncoming([]);
      setOutgoing([]);
      setConnected([]);
      setOpenInterests([]);
      setSkipped([]);
      setReady(false);
    }
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
          const [nextSuggestions, nextSaved, nextIncoming, nextOutgoing, nextConnected, nextInterests] = await Promise.all([
            getSuggestions(row.id),
            list(row.id),
            getIncoming(row.id),
            getOutgoing(row.id),
            getConnected(row.id),
            listMine(row.id),
          ]);
          if (!active) return;
          loadedSlug.current = slug;
          setEvent(row);
          setSuggestions(nextSuggestions);
          setSaved(nextSaved);
          setIncoming(nextIncoming);
          setOutgoing(nextOutgoing);
          setConnected(nextConnected);
          setOpenInterests(nextInterests.open);
          setSkipped(nextInterests.skipped);
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

  async function reloadInterests(eventId: string) {
    const [nextInterests, nextConnected] = await Promise.all([listMine(eventId), getConnected(eventId)]);
    setOpenInterests(nextInterests.open);
    setSkipped(nextInterests.skipped);
    setConnected(nextConnected);
  }

  async function interest(targetUserId: string) {
    if (!event) return;
    await expressInterest(event.id, targetUserId);
    await reloadInterests(event.id);
  }

  async function skip(targetUserId: string) {
    if (!event) return;
    await skipPerson(event.id, targetUserId);
    await reloadInterests(event.id);
  }

  async function withdraw(interestId: string) {
    if (!event) return;
    await removeInterest(interestId);
    await reloadInterests(event.id);
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

  const hidden = hiddenIds(openInterests, skipped, connected, incoming, outgoing);

  return {
    event,
    saved,
    suggestions: suggestions.filter((item) => !hidden.has(item.suggestedUserId)),
    incoming,
    outgoing,
    connected,
    openInterests,
    skipped,
    ready,
    missing,
    error,
    refreshing,
    refreshError,
    retry: () => setAttempt((value) => value + 1),
    refresh,
    interest,
    skip,
    withdraw,
    toggleSave,
    answer,
  };
}

function hiddenIds(
  open: InterestPerson[],
  skippedPeople: InterestPerson[],
  connected: ConnectionPerson[],
  incoming: ConnectionPerson[],
  outgoing: ConnectionPerson[],
): Set<string> {
  const hidden = new Set<string>();
  for (const person of open) hidden.add(person.userId);
  for (const person of skippedPeople) hidden.add(person.userId);
  for (const person of connected) hidden.add(person.userId);
  for (const person of incoming) if (person.status === 'pending') hidden.add(person.userId);
  for (const person of outgoing) if (person.status === 'pending') hidden.add(person.userId);
  return hidden;
}
