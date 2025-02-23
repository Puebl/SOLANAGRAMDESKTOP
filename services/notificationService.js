const { Notification } = require('electron');
const path = require('path');

class NotificationService {
    constructor() {
        this.notifications = new Map();
    }

    // Показать уведомление о новом сообщении
    showMessageNotification(sender, content, chatId) {
        // Если уже есть уведомление для этого чата, закрываем его
        if (this.notifications.has(chatId)) {
            this.notifications.get(chatId).close();
        }

        const notification = new Notification({
            title: sender,
            body: content,
            icon: path.join(__dirname, '../assets/icon.png'),
            silent: false
        });

        notification.on('click', () => {
            // При клике на уведомление открываем чат
            global.mainWindow?.webContents.send('open-chat', chatId);
            notification.close();
        });

        notification.show();
        this.notifications.set(chatId, notification);

        // Автоматически удаляем уведомление через 5 секунд
        setTimeout(() => {
            if (this.notifications.has(chatId)) {
                this.notifications.get(chatId).close();
                this.notifications.delete(chatId);
            }
        }, 5000);
    }

    // Показать уведомление о групповом сообщении
    showGroupMessageNotification(groupName, sender, content, groupId) {
        if (this.notifications.has(groupId)) {
            this.notifications.get(groupId).close();
        }

        const notification = new Notification({
            title: `${groupName} - ${sender}`,
            body: content,
            icon: path.join(__dirname, '../assets/icon.png'),
            silent: false
        });

        notification.on('click', () => {
            global.mainWindow?.webContents.send('open-group', groupId);
            notification.close();
        });

        notification.show();
        this.notifications.set(groupId, notification);

        setTimeout(() => {
            if (this.notifications.has(groupId)) {
                this.notifications.get(groupId).close();
                this.notifications.delete(groupId);
            }
        }, 5000);
    }

    // Показать уведомление о новом контакте
    showNewContactNotification(contactName) {
        const notification = new Notification({
            title: 'New Contact',
            body: `${contactName} started chatting with you`,
            icon: path.join(__dirname, '../assets/icon.png'),
            silent: false
        });

        notification.show();
    }

    // Показать уведомление об ошибке
    showErrorNotification(title, message) {
        const notification = new Notification({
            title: title,
            body: message,
            icon: path.join(__dirname, '../assets/error-icon.png')
        });

        notification.show();
    }

    // Показать уведомление о транзакции
    showTransactionNotification(status, message) {
        const notification = new Notification({
            title: `Transaction ${status}`,
            body: message,
            icon: path.join(__dirname, '../assets/transaction-icon.png')
        });

        notification.show();
    }

    // Закрыть все уведомления
    closeAll() {
        for (const notification of this.notifications.values()) {
            notification.close();
        }
        this.notifications.clear();
    }
}

module.exports = NotificationService;
