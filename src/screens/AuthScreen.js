import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AuthScreen() {
    const { colors, isDarkMode } = useTheme();
    const { login, signup, loading } = useAuth();

    const [abaAtiva, setAbaAtiva] = useState('login'); // 'login' | 'signup'

    // Campos do Login
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Campos do Registo
    const [signupNome, setSignupNome] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupCodigo, setSignupCodigo] = useState('');

    const handleLogin = async () => {
        if (!loginEmail || !loginPassword) {
            alert("Preenche o e-mail e a palavra-passe.");
            return;
        }
        try {
            await login(loginEmail, loginPassword);
        } catch (error) {
            // Trado dentro do AuthContext
        }
    };

    const handleSignup = async () => {
        if (!signupNome || !signupEmail || !signupPassword) {
            alert("Preenche o teu nome, e-mail e palavra-passe.");
            return;
        }
        try {
            await signup(signupNome, signupEmail, signupPassword, signupCodigo);
        } catch (error) {
            // Trado dentro do AuthContext
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* BRANDING HEADER */}
                    <View style={styles.brandingBox}>
                        <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
                            <Ionicons name="wallet-outline" size={38} color="#FFFFFF" />
                        </View>
                        <Text style={[styles.appTitle, { color: colors.textDark }]}>Stash</Text>
                        <Text style={[styles.appSubtitle, { color: colors.textLight }]}>
                            Gestão de orçamento familiar inteligente
                        </Text>
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
