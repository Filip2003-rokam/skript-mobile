import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { colors, fontSize, fonts, space } from '../../constants/theme';
import { displayName, RoleLine } from './personBits';

type PersonCardProps = {
  name: string | null;
  role: string | null;
  company: string | null;
  trailing?: ReactNode;
};

export function PersonCard({ name, role, company, trailing }: PersonCardProps) {
  const person = displayName(name);
  return (
    <Card>
      <View style={styles.row}>
        <Avatar name={person} />
        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>
            {person}
          </Text>
          <RoleLine role={role} company={company} />
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.gap,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
  trailing: {
    flexShrink: 0,
  },
});
