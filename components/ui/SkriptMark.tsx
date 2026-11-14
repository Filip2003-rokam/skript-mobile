import { Image } from 'react-native';
import { fontSize, mark } from '../../constants/theme';

const dark = require('../../assets/images/brand/skript-wordmark.png');
const light = require('../../assets/images/brand/skript-wordmark-light.png');

type SkriptMarkProps = {
  size?: number;
  tone?: 'dark' | 'light';
};

// Pravi Skript logo (tačke iznad slova i), kao slika. Svetla verzija ide preko fotografije.
export function SkriptMark({ size = fontSize.fs22, tone = 'dark' }: SkriptMarkProps) {
  const height = size * mark.height;
  return (
    <Image
      accessibilityLabel="Skript"
      source={tone === 'light' ? light : dark}
      style={{ height, width: height * mark.ratio }}
      resizeMode="contain"
    />
  );
}
