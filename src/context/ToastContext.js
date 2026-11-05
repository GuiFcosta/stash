import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from './ThemeContext';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const { colors, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();

    const [toast, setToast] = useState(null);
    const timeoutRef = useRef(null);
    const translateY = useRef(new Animated.Value(-120)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const hideToast = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -120,
                duration: 220,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setToast(null);
        });
    }, [translateY, opacity]);

    const showToast = useCallback(({ type = 'info', title, message, duration = 3000 }) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Feedback tátil de acordo com o tipo
        if (type === 'success') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else if (type === 'error') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } else if (type === 'warning') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }

        setToast({ type, title, message });

        translateY.setValue(-120);
        opacity.setValue(0);

        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                tension: 65,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start();

        timeoutRef.current = setTimeout(() => {
            hideToast();
        }, duration);
    }, [hideToast, translateY, opacity]);

    const toastApi = {
        show: showToast,
        hide: hideToast,
        success: (message, title = 'Sucesso') => showToast({ type: 'success', title, message }),
        error: (message, title = 'Erro') => showToast({ type: 'error', title, message }),
        warning: (message, title = 'Aviso') => showToast({ type: 'warning', title, message }),
        info: (message, title = 'Informação') => showToast({ type: 'info', title, message }),
    };

    const getMeta = (type) => {
        switch (type) {
            case 'success':
                return {
                    accent: '#10B981',
                    bgBadge: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
                    borderBadge: '#10B981',
                    icon: 'checkmark-circle',
                    defaultTitle: 'SUCESSO',
                };
            case 'error':
                return {
                    accent: '#EF4444',
                    bgBadge: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
                    borderBadge: '#EF4444',
                    icon: 'alert-circle',
                    defaultTitle: 'ERRO',
                };
            case 'warning':
                return {
                    accent: '#F59E0B',
                    bgBadge: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                    borderBadge: '#F59E0B',
                    icon: 'warning',
                    defaultTitle: 'ATENÇÃO',
                };
            case 'info':
            default:
                return {
                    accent: colors.primaryLight,
                    bgBadge: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#F1F5F9',
                    borderBadge: colors.border,
                    icon: 'information-circle',
                    defaultTitle: 'INFORMAÇÃO',
                };
        }
    };

    const meta = toast ? getMeta(toast.type) : null;

    return (
        <ToastContext.Provider value={toastApi}>
            {children}
            {toast && (
                <View
                    pointerEvents="box-none"
                    style={[
                        styles.overlay,
                        { paddingTop: Math.max(insets.top + 8, 16) }
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.toastCard,
                            {
                                backgroundColor: colors.cardBg,
                                borderColor: colors.border,
                                borderLeftColor: meta.accent,
                                transform: [{ translateY }],
                                opacity,
                            }
                        ]}
                    >
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={hideToast}
                            style={styles.toastInner}
                        >
                            <View
                                style={[
                                    styles.iconBox,
                                    {
                                        backgroundColor: meta.bgBadge,
                                        borderColor: meta.borderBadge,
                                    }
                                ]}
                            >
                                <Ionicons name={meta.icon} size={20} color={meta.accent} />
                            </View>

                            <View style={styles.textContainer}>
                                <Text
                                    style={[
                                        styles.titleText,
                                        { color: colors.textDark }
                                    ]}
                                    numberOfLines={1}
                                >
                                    {toast.title || meta.defaultTitle}
                                </Text>
                                {toast.message ? (
                                    <Text
                                        style={[
                                            styles.messageText,
                                            { color: colors.textMuted }
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {toast.message}
                                    </Text>
                                ) : null}
                            </View>

                            <TouchableOpacity
                                onPress={hideToast}
                                style={styles.closeBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={18} color={colors.textLight} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast deve ser usado dentro de um ToastProvider');
    }
    return context;
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    toastCard: {
        width: '100%',
        maxWidth: 520,
        borderRadius: 4,
        borderWidth: 1.5,
        borderLeftWidth: 6,
        shadowColor: '#111827',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.95,
        shadowRadius: 0,
        elevation: 8,
    },
    toastInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 12,
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: 2,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    titleText: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_700Bold',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    messageText: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_500Medium',
        marginTop: 2,
        lineHeight: 16,
    },
    closeBtn: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
