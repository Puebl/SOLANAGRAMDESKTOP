const { QWidget, QLabel, QPushButton, FlexLayout, QScrollArea, QPixmap } = require("@nodegui/nodegui");
const StickerGenerator = require("../services/stickerGenerator");

class StickerPanel extends QWidget {
    constructor() {
        super();
        this.setObjectName("stickerPanel");
        
        // Инициализация генератора стикеров
        this.stickerGenerator = new StickerGenerator(process.env.OPENAI_API_KEY);
        
        // Создание layout
        this.layout = new FlexLayout();
        this.setLayout(this.layout);
        
        // Создание области прокрутки для стикеров
        this.scrollArea = new QScrollArea();
        this.scrollArea.setObjectName("stickerScroll");
        
        // Контейнер для стикеров
        this.stickerContainer = new QWidget();
        this.stickerContainer.setObjectName("stickerContainer");
        this.stickerLayout = new FlexLayout();
        this.stickerContainer.setLayout(this.stickerLayout);
        
        // Кнопка генерации стикеров
        this.generateButton = new QPushButton();
        this.generateButton.setText("Создать стикер");
        this.generateButton.setObjectName("generateButton");
        
        // Добавление виджетов в layout
        this.layout.addWidget(this.scrollArea);
        this.layout.addWidget(this.generateButton);
        
        // Стилизация
        this.setStyleSheet(`
            #stickerPanel {
                background-color: #2B2B2B;
                padding: 10px;
                min-width: 200px;
            }
            
            #stickerScroll {
                background-color: #333333;
                border-radius: 5px;
                margin-bottom: 10px;
            }
            
            #stickerContainer {
                padding: 10px;
                background-color: transparent;
            }
            
            #generateButton {
                background-color: #9945FF;
                color: white;
                padding: 8px;
                border-radius: 5px;
                margin-top: 10px;
            }
            
            #generateButton:hover {
                background-color: #14F195;
            }
            
            .sticker {
                margin: 5px;
                border-radius: 5px;
                background-color: #404040;
            }
            
            .sticker:hover {
                background-color: #4a4a4a;
            }
        `);
        
        // Подключение обработчиков событий
        this.generateButton.addEventListener('clicked', () => {
            this.generateNewSticker();
        });
    }
    
    async generateNewSticker() {
        try {
            // Показываем индикатор загрузки
            this.generateButton.setEnabled(false);
            this.generateButton.setText("Генерация...");
            
            // Генерируем стикер
            const sticker = await this.stickerGenerator.generateSticker("Случайный эмоциональный стикер");
            
            // Создаем виджет стикера
            const stickerWidget = new QWidget();
            stickerWidget.setObjectName("sticker");
            const stickerLayout = new FlexLayout();
            stickerWidget.setLayout(stickerLayout);
            
            // Создаем изображение стикера
            const stickerImage = new QLabel();
            const pixmap = new QPixmap();
            pixmap.loadFromData(Buffer.from(sticker.preview.split(',')[1], 'base64'));
            stickerImage.setPixmap(pixmap);
            
            stickerLayout.addWidget(stickerImage);
            this.stickerLayout.addWidget(stickerWidget);
            
            // Добавляем обработчик клика
            stickerWidget.addEventListener('clicked', () => {
                this.onStickerSelected(sticker);
            });
            
        } catch (error) {
            console.error('Ошибка генерации стикера:', error);
        } finally {
            // Восстанавливаем кнопку
            this.generateButton.setEnabled(true);
            this.generateButton.setText("Создать стикер");
        }
    }
    
    async generateStickerPack(theme) {
        try {
            const stickers = await this.stickerGenerator.generateStickerPack(theme);
            stickers.forEach(sticker => {
                this.addStickerToPanel(sticker);
            });
        } catch (error) {
            console.error('Ошибка генерации набора стикеров:', error);
        }
    }
    
    addStickerToPanel(sticker) {
        const stickerWidget = new QWidget();
        stickerWidget.setObjectName("sticker");
        const stickerLayout = new FlexLayout();
        stickerWidget.setLayout(stickerLayout);
        
        const stickerImage = new QLabel();
        const pixmap = new QPixmap();
        pixmap.loadFromData(Buffer.from(sticker.preview.split(',')[1], 'base64'));
        stickerImage.setPixmap(pixmap);
        
        stickerLayout.addWidget(stickerImage);
        this.stickerLayout.addWidget(stickerWidget);
        
        stickerWidget.addEventListener('clicked', () => {
            this.onStickerSelected(sticker);
        });
    }
    
    // Метод для обработки выбора стикера (должен быть переопределен)
    onStickerSelected(sticker) {
        console.log('Выбран стикер:', sticker);
    }
}

module.exports = StickerPanel;
