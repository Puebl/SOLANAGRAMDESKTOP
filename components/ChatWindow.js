const { QWidget, FlexLayout, QLabel, QLineEdit, QPushButton, QScrollArea } = require("@nodegui/nodegui");

class ChatWindow extends QWidget {
    constructor() {
        super();
        this.setObjectName("chatWindow");
        
        // Создание основного layout
        this.layout = new FlexLayout();
        this.setLayout(this.layout);
        
        // Создание области сообщений
        this.messageContainer = new QWidget();
        this.messageContainer.setObjectName("messageContainer");
        this.messageLayout = new FlexLayout();
        this.messageContainer.setLayout(this.messageLayout);
        
        this.messageArea = new QScrollArea();
        this.messageArea.setObjectName("messageArea");
        this.messageArea.setWidget(this.messageContainer);
        
        // Создание нижней панели
        this.bottomPanel = new QWidget();
        this.bottomPanel.setObjectName("bottomPanel");
        this.bottomLayout = new FlexLayout();
        this.bottomPanel.setLayout(this.bottomLayout);
        
        // Создание поля ввода
        this.messageInput = new QLineEdit();
        this.messageInput.setObjectName("messageInput");
        this.messageInput.setPlaceholderText("Введите сообщение...");
        
        // Создание кнопки отправки
        this.sendButton = new QPushButton();
        this.sendButton.setText("Отправить");
        this.sendButton.setObjectName("sendButton");
        
        // Добавление виджетов в нижнюю панель
        this.bottomLayout.addWidget(this.messageInput);
        this.bottomLayout.addWidget(this.sendButton);
        
        // Добавление виджетов в основной layout
        this.layout.addWidget(this.messageArea);
        this.layout.addWidget(this.bottomPanel);
        
        // Стилизация
        this.setStyleSheet(`
            #chatWindow {
                flex: 1;
                background-color: #1C1C1C;
                padding: 16px;
            }
            
            #messageArea {
                flex: 1;
                background-color: #2C2C2C;
                border-radius: 8px;
                margin-bottom: 16px;
                min-height: 400px;
            }
            
            #messageContainer {
                background-color: transparent;
                padding: 16px;
            }
            
            #bottomPanel {
                min-height: 50px;
                background-color: #2C2C2C;
                border-radius: 8px;
                padding: 8px;
            }
            
            #messageInput {
                flex: 1;
                height: 36px;
                background-color: #3C3C3C;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 0 12px;
                margin-right: 8px;
                font-size: 14px;
            }
            
            #sendButton {
                background-color: #9945FF;
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
            }
            
            #sendButton:hover {
                background-color: #14F195;
            }
            
            .message {
                background-color: #3C3C3C;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 8px;
                max-width: 80%;
            }
            
            .message-sender {
                color: #9945FF;
                font-size: 12px;
                margin-bottom: 4px;
            }
            
            .message-content {
                color: white;
                font-size: 14px;
            }
            
            .message-time {
                color: #666666;
                font-size: 10px;
                margin-top: 4px;
                text-align: right;
            }
        `);
        
        // Подключение обработчиков событий
        this.sendButton.addEventListener('clicked', () => {
            this.sendMessage();
        });
        
        this.messageInput.addEventListener('returnPressed', () => {
            this.sendMessage();
        });
    }
    
    sendMessage() {
        const content = this.messageInput.text();
        if (content.trim()) {
            this.addMessage('You', content);
            this.messageInput.clear();
        }
    }
    
    addMessage(sender, content) {
        const messageWidget = new QWidget();
        messageWidget.setObjectName("message");
        const messageLayout = new FlexLayout();
        messageWidget.setLayout(messageLayout);
        
        const senderLabel = new QLabel();
        senderLabel.setObjectName("message-sender");
        senderLabel.setText(sender);
        
        const contentLabel = new QLabel();
        contentLabel.setObjectName("message-content");
        contentLabel.setText(content);
        
        const timeLabel = new QLabel();
        timeLabel.setObjectName("message-time");
        timeLabel.setText(new Date().toLocaleTimeString());
        
        messageLayout.addWidget(senderLabel);
        messageLayout.addWidget(contentLabel);
        messageLayout.addWidget(timeLabel);
        
        this.messageLayout.addWidget(messageWidget);
        
        // Прокрутка к последнему сообщению
        this.messageArea.verticalScrollBar().setValue(
            this.messageArea.verticalScrollBar().maximum()
        );
    }
}

module.exports = ChatWindow;
