import React, { useState } from 'react';
import { Text, View, SafeAreaView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { styles } from './styles/AuthScreenStyles';

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
        if (!loginEmail.trim() || !loginPassword.trim()) {
            Alert.alert("Aviso", "Preenche o e-mail e a palavra-passe.");
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
            Alert.alert("Aviso", "Preenche o teu nome, e-mail e palavra-passe.");
            return;
        }
        try {
            await signup(signupNome, signupEmail, signupPassword, signupCodigo);
        } catch (error) {
            // Tratado no AuthContext
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