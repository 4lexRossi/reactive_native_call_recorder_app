import { Audio, InterruptionModeIOS } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform, NativeModules, NativeEventEmitter } from 'react-native';
import VIForegroundService from '@voximplant/react-native-foreground-service';

const { CallStateModule } = NativeModules;

const { PipModule } = NativeModules;

const setPipActive = (active) => {
  if (Platform.OS === 'android' && PipModule && PipModule.setRecordingActive) {
    try {
      PipModule.setRecordingActive(active);
    } catch (e) {
      console.warn('Failed to set PIP active:', e);
    }
  }
};

const METADATA_FILE = FileSystem.documentDirectory + 'recordings.json';
const RECORDINGS_DIR = FileSystem.documentDirectory + 'recordings/';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const RecordingsContext = createContext(null);

export function RecordingsProvider({ children }) {
  const [recordings, setRecordings] = useState([]);
  const [currentRecording, setCurrentRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [activeCallType, setActiveCallType] = useState('phone');
  const [startTime, setStartTime] = useState(null);
  const [lastStoppedRecording, setLastStoppedRecording] = useState(null);

  // Refs that mirror state so native event listeners can read current values
  // without needing to be in the dependency array (avoids stale closures).
  const currentRecordingRef = useRef(null);
  const isPausedRef = useRef(false);

  useEffect(() => { currentRecordingRef.current = currentRecording; }, [currentRecording]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const isInitialMount = useRef(true);
  const timerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const pauseRecordingRef = useRef(null);
  const stopRecordingRef = useRef(null);
  // Tracks whether the recording was auto-paused by an incoming call
  // so we can auto-resume when the call ends.
  const callInterruptedRef = useRef(false);

  // Sync refs to avoid dependency cycles in native event listener
  useEffect(() => {
    pauseRecordingRef.current = pauseRecording;
    stopRecordingRef.current = stopRecording;
  });

  // Listen to native Picture-in-Picture action broadcasts
  useEffect(() => {
    if (Platform.OS === 'android' && PipModule) {
      try {
        const eventEmitter = new NativeEventEmitter(PipModule);
        const subscription = eventEmitter.addListener('onPipAction', (action) => {
          if (action === 'pause') {
            if (pauseRecordingRef.current) pauseRecordingRef.current();
          } else if (action === 'stop') {
            if (stopRecordingRef.current) stopRecordingRef.current();
          }
        });
        return () => subscription.remove();
      } catch (err) {
        console.warn('Failed to register native PIP action emitter:', err);
      }
    }
  }, []);

  // ── Call / VoIP interruption handling ──────────────────────────────────────
  // When a phone call or WhatsApp call starts, Android takes exclusive control
  // of the microphone — there is no way to share it. We pause gracefully and
  // auto-resume when the call ends.
  useEffect(() => {
    if (Platform.OS !== 'android' || !CallStateModule) return;

    let subscription;
    try {
      const emitter = new NativeEventEmitter(CallStateModule);
      subscription = emitter.addListener('onCallInterruption', (event) => {
        if (event === 'call_started') {
          // Only pause if we are actively recording and not already paused
          if (pauseRecordingRef.current && !callInterruptedRef.current) {
            const isCurrentlyRecording = !!currentRecordingRef.current;
            const isCurrentlyPaused = isPausedRef.current;
            if (isCurrentlyRecording && !isCurrentlyPaused) {
              callInterruptedRef.current = true;
              pauseRecordingRef.current();
              // Update foreground service notification to inform the user
              VIForegroundService.getInstance().startService({
                channelId: 'recording',
                id: 1001,
                title: '⏸️ Recording Paused',
                text: 'Call in progress — will resume automatically when the call ends.',
                icon: 'ic_launcher',
                foregroundServiceType: 'microphone',
              }).catch(() => {});
            }
          }
        } else if (event === 'call_ended') {
          // Auto-resume only if WE paused it due to a call
          if (callInterruptedRef.current) {
            callInterruptedRef.current = false;
            if (pauseRecordingRef.current) {
              // Small delay to let the system release the mic
              setTimeout(() => {
                pauseRecordingRef.current && pauseRecordingRef.current();
                VIForegroundService.getInstance().startService({
                  channelId: 'recording',
                  id: 1001,
                  title: '🔴 Recording Active',
                  text: 'Recording resumed after call.',
                  icon: 'ic_launcher',
                  foregroundServiceType: 'microphone',
                }).catch(() => {});
              }, 800);
            }
          }
        }
      });
    } catch (err) {
      console.warn('Failed to register CallStateModule listener:', err);
    }

    return () => subscription?.remove();
  }, []);

  // Start / stop the native call-state watcher based on recording state
  useEffect(() => {
    if (Platform.OS !== 'android' || !CallStateModule) return;
    try {
      if (isRecording) {
        CallStateModule.startListening();
      } else {
        callInterruptedRef.current = false; // reset on manual stop
        CallStateModule.stopListening();
      }
    } catch (err) {
      console.warn('CallStateModule error:', err);
    }
  }, [isRecording]);
  // ───────────────────────────────────────────────────────────────────────────

  // Update native PiP window state (Play/Pause button toggle) when state changes reactive
  useEffect(() => {
    if (Platform.OS === 'android' && PipModule && PipModule.updatePipState) {
      try {
        PipModule.updatePipState(isPaused);
      } catch (e) {
        console.warn('Failed to update native PIP play/pause state:', e);
      }
    }
  }, [isPaused]);

  // Ensure recordings directory exists and request notification permissions
  useEffect(() => {
    async function init() {
      const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
      }

      // Load metadata
      const fileInfo = await FileSystem.getInfoAsync(METADATA_FILE);
      if (fileInfo.exists) {
        try {
          const content = await FileSystem.readAsStringAsync(METADATA_FILE);
          setRecordings(JSON.parse(content));
        } catch (e) {
          console.error('Failed to parse recordings metadata', e);
        }
      }

      // Permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Create Android notification channel for the foreground service
      if (Platform.OS === 'android') {
        try {
          await VIForegroundService.getInstance().createNotificationChannel({
            id: 'recording',
            name: 'Call Recording',
            description: 'Keeps call recording alive in background',
            enableVibration: false,
            importance: 'high',
          });
        } catch (err) {
          console.warn('Could not create foreground service channel:', err);
        }
      }

      isInitialMount.current = false;
    }
    init();
  }, []);

  // Timer logic - timestamp-based so it stays accurate after backgrounding
  useEffect(() => {
    if (isRecording && !isPaused && startTime) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - startTime) / 1000);
        setDuration(diff);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused, startTime]);

  // Resync timer when app returns to foreground after being backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        isRecording &&
        !isPaused &&
        startTime
      ) {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [isRecording, isPaused, startTime]);

  // Persist metadata when recordings change
  useEffect(() => {
    if (!isInitialMount.current) {
      FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(recordings))
        .catch(e => console.error('Failed to save recordings metadata', e));
    }
  }, [recordings]);

  async function startRecording(type = 'phone') {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return { error: 'Permission denied' };

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        shouldDuckAndroid: false,
        // interruptionModeAndroid is intentionally omitted — it only affects
        // audio PLAYBACK focus ducking on Android and has no effect on whether
        // another app can take over the microphone.
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      const now = Date.now();
      setStartTime(now);
      setCurrentRecording(recording);
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setActiveCallType(type);
      setPipActive(true);

      // Start Android foreground service to keep process alive in background
      if (Platform.OS === 'android') {
        try {
          await VIForegroundService.getInstance().startService({
            channelId: 'recording',
            id: 1001,
            title: '🔴 Recording Active',
            text: `Recording ${type === 'whatsapp' ? 'WhatsApp' : 'Phone'} call...`,
            icon: 'ic_launcher',
            foregroundServiceType: 'microphone',
          });
        } catch (err) {
          console.warn('Could not start foreground service:', err);
        }
      }

      return { recording };
    } catch (e) {
      console.error('Failed to start recording', e);
      return { error: e.message };
    }
  }

  async function pauseRecording() {
    if (!currentRecording) return;
    try {
      if (isPaused) {
        const now = Date.now();
        setStartTime(now - (duration * 1000));
        await currentRecording.startAsync();
        setIsPaused(false);
      } else {
        await currentRecording.pauseAsync();
        setIsPaused(true);
      }
    } catch (e) {
      console.error('Failed to pause/resume recording', e);
    }
  }

  async function stopRecording() {
    if (!currentRecording) return null;
    try {
      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();
      const durationFinal = duration;
      const typeFinal = activeCallType;

      setCurrentRecording(null);
      setIsRecording(false);
      setIsPaused(false);
      setPipActive(false);

      // Stop the Android foreground service
      if (Platform.OS === 'android') {
        try {
          await VIForegroundService.getInstance().stopService();
        } catch (err) {
          console.warn('Could not stop foreground service:', err);
        }
      }

      // Dismiss all notifications
      try {
        await Notifications.dismissAllNotificationsAsync();
      } catch (err) {
        console.warn('Failed to dismiss notifications:', err);
      }

      const result = { uri, duration: durationFinal, type: typeFinal };
      setLastStoppedRecording(result);
      return result;
    } catch (e) {
      console.error('Failed to stop recording', e);
      return null;
    }
  }

  async function addRecording(rec) {
    try {
      // Move file to permanent location
      const filename = `recording_${rec.id}.m4a`;
      const permanentUri = RECORDINGS_DIR + filename;

      await FileSystem.moveAsync({
        from: rec.uri,
        to: permanentUri
      });

      const finalRec = { ...rec, uri: permanentUri };
      setRecordings(prev => [finalRec, ...prev]);
      return finalRec;
    } catch (e) {
      console.error('Failed to save recording file', e);
      // Fallback: add anyway or throw error?
      setRecordings(prev => [rec, ...prev]);
    }
  }

  async function deleteRecording(id) {
    const recToDelete = recordings.find(r => r.id === id);
    if (recToDelete && recToDelete.uri) {
      try {
        const info = await FileSystem.getInfoAsync(recToDelete.uri);
        if (info.exists) {
          await FileSystem.deleteAsync(recToDelete.uri);
        }
      } catch (e) {
        console.error('Failed to delete recording file', e);
      }
    }
    setRecordings(prev => prev.filter(r => r.id !== id));
  }

  return (
    <RecordingsContext.Provider value={{
      recordings,
      addRecording,
      deleteRecording,
      currentRecording,
      isRecording,
      isPaused,
      duration,
      startTime,
      activeCallType,
      startRecording,
      pauseRecording,
      stopRecording,
      setDuration,
      lastStoppedRecording,
      setLastStoppedRecording
    }}>
      {children}
    </RecordingsContext.Provider>
  );
}

export function useRecordings() {
  return useContext(RecordingsContext);
}
