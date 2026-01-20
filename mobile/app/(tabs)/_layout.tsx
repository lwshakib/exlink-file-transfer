import { Stack, Tabs } from "expo-router";

export default function TabLayout() {
    return (
        <Tabs>
            <Tabs.Screen name="send" />
            <Tabs.Screen name="receive" />
            <Tabs.Screen name="settings" />
        </Tabs>
    )
}