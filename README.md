# Solanagram

Solanagram is a decentralized messaging application built on the Solana blockchain. It combines the familiar interface of a messaging app with blockchain technology, augmented reality features, and secure communication.

## Features

- 💬 Decentralized messaging using Solana blockchain
- 🔒 End-to-end encryption for all messages
- 👥 Individual and group chats
- 📎 File sharing with IPFS integration
- 🎭 Custom sticker creation and sharing
- 📱 Voice and video calls
- 🎨 Augmented reality filters and effects
- 💰 Solana wallet integration

## Prerequisites

Before you begin, ensure you have met the following requirements:
- Node.js (v16 or higher)
- npm (v8 or higher)
- [Phantom Wallet](https://phantom.app/) browser extension
- OpenCV (for AR features)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/solanagram.git
cd solanagram
```

2. Install dependencies:
```bash
npm install
```

3. Create necessary directories:
```bash
mkdir -p src/data
```

4. Configure environment variables:
Create a `.env` file in the root directory and add the following:
```env
SOLANA_NETWORK=devnet  # or mainnet-beta for production
IPFS_PROJECT_ID=your_ipfs_project_id
IPFS_PROJECT_SECRET=your_ipfs_project_secret
```

## Development

To run the application in development mode:
```bash
npm run dev
```

To build the application:
```bash
npm run build
```

## Usage

1. Launch the application
2. Connect your Phantom wallet
3. Start chatting with other Solanagram users

### Messaging
- Send text messages, files, and stickers
- Create and join group chats
- Make voice and video calls

### AR Features
- Use AR filters during video calls
- Create custom AR effects
- Share AR stickers

### Stickers
- Create custom stickers
- Share stickers with other users
- Import sticker packs

## Architecture

Solanagram is built using the following technologies:
- Electron for cross-platform desktop application
- Solana Web3.js for blockchain integration
- IPFS for decentralized file storage
- OpenCV for AR features
- WebRTC for voice and video calls

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Security

Solanagram takes security seriously. All messages are end-to-end encrypted using TweetNaCl.js, and no private keys ever leave your device.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Acknowledgments

- Solana Foundation
- IPFS
- OpenCV
- Electron community
- All contributors and users
