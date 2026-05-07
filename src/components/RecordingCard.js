import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../theme';

export default function RecordingCard({ item, index, onDelete, onPlay }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isWa = item.type === 'whatsapp';
  const accentColor = isWa ? Colors.whatsapp : Colors.accent;
  const bgAccent = isWa ? 'rgba(37,211,102,0.08)' : Colors.accentDim;
  const borderColor = isWa ? 'rgba(37,211,102,0.25)' : 'rgba(124,58,237,0.25)';

  const callDate = new Date(item.date);
  const isToday = new Date().toDateString() === callDate.toDateString();
  const dateLabel = isToday
    ? 'Today · ' + callDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : callDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' · ' +
      callDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor },
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Left Icon */}
      <View style={[styles.iconWrap, { backgroundColor: bgAccent }]}>
        <MaterialCommunityIcons
          name={isWa ? 'whatsapp' : 'phone-log'}
          size={24}
          color={accentColor}
        />
      </View>

      {/* Content */}
      <TouchableOpacity style={styles.content} onPress={onPlay} activeOpacity={0.8}>
        <Text style={styles.caller} numberOfLines={1}>{item.caller}</Text>
        <Text style={styles.meta}>{dateLabel}</Text>
        <View style={styles.tags}>
          <View style={[styles.tag, { backgroundColor: bgAccent, borderColor }]}>
            <Text style={[styles.tagText, { color: accentColor }]}>
              {isWa ? 'WhatsApp' : 'Phone'}
            </Text>
          </View>
          <View style={styles.durationTag}>
            <Ionicons name="time-outline" size={11} color={Colors.textDim} />
            <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
          </View>
          {item.size > 0 && (
            <Text style={styles.sizeText}>
              {(item.size / 1024 / 1024).toFixed(1)} MB
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onPlay}>
          <Ionicons name="play-circle" size={30} color={accentColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color={Colors.textDim} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  caller: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tag: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  durationText: {
    color: Colors.textDim,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  sizeText: {
    color: Colors.textDim,
    fontSize: 11,
  },
  actions: {
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
});
