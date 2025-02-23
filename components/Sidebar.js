const { QWidget, FlexLayout, QPushButton, QLabel, QScrollArea } = require("@nodegui/nodegui");

class Sidebar extends QWidget {
  constructor() {
    super();
    this.setObjectName("sidebar");
    
    // Create layout
    this.layout = new FlexLayout();
    this.setLayout(this.layout);
    
    // Create wallet section
    this.walletSection = new QWidget();
    this.walletSection.setObjectName("walletSection");
    const walletLayout = new FlexLayout();
    this.walletSection.setLayout(walletLayout);
    
    this.connectButton = new QPushButton();
    this.connectButton.setText("Connect Wallet");
    this.connectButton.setObjectName("connectButton");
    walletLayout.addWidget(this.connectButton);
    
    // Create chat list
    this.chatList = new QScrollArea();
    this.chatList.setObjectName("chatList");
    
    // Add new chat button
    this.newChatButton = new QPushButton();
    this.newChatButton.setText("New Chat");
    this.newChatButton.setObjectName("newChatButton");
    
    // Add widgets to layout
    this.layout.addWidget(this.walletSection);
    this.layout.addWidget(this.chatList);
    this.layout.addWidget(this.newChatButton);
    
    // Style the sidebar
    this.setStyleSheet(`
      #sidebar {
        background-color: #2B2B2B;
        min-width: 300px;
        max-width: 300px;
        padding: 10px;
      }
      #walletSection {
        margin-bottom: 20px;
      }
      #connectButton, #newChatButton {
        height: 40px;
        background-color: #0088cc;
        color: white;
        border-radius: 5px;
        margin: 5px;
      }
      #chatList {
        flex: 1;
        background-color: #333333;
        border-radius: 5px;
        margin: 5px;
      }
    `);
  }

  addChat(address, name) {
    const chatWidget = new QWidget();
    chatWidget.setObjectName("chatItem");
    const chatLayout = new FlexLayout();
    chatWidget.setLayout(chatLayout);

    const nameLabel = new QLabel();
    nameLabel.setText(name || address.slice(0, 8) + "...");
    nameLabel.setStyleSheet('color: white;');

    chatLayout.addWidget(nameLabel);
    chatWidget.setStyleSheet(`
      #chatItem {
        padding: 10px;
        margin: 5px;
        background-color: #404040;
        border-radius: 5px;
      }
      #chatItem:hover {
        background-color: #4a4a4a;
      }
    `);

    // Add the chat widget to chat list
    this.chatList.widget().layout().addWidget(chatWidget);
  }
}

module.exports = Sidebar;
