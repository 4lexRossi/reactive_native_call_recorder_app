import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../theme';
import { useSettings } from '../context/SettingsContext';

export default function SettingsScreen() {
  const { settings, updateSetting } = useSettings();

  const openPrivacy = () =>
    Alert.alert(
      'Privacy Notice',
      'This app records audio from your microphone. Always obtain consent from all parties before recording any conversation. Recording laws vary by jurisdiction.'
    );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Configure your recorder</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Recording Section */}
        <SectionHeader icon="mic" label="Recording" />

        <SettingCard>
          <SettingRow
            icon="headset"
            iconColor={Colors.accent}
            label="High Quality Audio"
            sub="192kbps stereo recording"
            value={settings.highQuality}
            onToggle={v => updateSetting('highQuality', v)}
          />
          <Divider />
          <SettingRow
            icon="notifications"
            iconColor={Colors.orange}
            label="Recording Notifications"
            sub="Show active recording indicator"
            value={settings.notifications}
            onToggle={v => updateSetting('notifications', v)}
          />
          <Divider />
          <SettingRow
            icon="phone-portrait-outline"
            iconColor={Colors.green}
            label="Vibrate on Start"
            sub="Haptic feedback when recording begins"
            value={settings.vibrate}
            onToggle={v => updateSetting('vibrate', v)}
          />
        </SettingCard>

        {/* Storage Section */}
        <SectionHeader icon="folder" label="Storage" />

        <SettingCard>
          <SettingRow
            icon="cloud-upload-outline"
            iconColor={Colors.accent}
            label="Auto Backup"
            sub="Save copies to cloud storage"
            value={settings.autoBackup}
            onToggle={v => updateSetting('autoBackup', v)}
          />
          <Divider />
          <SettingRow
            icon="trash-outline"
            iconColor={Colors.red}
            label="Auto Delete"
            sub="Remove recordings after 30 days"
            value={settings.autoDelete}
            onToggle={v => updateSetting('autoDelete', v)}
          />
        </SettingCard>

        {/* About Section */}
        <SectionHeader icon="information-circle" label="About" />

        <SettingCard>
          <TouchableOpacity style={styles.linkRow} onPress={openPrivacy} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.red} />
            </View>
            <View style={styles.linkInfo}>
              <Text style={styles.linkText}>Privacy Notice</Text>
              <Text style={styles.linkSub}>Recording laws & consent</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
          </TouchableOpacity>
          <Divider />
          <View style={styles.linkRow}>
            <View style={[styles.iconBox, { backgroundColor: Colors.accentDim }]}>
              <Ionicons name="code-slash-outline" size={20} color={Colors.accent} />
            </View>
            <View style={styles.linkInfo}>
              <Text style={styles.linkText}>Version</Text>
              <Text style={styles.linkSub}>1.0.0 — CallRecorder Pro</Text>
            </View>
          </View>
        </SettingCard>

        <Text style={styles.footerNote}>
          ⚠️ Recording calls without consent may be illegal in your jurisdiction. Use responsibly.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ icon, label }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={Colors.accent} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

function SettingCard({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingRow({ icon, iconColor, label, sub, value, onToggle }) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.iconBox, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.cardBorder, true: Colors.accentLight }}
        thumbColor={value ? Colors.white : Colors.textMuted}
        ios_backgroundColor={Colors.cardBorder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingLeft: 4,
  },
  sectionLabel: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginLeft: 56,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  settingSub: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  linkInfo: {
    flex: 1,
    gap: 2,
  },
  linkText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  linkSub: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  footerNote: {
    color: Colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.xl,
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
});
