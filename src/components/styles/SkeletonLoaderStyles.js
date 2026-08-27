import { StyleSheet } from 'react-native';
export const skeletonStyles = StyleSheet.create({
    card: { padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 15 },
    info: { flex: 1 },
    goalCard: { padding: 20, borderRadius: 16, marginBottom: 16 },
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    header: { padding: 30, paddingTop: 30, alignItems: 'center' },
});