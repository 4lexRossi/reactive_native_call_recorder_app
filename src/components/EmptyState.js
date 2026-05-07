import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../theme';

export default function EmptyState({ filter }) {
  const config = {
    all: {
      icon: 'microphone-off',
      title: 'No Recordings Yet',
      sub: 'Tap the mic button below to start recording your first call.',
    },
    phone: {
      icon: 'phone-off',
      title: 'No Phone Recordings',
      sub: 'Switch to Phone mode and start recording a phone call.',
    },
    whatsapp: {
      icon: 'whatsapp',
      title: 'No WhatsApp Recordings',
      sub: 'Switch to WhatsApp mode and start recording a WhatsApp call.',
    },
  };

  const c = config[filter] || config.all;

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={c.icon} size={52} color={Colors.textDim} />
      </View>
      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.sub}>{c.sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
    marginTop: -60,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
