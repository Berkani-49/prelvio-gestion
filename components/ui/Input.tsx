import React, { useState } from 'react';
import {
  View, TextInput, Text, TouchableOpacity,
  StyleSheet, TextInputProps, ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  isPassword,
  containerStyle,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[s.container, containerStyle]}>
      {label && <Text style={s.label}>{label}</Text>}

      <View style={[s.wrap, isFocused && s.focused, error ? s.errorBorder : null]}>
        {leftIcon && <View style={s.iconLeft}>{leftIcon}</View>}

        <TextInput
          style={[s.input, leftIcon ? s.inputWithLeft : null]}
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.primary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.iconRight}>
            <Text style={s.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        )}

        {rightIcon && !isPassword && <View style={s.iconRight}>{rightIcon}</View>}
      </View>

      {error && <Text style={s.errorText}>⚠ {error}</Text>}
      {hint && !error && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.2 },
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    minHeight: 52,
  },
  focused: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}0A` },
  errorBorder: { borderColor: Colors.danger },
  input: {
    flex: 1, color: Colors.textPrimary,
    fontSize: 15, paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  inputWithLeft: { paddingLeft: 0 },
  iconLeft: { paddingLeft: Spacing.md },
  iconRight: { paddingRight: Spacing.md },
  errorText: { fontSize: 12, color: Colors.danger, fontWeight: '500' },
  hint: { fontSize: 11, color: Colors.textMuted },
  eyeText: { fontSize: 16 },
});
