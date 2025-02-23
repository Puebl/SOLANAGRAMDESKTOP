const { create } = require('ipfs-http-client');
const { Buffer } = require('buffer');
const { encrypt, decrypt } = require('tweetnacl');
const { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } = require('tweetnacl-util');
const fs = require('fs');
const path = require('path');

class IPFSService {
    constructor() {
        // Подключаемся к публичному IPFS узлу
        this.ipfs = create({
            host: 'ipfs.infura.io',
            port: 5001,
            protocol: 'https'
        });
    }

    // Загрузка зашифрованного сообщения в IPFS
    async uploadMessage(content, recipientPublicKey) {
        try {
            // Шифруем сообщение
            const messageData = decodeUTF8(content);
            const ephemeralKeyPair = encrypt.keyPair();
            const encryptedMessage = encrypt(
                messageData,
                recipientPublicKey,
                ephemeralKeyPair.secretKey
            );

            // Создаем буфер из зашифрованного сообщения
            const buffer = Buffer.from(encryptedMessage);

            // Загружаем в IPFS
            const result = await this.ipfs.add(buffer);
            
            return {
                hash: result.path,
                encryptionKey: ephemeralKeyPair.publicKey
            };
        } catch (error) {
            console.error('Error uploading to IPFS:', error);
            throw error;
        }
    }

    // Загрузка файла в IPFS
    async uploadFile(filePath) {
        try {
            const file = fs.readFileSync(filePath);
            const fileName = path.basename(filePath);
            
            // Создаем метаданные файла
            const fileData = {
                path: fileName,
                content: Buffer.from(file)
            };

            // Загружаем файл в IPFS
            const result = await this.ipfs.add(fileData);
            
            return {
                cid: result.cid.toString(),
                size: result.size,
                name: fileName
            };
        } catch (error) {
            console.error('Error uploading file to IPFS:', error);
            throw error;
        }
    }

    // Загрузка буфера данных в IPFS
    async uploadBuffer(buffer, fileName) {
        try {
            const fileData = {
                path: fileName,
                content: Buffer.from(buffer)
            };

            const result = await this.ipfs.add(fileData);
            
            return {
                cid: result.cid.toString(),
                size: result.size,
                name: fileName
            };
        } catch (error) {
            console.error('Error uploading buffer to IPFS:', error);
            throw error;
        }
    }

    // Получение сообщения из IPFS
    async getMessage(hash, secretKey) {
        try {
            const chunks = [];
            for await (const chunk of this.ipfs.cat(hash)) {
                chunks.push(chunk);
            }
            
            const encryptedData = Buffer.concat(chunks);
            const decryptedMessage = decrypt(encryptedData, secretKey);
            
            return encodeUTF8(decryptedMessage);
        } catch (error) {
            console.error('Error getting message from IPFS:', error);
            throw error;
        }
    }

    // Получение файла из IPFS
    async getFile(cid) {
        try {
            const chunks = [];
            for await (const chunk of this.ipfs.cat(cid)) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        } catch (error) {
            console.error('Error getting file from IPFS:', error);
            throw error;
        }
    }

    // Получение URL для просмотра файла
    getViewUrl(cid) {
        return `https://ipfs.io/ipfs/${cid}`;
    }

    // Сохранение файла локально
    async saveFile(cid, savePath) {
        try {
            const fileData = await this.getFile(cid);
            fs.writeFileSync(savePath, fileData);
            return savePath;
        } catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    }

    // Проверка доступности файла
    async isAvailable(cid) {
        try {
            const stats = await this.ipfs.files.stat(`/ipfs/${cid}`);
            return stats.size > 0;
        } catch (error) {
            return false;
        }
    }
}

module.exports = IPFSService;
