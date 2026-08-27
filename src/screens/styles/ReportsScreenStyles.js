import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingBottom: 10, alignItems: 'center' },
    headerTitle: { fontSize: 28,  fontFamily: 'SpaceGrotesk_700Bold' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    chartCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 20, alignItems: 'center' },
    cardTitle: {fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', alignSelf: 'flex-start' },
    chartLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, paddingHorizontal: 10 },
    chartLabelText: { fontSize: 10, fontFamily: 'SpaceGrotesk_500Medium' },
    sectionTitle: { fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    exportActions: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 15, gap: 15,},
    exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 8 },
    exportBtnText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 },
    monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
    monthText: { fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold' },
    monthStats: { alignItems: 'flex-end' },
});