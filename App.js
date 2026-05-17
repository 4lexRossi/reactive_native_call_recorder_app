import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, Text, TouchableOpacity, Animated, NativeModules } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecordingsProvider, useRecordings } from './src/context/RecordingsContext';
import { SettingsProvider } from './src/context/SettingsContext';
import HomeScreen from './src/screens/HomeScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import RecordScreen from './src/screens/RecordScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Colors } from './src/theme';

const { PipModule } = NativeModules;

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.cardBorder,
  },
};

function PipOverlayBar() {
  const { isRecording, isPaused, duration, activeCallType } = useRecordings();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the REC dot
  useEffect(() => {
    let anim;
    if (isRecording && !isPaused) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => anim?.stop();
  }, [isRecording, isPaused]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.pipContainer}>
      <View style={styles.pipRow}>
        {/* Left: Pulse dot, Call Type Icon and Name */}
        <View style={styles.indicatorRow}>
          <Animated.View style={[styles.recDot, { opacity: pulseAnim }]} />
          <Ionicons 
            name={activeCallType === 'whatsapp' ? 'logo-whatsapp' : 'call'} 
            size={16} 
            color={activeCallType === 'whatsapp' ? '#25D366' : '#EF4444'} 
            style={{ marginRight: 6 }}
          />
          <Text style={styles.pipTitle}>
            {isPaused ? 'PAUSED' : (activeCallType === 'whatsapp' ? 'WHATSAPP' : 'PHONE')}
          </Text>
        </View>

        {/* Right: Monospace duration timer */}
        <Text style={styles.pipTimer}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: (Platform.OS === 'ios' ? 88 : 64) + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 28 : 10),
          }
        ],
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textDim,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Home') {
            return (
              <Ionicons
                name={focused ? 'mic' : 'mic-outline'}
                size={size}
                color={color}
              />
            );
          }
          if (route.name === 'Settings') {
            return (
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={size}
                color={color}
              />
            );
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Recordings' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { width, height } = useWindowDimensions();
  const isPip = width < 300 || height < 300;

  if (isPip) {
    return <PipOverlayBar />;
  }

  return (
    <NavigationContainer theme={NavTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen
          name="Record"
          component={RecordScreen}
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <RecordingsProvider>
        <SettingsProvider>
          <StatusBar style="light" />
          <AppContent />
        </SettingsProvider>
      </RecordingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.cardBorder,
    borderTopWidth: 1,
    paddingTop: 10,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  pipContainer: {
    flex: 1,
    backgroundColor: '#07070C', // Deep black slate
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  pipTitle: {
    color: '#A0A0AB',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  pipTimer: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
});
