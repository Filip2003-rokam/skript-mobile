import { useLocalSearchParams } from 'expo-router';
import { Profile } from '../../../components/Profile';

export default function ProfileScreen() {
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  const value = Array.isArray(notice) ? notice[0] : notice;
  return <Profile notice={value} />;
}
