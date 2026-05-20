import React from 'react';
import {
  Text as RNText,
  TouchableOpacity,
  View,
  ActivityIndicator as RNActivityIndicator,
  Modal as RNModal,
  TextInput as RNTextInput,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

export const Text = ({ style, variant, children, ...props }: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <RNText style={[{ color: themeColors.onSurface }, style]} {...props}>
      {children}
    </RNText>
  );
};

export const IconButton = ({ icon, onPress, size = 24, iconColor, style, disabled }: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[{ padding: 8, opacity: disabled ? 0.5 : 1, borderRadius: 20 }, style]}
      disabled={disabled}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={size}
        color={iconColor || themeColors.onSurface}
      />
    </TouchableOpacity>
  );
};

export const Button = ({
  onPress,
  children,
  mode,
  style,
  labelStyle,
  disabled,
  contentStyle,
}: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  const isContained = mode === 'contained';
  const isOutlined = mode === 'outlined';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        isContained && { backgroundColor: themeColors.primary },
        isOutlined && { borderWidth: 1, borderColor: themeColors.outline },
        style,
        contentStyle,
      ]}
    >
      <RNText
        style={[
          {
            color: isContained ? themeColors.onPrimary : themeColors.primary,
            fontWeight: '600',
            fontSize: 14,
          },
          labelStyle,
        ]}
      >
        {children}
      </RNText>
    </TouchableOpacity>
  );
};

export const Card = ({ children, style, elevation }: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <View
      style={[
        {
          backgroundColor: themeColors.elevation?.level1 || themeColors.surface,
          borderRadius: 12,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

Card.Content = ({ children, style }: any) => <View style={style}>{children}</View>;
Card.Title = ({ title, subtitle, left, right, titleStyle, subtitleStyle }: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      {left && <View style={{ marginRight: 16 }}>{left()}</View>}
      <View style={{ flex: 1 }}>
        <RNText style={[{ fontSize: 16, fontWeight: 'bold', color: themeColors.onSurface }, titleStyle]}>
          {title}
        </RNText>
        {subtitle && (
          <RNText style={[{ fontSize: 14, color: themeColors.onSurfaceVariant }, subtitleStyle]}>
            {subtitle}
          </RNText>
        )}
      </View>
      {right && <View>{right()}</View>}
    </View>
  );
};

export const Divider = ({ style }: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: themeColors.outlineVariant }, style]} />
  );
};

export const ActivityIndicator = ({ size = 'small', color, style }: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  return <RNActivityIndicator size={size} color={color || themeColors.primary} style={style} />;
};

export const Portal = ({ children }: any) => {
  // We mock portal by just returning children, assuming it's wrapping a Modal
  return <>{children}</>;
};

export const Modal = ({ visible, onDismiss, children, contentContainerStyle }: any) => {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableWithoutFeedback>
            <View style={[contentContainerStyle, { borderRadius: 12, padding: 20 }]}>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

export const Dialog = ({ visible, onDismiss, children, style }: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableWithoutFeedback>
            <View style={[{ backgroundColor: themeColors.elevation?.level3 || themeColors.surface, borderRadius: 28, width: '85%', maxWidth: 400, padding: 24 }, style]}>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

Dialog.Title = ({ children, style }: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <RNText style={[{ fontSize: 24, marginBottom: 16, color: themeColors.onSurface }, style]}>
      {children}
    </RNText>
  );
};

Dialog.Content = ({ children, style }: any) => (
  <View style={[{ marginBottom: 24 }, style]}>{children}</View>
);

Dialog.Actions = ({ children, style }: any) => (
  <View style={[{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }, style]}>{children}</View>
);

export const TextInput = ({ value, onChangeText, placeholder, style, mode, secureTextEntry, autoCapitalize }: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <RNTextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={themeColors.onSurfaceVariant}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      style={[
        {
          borderWidth: 1,
          borderColor: themeColors.outline,
          borderRadius: mode === 'outlined' ? 4 : 0,
          padding: 16,
          color: themeColors.onSurface,
          backgroundColor: themeColors.surface,
          fontSize: 16,
        },
        style,
      ]}
    />
  );
};

// Dummy hook to replace useTheme directly with our context equivalent
export const useTheme = () => {
  const { colorScheme, selectedVariation } = useAppTheme();
  return { colors: selectedVariation[colorScheme], dark: colorScheme === 'dark' };
};

export const Checkbox = ({ status, onPress }: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  const checked = status === 'checked';
  return (
    <TouchableOpacity onPress={onPress} style={{ padding: 8 }}>
      <MaterialCommunityIcons
        name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
        size={24}
        color={checked ? themeColors.primary : themeColors.onSurfaceVariant}
      />
    </TouchableOpacity>
  );
};

export const Searchbar = ({ placeholder, onChangeText, value, style }: any) => {
  const { colorScheme, selectedVariation } = useAppTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.surfaceVariant || themeColors.surface, borderRadius: 28, paddingHorizontal: 16, height: 56 }, style]}>
      <MaterialCommunityIcons name="magnify" size={24} color={themeColors.onSurfaceVariant} />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={themeColors.onSurfaceVariant}
        style={{ flex: 1, marginLeft: 12, fontSize: 16, color: themeColors.onSurface }}
      />
    </View>
  );
};

export const List = {
  Item: ({ title, description, left, right, onPress, style }: any) => {
    const { colorScheme, selectedVariation } = useAppTheme();
    const themeColors = selectedVariation[colorScheme];
    return (
      <TouchableOpacity onPress={onPress} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }, style]}>
        {left && <View style={{ marginRight: 16 }}>{left({ color: themeColors.onSurfaceVariant })}</View>}
        <View style={{ flex: 1 }}>
          <RNText style={{ fontSize: 16, color: themeColors.onSurface }}>{title}</RNText>
          {description && <RNText style={{ fontSize: 14, color: themeColors.onSurfaceVariant }}>{description}</RNText>}
        </View>
        {right && <View style={{ marginLeft: 16 }}>{right({})}</View>}
      </TouchableOpacity>
    );
  },
  Icon: ({ icon, color, style }: any) => (
    <MaterialCommunityIcons name={icon as any} size={24} color={color} style={style} />
  ),
};
