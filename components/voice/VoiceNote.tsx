import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Button } from '../ui/Button';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';
import { toDisplayDate } from '../../lib/contactDates';
import { noteWithTopic, transcribeVoiceNote, type VoiceDraft } from '../../lib/services/voiceNoteService';
import { VoiceNoteResult } from './VoiceNoteResult';
import { t } from '../../lib/i18n';

const limitSeconds = 30;

type VoiceNoteProps = {
  existingNote?: string | null;
  existingDate?: string | null;
  email?: string | null;
  onReady?: (result: VoiceDraft) => void;
  onSave?: (value: { note: string | null; followUpDate: string | null; followUpDraft: string | null }) => Promise<void>;
};

export function VoiceNote({ existingNote, existingDate, email, onReady, onSave }: VoiceNoteProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'processing' | 'denied' | 'error' | 'ready'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const recordingRef = useRef(false);
  const busyRef = useRef(false);
  const finishRef = useRef<() => Promise<void>>(async () => {});

  finishRef.current = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase('processing');
    setMessage(null);
    let uri = recorder.uri;
    try {
      if (recorder.getStatus().isRecording) await recorder.stop();
      uri = recorder.uri ?? recorder.getStatus().url;
      if (!uri) throw new Error(t('voice.empty'));
      const audio = await new File(uri).base64();
      if (!audio) throw new Error(t('voice.empty'));
      const mime = uri.endsWith('.webm') ? 'audio/webm' : uri.endsWith('.wav') ? 'audio/wav' : 'audio/mp4';
      const result = await transcribeVoiceNote(audio, mime);
      if (onReady) {
        onReady(result);
        setDraft(null);
        setNotice(result.fullName ? t('voice.filled') : t('voice.filledNoName'));
        setPhase('idle');
      } else {
        setDraft(result);
        setNotice(null);
        setPhase('ready');
      }
    } catch (cause) {
      setPhase('error');
      setMessage(cause instanceof Error && cause.message ? cause.message : t('voice.notProcessed'));
    } finally {
      if (uri) {
        try {
          new File(uri).delete();
        } catch {
          // Lokalni fajl je već nestao. Server ga nije čuvao.
        }
      }
      try {
        await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false });
      } catch {
        // Sesija mikrofona se gasi i bez ove izmene.
      }
      busyRef.current = false;
    }
  };

  useEffect(() => {
    if (state.isRecording) {
      recordingRef.current = true;
      return;
    }
    if (!recordingRef.current) return;
    recordingRef.current = false;
    void finishRef.current();
  }, [state.isRecording]);

  async function start() {
    setMessage(null);
    setNotice(null);
    setSaveError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setPhase('denied');
        return;
      }
      // Snimanje ide dalje i kad se ekran zaključa usred beleške.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: limitSeconds });
      setDraft(null);
      setPhase('recording');
    } catch {
      setPhase('error');
      setMessage(t('voice.recordFailed'));
    }
  }

  async function stop() {
    try {
      if (recorder.getStatus().isRecording) {
        await recorder.stop();
        return;
      }
      if (!recordingRef.current) {
        setPhase('error');
        setMessage(t('voice.startFailed'));
      }
    } catch {
      setPhase('error');
      setMessage(t('voice.stopFailed'));
    }
  }

  async function save(value: { note: string | null; followUpDate: string | null; followUpDraft: string | null }) {
    if (!onSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(value);
      setDraft(null);
      setPhase('idle');
    } catch (cause) {
      setSaveError(cause instanceof Error && cause.message ? cause.message : t('voice.contactNotSaved'));
    } finally {
      setSaving(false);
    }
  }

  const seconds = Math.min(limitSeconds, Math.max(0, Math.round(state.durationMillis / 1000)));

  return (
    <View style={styles.wrap}>
      {phase === 'recording' ? (
        <View style={styles.recording}>
          <View style={styles.orb}>
            <Feather name="mic" size={size.iconLg} color={colors.ink} />
          </View>
          <Text style={styles.time}>0:{String(seconds).padStart(2, '0')} / 0:30</Text>
          <Button label={t('voice.stop')} variant="secondary" onPress={() => void stop()} />
        </View>
      ) : phase === 'processing' ? (
        <View style={styles.row}>
          <ActivityIndicator color={colors.ink} />
          <Text style={styles.status}>{t('voice.processing')}</Text>
        </View>
      ) : (
        <Button label={t('voice.record')} variant="secondary" onPress={() => void start()} />
      )}
      {phase === 'denied' ? (
        <>
          <Text style={styles.error}>{t('voice.noMic')}</Text>
          <Button label={t('camera.openSettings')} variant="ghost" onPress={() => void Linking.openSettings()} />
        </>
      ) : null}
      {phase === 'error' && message ? <Text style={styles.error}>{message}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {phase === 'ready' && draft ? (
        <VoiceNoteResult
          note={noteWithTopic(draft.note, '', existingNote) ?? ''}
          topic={draft.topic}
          followUp={toDisplayDate(draft.followUpDate) || toDisplayDate(existingDate ?? null)}
          subject={draft.subject}
          body={draft.body}
          email={email}
          saving={saving}
          error={saveError}
          onSave={(value) => void save(value)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.gap },
  recording: { alignItems: 'center', gap: space.gap },
  orb: {
    width: size.avatarLg,
    height: size.avatarLg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.skriptYellow,
  },
  time: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.ink, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.gap },
  status: { fontFamily: fonts.semibold, fontSize: fontSize.fs15, color: colors.ink },
  notice: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  error: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.destructive },
});
