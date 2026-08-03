export const inicioDoMes = (data) => new Date(data.getFullYear(), data.getMonth(), 1);

export const chaveDoMes = (data) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
};

export const rotuloDoMes = (data) => new Intl.DateTimeFormat('pt-PT', {
    month: 'long',
    year: 'numeric',
}).format(data);

export const alterarMes = (data, deslocamento) => (
    new Date(data.getFullYear(), data.getMonth() + deslocamento, 1)
);
