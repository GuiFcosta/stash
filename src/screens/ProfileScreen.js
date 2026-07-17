import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
    // Componente interno para desenhar cada "linha" do menu
    const MenuItem = ({ icone, titulo, subtitulo, corIcone = '#4B5563', acao }) => (
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={acao}>
            <View style={[styles.iconContainer, { backgroundColor: `${corIcone}15` }]}>
                <Ionicons name={icone} size={22} color={corIcone} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{titulo}</Text>
                {subtitulo && <Text style={styles.menuSubtitle}>{subtitulo}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>O Meu Perfil</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Cartão de Identificação */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>EU</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>Guilherme Costa</Text>
                        <Text style={styles.profileEmail}>familia@email.com</Text>
                    </View>
                    <TouchableOpacity style={styles.editButton}>
                        <Text style={styles.editButtonText}>Editar</Text>
                    </TouchableOpacity>
                </View>

                {/* Secção: Ligações Bancárias (Open Banking) */}
                <Text style={styles.sectionTitle}>Integrações</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icone="business"
                        titulo="ActivoBank"
                        subtitulo="Sincronizado há 2 horas"
                        corIcone="#10B981"
                    />
                    <MenuItem
                        icone="add-circle-outline"
                        titulo="Adicionar Novo Banco"
                        subtitulo="Ligar via Open Banking"
                        corIcone="#3B82F6"
                    />
                </View>

                {/* Secção: Gestão Familiar */}
                <Text style={styles.sectionTitle}>Gestão Familiar</Text>
                <View style={styles.menuGroup}>
                    <MenuItem icone="people-outline" titulo="Membros da Família" subtitulo="Gerir acessos e rendimentos" />
                    <MenuItem icone="options-outline" titulo="Ajustar Despesas Essenciais" subtitulo="Aluguer, Luz, Água, etc." />
                </View>

                {/* Secção: Definições e Ajuda */}
                <Text style={styles.sectionTitle}>Conta</Text>
                <View style={styles.menuGroup}>
                    <MenuItem icone="notifications-outline" titulo="Notificações" />
                    <MenuItem icone="shield-checkmark-outline" titulo="Privacidade e Segurança" />
                    <MenuItem icone="log-out-outline" titulo="Terminar Sessão" corIcone="#EF4444" />
                </View>

                <Text style={styles.versaoApp}>Versão 1.0.0 (MVP)</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { padding: 30, paddingTop: 60, alignItems: 'center', backgroundColor: '#F5F7FA' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
    content: { padding: 20 },
    profileCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1E3A8A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    profileEmail: { fontSize: 14, color: '#6B7280', marginTop: 2 },
    editButton: { backgroundColor: '#E0E7FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    editButtonText: { color: '#1E3A8A', fontSize: 12, fontWeight: 'bold' },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 5 },
    menuGroup: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 25, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    iconContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuTextContainer: { flex: 1 },
    menuTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
    menuSubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
    versaoApp: { textAlign: 'center', color: '#D1D5DB', fontSize: 12, marginTop: 10, marginBottom: 30 }
});