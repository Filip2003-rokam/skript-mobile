import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Screen } from '../../../../components/ui/Screen';
import { TextField } from '../../../../components/ui/TextField';
import { InlineError, LoadingState } from '../../../../components/ui/State';
import { needOptions, offerOptions, roleOptions, whyOptions } from '../../../../constants/options';
import { colors, size, space } from '../../../../constants/theme';
import { Ask, ChoiceChips, Mine, StepLabel, choiceLabels } from '../../../../components/ProfileChat';
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
  const seen = useRef<string | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [why, setWhy] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [company, setCompany] = useState('');
  const [offers, setOffers] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    if (seen.current !== code) {
      seen.current = code;
      setEventId(null);
      setReady(false);
    }
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

  if (!ready && !eventId) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!eventId && (missing || error)) {
    return (
      <Screen>
        <EmptyState
          icon={<Feather name={missing ? 'camera' : 'alert-circle'} size={size.iconMd} color={colors.ink} />}
          text={missing ? 'Ovaj event ne postoji. Vrati se i proveri kod.' : (error ?? 'Ne mogu da učitam profil. Proveri vezu i pokušaj ponovo.')}
          action={missing ? 'Nazad' : 'Pokušaj ponovo'}
          onAction={() => (missing ? router.back() : setAttempt((value) => value + 1))}
        />
      </Screen>
    );
  }

  const companyAnswer = company.trim() || 'Preskočeno';

  return (
    <Screen scroll>
      {error ? <InlineError text={error} /> : null}
      <View style={styles.thread}>
      <Ask text="Kratko podešavanje da nađem prave ljude. Šta te dovodi ovde? Izaberi sve što važi." />
      {step === 0 ? (
        <>
          <ChoiceChips options={whyOptions} selected={why} onPress={(key) => setWhy((list) => toggle(list, key))} />
          <Button label="Nastavi" size="sm" disabled={why.length === 0} onPress={() => setStep(1)} />
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
              <TextField hideLabel label="Firma" placeholder="Ime firme" value={company} onChangeText={setCompany} autoCapitalize="words" />
              <View style={styles.row}>
                <Button label="Nastavi" size="sm" disabled={!company.trim()} onPress={() => setStep(3)} />
                <Button label="Preskoči" size="sm" variant="secondary" onPress={() => { setCompany(''); setStep(3); }} />
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
          <StepLabel text="Nudim" />
          <ChoiceChips options={offerOptions} selected={offers} onPress={(key) => setOffers((list) => toggle(list, key))} />
          <StepLabel text="Treba mi pomoć oko" />
          <ChoiceChips options={needOptions} selected={needs} onPress={(key) => setNeeds((list) => toggle(list, key))} />
          <Button label="Gotovo" size="sm" loading={saving} disabled={offers.length === 0 && needs.length === 0} onPress={finish} />
        </>
      ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  thread: { gap: space.edge },
  row: { flexDirection: 'row', gap: space.tight * 2 },
});
