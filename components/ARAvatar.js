const { QWidget, QLabel, QPushButton, FlexLayout } = require("@nodegui/nodegui");
const ARService = require("../services/arService");

class ARAvatar extends QWidget {
    constructor() {
        super();
        this.setObjectName("arAvatar");
        
        // Инициализация AR сервиса
        this.arService = new ARService();
        
        // Создание layout
        this.layout = new FlexLayout();
        this.setLayout(this.layout);
        
        // Создание контейнера для AR
        this.arContainer = new QWidget();
        this.arContainer.setObjectName("arContainer");
        
        // Создание видео элемента для камеры
        this.videoElement = new QLabel();
        this.videoElement.setObjectName("videoPreview");
        
        // Создание контейнера для управления
        this.controlsContainer = new QWidget();
        this.controlsContainer.setObjectName("controls");
        this.controlsLayout = new FlexLayout();
        this.controlsContainer.setLayout(this.controlsLayout);
        
        // Кнопки управления
        this.startARButton = new QPushButton();
        this.startARButton.setText("Запустить AR");
        this.startARButton.setObjectName("startARButton");
        
        this.changeAvatarButton = new QPushButton();
        this.changeAvatarButton.setText("Сменить аватар");
        this.changeAvatarButton.setObjectName("changeAvatarButton");
        
        this.takePhotoButton = new QPushButton();
        this.takePhotoButton.setText("Сделать фото");
        this.takePhotoButton.setObjectName("takePhotoButton");
        
        // Добавление кнопок в контейнер управления
        this.controlsLayout.addWidget(this.startARButton);
        this.controlsLayout.addWidget(this.changeAvatarButton);
        this.controlsLayout.addWidget(this.takePhotoButton);
        
        // Добавление элементов в основной layout
        this.layout.addWidget(this.arContainer);
        this.layout.addWidget(this.videoElement);
        this.layout.addWidget(this.controlsContainer);
        
        // Стилизация
        this.setStyleSheet(`
            #arAvatar {
                background-color: #1C1C1C;
                padding: 20px;
                min-width: 800px;
                min-height: 600px;
            }
            
            #arContainer {
                background-color: #2C2C2C;
                border-radius: 10px;
                flex: 1;
                min-height: 400px;
            }
            
            #videoPreview {
                position: absolute;
                right: 20px;
                top: 20px;
                width: 200px;
                height: 150px;
                background-color: #333333;
                border-radius: 10px;
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
            
            QPushButton:hover {
                background-color: #14F195;
            }
        `);
        
        // Подключение обработчиков событий
        this.startARButton.addEventListener('clicked', () => {
            this.toggleAR();
        });
        
        this.changeAvatarButton.addEventListener('clicked', () => {
            this.changeAvatar();
        });
        
        this.takePhotoButton.addEventListener('clicked', () => {
            this.takePhoto();
        });
    }
    
    async initialize() {
        try {
            await this.arService.initialize(this.arContainer);
            console.log('AR инициализирован');
        } catch (error) {
            console.error('Ошибка инициализации AR:', error);
        }
    }
    
    async toggleAR() {
        try {
            if (this.startARButton.text() === "Запустить AR") {
                await this.arService.startARSession(this.videoElement);
                this.startARButton.setText("Остановить AR");
            } else {
                this.arService.dispose();
                this.startARButton.setText("Запустить AR");
            }
        } catch (error) {
            console.error('Ошибка переключения AR:', error);
        }
    }
    
    async changeAvatar() {
        try {
            // Здесь должна быть логика выбора NFT аватара
            const nftMetadata = {
                model_url: 'path/to/3d/model.glb'
            };
            
            const success = await this.arService.loadAvatarModel(nftMetadata);
            if (success) {
                console.log('Аватар успешно загружен');
            } else {
                console.error('Ошибка загрузки аватара');
            }
        } catch (error) {
            console.error('Ошибка смены аватара:', error);
        }
    }
    
    takePhoto() {
        try {
            // Здесь должна быть логика создания скриншота AR сцены
            console.log('Фото сделано');
        } catch (error) {
            console.error('Ошибка создания фото:', error);
        }
    }
    
    // Очистка ресурсов при закрытии
    cleanup() {
        this.arService.dispose();
    }
}

module.exports = ARAvatar;
