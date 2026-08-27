import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const requestNotificationPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === 'granted';
};

export const scheduleFixedExpensesReminder = async (active) => {
    try {
        await Notifications.cancelScheduledNotificationAsync('fixed-expenses');
        if (!active) return;
        
        // Agendar para o dia 1 de cada mês às 9:00
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Contas Mensais Pendentes 📄",
                body: "Novo mês, novas contas! Não te esqueças de pagar e registar as tuas despesas fixas no Stash.",
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
                day: 1,
                hour: 9,
                minute: 0,
            },
            identifier: 'fixed-expenses'
        });
    } catch (error) {
        console.error('Erro ao agendar lembrete de contas:', error);
    }
};

export const scheduleWeeklyBalanceAlert = async (active) => {
    try {
        await Notifications.cancelScheduledNotificationAsync('weekly-balance');
        if (!active) return;
        
        // Agendar para todas as segundas-feiras (weekday: 2) às 10:00
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Resumo Semanal 💰",
                body: "Como está o teu orçamento? Entra no Stash para verificar o teu saldo disponível para esta semana.",
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: 2, // 1 is Sunday, 2 is Monday
                hour: 10,
                minute: 0,
            },
            identifier: 'weekly-balance'
        });
    } catch (error) {
        console.error('Erro ao agendar alerta semanal:', error);
    }
};

export const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
};
