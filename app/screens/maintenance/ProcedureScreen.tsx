import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaintenanceStackParamList } from '@/app/types/navigation';
import { ArrowLeft, FileText, Video, BookOpen, AlertCircle, FileSearch } from 'lucide-react-native';
import { useTheme } from '@/app/constants/theme';
import { fetchExternalAsset } from '@/lib/assetService';
import { fetchAssetManuals } from '@/lib/assetDocumentsService';
import type { AssetManual } from '@/lib/types/assetDocuments';

type NavigationProp = NativeStackNavigationProp<MaintenanceStackParamList, 'Procedure'>;
type RouteType = RouteProp<MaintenanceStackParamList, 'Procedure'>;

export default function ProcedureScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors, isDark, shadows } = useTheme();
  const { assetId } = route.params;

  const [assetName, setAssetName] = useState(String(assetId));
  const [relevantManuals, setRelevantManuals] = useState<AssetManual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [asset, manuals] = await Promise.all([
          fetchExternalAsset(assetId),
          fetchAssetManuals(assetId),
        ]);
        setAssetName(asset.name);
        setRelevantManuals(manuals);
      } catch {
        setAssetName(String(assetId));
        setRelevantManuals([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [assetId]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText size={20} color="#EF4444" />;
      case 'Video': return <Video size={20} color="#3B82F6" />;
      case 'Guide': return <BookOpen size={20} color="#10B981" />;
      default: return <FileText size={20} color={colors.primary} />;
    }
  };

  const openDoc = (docTitle: string) => {
    import('react-native').then(m => m.Alert.alert(`Opening ${docTitle}`, 'Simulated opening of technical documentation...'));
  };

  const styles = getStyles(colors, shadows);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Manuals & Procedures</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Loading…' : `${assetId} - ${assetName}`}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.heroSection}>
           <View style={styles.heroIconBg}>
              <BookOpen size={32} color={colors.primary} />
           </View>
           <Text style={styles.heroTitle}>Asset Documentation</Text>
           <Text style={styles.heroDesc}>Review available safety, operation, and maintenance guidelines before starting work.</Text>
        </View>

        {relevantManuals.length === 0 ? (
          <View style={styles.emptyState}>
            <FileSearch size={40} color={colors.mutedForeground} style={{ marginBottom: 12, opacity: 0.5 }} />
            <Text style={styles.emptyTitle}>No Documentation Found</Text>
            <Text style={styles.emptyDesc}>There are currently no manuals attached to this specific asset.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {relevantManuals.map(doc => (
               <TouchableOpacity 
                 key={doc.id}
                 activeOpacity={0.7}
                 style={styles.docCard}
                 onPress={() => openDoc(doc.title)}
               >
                 <View style={styles.docIconWrap}>
                   {getIcon(doc.type)}
                 </View>
                 <View style={styles.docInfo}>
                   <Text style={styles.docTitle}>{doc.title}</Text>
                   <View style={styles.docMeta}>
                     <Text style={styles.docMetaText}>{doc.type}</Text>
                     <View style={styles.dot} />
                     <Text style={styles.docMetaText}>{doc.size}</Text>
                     <View style={styles.dot} />
                     <Text style={styles.docMetaText}>Updated: {doc.lastUpdated}</Text>
                   </View>
                 </View>
                 <ArrowLeft size={16} color={colors.mutedForeground} style={{ transform: [{ rotate: '135deg' }] }} />
               </TouchableOpacity>
            ))}
          </View>
        )}
        
        <View style={styles.safetyBox}>
          <AlertCircle size={18} color="#D97706" />
          <Text style={styles.safetyText}>Always remember to wear standard Personal Protective Equipment (PPE) during operation.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  heroIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.muted + '40',
    borderStyle: 'dashed',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.muted + '20',
    ...shadows.card,
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docMetaText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.muted,
    marginHorizontal: 6,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  safetyText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
    lineHeight: 18,
  },
});
