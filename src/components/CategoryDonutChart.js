import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../theme/Colors';

const CORES = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B'];
const RAIO = 50;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

export default function CategoryDonutChart({ dados, limites = {} }) {
    const total = dados.reduce((soma, item) => soma + item.valor, 0);

    if (total <= 0) {
        return <Text style={styles.semDados}>Ainda não existem gastos para analisar neste mês.</Text>;
    }

    let percentagemAcumulada = 0;

    return (
        <View>
            <View style={styles.graficoContainer}>
                <Svg width={150} height={150} viewBox="0 0 120 120" accessibilityLabel="Distribuição de gastos por categoria">
                    <Circle cx="60" cy="60" r={RAIO} stroke="#E5E7EB" strokeWidth="18" fill="none" />
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
                                stroke={CORES[index % CORES.length]}
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
                    <Text style={styles.total}>{total.toFixed(0)}€</Text>
                    <Text style={styles.totalLabel}>gasto</Text>
                </View>
            </View>

            <View style={styles.legenda}>
                {dados.map((item, index) => {
                    const percentagemTotal = (item.valor / total) * 100;
                    const limite = limites[item.categoria] || 0;
                    const temLimite = limite > 0;
                    const pctLimite = temLimite ? Math.min((item.valor / limite) * 100, 100) : 0;
                    const excedido = temLimite && item.valor > limite;
                    const corBarra = pctLimite >= 100 ? Colors.danger : (pctLimite >= 80 ? Colors.warning : Colors.success);

                    return (
                        <View key={item.categoria} style={styles.blocoCategoria}>
                            <View style={styles.linhaLegenda}>
                                <View style={[styles.corLegenda, { backgroundColor: CORES[index % CORES.length] }]} />
                                <Text style={styles.nomeCategoria}>{item.categoria}</Text>
                                <Text style={[styles.valorCategoria, excedido && styles.valorExcedido]}>
                                    {item.valor.toFixed(2)}€
                                    {temLimite ? ` / ${limite.toFixed(0)}€` : ` (${percentagemTotal.toFixed(0)}%)`}
                                </Text>
                            </View>

                            {temLimite && (
                                <View style={styles.barraFundo}>
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

const styles = StyleSheet.create({
    graficoContainer: { width: 150, height: 150, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
    centroGrafico: { position: 'absolute', alignItems: 'center' },
    total: { fontSize: 20, fontWeight: '700', color: Colors.textDark },
    totalLabel: { fontSize: 12, color: Colors.textLight },
    legenda: { gap: 12 },
    blocoCategoria: { gap: 4 },
    linhaLegenda: { flexDirection: 'row', alignItems: 'center' },
    corLegenda: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    nomeCategoria: { flex: 1, fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
    valorCategoria: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
    valorExcedido: { color: Colors.danger, fontWeight: 'bold' },
    barraFundo: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginLeft: 18 },
    barraProgresso: { height: '100%', borderRadius: 3 },
    semDados: { color: Colors.textLight, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
});
