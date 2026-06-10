import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/app/constants/theme';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const StatusBadge = ({ status, size = 'sm', style }: BadgeProps) => {
  const { colors } = useTheme();

  const statusColors: Record<string, { bg: string; text: string }> = {
    // Work order statuses
    'Assigned':       { bg: colors.info + '1A', text: colors.info },
    'Accepted':       { bg: colors.success + '1A', text: colors.success },
    'In Progress':    { bg: colors.warning + '1A', text: colors.warning },
    'On Hold':        { bg: colors.mutedForeground + '1A', text: colors.mutedForeground },
    'Pending Approval': { bg: colors.warning + '1A', text: colors.warning },
    'Cancelled':      { bg: colors.mutedForeground + '1A', text: colors.mutedForeground },
    'Completed':      { bg: colors.success + '1A', text: colors.success },
    'Verified':       { bg: colors.success + '1A', text: colors.success },
    'Closed':         { bg: colors.mutedForeground + '1A', text: colors.mutedForeground },
    
    // Asset statuses
    'Active':         { bg: colors.success + '1A', text: colors.success },
    'Inactive':       { bg: colors.mutedForeground + '1A', text: colors.mutedForeground },
    'Under Repair':   { bg: colors.warning + '1A', text: colors.warning },
    
    // Form statuses
    'Draft':          { bg: colors.mutedForeground + '1A', text: colors.mutedForeground },
    'Submitted':      { bg: colors.info + '1A', text: colors.info },
    'Approved':       { bg: colors.success + '1A', text: colors.success },
    
    // Priority
    'Low':            { bg: colors.success + '1A', text: colors.success },
    'Medium':         { bg: colors.warning + '1A', text: colors.warning },
    'High':           { bg: colors.warning + '1A', text: colors.warning },
    'Critical':       { bg: colors.destructive + '1A', text: colors.destructive },
    
    // Audit/Validation Statuses
    'Pass':           { bg: colors.success + '1A', text: colors.success },
    'Failed':         { bg: colors.destructive + '1A', text: colors.destructive },
    
    // Work order types
    'PPM':            { bg: colors.info + '1A', text: colors.info },
    'Breakdown':      { bg: colors.destructive + '1A', text: colors.destructive },
    'Inspection':     { bg: colors.secondary + '1A', text: colors.secondary },
    'Reactive':       { bg: colors.warning + '1A', text: colors.warning },
    'Corrective':     { bg: colors.warning + '1A', text: colors.warning }, // legacy alias → Reactive
    'Other':          { bg: colors.mutedForeground + '1A', text: colors.mutedForeground },
  };

  const config = statusColors[status] || { bg: colors.mutedForeground + '1A', text: colors.mutedForeground };
  
  return (
    <View style={[
      styles.badge, 
      { backgroundColor: config.bg, borderWidth: 1, borderColor: config.text }, 
      size === 'sm' ? styles.sm : styles.md,
      style
    ]}>
      <Text style={[
        styles.text, 
        { color: config.text },
        size === 'sm' ? styles.smText : styles.mdText
      ]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 9999,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontWeight: '700',
  },
  smText: {
    fontSize: 10,
  },
  mdText: {
    fontSize: 12,
  },
});
