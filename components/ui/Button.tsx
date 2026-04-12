import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/colors';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#0B0D11' : variant === 'outline' || variant === 'ghost' ? Colors.primary : '#fff'}
          size="small"
        />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },

  // Variants
  primary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  secondary: { backgroundColor: Colors.surfaceAlt },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.danger },

  // Sizes
  size_sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, minHeight: 36 },
  size_md: { paddingHorizontal: Spacing.lg, paddingVertical: 12, minHeight: 48 },
  size_lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, minHeight: 56 },

  // Text — primary utilise le fond teal donc texte sombre
  text: { fontWeight: '700', letterSpacing: 0.2 },
  text_primary: { color: '#0B0D11' },
  text_secondary: { color: Colors.textPrimary },
  text_outline: { color: Colors.primary },
  text_ghost: { color: Colors.primary },
  text_danger: { color: '#fff' },

  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 16, fontWeight: '800' },
});
