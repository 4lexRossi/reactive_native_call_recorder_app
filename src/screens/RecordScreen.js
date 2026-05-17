import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Alert,
  Easing,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, Spacing, Radius } from '../theme';
import { useRecordings } from '../context/RecordingsContext';

const { width, height } = Dimensions.get('window');

export default function RecordScreen({ navigation }) {
  const { 
    addRecording, 
    isRecording, 
    isPaused, 
    duration, 
    activeCallType, 
    startRecording: startRecordingGlobal, 
    pauseRecording, 
    stopRecording: stopRecordingGlobal,
    currentRecording,
    setDuration
  } = useRecordings();

  const [callType, setCallType] = useState('phone'); // Local selection until recording starts
  const [callerName, setCallerName] = useState('');
  const [pendingRecording, setPendingRecording] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef([...Array(5)].map(() => new Animated.Value(0.3))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Sync local callType with activeCallType if recording
  useEffect(() => {
    if (isRecording) {
      setCallType(activeCallType);
    }
  }, [isRecording, activeCallType]);

  // Pulse animation for mic button
  useEffect(() => {
    let pulse;
    if (isRecording && !isPaused) {
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => pulse?.stop();
  }, [isRecording, isPaused]);

  // Wave animations when recording
  useEffect(() => {
    let anims;
    if (isRecording && !isPaused) {
      anims = waveAnims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 100),
            Animated.timing(anim, {
              toValue: 1,
              duration: 400 + i * 80,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 400 + i * 80,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ])
        )
      );
      anims.forEach(a => a.start());
    } else {
      waveAnims.forEach(a => a.setValue(0.3));
    }
    return () => anims?.forEach(a => a.stop());
  }, [isRecording, isPaused]);

  // Glow anim for recording state
  useEffect(() => {
    let anim;
    if (isRecording) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
        ])
      );
      anim.start();
    } else {
      glowAnim.setValue(0);
    }
    return () => anim?.stop();
  }, [isRecording]);

  async function startRecording() {
    const result = await startRecordingGlobal(callType);
    if (result?.error) {
      Alert.alert('Error', result.error);
    }
  }

  async function stopRecording() {
    const result = await stopRecordingGlobal();
    if (result) {
      const newRec = {
        id: Date.now().toString(),
        type: result.type,
        caller: callerName || (result.type === 'whatsapp' ? 'WhatsApp Call' : 'Phone Call'),
        date: new Date().toISOString(),
        duration: result.duration,
        uri: result.uri,
        size: await getFileSize(result.uri),
      };
      setPendingRecording(newRec);
    }
  }

  async function handleSave() {
    if (!pendingRecording) return;
    try {
      await addRecording(pendingRecording);
      setPendingRecording(null);
      setDuration(0);
      setCallerName('');

      Alert.alert('Saved ✓', 'Recording saved successfully!', [
        { text: 'View Recordings', onPress: () => navigation.navigate('Tabs') },
        { text: 'Record Again', style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Could not save recording: ' + err.message);
    }
  }

  function handleDiscard() {
    Alert.alert('Discard', 'Delete this recording?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setPendingRecording(null);
          setDuration(0);
          setCallerName('');
        },
      },
    ]);
  }

  async function getFileSize(uri) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info.size || 0;
    } catch {
      return 0;
    }
  }

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  const pad = n => n.toString().padStart(2, '0');

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.45)'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Image source={require('../../assets/icon.png')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Call Recorder</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Call Type Selector */}
      <View style={styles.typeSwitcher}>
        <TouchableOpacity
          style={[styles.typeBtn, callType === 'phone' && styles.typeBtnActive]}
          onPress={() => !isRecording && setCallType('phone')}
          disabled={isRecording}
        >
          <Ionicons
            name="call"
            size={18}
            color={callType === 'phone' ? Colors.white : Colors.textMuted}
          />
          <Text style={[styles.typeText, callType === 'phone' && styles.typeTextActive]}>
            Phone Call
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, callType === 'whatsapp' && styles.typeBtnWa]}
          onPress={() => !isRecording && !pendingRecording && setCallType('whatsapp')}
          disabled={isRecording || !!pendingRecording}
        >
          <MaterialCommunityIcons
            name="whatsapp"
            size={18}
            color={callType === 'whatsapp' ? Colors.white : Colors.textMuted}
          />
          <Text style={[styles.typeText, callType === 'whatsapp' && styles.typeTextActive]}>
            WhatsApp
          </Text>
        </TouchableOpacity>
      </View>

      {/* Visualizer + Timer */}
      <View style={styles.center}>
        {/* Waveform */}
        <View style={styles.waveform}>
          {waveAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.wavebar,
                {
                  transform: [{ scaleY: anim }],
                  backgroundColor: isRecording
                    ? callType === 'whatsapp'
                      ? Colors.whatsapp
                      : Colors.recording
                    : Colors.cardBorder,
                },
              ]}
            />
          ))}
        </View>

        {/* Glow circle */}
        <Animated.View
          style={[
            styles.glowRing,
            isRecording && { backgroundColor: glowColor },
          ]}
        />

        {/* Mic Button */}
        {!pendingRecording ? (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.micBtn,
                isRecording && {
                  backgroundColor:
                    callType === 'whatsapp' ? Colors.whatsapp : Colors.recording,
                  shadowColor:
                    callType === 'whatsapp' ? Colors.whatsapp : Colors.recording,
                },
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={44}
                color={Colors.white}
              />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.reviewActions}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: Colors.red + '15', borderColor: Colors.red + '30' }]} 
              onPress={handleDiscard}
            >
              <Ionicons name="trash-outline" size={32} color={Colors.red} />
              <Text style={[styles.actionLabel, { color: Colors.red }]}>Discard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.saveBtnLarge]} 
              onPress={handleSave}
            >
              <Ionicons name="checkmark" size={40} color={Colors.white} />
              <Text style={[styles.actionLabel, { color: Colors.white, fontSize: 16 }]}>Save Recording</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timer */}
        <View style={styles.timerBox}>
          {isRecording && (
            <View style={[styles.recDot, isPaused && { backgroundColor: Colors.orange }]} />
          )}
          <Text style={styles.timer}>{formatTime(duration)}</Text>
        </View>

        {/* Status */}
        <Text style={styles.statusText}>
          {pendingRecording
            ? 'Recording Finished'
            : !isRecording
            ? 'Tap to Start Recording'
            : isPaused
            ? 'Recording Paused'
            : `Recording ${callType === 'whatsapp' ? 'WhatsApp' : 'Phone'} Call...`}
        </Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        {isRecording && (
          <TouchableOpacity style={styles.controlBtn} onPress={pauseRecording}>
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={24}
              color={Colors.text}
            />
            <Text style={styles.controlLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons
            name={callType === 'whatsapp' ? 'whatsapp' : 'phone-log'}
            size={20}
            color={callType === 'whatsapp' ? Colors.whatsapp : Colors.accent}
          />
          <Text style={styles.infoText}>
            {callType === 'whatsapp' ? 'WhatsApp Recording' : 'Phone Recording'}
          </Text>
        </View>

        {isRecording && (
          <TouchableOpacity style={styles.controlBtn} onPress={stopRecording}>
            <Ionicons name="save-outline" size={24} color={Colors.green} />
            <Text style={[styles.controlLabel, { color: Colors.green }]}>Save</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notice */}
      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.textDim} />
        <Text style={styles.noticeText}>
          Always inform the other party that the call is being recorded.
        </Text>
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
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  typeSwitcher: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 4,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  typeBtnActive: {
    backgroundColor: Colors.accent,
  },
  typeBtnWa: {
    backgroundColor: Colors.whatsapp,
  },
  typeText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  typeTextActive: {
    color: Colors.white,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 60,
  },
  wavebar: {
    width: 6,
    height: 48,
    borderRadius: 3,
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'transparent',
  },
  micBtn: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 16,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.recording,
  },
  timer: {
    color: Colors.text,
    fontSize: 42,
    fontWeight: '200',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  controlBtn: {
    alignItems: 'center',
    gap: 6,
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minWidth: 72,
  },
  controlLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accentGlow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  infoText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    height: 140,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 100,
  },
  saveBtnLarge: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
    paddingHorizontal: Spacing.xl,
    height: 120,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  noticeText: {
    color: Colors.textDim,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});
