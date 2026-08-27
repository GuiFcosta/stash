export const calcularGastoTotal = (gastos) => {
    return (gastos || []).reduce((soma, despesa) => soma + (Number(despesa.valor) || 0), 0);
};

export const despesaFixaFoiPagaNoMes = (despesa, chaveMes) => {
    return Boolean(despesa?.pagamentos && despesa.pagamentos[chaveMes]?.pago);
};

export const obterQuemPagouFixoNoMes = (despesa, chaveMes) => {
    return (despesa?.pagamentos && despesa.pagamentos[chaveMes]?.quem) || null;
};

export const calcularTotalFixasPagas = (despesasFixas, chaveMes) => {
    return (despesasFixas || [])
        .filter(d => despesaFixaFoiPagaNoMes(d, chaveMes))
        .reduce((soma, d) => soma + (Number(d.valor) || 0), 0);
};

export const calcularTotalFixasPagasPorMembro = (despesasFixas, chaveMes, membroNome) => {
    return (despesasFixas || [])
        .filter(d => despesaFixaFoiPagaNoMes(d, chaveMes) && obterQuemPagouFixoNoMes(d, chaveMes) === membroNome)
        .reduce((soma, d) => soma + (Number(d.valor) || 0), 0);
};

export const agruparGastosPorCategoria = (gastosVariaveis, despesasFixasPagas) => {
    const todosOsGastos = [
        ...(gastosVariaveis || []),
        ...(despesasFixasPagas || []).map(f => ({
            valor: Number(f.valor) || 0,
            categoria: f.categoria || 'Casa'
        }))
    ];

    return Object.values(todosOsGastos.reduce((resultado, gasto) => {
        const valor = Number(gasto.valor) || 0;
        if (valor <= 0) return resultado;

        const categoria = gasto.categoria || 'Outros';
        resultado[categoria] = resultado[categoria] || { categoria, valor: 0 };
        resultado[categoria].valor += valor;
        return resultado;
    }, {})).sort((a, b) => b.valor - a.valor);
};

export const obterTimestamp = (gasto) => {
    if (!gasto) return 0;
    if (Number.isFinite(gasto.timestamp)) return gasto.timestamp;
    if (typeof gasto.timestamp?.toMillis === 'function') return gasto.timestamp.toMillis();

    const [dia, mes] = String(gasto.data || '').split('/').map(Number);
    if (dia > 0 && mes > 0 && mes <= 12) {
        return new Date(new Date().getFullYear(), mes - 1, dia).getTime();
    }

    return 0;
};
