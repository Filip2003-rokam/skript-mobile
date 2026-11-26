import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Sheet } from '../ui/Sheet';
import { InlineError, LoadingState } from '../ui/State';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';
import { authErrorMessage } from '../../lib/services/authService';
import { inboxTarget, inboxText, listInbox, markInboxRead, type InboxItem } from '../../lib/services/inboxService';
import { appLocale, t } from '../../lib/i18n';

// Zvonce na početnoj: zahtevi, nove veze i sastanci za ovaj event. Otvaranje ih označi kao pročitana.

function when(iso: string): string {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(appLocale(), { day: 'numeric', month: 'short' });
}

export function InboxBell({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    let active = true;
    listInbox(eventId)
      .then((rows) => {
        if (!active) return;
        setItems(rows);
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
  }, [eventId]);

  useFocusEffect(load);

  const unread = items.filter((item) => !item.read).length;

  const show = () => {
    setOpen(true);
    const ids = items.filter((item) => !item.read).map((item) => item.id);
    if (ids.length === 0) return;
    // Tačka nestaje odmah. Ako upis ne uspe, sledeći ulazak na početnu vrati stvarno stanje.
    setItems((current) => current.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item)));
    markInboxRead(ids).catch(() => undefined);
  };

  const go = (item: InboxItem) => {
    setOpen(false);
    const target = inboxTarget(item.kind);
    if (target === 'myDay') router.push({ pathname: '/agenda', params: { view: 'myDay' } });
    else router.push({ pathname: '/people', params: { view: target } });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? t('inbox.open', { count: unread }) : t('inbox.title')}
        hitSlop={space.tight * 2}
        onPress={show}
        style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
      >
        <Feather name="bell" size={size.iconMd} color={colors.ink} />
        {unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        ) : null}
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('inbox.title')} scroll>
        {!ready ? <LoadingState fill={false} /> : null}
        {error ? <InlineError text={error} onRetry={load} /> : null}
        {ready && !error && items.length === 0 ? <Text style={styles.empty}>{t('inbox.empty')}</Text> : null}
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => go(item)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowText}>{inboxText(item)}</Text>
            <Text style={styles.rowTime}>{when(item.createdAt)}</Text>
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: size.buttonSm,
    height: size.buttonSm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.surfaceBorder,
  },
  pressed: {
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: space.tight,
    right: space.tight,
    minWidth: size.iconSm,
    height: size.iconSm,
    paddingHorizontal: space.tight,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.skriptYellow,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs11,
    color: colors.onSignal,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.text2,
    paddingVertical: space.gap,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.gap,
    paddingVertical: space.gap,
    borderBottomWidth: size.border,
    borderBottomColor: colors.hairline,
  },
  rowText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.fs15,
    color: colors.ink,
  },
  rowTime: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs12,
    color: colors.text3,
  },
});
