import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    scrollContentTeclado: {
        justifyContent: 'flex-start',
        paddingTop: 8,
    },
    brandingBox: {
        alignItems: 'center',
        marginBottom: 26,
    },
    brandingBoxCompact: {
        marginBottom: 10,
    },
    logoImage: {
        width: 72,
        height: 72,
        marginBottom: 12,
    },
    logoImageCompact: {
        width: 44,
        height: 44,
        marginBottom: 4,
    },
    appTitle: {
        fontSize: 30,
        fontFamily: 'SpaceGrotesk_700Bold',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    appTitleCompact: {
        fontSize: 22,
        letterSpacing: 0.5,
    },
    appSubtitle: {
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_500Medium',
        marginTop: 4,
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        borderRadius: 2,
        borderWidth: 1.5,
        borderColor: '#111827',
        padding: 4,
        marginBottom: 20,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 2,
        alignItems: 'center',
    },
    tabButtonAtivo: {
        borderWidth: 1,
        borderColor: '#111827',
    },
    tabTexto: {
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tabTextoAtivo: {
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    formBox: {
        gap: 6,
    },
    inputLabel: {
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: 8,
        marginBottom: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 2,
        paddingHorizontal: 14,
        height: 50,
        borderWidth: 1.5,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    dicaTexto: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_400Regular',
        marginTop: 4,
        marginBottom: 8,
        lineHeight: 16,
    },
    btnSubmit: {
        height: 52,
        borderRadius: 2,
        borderWidth: 1.5,
        borderColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#111827',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    btnSubmitTexto: {
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: 'SpaceGrotesk_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
});
