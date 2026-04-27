import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IoniconsName;
  size?: number;
  color?: string;
  style?: any;
}

export const Icon = ({ name, size = 20, color = colors.foreground, style }: IconProps) => (
  <Ionicons name={name} size={size} color={color} style={style} />
);

// Preset icon buttons used across screens
export const IconButton = ({
  name, size = 20, color = colors.muted, onPress, bg, style,
}: {
  name: IoniconsName; size?: number; color?: string;
  onPress?: () => void; bg?: string; style?: any;
}) => {
  const { TouchableOpacity, View, StyleSheet } = require('react-native');
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        {
          width: 36, height: 36, borderRadius: 10,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: bg || 'transparent',
        },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </TouchableOpacity>
  );
};
