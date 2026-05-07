import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../theme';
import { useRecordings } from '../context/RecordingsContext';
import RecordingCard from '../components/RecordingCard';
import EmptyState from '../components/EmptyState';
import GlassHeader from '../components/GlassHeader';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { recordings, deleteRecording } = useRecordings();
  const [filter, setFilter] = useState('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const filtered = recordings.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'phone') return r.type === 'phone';
    if (filter === 'whatsapp') return r.type === 'whatsapp';
    return true;
  });

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRecording(id) },
      ]
    );
  };

  const totalDuration = recordings.reduce((acc, r) => acc + (r.duration || 0), 0);
  const phoneCount = recordings.filter(r => r.type === 'phone').length;
  const waCount = recordings.filter(r => r.type === 'whatsapp').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GlassHeader />

      {/* Stats Row */}
      <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{recordings.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, styles.statCardAccent]}>
          <MaterialCommunityIcons name="phone-log" size={18} color={Colors.accent} />
          <Text style={[styles.statNumber, { color: Colors.accent }]}>{phoneCount}</Text>
          <Text style={styles.statLabel}>Phone</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWa]}>
          <MaterialCommunityIcons name="whatsapp" size={18} color={Colors.whatsapp} />
          <Text style={[styles.statNumber, { color: Colors.whatsapp }]}>{waCount}</Text>
          <Text style={styles.statLabel}>WhatsApp</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{formatTotal(totalDuration)}</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
      </Animated.View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['all', 'phone', 'whatsapp'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            {f === 'whatsapp' && (
              <MaterialCommunityIcons
                name="whatsapp"
                size={14}
                color={filter === f ? Colors.white : Colors.textMuted}
                style={{ marginRight: 4 }}
              />
            )}
            {f === 'phone' && (
              <Ionicons
                name="call"
                size={14}
                color={filter === f ? Colors.white : Colors.textMuted}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <RecordingCard
              item={item}
              index={index}
              onDelete={() => handleDelete(item.id)}
              onPlay={() => navigation.navigate('Player', { recording: item })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Record')}
        activeOpacity={0.85}
      >
        <View style={styles.fabInner}>
          <Ionicons name="mic" size={28} color={Colors.white} />
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function formatTotal(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${secs}s`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  statCardAccent: {
    borderColor: 'rgba(124,58,237,0.3)',
    backgroundColor: Colors.accentDim,
  },
  statCardWa: {
    borderColor: 'rgba(37,211,102,0.3)',
    backgroundColor: 'rgba(37,211,102,0.06)',
  },
  statNumber: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 4,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  filterTabActive: {
    backgroundColor: Colors.accent,
  },
  filterText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.white,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  fabInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
