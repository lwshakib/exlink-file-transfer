import { Tabs } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { BottomNavigation, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// TabLayout acts as the UI shell defining the application's main bottom navigation bar
export default function TabLayout() {
  // Extract standardized color and style variables dynamically driven by the app's selected theme mode
  const theme = useTheme();

  return (
    // Expo Router's native Tabs wrapper mapping folder routes explicitly to bottom bar buttons
    <Tabs
      screenOptions={{
        // Hide standard native headers natively to permit custom React Native Paper headers individually per screen
        headerShown: false,
      }}
      // Overriding standard tab bar with custom React Native Paper BottomNavigation
      tabBar={({ navigation, state, descriptors, insets }) => (
        <BottomNavigation.Bar
          navigationState={state} // Binds the React Navigation router state to the UI active state
          safeAreaInsets={insets} // Pads appropriately over software home bars or diverse screen shapes
          style={{
            // Themed background application explicitly overwriting default clears
            backgroundColor: theme.colors.background,
            borderTopWidth: 0, // Kill standard ugly native top border edges
            elevation: 0, // Suppresses android drop shadows entirely for modern flatness
            shadowOpacity: 0, // Suppresses iOS drop shadow equivalents
          }}
          // Intercept user tapping logic to manage tab switching robustly
          onTabPress={({ route, preventDefault }) => {
            // Emits standard event letting React Navigation process internal tap updates
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true, // Enables overriding standard navigation
            });

            // Prevent fallback navigation if an internal mechanism locked it
            if (event.defaultPrevented) {
              preventDefault();
            } else {
              // Execute actual explicit navigation manually updating state smoothly
              navigation.dispatch({
                ...CommonActions.navigate(route.name, route.params),
                target: state.key, // Anchors the action directly inside this tab tree
              });
            }
          }}
          // Dynamically asks the screen configurations below what icon to fetch based on active routing
          renderIcon={({ route, focused, color }) =>
            // Looks up the specific explicit options tied to the route
            descriptors[route.key].options.tabBarIcon?.({
              focused,
              color,
              size: 24, // Locking fixed size to prevent visual jumping
            }) || null
          }
          // Same logic applying for fetching raw screen labels dynamically
          getLabelText={({ route }) => {
            const { options } = descriptors[route.key];
            // Uses fallback heuristic testing: native tabBarLabel, native title, or generic route.name
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : typeof options.title === 'string'
                  ? options.title
                  : route.name;

            return label; // Result explicitly printed under Tab Icon
          }}
        />
      )}
    >
      {/* Route matching '(tabs)/receive.tsx' strictly configured for display in the tab bar */}
      <Tabs.Screen
        name="receive"
        options={{
          title: 'Receive', // The explicit label string
          tabBarIcon: ({ color, size }) => (
            // Icon dynamically styled referencing material-community icon set
            <MaterialCommunityIcons name="download" color={color} size={size} />
          ),
        }}
      />
      {/* Route matching '(tabs)/send.tsx' specifically bound with send-icons */}
      <Tabs.Screen
        name="send"
        options={{
          title: 'Send',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="send" color={color} size={size} />
          ),
        }}
      />

      {/* Route mapping logically to '(tabs)/settings.tsx' for configuration pane */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
