import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    graficoContainer: { width: 150, height: 150, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
    centroGrafico: { position: 'absolute', alignItems: 'center' },
    total: { fontSize: 20, fontWeight: '700' },
    totalLabel: { fontSize: 12 },
    legenda: { gap: 12 },
    blocoCategoria: { gap: 4 },
    linhaLegenda: { flexDirection: 'row', alignItems: 'center' },
    corLegenda: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    nomeCategoria: { flex: 1, fontSize: 14, fontWeight: '500' },
    valorCategoria: { fontSize: 13, fontWeight: '600' },
    barraFundo: { height: 6, borderRadius: 3, overflow: 'hidden', marginLeft: 18 },
    barraProgresso: { height: '100%', borderRadius: 3 },
    semDados: { fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
});