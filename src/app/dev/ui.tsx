import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { EmptyState } from '../../../components/ui/EmptyState';
import { EventHero } from '../../../components/ui/EventHero';
import { EventLogo } from '../../../components/ui/EventLogo';
import { Screen } from '../../../components/ui/Screen';
import { Segmented } from '../../../components/ui/Segmented';
import { SkriptMark } from '../../../components/ui/SkriptMark';
import { TabBar } from '../../../components/ui/TabBar';
import { TextField } from '../../../components/ui/TextField';
import { colors, fontSize, fonts, radius, size, space } from '../../../constants/theme';

const HALL =
  'https://demo.skript.events/__l5e/assets-v1/d528dae9-3805-431c-86f8-aaafd66ca61e/hall.webp';

export default function UiScreen() {
  const [two, setTwo] = useState('da');
  const [three, setThree] = useState('mreza');
  const [four, setFour] = useState('a');
  const [name, setName] = useState('');
  const [tab, setTab] = useState('index');

  return (
    <Screen scroll>
      <Button label="Nazad" variant="ghost" size="sm" onPress={() => router.back()} />
      <Text style={styles.title}>Komponente</Text>

      <Text style={styles.heading}>Znak</Text>
      <SkriptMark />
      <SkriptMark size={fontSize.fs30} />

      <Text style={styles.heading}>Dugmad</Text>
      <View style={styles.row}>
        <Button label="Primarno" />
        <Button label="Sekundarno" variant="secondary" />
        <Button label="Duh" variant="ghost" />
        <Button label="Akcenat" variant="accent" />
      </View>
      <View style={styles.row}>
        <Button label="Malo" size="sm" />
        <Button label="Srednje" size="md" />
        <Button label="Veliko" size="lg" />
      </View>
      <View style={styles.row}>
        <Button label="Isključeno" disabled />
        <Button label="Učitavanje" loading />
        <Button variant="icon" size="sm" accessibilityLabel="Poruka">
          <Feather name="message-circle" size={size.iconSm} color={colors.ink} />
        </Button>
        <Button variant="icon" accessibilityLabel="Kalendar">
          <Feather name="calendar" size={size.iconMd} color={colors.ink} />
        </Button>
        <Button variant="icon" size="lg" accessibilityLabel="Profil">
          <Feather name="user" size={size.iconMd} color={colors.ink} />
        </Button>
      </View>

      <Text style={styles.heading}>Kartice</Text>
      <Card>
        <Text style={styles.body}>Staklo</Text>
      </Card>
      <Card variant="surface">
        <Text style={styles.body}>Bela površina</Text>
      </Card>
      <Card variant="featured">
        <Text style={styles.body}>Žut okvir</Text>
      </Card>

      <Text style={styles.heading}>Čipovi</Text>
      <View style={styles.row}>
        <Chip label="Podrazumevano" />
        <Chip label="Izabrano" selected />
        <Chip label="Mali" small />
        <Chip label="Mali izabran" small selected />
      </View>

      <Text style={styles.heading}>Prekidač</Text>
      <Segmented
        value={two}
        onChange={setTwo}
        options={[
          { id: 'da', label: 'Da' },
          { id: 'ne', label: 'Ne' },
        ]}
      />
      <Segmented
        value={three}
        onChange={setThree}
        options={[
          { id: 'mreza', label: 'Mreža' },
          { id: 'agenda', label: 'Agenda' },
          { id: 'ljudi', label: 'Ljudi' },
        ]}
      />
      <Segmented
        value={four}
        onChange={setFour}
        options={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
          { id: 'c', label: 'C' },
          { id: 'd', label: 'D' },
        ]}
      />

      <Text style={styles.heading}>Avatar</Text>
      <View style={styles.row}>
        <Avatar name="Ana Kovač" />
        <Avatar name="Marko" size={size.logo} />
      </View>

      <Text style={styles.heading}>Polje</Text>
      <TextField label="Ime" value={name} onChangeText={setName} placeholder="Tvoje ime" />
      <TextField label="Mejl" defaultValue="ana@" error="Unesi ispravnu imejl adresu." />

      <Text style={styles.heading}>Prazno stanje</Text>
      <EmptyState
        icon={<Feather name="users" size={size.iconMd} color={colors.ink} />}
        text="Još nema kontakata. Dodaj prvu osobu sa eventa."
        action="Dodaj kontakt"
        onAction={() => undefined}
      />

      <Text style={styles.heading}>Logo eventa</Text>
      <View style={styles.row}>
        <EventLogo initials="SR" />
        <EventLogo initials="FN" />
        <EventLogo initials="T5" small />
      </View>
      <View style={styles.row}>
        <View style={styles.color}>
          <View style={[styles.swatch, { backgroundColor: colors.summit }]} />
          <Text style={styles.caption}>Summit</Text>
        </View>
        <View style={styles.color}>
          <View style={[styles.swatch, { backgroundColor: colors.founders }]} />
          <Text style={styles.caption}>Founders</Text>
        </View>
        <View style={styles.color}>
          <View style={[styles.swatch, { backgroundColor: colors.the5 }]} />
          <Text style={styles.caption}>The 5</Text>
        </View>
      </View>

      <Text style={styles.heading}>Vrh ekrana</Text>
      <EventHero eventName="Summit" title="Početna" coverUri={HALL} />
      <EventHero eventName="Founders Night" title="Agenda" />

      <Text style={styles.heading}>Donja traka</Text>
      <TabBar activeKey={tab} onPress={setTab} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize.fs30,
    color: colors.ink,
  },
  heading: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs17,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
  },
  caption: {
    fontFamily: fonts.medium,
    fontSize: fontSize.fs11,
    color: colors.text2,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.gap,
  },
  color: {
    alignItems: 'center',
    gap: space.tight,
  },
  swatch: {
    width: size.logoSm,
    height: size.logoSm,
    borderRadius: radius.logo,
  },
});
