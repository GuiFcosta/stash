import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 36,
        paddingHorizontal: 20,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 15,
        fontFamily: 'SpaceGrotesk_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_400Regular',
        textAlign: 'center',
        lineHeight: 19,
    },
    actionContainer: {
        marginTop: 16,
    },
});
