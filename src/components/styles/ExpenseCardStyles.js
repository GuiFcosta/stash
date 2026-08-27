import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    card: { padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    iconContainer: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    info: { flex: 1 },
    loja: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
    detalhe: { fontSize: 13, marginTop: 4 },
    valor: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' }
});
