import { Tabs } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { useTheme, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import React, { useEffect, useRef } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

function CustomTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const theme = useTheme();
  const { width: windowWidth } = Dimensions.get('window');
  
  // Tab Bar Width and Padding
  const horizontalPadding = 16;
  const tabBarWidth = windowWidth - horizontalPadding * 2;
  const numTabs = state.routes.length;
  const tabWidth = tabBarWidth / numTabs;

  // Animation for the active indicator capsule
  const slideAnim = useRef(new Animated.Value(state.index * tabWidth)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      tension: 100, // Snap and smooth layout
      friction: 10,
    }).start();
  }, [state.index, tabWidth]);

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          bottom: insets.bottom > 0 ? insets.bottom : 12,
          backgroundColor: theme.colors.elevation.level2,
          shadowColor: '#000',
          shadowOpacity: theme.dark ? 0.35 : 0.08,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      {/* Sliding Active Indicator Capsule */}
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            width: tabWidth - 12, // margin inside the tab slot
            transform: [{ translateX: slideAnim }],
            backgroundColor: theme.colors.primaryContainer,
          },
        ]}
      />

      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.dispatch({
              ...CommonActions.navigate(route.name, route.params),
              target: state.key,
            });
          }
        };

        // Scale and Opacity Animations for the Tab Content
        const scaleVal = useRef(new Animated.Value(isFocused ? 1.05 : 0.95)).current;
        const opacityVal = useRef(new Animated.Value(isFocused ? 1.0 : 0.65)).current;

        useEffect(() => {
          Animated.parallel([
            Animated.spring(scaleVal, {
              toValue: isFocused ? 1.08 : 0.95,
              useNativeDriver: true,
              tension: 120,
              friction: 9,
            }),
            Animated.timing(opacityVal, {
              toValue: isFocused ? 1.0 : 0.65,
              duration: 180,
              useNativeDriver: true,
            }),
          ]).start();
        }, [isFocused]);

        const iconName =
          route.name === 'receive'
            ? 'download'
            : route.name === 'send'
              ? 'send'
              : 'cog';

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.8}
            style={styles.tabButton}
          >
            <Animated.View
              style={[
                styles.tabContent,
                {
                  transform: [{ scale: scaleVal }],
                  opacity: opacityVal,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={iconName as any}
                size={22}
                color={isFocused ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// TabLayout acts as the UI shell defining the application's main bottom navigation bar
export default function TabLayout() {
  return (
    // Expo Router's native Tabs wrapper mapping folder routes explicitly to bottom bar buttons
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="receive"
        options={{
          title: 'Receive',
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: 'Send',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
    paddingHorizontal: 4,
  },
  activeIndicator: {
    position: 'absolute',
    height: 48,
    borderRadius: 18,
    top: 7, // Center capsule vertically
    left: 6, // Padding offset
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 1,
  },
});
