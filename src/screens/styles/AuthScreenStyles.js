import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 25, paddingTop: 40, justifyContent: 'center' },
    brandingBox: { alignItems: 'center', marginBottom: 30 },
    logoCircle: { width: 75, height: 75, borderRadius: 38, justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },
    appTitle: { fontSize: 32, fontWeight: 'bold', letterSpacing: 0.5 },
    appSubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' },
    tabContainer: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 25 },
    tabButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    tabButtonAtivo: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    tabTexto: { fontSize: 15, fontWeight: '600' },
    tabTextoAtivo: { fontWeight: 'bold' },
    formBox: { gap: 6 },
    inputLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1 },
    input: { flex: 1, fontSize: 16 },
    dicaTexto: { fontSize: 12, fontStyle: 'italic', marginTop: 4, marginBottom: 10, lineHeight: 16 },
    btnSubmit: { height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    btnSubmitTexto: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' }
});