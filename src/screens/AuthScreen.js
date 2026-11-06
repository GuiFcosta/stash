import React, { useState, useEffect } from 'react';
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Image,
    Keyboard,
    TouchableWithoutFeedback,
    LayoutAnimation,
    UIManager
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { styles } from './styles/AuthScreenStyles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AuthScreen() {
    const { colors, isDarkMode } = useTheme();
    const { login, signup, loading } = useAuth();
    const toast = useToast();
    const insets = useSafeAreaInsets();

    const [tecladoVisivel, setTecladoVisivel] = useState(false);
    const [abaAtiva, setAbaAtiva] = useState('login'); // 'login' | 'signup'

    // Campos do Login
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Campos do Registo
    const [signupNome, setSignupNome] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupCodigo, setSignupCodigo] = useState('');

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSubscription = Keyboard.addListener(showEvent, () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setTecladoVisivel(true);
        });
        const hideSubscription = Keyboard.addListener(hideEvent, () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setTecladoVisivel(false);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const handleLogin = async () => {
        if (!loginEmail.trim() || !loginPassword.trim()) {
            toast.warning("Preenche o e-mail e a palavra-passe.", "Campos Obrigatórios");
            return;
        }
        try {
            await login(loginEmail, loginPassword);
        } catch (error) {
            // Tratado no AuthContext
        }
    };

    const handleSignup = async () => {
        if (!signupNome.trim() || !signupEmail.trim() || !signupPassword.trim()) {
            toast.warning("Preenche o teu nome, e-mail e palavra-passe.", "Campos Obrigatórios");
            return;
        }
        try {
            await signup(signupNome, signupEmail, signupPassword, signupCodigo);
        } catch (error) {
            // Tratado no AuthContext
        }
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.background,
                    paddingTop: Math.max(insets.top, 16),
                    paddingBottom: Math.max(insets.bottom, 16),
                }
            ]}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 10}
                >
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContent,
                            tecladoVisivel && styles.scrollContentTeclado
                        ]}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {/* BRANDING HEADER */}
                        <View style={[styles.brandingBox, tecladoVisivel && styles.brandingBoxCompact]}>
                            <Image
                                source={require('../../assets/stash-logo.png')}
                                style={[styles.logoImage, tecladoVisivel && styles.logoImageCompact]}
                                resizeMode="contain"
                            />
                            <Text style={[styles.appTitle, { color: colors.textDark }, tecladoVisivel && styles.appTitleCompact]}>
                                Stash
                            </Text>
                            {!tecladoVisivel && (
                                <Text style={[styles.appSubtitle, { color: colors.textLight }]}>
                                    Gestão de orçamento familiar inteligente
                                </Text>
                            )}
                        </View>

                        {/* SELECTOR DE ABAS */}
                        <View style={[styles.tabContainer, { backgroundColor: colors.inputBg }]}>
                            <TouchableOpacity
                                style={[
                                    styles.tabButton,
                                    abaAtiva === 'login' && [styles.tabButtonAtivo, { backgroundColor: colors.cardBg }]
                                ]}
                                onPress={() => setAbaAtiva('login')}
                            >
                                <Text style={[
                                    styles.tabTexto,
                                    { color: colors.textLight },
                                    abaAtiva === 'login' && [styles.tabTextoAtivo, { color: colors.primaryLight }]
                                ]}>
                                    Iniciar Sessão
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.tabButton,
                                    abaAtiva === 'signup' && [styles.tabButtonAtivo, { backgroundColor: colors.cardBg }]
                                ]}
                                onPress={() => setAbaAtiva('signup')}
                            >
                                <Text style={[
                                    styles.tabTexto,
                                    { color: colors.textLight },
                                    abaAtiva === 'signup' && [styles.tabTextoAtivo, { color: colors.primaryLight }]
                                ]}>
                                    Criar Conta
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* FORMULÁRIO 1: INICIAR SESSÃO */}
                        {abaAtiva === 'login' && (
                            <View style={styles.formBox}>
                                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>E-mail</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                    <Ionicons name="mail-outline" size={20} color={colors.textDisabled} style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={[styles.input, { color: colors.textDark }]}
                                        placeholder="seu.email@exemplo.com"
                                        placeholderTextColor={colors.textDisabled}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={loginEmail}
                                        onChangeText={setLoginEmail}
                                    />
                                </View>

                                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Palavra-passe</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color={colors.textDisabled} style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={[styles.input, { color: colors.textDark }]}
                                        placeholder="••••••••"
                                        placeholderTextColor={colors.textDisabled}
                                        secureTextEntry={true}
                                        value={loginPassword}
                                        onChangeText={setLoginPassword}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.btnSubmit, { backgroundColor: colors.primary }]}
                                    onPress={handleLogin}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.btnSubmitTexto}>Entrar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* FORMULÁRIO 2: CRIAR CONTA */}
                        {abaAtiva === 'signup' && (
                            <View style={styles.formBox}>
                                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>O teu Nome Completo</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                    <Ionicons name="person-outline" size={20} color={colors.textDisabled} style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={[styles.input, { color: colors.textDark }]}
                                        placeholder="Ex: Guilherme Costa"
                                        placeholderTextColor={colors.textDisabled}
                                        value={signupNome}
                                        onChangeText={setSignupNome}
                                    />
                                </View>

                                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>E-mail</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                    <Ionicons name="mail-outline" size={20} color={colors.textDisabled} style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={[styles.input, { color: colors.textDark }]}
                                        placeholder="seu.email@exemplo.com"
                                        placeholderTextColor={colors.textDisabled}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={signupEmail}
                                        onChangeText={setSignupEmail}
                                    />
                                </View>

                                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Palavra-passe (mínimo 6 caracteres)</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color={colors.textDisabled} style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={[styles.input, { color: colors.textDark }]}
                                        placeholder="••••••••"
                                        placeholderTextColor={colors.textDisabled}
                                        secureTextEntry={true}
                                        value={signupPassword}
                                        onChangeText={setSignupPassword}
                                    />
                                </View>

                                {/* CÓDIGO DE CONVITE OPCIONAL */}
                                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                                    Código de Convite (Opcional)
                                </Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                    <Ionicons name="key-outline" size={20} color={colors.primaryLight} style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={[styles.input, { color: colors.textDark, fontWeight: 'bold', letterSpacing: 2 }]}
                                        placeholder="Ex: 8X2K9P"
                                        placeholderTextColor={colors.textDisabled}
                                        autoCapitalize="characters"
                                        maxLength={8}
                                        value={signupCodigo}
                                        onChangeText={setSignupCodigo}
                                    />
                                </View>
                                <Text style={[styles.dicaTexto, { color: colors.textLight }]}>
                                    💡 Se deixares em branco, criarás um grupo Solo privado onde podes convidar a tua família mais tarde.
                                </Text>

                                <TouchableOpacity
                                    style={[styles.btnSubmit, { backgroundColor: colors.success }]}
                                    onPress={handleSignup}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.btnSubmitTexto}>Criar Conta e Começar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </View>
    );
}
