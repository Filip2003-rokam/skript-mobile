import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { colors, fontSize, fonts, pressScale, radius, size, space } from '../../constants/theme';

export type TryCard = {
  key: string;
  tag: string;
  icon: keyof typeof Feather.glyphMap;
  live?: boolean;
  title: string;
  detail: string | null;
  onPress: () => void;
};

export function buildTryCards(liveTitle: string | null, nextTitle: string | null, suggestions: number, followUps: number): TryCard[] {
  return [
    {
      key: 'now',
      tag: 'Uživo',
      icon: 'radio',
      live: Boolean(liveTitle),
      title: 'Šta se dešava sada?',
      detail: liveTitle ?? 'Nema sesije u toku',
      onPress: () => router.push('/agenda'),
    },
    {
      key: 'next',
      tag: 'Agenda',
      icon: 'calendar',
      title: 'Šta je sledeće?',
      detail: nextTitle ?? 'Nema sledeće sesije',
      onPress: () => router.push('/agenda'),
    },
    {
      key: 'people',
      tag: 'Ljudi',
      icon: 'users',
      title: 'Koga da upoznam?',
      detail: suggestions === 0 ? 'Nema predloga' : suggestions === 1 ? '1 predlog' : `${suggestions} predloga`,
      onPress: () => router.push({ pathname: '/people', params: { view: 'suggestions' } }),
    },
    {
      key: 'swap',
      tag: 'Razmena',
      icon: 'repeat',
      title: 'Razmeni kontakt',
      detail: null,
      onPress: () => router.push('/swap' as Href),
    },
    {
      key: 'follow',
      tag: 'Kontakti',
      icon: 'book',
      title: 'Moji follow-up-ovi',
      detail: followUps === 0 ? 'Nema na redu' : followUps === 1 ? '1 na redu' : `${followUps} na redu`,
      onPress: () => router.push('/profile'),
    },
  ];
}

export function TryCards({ cards }: { cards: TryCard[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.bleed}
    >
      {cards.map((card) => (
        <Pressable
          key={card.key}
          accessibilityRole="button"
          onPress={card.onPress}
          style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: pressScale }] }]}
        >
          <View style={styles.top}>
            <View style={styles.tag}>
              {card.live ? <View style={styles.dot} /> : <Feather name={card.icon} size={fontSize.fs12} color={colors.text2} />}
              <Text style={styles.tagText}>{card.tag}</Text>
            </View>
            <Feather name="arrow-up-right" size={fontSize.fs12} color={colors.text3} />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {card.title}
          </Text>
          {card.detail ? (
            <Text style={styles.detail} numberOfLines={1}>
              {card.detail}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: {
    marginHorizontal: -space.edge,
  },
  row: {
    gap: space.gap,
    paddingHorizontal: space.edge,
  },
  card: {
    width: size.tryCardWidth,
    height: size.tryCardHeight,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.surfaceBorder,
    padding: space.gap,
    gap: space.tight * 2,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    height: size.chipSm,
    paddingHorizontal: space.tight * 2,
    borderRadius: radius.pill,
    backgroundColor: colors.fillSubtle,
  },
  dot: {
    width: size.liveDot,
    height: size.liveDot,
    borderRadius: size.liveDot,
    backgroundColor: colors.live,
  },
  tagText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs11,
    color: colors.text2,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
  detail: {
    marginTop: 'auto',
    fontFamily: fonts.regular,
    fontSize: fontSize.fs11,
    color: colors.text2,
  },
});
