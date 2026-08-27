import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingBottom: 10, alignItems: 'center' },
    headerTitle: { fontSize: 28,  fontFamily: 'Inter_800ExtraBold',},
    content: { padding: 20 },

    resumoCasalCard: { padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    resumoCasalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowTitle: { flexDirection: 'row', alignItems: 'center' },
    resumoCasalTitulo: { fontSize: 18, fontWeight: 'bold' },
    resumoCasalValor: { fontSize: 20, fontWeight: 'bold' },
    resumoCasalSub: { fontSize: 13, marginTop: 4, marginBottom: 12 },
    barraFundo: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
    barraProgresso: { height: '100%', borderRadius: 4 },
    pctCasalTexto: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },

    cardContainer: { marginBottom: 16 },
    pessoaCard: { padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    nome: { fontSize: 18, fontWeight: '600' },
    rendaText: { fontSize: 13, marginTop: 4, fontWeight: '600' },
    valor: { fontSize: 20, fontWeight: 'bold' },
    percentagemText: { fontSize: 12, marginTop: 4 },
    detalhesContainer: { padding: 16, marginTop: 8, borderRadius: 16 },
    detalhesTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10, marginTop: 5 },
    detalhesSubTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    seccaoCategoriasPessoa: { marginBottom: 15 },
    chipsCategoriasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipCategoriaPessoa: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, gap: 6, alignItems: 'center' },
    chipCatNome: { fontSize: 12 },
    chipCatValor: { fontSize: 12, fontWeight: 'bold' },
    semGastos: { fontStyle: 'italic', paddingVertical: 10 },
});