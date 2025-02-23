const { ipcRenderer } = require('electron');
const Store = require('electron-store');

class SettingsService {
    constructor() {
        this.store = new Store({
            name: 'settings',
            defaults: {
                theme: 'light',
                language: 'en',
                notifications: {
                    sound: true,
                    desktop: true,
                    preview: true,
                    inApp: true
                },
                privacy: {
                    lastSeen: 'everybody',
                    profilePhoto: 'everybody',
                    forwards: 'everybody',
                    calls: 'everybody'
                },
                chat: {
                    fontSize: 16,
                    sendWithEnter: true,
                    autoDownload: {
                        photos: true,
                        videos: false,
                        documents: false
                    },
                    emoji: {
                        suggest: true,
                        replaceEmoticons: true
                    }
                },
                appearance: {
                    messageCorners: 'rounded',
                    chatBackground: 'default',
                    messageAnimation: true,
                    showStickers: true
                },
                advanced: {
                    networkUsage: 'auto',
                    proxyEnabled: false,
                    proxySettings: null
                },
                security: {
                    twoStepVerification: false,
                    activeSessions: []
                }
            }
        });

        this.listeners = new Set();
    }

    // Получение всех настроек
    getAllSettings() {
        return this.store.store;
    }

    // Получение конкретной настройки
    getSetting(key) {
        return this.store.get(key);
    }

    // Установка настройки
    setSetting(key, value) {
        const oldValue = this.store.get(key);
        this.store.set(key, value);
        
        // Уведомляем слушателей об изменении
        this.notifyListeners(value, oldValue);
    }

    // Установка темы
    setTheme(theme) {
        return this.setSetting('theme', theme);
    }

    // Установка языка
    setLanguage(language) {
        return this.setSetting('language', language);
    }

    // Обновление настроек уведомлений
    updateNotificationSettings(settings) {
        const currentSettings = this.getSetting('notifications');
        return this.setSetting('notifications', {
            ...currentSettings,
            ...settings
        });
    }

    // Обновление настроек приватности
    updatePrivacySettings(settings) {
        const currentSettings = this.getSetting('privacy');
        return this.setSetting('privacy', {
            ...currentSettings,
            ...settings
        });
    }

    // Обновление настроек чата
    updateChatSettings(settings) {
        const currentSettings = this.getSetting('chat');
        return this.setSetting('chat', {
            ...currentSettings,
            ...settings
        });
    }

    // Обновление настроек внешнего вида
    updateAppearanceSettings(settings) {
        const currentSettings = this.getSetting('appearance');
        return this.setSetting('appearance', {
            ...currentSettings,
            ...settings
        });
    }

    // Обновление расширенных настроек
    updateAdvancedSettings(settings) {
        const currentSettings = this.getSetting('advanced');
        return this.setSetting('advanced', {
            ...currentSettings,
            ...settings
        });
    }

    // Установка настроек прокси
    setProxySettings(proxySettings) {
        return this.setSetting('advanced.proxySettings', proxySettings);
    }

    // Включение/выключение прокси
    toggleProxy(enabled) {
        return this.setSetting('advanced.proxyEnabled', enabled);
    }

    // Сброс всех настроек
    resetSettings() {
        const oldValue = this.store.store;
        this.store.clear();
        
        // Уведомляем слушателей об изменении
        this.notifyListeners(this.store.store, oldValue);
    }

    // Экспорт настроек
    exportSettings() {
        return JSON.stringify(this.getAllSettings(), null, 2);
    }

    // Импорт настроек
    importSettings(settingsJson) {
        try {
            const settings = JSON.parse(settingsJson);
            Object.entries(settings).forEach(([key, value]) => {
                this.setSetting(key, value);
            });
            return true;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    }

    // Применение настроек к интерфейсу
    applySettings() {
        const settings = this.getAllSettings();
        
        // Применяем тему
        document.body.setAttribute('data-theme', settings.theme);
        
        // Применяем размер шрифта
        document.documentElement.style.setProperty(
            '--message-font-size',
            `${settings.chat.fontSize}px`
        );

        // Применяем стиль углов сообщений
        document.documentElement.style.setProperty(
            '--message-border-radius',
            settings.appearance.messageCorners === 'rounded' ? '12px' : '4px'
        );

        // Применяем анимации
        if (!settings.appearance.messageAnimation) {
            document.documentElement.style.setProperty(
                '--message-animation-duration',
                '0s'
            );
        }

        return settings;
    }

    // Подписка на изменения настроек
    onSettingsChange(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    // Уведомление слушателей об изменениях
    notifyListeners(newValue, oldValue) {
        this.listeners.forEach(listener => {
            try {
                listener(newValue, oldValue);
            } catch (error) {
                console.error('Error in settings listener:', error);
            }
        });
    }

    // Методы для работы с активными сессиями
    getActiveSessions() {
        return this.store.get('security.activeSessions') || [];
    }

    addActiveSession(session) {
        const sessions = this.getActiveSessions();
        sessions.push({
            ...session,
            id: Date.now().toString(),
            lastActive: new Date().toISOString()
        });
        this.store.set('security.activeSessions', sessions);
    }

    removeActiveSession(sessionId) {
        const sessions = this.getActiveSessions();
        const filteredSessions = sessions.filter(session => session.id !== sessionId);
        this.store.set('security.activeSessions', filteredSessions);
    }

    updateActiveSession(sessionId) {
        const sessions = this.getActiveSessions();
        const sessionIndex = sessions.findIndex(session => session.id === sessionId);
        
        if (sessionIndex !== -1) {
            sessions[sessionIndex].lastActive = new Date().toISOString();
            this.store.set('security.activeSessions', sessions);
        }
    }

    // Методы для работы с двухфакторной аутентификацией
    async setupTwoFactorAuth(password) {
        try {
            // Здесь будет логика настройки 2FA
            // Например, генерация секрета, QR-кода и т.д.
            const response = await ipcRenderer.invoke('setup-2fa', { password });
            
            if (response.success) {
                this.store.set('security.twoStepVerification', true);
                this.store.set('security.twoFactorSecret', response.secret);
                return response;
            }
            
            throw new Error(response.error || 'Failed to setup 2FA');
        } catch (error) {
            console.error('Error setting up 2FA:', error);
            throw error;
        }
    }

    async verifyTwoFactorCode(code) {
        try {
            const secret = this.store.get('security.twoFactorSecret');
            const response = await ipcRenderer.invoke('verify-2fa', { 
                secret, 
                code 
            });
            
            return response.success;
        } catch (error) {
            console.error('Error verifying 2FA code:', error);
            throw error;
        }
    }

    // Методы для работы с шифрованием
    async generateEncryptionKeys() {
        try {
            const response = await ipcRenderer.invoke('generate-encryption-keys');
            
            if (response.success) {
                this.store.set('security.encryptionKeys', {
                    publicKey: response.publicKey,
                    encryptedPrivateKey: response.encryptedPrivateKey
                });
                return response;
            }
            
            throw new Error(response.error || 'Failed to generate encryption keys');
        } catch (error) {
            console.error('Error generating encryption keys:', error);
            throw error;
        }
    }

    getPublicKey() {
        return this.store.get('security.encryptionKeys.publicKey');
    }

    async getDecryptedPrivateKey(password) {
        try {
            const encryptedPrivateKey = this.store.get('security.encryptionKeys.encryptedPrivateKey');
            const response = await ipcRenderer.invoke('decrypt-private-key', {
                encryptedPrivateKey,
                password
            });
            
            if (response.success) {
                return response.privateKey;
            }
            
            throw new Error(response.error || 'Failed to decrypt private key');
        } catch (error) {
            console.error('Error decrypting private key:', error);
            throw error;
        }
    }
}

module.exports = SettingsService; 