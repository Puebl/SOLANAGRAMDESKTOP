const { QWidget, QLabel, QPushButton, FlexLayout } = require("@nodegui/nodegui");
const CallService = require("../services/callService");

class CallWindow extends QWidget {
    constructor() {
        super();
        this.setObjectName("callWindow");
        
        // Инициализация сервиса звонков
        this.callService = new CallService('wss://your-signaling-server.com');
        
        // Создание layout
        this.layout = new FlexLayout();
        this.setLayout(this.layout);
        
        // Создание видео контейнеров
        this.localVideoContainer = new QWidget();
        this.localVideoContainer.setObjectName("localVideo");
        
        this.remoteVideoContainer = new QWidget();
        this.remoteVideoContainer.setObjectName("remoteVideo");
        
        // Создание кнопок управления
        this.audioButton = new QPushButton();
        this.audioButton.setText("Выкл. микрофон");
        this.audioButton.setObjectName("audioButton");
        
        this.videoButton = new QPushButton();
        this.videoButton.setText("Выкл. камеру");
        this.videoButton.setObjectName("videoButton");
        
        this.endCallButton = new QPushButton();
        this.endCallButton.setText("Завершить");
        this.endCallButton.setObjectName("endCallButton");
        
        // Создание контейнера для кнопок
        this.controlsContainer = new QWidget();
        this.controlsContainer.setObjectName("controls");
        this.controlsLayout = new FlexLayout();
        this.controlsContainer.setLayout(this.controlsLayout);
        
        // Добавление кнопок в контейнер управления
        this.controlsLayout.addWidget(this.audioButton);
        this.controlsLayout.addWidget(this.videoButton);
        this.controlsLayout.addWidget(this.endCallButton);
        
        // Добавление всех элементов в основной layout
        this.layout.addWidget(this.localVideoContainer);
        this.layout.addWidget(this.remoteVideoContainer);
        this.layout.addWidget(this.controlsContainer);
        
        // Стилизация
        this.setStyleSheet(`
            #callWindow {
                background-color: #1C1C1C;
                padding: 20px;
                min-width: 800px;
                min-height: 600px;
            }
            
            #localVideo {
                background-color: #2C2C2C;
                border-radius: 10px;
                min-width: 200px;
                min-height: 150px;
                position: absolute;
                right: 20px;
                top: 20px;
            }
            
            #remoteVideo {
                background-color: #2C2C2C;
                border-radius: 10px;
                flex: 1;
                min-height: 400px;
            }
            
            #controls {
                background-color: rgba(44, 44, 44, 0.8);
                border-radius: 10px;
                padding: 10px;
                margin-top: 20px;
            }
            
            QPushButton {
                background-color: #9945FF;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                margin: 0 5px;
            }
            
            #endCallButton {
                background-color: #FF4545;
            }
            
            QPushButton:hover {
                background-color: #14F195;
            }
            
            #endCallButton:hover {
                background-color: #FF6B6B;
            }
        `);
        
        // Подключение обработчиков событий
        this.audioButton.addEventListener('clicked', () => {
            this.toggleAudio();
        });
        
        this.videoButton.addEventListener('clicked', () => {
            this.toggleVideo();
        });
        
        this.endCallButton.addEventListener('clicked', () => {
            this.endCall();
        });
    }
    
    async startCall(recipientId) {
        try {
            // Инициализация медиапотоков
            await this.callService.initializeCall();
            
            // Отображение локального видео
            this.displayLocalVideo(this.callService.localStream);
            
            // Начало звонка
            await this.callService.startCall(recipientId);
            
            // Обработчик удаленного потока
            this.callService.handleRemoteStream = (stream) => {
                this.displayRemoteVideo(stream);
            };
        } catch (error) {
            console.error('Ошибка начала звонка:', error);
        }
    }
    
    displayLocalVideo(stream) {
        // Здесь должна быть логика отображения локального видео
        // В Qt это можно сделать через QVideoWidget или QMediaPlayer
        console.log('Отображение локального видео');
    }
    
    displayRemoteVideo(stream) {
        // Здесь должна быть логика отображения удаленного видео
        console.log('Отображение удаленного видео');
    }
    
    async toggleAudio() {
        const isEnabled = this.audioButton.text() === "Выкл. микрофон";
        await this.callService.toggleAudio(!isEnabled);
        this.audioButton.setText(isEnabled ? "Вкл. микрофон" : "Выкл. микрофон");
    }
    
    async toggleVideo() {
        const isEnabled = this.videoButton.text() === "Выкл. камеру";
        await this.callService.toggleVideo(!isEnabled);
        this.videoButton.setText(isEnabled ? "Вкл. камеру" : "Выкл. камеру");
    }
    
    endCall() {
        this.callService.endCall();
        this.hide();
    }
}

module.exports = CallWindow;
