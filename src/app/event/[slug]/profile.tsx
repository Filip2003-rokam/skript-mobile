import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../../components/ui/Button';
import { Screen } from '../../../../components/ui/Screen';
import { TextField } from '../../../../components/ui/TextField';
import { needOptions, offerOptions, roleOptions, whyOptions } from '../../../../constants/options';
import { colors, fontSize, fonts, space } from '../../../../constants/theme';
import { Ask, ChoiceChips, Mine, choiceLabels } from '../../../../components/ProfileChat';
import { authErrorMessage } from '../../../../lib/services/authService';
import { getMyEventProfile, saveMyEventProfile } from '../../../../lib/services/attendeeService';
import { getEventBySlug } from '../../../../lib/services/eventService';

function toggle(list: string[], key: string) {
  return list.includes(key) ? list.filter((item) => item !== key) : [...list, key];
}

export default function EventProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const code = typeof slug === 'string' ? slug : '';
  const [eventId, setEventId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [why, setWhy] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [company, setCompany] = useState('');
  const [offers, setOffers] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    setReady(false);
    setMissing(false);
    setError(null);
    getEventBySlug(code)
      .then(async (event) => {
        if (!active) return;
        if (!event) {
          setMissing(true);
          setReady(true);
          return;
        }
        setEventId(event.id);
        const profile = await getMyEventProfile(event.id);
        if (!active || !profile) return;
        setWhy(profile.why);
        setRole(profile.role);
        setCompany(profile.company ?? '');
        setOffers(profile.offers);
        setNeeds(profile.needs);
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
  }, [code, attempt]);

  async function finish() {
    if (!eventId) return;
    setSaving(true);
    setError(null);
    try {
      await saveMyEventProfile(eventId, {
        why,
        role,
        company: company.trim() || null,
        offers,
        needs,
      });
      router.replace({ pathname: '/people', params: { view: 'suggestions' } });
    } catch (cause) {
      setError(authErrorMessage(cause));
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <Screen>
        <ActivityIndicator color={colors.ink} />
      </Screen>
    );
  }

  if (missing || (error && !eventId)) {
    return (
      <Screen>
        <Text style={styles.body}>{missing ? 'Ovaj event ne postoji. Proveri kod.' : error}</Text>
        <Button label={missing ? 'Nazad' : 'Pokušaj ponovo'} variant={missing ? 'ghost' : 'primary'} onPress={() => (missing ? router.back() : setAttempt((value) => value + 1))} />
      </Screen>
    );
  }

  const companyAnswer = company.trim() || 'Preskočeno';

  return (
    <Screen scroll>
      <Ask text="Kratko podešavanje da nađem prave ljude. Šta te dovodi ovde? Izaberi sve što važi." />
      {step === 0 ? (
        <>
          <ChoiceChips options={whyOptions} selected={why} onPress={(key) => setWhy((list) => toggle(list, key))} />
          <Button label="Nastavi" disabled={why.length === 0} onPress={() => setStep(1)} />
        </>
      ) : (
        <Mine text={choiceLabels(whyOptions, why)} />
      )}
      {step >= 1 ? (
        <>
          <Ask text="Čime se baviš?" />
          {step === 1 ? (
            <ChoiceChips options={roleOptions} selected={role ? [role] : []} onPress={(key) => { setRole(key); setStep(2); }} />
          ) : (
            <Mine text={choiceLabels(roleOptions, role ? [role] : [])} />
          )}
        </>
      ) : null}
      {step >= 2 ? (
        <>
          <Ask text="Tvoja firma?" />
          {step === 2 ? (
            <>
              <TextField label="Firma" value={company} onChangeText={setCompany} autoCapitalize="words" />
              <View style={styles.row}>
                <Button label="Nastavi" disabled={!company.trim()} onPress={() => setStep(3)} />
                <Button label="Preskoči" variant="secondary" onPress={() => { setCompany(''); setStep(3); }} />
              </View>
            </>
          ) : (
            <Mine text={companyAnswer} />
          )}
        </>
      ) : null}
      {step >= 3 ? (
        <>
          <Ask text="Šta nudiš, a gde ti treba pomoć?" />
          <Text style={styles.group}>NUDIM</Text>
          <ChoiceChips options={offerOptions} selected={offers} onPress={(key) => setOffers((list) => toggle(list, key))} />
          <Text style={styles.group}>TREBA MI POMOĆ OKO</Text>
          <ChoiceChips options={needOptions} selected={needs} onPress={(key) => setNeeds((list) => toggle(list, key))} />
          <Button label="Gotovo" loading={saving} disabled={offers.length === 0 && needs.length === 0} onPress={finish} />
          {error ? <Text style={styles.body}>{error}</Text> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.gap,
  },
  group: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs11,
    color: colors.text2,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
  },
});
