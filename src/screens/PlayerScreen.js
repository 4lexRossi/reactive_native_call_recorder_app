import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import * as Sharing from 'expo-sharing';
import { Colors, Spacing, Radius } from '../theme';

export default function PlayerScreen({ route, navigation }) {
  const { recording } = route.params;
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(recording.duration * 1000 || 0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  async function loadAndPlay() {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
          return;
        } else {
          await sound.playAsync();
          setIsPlaying(true);
          return;
        }
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recording.uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (err) {
      Alert.alert('Playback Error', 'Could not play this recording.');
    }
  }

  function onPlaybackStatusUpdate(status) {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || duration);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  }

  async function seekTo(value) {
    if (sound) {
      await sound.setPositionAsync(value);
      setPosition(value);
    }
  }

  async function shareRecording() {
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(recording.uri);
      } else {
        Alert.alert('Sharing not available on this device.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not share the recording.');
    }
  }

  const formatMs = (ms) => {
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const callDate = new Date(recording.date);
  const isWa = recording.type === 'whatsapp';
  const accentColor = isWa ? Colors.whatsapp : Colors.accent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity onPress={shareRecording} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Album Art */}
      <View style={styles.artContainer}>
        <View style={[styles.artCircle, { borderColor: accentColor, shadowColor: accentColor }]}>
          <MaterialCommunityIcons
            name={isWa ? 'whatsapp' : 'phone-log'}
            size={72}
            color={accentColor}
          />
        </View>
        <View style={[styles.artBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.artBadgeText}>{isWa ? 'WA' : 'PH'}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoSection}>
        <Text style={styles.callerName}>{recording.caller}</Text>
        <Text style={styles.callMeta}>
          {callDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        <Text style={styles.callTime}>
          {callDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          {'  ·  '}
          {formatMs(duration)}
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={position}
          onSlidingComplete={seekTo}
          minimumTrackTintColor={accentColor}
          maximumTrackTintColor={Colors.cardBorder}
          thumbTintColor={accentColor}
        />
        <View style={styles.progressLabels}>
          <Text style={styles.progressTime}>{formatMs(position)}</Text>
          <Text style={styles.progressTime}>{formatMs(duration)}</Text>
        </View>
      </View>

      {/* Playback Controls */}
      <View style={styles.playbackControls}>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => seekTo(Math.max(0, position - 10000))}
        >
          <Ionicons name="play-back" size={28} color={Colors.textMuted} />
          <Text style={styles.skipLabel}>10s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: accentColor, shadowColor: accentColor }]}
          onPress={loadAndPlay}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={34}
            color={Colors.white}
            style={!isPlaying && { marginLeft: 4 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => seekTo(Math.min(duration, position + 10000))}
        >
          <Ionicons name="play-forward" size={28} color={Colors.textMuted} />
          <Text style={styles.skipLabel}>10s</Text>
        </TouchableOpacity>
      </View>

      {/* File Info */}
      <View style={styles.fileInfo}>
        <View style={styles.fileInfoRow}>
          <Ionicons name="document-outline" size={16} color={Colors.textDim} />
          <Text style={styles.fileInfoText}>
            {recording.size ? (recording.size / 1024 / 1024).toFixed(1) + ' MB' : '--'}
          </Text>
        </View>
        <View style={styles.fileInfoRow}>
          <Ionicons name="time-outline" size={16} color={Colors.textDim} />
          <Text style={styles.fileInfoText}>{formatMs(duration)} min</Text>
        </View>
        <View style={styles.fileInfoRow}>
          <MaterialCommunityIcons
            name={isWa ? 'whatsapp' : 'phone'}
            size={16}
            color={Colors.textDim}
          />
          <Text style={styles.fileInfoText}>{isWa ? 'WhatsApp' : 'Phone'}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  artContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  artCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.card,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  artBadge: {
    position: 'absolute',
    bottom: 4,
    right: '30%',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  artBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  infoSection: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
  },
  callerName: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  callMeta: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  callTime: {
    color: Colors.textDim,
    fontSize: 13,
  },
  progressSection: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
    paddingHorizontal: 4,
  },
  progressTime: {
    color: Colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.lg,
  },
  skipBtn: {
    alignItems: 'center',
    gap: 2,
  },
  skipLabel: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: '600',
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  fileInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  fileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileInfoText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
});
