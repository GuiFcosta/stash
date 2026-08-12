import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/Firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { hexToRgba } from '../utils/colors';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystemLegacy from 'expo-file-system/legacy';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { familyData, user } = useAuth();
    
    const [carregando, setCarregando] = useState(true);
    const [dadosMensais, setDadosMensais] = useState([]);

    const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    useEffect(() => {
        carregarDados();
    }, [familyData]);

    const carregarDados = async () => {
        if (!familyData?.id) return;
        
        try {
            setCarregando(true);
            const q = query(collection(db, 'gastos_variaveis'), where('familyId', '==', familyData.id));
            const snapshot = await getDocs(q);
            
            const gastos = snapshot.docs.map(doc => doc.data());
            const despesasFixas = familyData.despesasFixas || [];
            const membros = familyData.membros || [];
            
            const rendaTotalMensal = membros.reduce((soma, m) => soma + (Number(m.renda) || 0), 0);
            
            // Agrupar por mês
            const anoAtual = new Date().getFullYear();
            const mesesAgrupados = Array.from({ length: 12 }, (_, i) => {
                const mesNum = i + 1;
                const chaveMes = `${anoAtual}-${mesNum.toString().padStart(2, '0')}`;
                
                // Variáveis deste mês
                const variaveisMes = gastos.filter(g => g.mesReferencia === chaveMes);
                const totalVariavel = variaveisMes.reduce((soma, g) => soma + (Number(g.valor) || 0), 0);
                
                // Fixas pagas neste mês
                const totalFixasPagas = despesasFixas.filter(d => d.pagamentos && d.pagamentos[chaveMes]?.pago)
                                                    .reduce((soma, d) => soma + (Number(d.valor) || 0), 0);
                
                const totalGasto = totalVariavel + totalFixasPagas;
                const saldo = rendaTotalMensal - totalGasto;
                const taxaPoupanca = rendaTotalMensal > 0 ? (saldo / rendaTotalMensal) * 100 : 0;
                
                return {
                    mes: mesesLabels[i],
                    chaveMes,
                    renda: rendaTotalMensal,
                    variavel: totalVariavel,
                    fixa: totalFixasPagas,
                    totalGasto,
                    saldo,
                    taxaPoupanca,
                };
            });
            
            const currentMonthIndex = new Date().getMonth();
            const mesesFiltrados = mesesAgrupados.filter((m, i) => {
                return m.variavel > 0 || m.fixa > 0 || i === currentMonthIndex;
            });
            
            setDadosMensais(mesesFiltrados);
        } catch (error) {
            console.error("Erro ao carregar relatório:", error);
            Alert.alert("Erro", "Não foi possível carregar os dados do relatório.");
        } finally {
            setCarregando(false);
        }
    };

    const gerarCSV = async () => {
        if (dadosMensais.length === 0) return;
        
        let csvContent = "Mês,Renda,Despesas Fixas,Despesas Variáveis,Total Gasto,Saldo,Taxa de Poupança (%)\n";
        dadosMensais.forEach(row => {
            csvContent += `${row.mes},${row.renda.toFixed(2)},${row.fixa.toFixed(2)},${row.variavel.toFixed(2)},${row.totalGasto.toFixed(2)},${row.saldo.toFixed(2)},${row.taxaPoupanca.toFixed(2)}\n`;
        });

        try {
            const path = `${FileSystemLegacy.cacheDirectory}relatorio_stash.csv`;
            await FileSystemLegacy.writeAsStringAsync(path, csvContent, { encoding: 'utf8' });
            
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar Relatório CSV' });
            }
        } catch (err) {
            console.error("Erro ao exportar CSV:", err);
            Alert.alert("Erro", "Falha ao gerar o ficheiro CSV.");
        }
    };

    const gerarPDF = async () => {
        if (dadosMensais.length === 0) return;

        let tableRows = dadosMensais.map(row => `
            <tr>
                <td>${row.mes}</td>
                <td>${row.renda.toFixed(2)} €</td>
                <td>${row.fixa.toFixed(2)} €</td>
                <td>${row.variavel.toFixed(2)} €</td>
                <td><strong>${row.totalGasto.toFixed(2)} €</strong></td>
                <td style="color: ${row.saldo >= 0 ? '#10B981' : '#EF4444'}">${row.saldo.toFixed(2)} €</td>
                <td>${row.taxaPoupanca.toFixed(1)}%</td>
            </tr>
        `).join('');

        const html = `
        <html>
            <head>
                <style>
                    body { font-family: Helvetica, sans-serif; padding: 20px; }
                    h1 { color: #3B82F6; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                    th { background-color: #f2f2f2; }
                    td:first-child, th:first-child { text-align: left; }
                </style>
            </head>
            <body>
                <h1>Relatório Anual - Stash</h1>
                <p>Resumo financeiro de todos os meses.</p>
                <table>
                    <tr>
                        <th>Mês</th>
                        <th>Renda</th>
                        <th>Fixas</th>
                        <th>Variáveis</th>
                        <th>Total Gasto</th>
                        <th>Saldo</th>
                        <th>Poupança</th>
                    </tr>
                    ${tableRows}
                </table>
            </body>
        </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar Relatório PDF' });
            }
        } catch (err) {
            console.error("Erro ao exportar PDF:", err);
            Alert.alert("Erro", "Falha ao gerar o ficheiro PDF.");
        }
    };

    if (carregando) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primaryLight} />
            </View>
        );
    }

    // Gráfico de linha (Saldo ao longo dos meses)
    const chartHeight = 180;
    const chartWidth = width - 40;
    
    // Obter máximo e mínimo para escalar o gráfico
    const maxSaldo = Math.max(...dadosMensais.map(d => d.saldo), 1);
    const minSaldo = Math.min(...dadosMensais.map(d => d.saldo), 0);
    const range = maxSaldo - minSaldo || 1;

    const points = dadosMensais.map((d, index) => {
        const x = (index / 11) * (chartWidth - 40) + 20;
        const y = chartHeight - 20 - ((d.saldo - minSaldo) / range) * (chartHeight - 40);
        return { x, y, saldo: d.saldo };
    });
    const pathData = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 30) }]}>
                <Text style={[styles.headerTitle, { color: colors.textDark }]}>Relatórios & Exportação</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* GRÁFICO DE TENDÊNCIA */}
                <View style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.textDark }]}>Evolução de Saldo Mensal</Text>
                    
                    <Svg width={chartWidth} height={chartHeight} style={{ marginTop: 10 }}>
                        <Path d={pathData} stroke={colors.primaryLight} strokeWidth="3" fill="none" />
                        {points.map((p, i) => (
                            <Circle key={i} cx={p.x} cy={p.y} r="4" fill={colors.primary} />
                        ))}
                    </Svg>
                    <View style={styles.chartLabels}>
                        {mesesLabels.map((mes, i) => (
                            i % 2 === 0 ? <Text key={i} style={[styles.chartLabelText, { color: colors.textMuted }]}>{mes}</Text> : <View key={i} style={{width: 20}} />
                        ))}
                    </View>
                </View>

                {/* BOTÕES DE EXPORTAÇÃO */}
                <Text style={[styles.sectionTitle, { color: colors.textDisabled }]}>Exportar Dados</Text>
                <View style={[styles.exportActions, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <TouchableOpacity style={[styles.exportBtn, { backgroundColor: hexToRgba(colors.primaryLight, 0.1) }]} onPress={gerarCSV}>
                        <Ionicons name="document-text" size={24} color={colors.primaryLight} />
                        <Text style={[styles.exportBtnText, { color: colors.primaryLight }]}>Exportar CSV</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.exportBtn, { backgroundColor: hexToRgba(colors.danger, 0.1) }]} onPress={gerarPDF}>
                        <Ionicons name="document" size={24} color={colors.danger} />
                        <Text style={[styles.exportBtnText, { color: colors.danger }]}>Descarregar PDF</Text>
                    </TouchableOpacity>
                </View>

                {/* RESUMO MÊS A MÊS */}
                <Text style={[styles.sectionTitle, { color: colors.textDisabled, marginTop: 20 }]}>Resumo Mensal</Text>
                {dadosMensais.slice().reverse().map((row, index) => (
                    <View key={index} style={[styles.monthRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <Text style={[styles.monthText, { color: colors.textDark }]}>{row.mes}</Text>
                        <View style={styles.monthStats}>
                            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Gasto: {row.totalGasto.toFixed(2)}€</Text>
                            <Text style={{ color: row.saldo >= 0 ? colors.success : colors.danger, fontWeight: 'bold' }}>
                                {row.saldo >= 0 ? '+' : ''}{row.saldo.toFixed(2)}€
                            </Text>
                        </View>
                    </View>
                ))}
                
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, },
    header: { paddingHorizontal: 24, paddingBottom: 16, alignItems: 'center' },
    headerTitle: { fontSize: 28,  fontFamily: 'Inter_800ExtraBold',},
    scrollContent: { padding: 20, paddingBottom: 40, },
    chartCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 20,
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        alignSelf: 'flex-start',
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
        paddingHorizontal: 10,
    },
    chartLabelText: {
        fontSize: 10,
        fontFamily: 'Inter_500Medium',
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Inter_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
    },
    exportActions: {
        flexDirection: 'row',
        borderRadius: 16,
        borderWidth: 1,
        padding: 15,
        gap: 15,
    },
    exportBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    exportBtnText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
    },
    monthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
    },
    monthText: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },
    monthStats: {
        alignItems: 'flex-end',
    },
});
