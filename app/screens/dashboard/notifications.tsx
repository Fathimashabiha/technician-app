import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Bell, ClipboardList, AlertTriangle, RefreshCw, Calendar, Info, Check } from 'lucide-react-native';
import { notifications } from '@/data/mockData';
import { PageHeader } from '@/components/PageHeader';
import { useTheme } from '@/app/constants/theme';
import Animated, { FadeInUp } from 'react-native-reanimated';

const typeIcons: Record<string, any> = {
  assignment: ClipboardList,
  priority: AlertTriangle,
  reminder: Calendar,
  system: Info,
};

export default function NotificationsScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const [items, setItems] = useState(notifications);
  const unread = items.filter(n => !n.read).length;

  const typeColors: Record<string, string> = {
    assignment: colors.primary + '1A',
    priority: colors.destructive + '1A',
    reminder: colors.secondary + '1A',
    system: colors.panel,
  };

  const typeIconColors: Record<string, string> = {
    assignment: colors.primary,
    priority: colors.destructive,
    reminder: colors.secondary,
    system: colors.mutedForeground,
  };

  const styles = getStyles(colors, shadows);

  const markRead = (id: string) => {
    setItems(items.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setItems(items.map(n => ({ ...n, read: true })));
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={isDark ? colors.navy : colors.background} barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader
        title="Notifications"
        showBack
        rightElement={
          unread > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
              <Check size={14} color={colors.primary} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.unreadCount}>{unread} unread notifications</Text>
        
        <View style={styles.list}>
          {items.map((notif, i) => {
            const Icon = typeIcons[notif.type] || Bell;
            return (
              <Animated.View
                key={notif.id}
                entering={FadeInUp.delay(i * 30)}
              >
                <TouchableOpacity
                  onPress={() => markRead(notif.id)}
                  style={[
                    styles.notifCard,
                    !notif.read && styles.unreadCard
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardContent}>
                    <View style={[styles.iconBox, { backgroundColor: typeColors[notif.type] }]}>
                      <Icon size={16} color={typeIconColors[notif.type]} />
                    </View>
                    <View style={styles.textContent}>
                      <View style={styles.cardHeader}>
                        <Text style={[
                          styles.notifTitle,
                          !notif.read ? styles.unreadTitle : styles.readTitle
                        ]}>
                          {notif.title}
                        </Text>
                        {!notif.read && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notifMessage} numberOfLines={2}>{notif.message}</Text>
                      <Text style={styles.notifTime}>{notif.time}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
      </View>
    </View>
  );
}

const getStyles = (colors: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  unreadCount: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '600',
    marginBottom: 16,
    paddingLeft: 4,
  },
  list: {
    gap: 12,
  },
  notifCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    ...shadows.card,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  unreadCard: {
    borderLeftColor: colors.primary,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 16,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  unreadTitle: {
    color: colors.foreground,
  },
  readTitle: {
    color: colors.mutedForeground,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  notifMessage: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginBottom: 8,
  },
  notifTime: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
});

