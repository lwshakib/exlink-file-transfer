import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme, Card, IconButton, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay,
  Easing,
  withTiming
} from "react-native-reanimated";

export default function SendingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const { deviceName, deviceId, os } = params;

  const topCardY = useSharedValue(50);
  const bottomCardY = useSharedValue(-50);
  const contentScale = useSharedValue(0.9);
  const contentOpacity = useSharedValue(0);
  const arrowOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const buttonY = useSharedValue(20);

  useEffect(() => {
    contentScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) });
    contentOpacity.value = withTiming(1, { duration: 500 });
    topCardY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.exp) });
    bottomCardY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.exp) });
    arrowOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    textOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    buttonY.value = withDelay(600, withTiming(0, { duration: 400 }));
  }, []);

  const topAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: topCardY.value }],
    width: '100%',
  }));

  const bottomAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bottomCardY.value }],
    width: '100%',
  }));

  const centerAreaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
    opacity: contentOpacity.value,
  }));

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: arrowOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonY.value }],
    opacity: textOpacity.value,
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={[styles.centerContent, centerAreaStyle]}>
        {/* Self Device Card */}
        <Animated.View style={topAnimatedStyle}>
          <Card style={[styles.deviceCard, { backgroundColor: theme.colors.elevation.level3 }]} mode="contained">
            <View style={styles.deviceCardContent}>
              <MaterialCommunityIcons name="cellphone" size={48} color={theme.colors.primary} style={styles.deviceIcon} />
              <View style={styles.deviceInfo}>
                <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Adorable Pear</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: theme.colors.secondaryContainer }]}>
                    <Text variant="labelMedium" style={[styles.badgeText, { color: theme.colors.onSecondaryContainer }]}>#100</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: theme.colors.secondaryContainer }]}>
                    <Text variant="labelMedium" style={[styles.badgeText, { color: theme.colors.onSecondaryContainer }]}>Tecno</Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Arrow */}
        <Animated.View style={[styles.arrowContainer, arrowAnimatedStyle]}>
          <MaterialCommunityIcons name="arrow-down" size={32} color={theme.colors.primary} />
        </Animated.View>

        {/* Target Device Card */}
        <Animated.View style={bottomAnimatedStyle}>
          <Card style={[styles.deviceCard, { backgroundColor: theme.colors.elevation.level3 }]} mode="contained">
            <View style={styles.deviceCardContent}>
              <MaterialCommunityIcons name="laptop" size={54} color={theme.colors.primary} style={styles.deviceIcon} />
              <View style={styles.deviceInfo}>
                <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{deviceName || "Efficient Pineapple"}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: theme.colors.secondaryContainer }]}>
                    <Text variant="labelMedium" style={[styles.badgeText, { color: theme.colors.onSecondaryContainer }]}>{deviceId || "#106"}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: theme.colors.secondaryContainer }]}>
                    <Text variant="labelMedium" style={[styles.badgeText, { color: theme.colors.onSecondaryContainer }]}>{os || "Windows"}</Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>
      </Animated.View>

      <View style={styles.bottomSection}>
        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text variant="bodyLarge" style={[styles.waitingText, { color: theme.colors.onSurfaceVariant }]}>Waiting for response...</Text>
        </Animated.View>
        
        <Animated.View style={buttonAnimatedStyle}>
          <Button 
            mode="contained" 
            icon="close" 
            onPress={() => router.back()} 
            style={styles.cancelButton}
            contentStyle={styles.cancelButtonContent}
            buttonColor={theme.colors.primaryContainer}
            textColor={theme.colors.onPrimaryContainer}
            labelStyle={styles.cancelLabel}
          >
            Cancel
          </Button>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  deviceCard: {
    borderRadius: 24,
  },
  deviceCardContent: {
    flexDirection: "row",
    padding: 24,
    alignItems: "center",
  },
  deviceIcon: {
    marginRight: 20,
  },
  deviceInfo: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontWeight: "500",
  },
  arrowContainer: {
    paddingVertical: 24,
  },
  bottomSection: {
    alignItems: "center",
    paddingBottom: 60,
  },
  textContainer: {
    marginBottom: 32,
  },
  waitingText: {
    fontWeight: "500",
  },
  cancelButton: {
    borderRadius: 30,
    width: 160,
  },
  cancelButtonContent: {
    height: 52,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
