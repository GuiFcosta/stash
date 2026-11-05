import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    card: {
        padding: 14,
        borderRadius: 4,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        shadowColor: '#111827',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 0.9,
        shadowRadius: 0,
        elevation: 3,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 2,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    info: {
        flex: 1,
        marginRight: 8,
    },
    loja: {
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_700Bold',
        letterSpacing: -0.2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        flexWrap: 'wrap',
        gap: 4,
    },
    categoriaBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderWidth: 1,
        borderRadius: 2,
    },
    categoriaBadgeText: {
        fontSize: 10,
        fontFamily: 'SpaceGrotesk_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    detalhe: {
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    valorBox: {
        alignItems: 'flex-end',
    },
    valor: {
        fontSize: 15,
        fontFamily: 'SpaceGrotesk_700Bold',
        letterSpacing: -0.3,
    },
    metodoLabel: {
        fontSize: 9,
        fontFamily: 'SpaceGrotesk_700Bold',
        letterSpacing: 0.6,
        marginTop: 2,
    },
});
