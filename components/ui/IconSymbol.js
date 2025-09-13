// Fallback for using MaterialIcons on Android.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chart.bar.fill': 'bar-chart',
  'gearshape.fill': 'build',
  'person.crop.circle.fill': 'account-circle',
  'list.clipboard.fill': 'assignment',
  'person.3.fill': 'group',
  'wrench.and.screwdriver.fill': 'build',
  'doc.text.fill': 'description',
  'person.fill': 'person',
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
