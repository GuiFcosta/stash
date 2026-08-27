import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { CATEGORY_COLORS } from '../theme/Colors';
import { styles } from './styles/CategoryDonutChartStyles';
const RAIO = 50;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

export default function CategoryDonutChart({ dados, limites = {} }) {
    const { colors } = useTheme();
    const total = dados.reduce((soma, item) => soma + item.valor, 0);

    if (total <= 0) {
        return <Text style={[styles.semDados, { color: colors.textLight }]}>Ainda não existem gastos para analisar neste mês.</Text>;
    }

    let percentagemAcumulada = 0;

    return (
        <View>
            <View style={styles.graficoContainer}>
                <Svg width={150} height={150} viewBox="0 0 120 120" accessibilityLabel="Distribuição de gastos por categoria">
                    <Circle cx="60" cy="60" r={RAIO} stroke={colors.trackBg} strokeWidth="18" fill="none" />
                    {dados.map((item, index) => {
                        const percentagem = item.valor / total;
                        const comprimento = percentagem * CIRCUNFERENCIA;
                        const deslocamento = -percentagemAcumulada * CIRCUNFERENCIA;
                        percentagemAcumulada += percentagem;

                        return (
                            <Circle
                                key={item.categoria}
                                cx="60"
                                cy="60"
                                r={RAIO}
                                stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                                strokeWidth="18"
                                strokeDasharray={`${comprimento} ${CIRCUNFERENCIA}`}
                                strokeDashoffset={deslocamento}
                                strokeLinecap="butt"
                                fill="none"
                                rotation="-90"
                                origin="60, 60"
                            />
                        );
                    })}
                </Svg>
                <View style={styles.centroGrafico} pointerEvents="none">
                    <Text style={[styles.total, { color: colors.textDark }]}>{total.toFixed(0)}€</Text>
                    <Text style={[styles.totalLabel, { color: colors.textLight }]}>gasto</Text>
                </View>
            </View>

            <View style={styles.legenda}>
                {dados.map((item, index) => {
                    const percentagemTotal = (item.valor / total) * 100;
                    const limite = limites[item.categoria] || 0;
                    const temLimite = limite > 0;
                    const pctLimite = temLimite ? Math.min((item.valor / limite) * 100, 100) : 0;
                    const excedido = temLimite && item.valor > limite;
                    const corBarra = pctLimite >= 100 ? colors.danger : (pctLimite >= 80 ? colors.warning : colors.success);

                    return (
                        <View key={item.categoria} style={styles.blocoCategoria}>
                            <View style={styles.linhaLegenda}>
                                <View style={[styles.corLegenda, { backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }]} />
                                <Text style={[styles.nomeCategoria, { color: colors.textMuted }]}>{item.categoria}</Text>
                                <Text style={[styles.valorCategoria, { color: colors.textMuted }, excedido && { color: colors.danger, fontWeight: 'bold' }]}>
                                    {item.valor.toFixed(2)}€
                                    {temLimite ? ` / ${limite.toFixed(0)}€` : ` (${percentagemTotal.toFixed(0)}%)`}
                                </Text>
                            </View>

                            {temLimite && (
                                <View style={[styles.barraFundo, { backgroundColor: colors.trackBg }]}>
                                    <View style={[styles.barraProgresso, { width: `${pctLimite}%`, backgroundColor: corBarra }]} />
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}