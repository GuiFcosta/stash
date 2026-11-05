import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { CATEGORY_COLORS } from '../theme/Colors';
import { obterMetaCategoria } from '../constants/Categories';
import { styles } from './styles/CategoryDonutChartStyles';

export default function CategoryDonutChart({ dados, limites = {} }) {
    const { colors } = useTheme();
    const total = dados.reduce((soma, item) => soma + item.valor, 0);

    if (total <= 0) {
        return (
            <Text style={[styles.semDados, { color: colors.textLight }]}>
                Ainda não existem gastos para analisar neste mês.
            </Text>
        );
    }

    return (
        <View accessibilityLabel="Distribuição de gastos por categoria">
            {/* Banner de Resumo Swiss Grid */}
            <View style={[
                styles.totalBox,
                {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.borderSubtle || colors.border,
                }
            ]}>
                <Text style={[styles.totalBoxLabel, { color: colors.textLight }]}>
                    TOTAL GASTOS
                </Text>
                <Text style={[styles.totalBoxValue, { color: colors.textDark }]}>
                    {total.toFixed(0)} €{' '}
                    <Text style={[styles.totalBoxRubricas, { color: colors.primaryLight }]}>
                        ({dados.length} {dados.length === 1 ? 'rubrica' : 'rubricas'})
                    </Text>
                </Text>
            </View>

            {/* Barras de Progresso Horizontais Compactas (Swiss Grid) */}
            <View style={styles.legenda}>
                {dados.map((item, index) => {
                    const percentagemTotal = (item.valor / total) * 100;
                    const limite = limites[item.categoria] || 0;
                    const temLimite = limite > 0;
                    const pctExibida = temLimite ? (item.valor / limite) * 100 : percentagemTotal;
                    const pctBarra = Math.min(pctExibida, 100);
                    const emAlerta = temLimite && pctExibida >= 80;
                    const excedido = temLimite && item.valor > limite;
                    const metaCat = obterMetaCategoria(item.categoria);
                    const corCategoria = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                    const corBarra = excedido || emAlerta ? colors.danger : corCategoria;

                    return (
                        <View key={item.categoria} style={styles.blocoCategoria}>
                            <View style={styles.linhaLegenda}>
                                <View style={styles.leftRow}>
                                    <View style={[styles.corLegenda, { backgroundColor: corBarra }]} />
                                    <Ionicons
                                        name={metaCat.icone}
                                        size={14}
                                        color={colors.textMuted}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[styles.nomeCategoria, { color: colors.textDark }]}>
                                        {item.categoria}
                                    </Text>
                                </View>

                                <View style={styles.rightRow}>
                                    <Text style={[
                                        styles.valorCategoria,
                                        { color: colors.textDark },
                                        excedido && { color: colors.danger }
                                    ]}>
                                        {item.valor.toFixed(0)} €
                                    </Text>
                                    {temLimite && (
                                        <Text style={[styles.limiteTexto, { color: colors.textLight }]}>
                                            / {limite.toFixed(0)} €
                                        </Text>
                                    )}
                                    <View style={[
                                        styles.pctBadge,
                                        emAlerta
                                            ? { backgroundColor: colors.dangerSoft, borderColor: colors.danger }
                                            : { backgroundColor: colors.primarySoft, borderColor: colors.primaryLight }
                                    ]}>
                                        <Text style={[
                                            styles.pctBadgeText,
                                            { color: emAlerta ? colors.danger : colors.primaryLight }
                                        ]}>
                                            {pctExibida.toFixed(0)}%
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[
                                styles.barraFundo,
                                {
                                    backgroundColor: colors.trackBg,
                                    borderColor: colors.border,
                                }
                            ]}>
                                <View style={[
                                    styles.barraProgresso,
                                    {
                                        width: `${pctBarra}%`,
                                        backgroundColor: corBarra,
                                    }
                                ]} />
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
