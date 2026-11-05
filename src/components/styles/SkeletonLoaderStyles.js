import { StyleSheet } from 'react-native';
export const skeletonStyles = StyleSheet.create({
    card: { padding: 14, borderRadius: 4, borderWidth: 1.5, borderColor: '#111827', marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
    info: { flex: 1 },
    goalCard: { padding: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#111827', marginBottom: 14 },
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    header: { padding: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#111827', alignItems: 'flex-start' },
});
