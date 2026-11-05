import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/Firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { styles } from './styles/ReportsScreenStyles';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { calcularGastoTotal, calcularTotalFixasPagas } from '../utils/calculations';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { familyData } = useAuth();
    
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
                const totalVariavel = calcularGastoTotal(variaveisMes);
                
                // Fixas pagas neste mês
                const totalFixasPagas = calcularTotalFixasPagas(despesasFixas, chaveMes);
                
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
                    h1 { color: #111827; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #111827; padding: 8px; text-align: right; }
                    th { background-color: #f1f5f9; }
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

    // Gráfico de linha (Saldo ao longo dos meses ativos)
    const chartHeight = 170;
    const chartWidth = width - 68;
    
    // Obter máximo e mínimo para escalar o gráfico corretamente
    const maxSaldo = Math.max(...dadosMensais.map(d => d.saldo), 100);
    const minSaldo = Math.min(...dadosMensais.map(d => d.saldo), 0);
    const range = maxSaldo - minSaldo || 1;
    const divisorX = Math.max(dadosMensais.length - 1, 1);

    const points = dadosMensais.map((d, index) => {
        const x = dadosMensais.length === 1
            ? chartWidth / 2
            : (index / divisorX) * (chartWidth - 40) + 20;
        const y = chartHeight - 24 - ((d.saldo - minSaldo) / range) * (chartHeight - 48);
        return { x, y, saldo: d.saldo, mes: d.mes };
    });
    const pathData = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[
                styles.header,
                {
                    backgroundColor: colors.cardBg,
                    borderBottomColor: colors.border,
                    paddingTop: Math.max(insets.top + 6, 14),
                }
            ]}>
                <View>
                    <Text style={[styles.headerOverline, { color: colors.textLight }]}>ANÁLISE ANUAL</Text>
                    <Text style={[styles.headerTitle, { color: colors.textDark }]}>Relatórios & Exportação</Text>
                </View>
                <View style={[styles.anoBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Text style={[styles.anoBadgeText, { color: colors.textDark }]}>{new Date().getFullYear()}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* GRÁFICO DE TENDÊNCIA SWISS GRID */}
                <View style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <View style={[styles.cardHeaderRow, { borderBottomColor: colors.borderSubtle || colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.textDark }]}>EVOLUÇÃO DE SALDO MENSAL</Text>
                        <Text style={[styles.cardSubtitle, { color: '#059669' }]}>
                            {dadosMensais.length} {dadosMensais.length === 1 ? 'mês' : 'meses'}
                        </Text>
                    </View>
                    
                    <Svg width={chartWidth} height={chartHeight} style={{ marginTop: 8 }}>
                        <Line
                            x1="12"
                            y1={chartHeight / 2}
                            x2={chartWidth - 12}
                            y2={chartHeight / 2}
                            stroke={colors.borderSubtle || '#E5E7EB'}
                            strokeDasharray="4 4"
                            strokeWidth="1"
                        />
                        {points.length > 1 && (
                            <Path d={pathData} stroke="#10B981" strokeWidth="3" fill="none" />
                        )}
                        {points.map((p, i) => (
                            <Circle
                                key={i}
                                cx={p.x}
                                cy={p.y}
                                r="5"
                                fill={p.saldo >= 0 ? '#10B981' : colors.danger}
                                stroke={colors.cardBg}
                                strokeWidth="2"
                            />
                        ))}
                    </Svg>
                    <View style={[
                        styles.chartLabels,
                        dadosMensais.length === 1 && { justifyContent: 'center' }
                    ]}>
                        {points.map((p, i) => (
                            <View key={i} style={{ alignItems: 'center' }}>
                                <Text style={[styles.chartLabelText, { color: colors.textDark }]}>{p.mes}</Text>
                                <Text style={[
                                    styles.chartValueMini,
                                    { color: p.saldo >= 0 ? '#059669' : colors.danger }
                                ]}>
                                    {p.saldo.toFixed(0)}€
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* BOTÕES DE EXPORTAÇÃO */}
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>EXPORTAR DADOS</Text>
                <View style={styles.exportActions}>
                    <TouchableOpacity
                        style={[styles.exportBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                        onPress={gerarCSV}
                    >
                        <View style={[styles.exportIconBox, { backgroundColor: '#D1FAE5' }]}>
                            <Ionicons name="document-text-outline" size={20} color="#065F46" />
                        </View>
                        <Text style={[styles.exportBtnText, { color: colors.textDark }]}>EXPORTAR CSV</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.exportBtn, { backgroundColor: colors.primary, borderColor: colors.border }]}
                        onPress={gerarPDF}
                    >
                        <View style={[styles.exportIconBox, { backgroundColor: '#10B981' }]}>
                            <Ionicons name="document-outline" size={20} color="#FFFFFF" />
                        </View>
                        <Text style={[styles.exportBtnText, { color: '#FFFFFF' }]}>DESCARREGAR PDF</Text>
                    </TouchableOpacity>
                </View>

                {/* RESUMO MÊS A MÊS */}
                <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 22 }]}>EXTRATO MENSAL</Text>
                {dadosMensais.slice().reverse().map((row, index) => (
                    <View key={index} style={[styles.monthRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <View style={styles.monthLeft}>
                            <View style={[styles.monthBadge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.monthBadgeText}>{row.mes.toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={[styles.monthText, { color: colors.textDark }]}>
                                    Gasto Total: {row.totalGasto.toFixed(2)} €
                                </Text>
                                <Text style={[styles.monthSub, { color: colors.textLight }]}>
                                    Fixo: {row.fixa.toFixed(0)}€ • Variável: {row.variavel.toFixed(0)}€
                                </Text>
                            </View>
                        </View>
                        <View style={styles.monthStats}>
                            <Text style={[
                                styles.monthSaldo,
                                { color: row.saldo >= 0 ? '#059669' : colors.danger }
                            ]}>
                                {row.saldo >= 0 ? '+' : ''}{row.saldo.toFixed(2)} €
                            </Text>
                            <Text style={[styles.monthTaxa, { color: colors.textMuted }]}>
                                {row.taxaPoupanca.toFixed(0)}% poupado
                            </Text>
                        </View>
                    </View>
                ))}
                
            </ScrollView>
        </SafeAreaView>
    );
}
