import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    totalBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderRadius: 2,
        marginBottom: 16,
    },
    totalBoxLabel: {
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_700Bold',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    totalBoxValue: {
        fontSize: 15,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    totalBoxRubricas: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    legenda: {
        gap: 14,
    },
    blocoCategoria: {
        gap: 6,
    },
    linhaLegenda: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    corLegenda: {
        width: 10,
        height: 10,
        borderRadius: 1,
        marginRight: 8,
    },
    nomeCategoria: {
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    valorCategoria: {
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    limiteTexto: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    pctBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderWidth: 1,
        borderRadius: 2,
        marginLeft: 4,
    },
    pctBadgeText: {
        fontSize: 10,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    barraFundo: {
        height: 10,
        borderRadius: 1,
        borderWidth: 1,
        overflow: 'hidden',
        padding: 1,
    },
    barraProgresso: {
        height: '100%',
    },
    semDados: {
        fontFamily: 'SpaceGrotesk_400Regular',
        textAlign: 'center',
        paddingVertical: 20,
    },
});
