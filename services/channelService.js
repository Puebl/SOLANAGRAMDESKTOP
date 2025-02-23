const { PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');
const { serialize } = require('borsh');
const IPFSService = require('./ipfs');

class ChannelService {
    constructor(walletService, messageService) {
        this.walletService = walletService;
        this.messageService = messageService;
        this.ipfsService = new IPFSService();
    }

    // Создание нового канала
    async createChannel(name, description, isPrivate = false) {
        try {
            const creator = this.walletService.publicKey;
            
            // Создаем PDA для канала
            const [channelPDA] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('channel'),
                    creator.toBuffer(),
                    Buffer.from(name)
                ],
                this.messageService.programId
            );

            // Создаем метаданные канала
            const channelMetadata = {
                name,
                description,
                isPrivate,
                avatar: null,
                createdAt: Date.now(),
                owner: creator.toBase58(),
                admins: [creator.toBase58()],
                subscribers: [creator.toBase58()]
            };

            // Загружаем метаданные в IPFS
            const metadataResult = await this.ipfsService.uploadBuffer(
                Buffer.from(JSON.stringify(channelMetadata)),
                `${name}_metadata.json`
            );

            const instruction = new Transaction().add(
                SystemProgram.createAccountWithSeed({
                    fromPubkey: creator,
                    newAccountPubkey: channelPDA,
                    basePubkey: creator,
                    seed: name,
                    lamports: await this.messageService.connection.getMinimumBalanceForRentExemption(1024),
                    space: 1024,
                    programId: this.messageService.programId,
                })
            );

            // Добавляем инструкцию создания канала
            instruction.add({
                keys: [
                    { pubkey: creator, isSigner: true, isWritable: true },
                    { pubkey: channelPDA, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId: this.messageService.programId,
                data: Buffer.from(serialize({
                    variant: 'CreateChannel',
                    value: { 
                        name,
                        description,
                        metadataCid: metadataResult.cid
                    }
                }))
            });

            const signature = await this.walletService.sendTransaction(instruction);

            return {
                channelId: channelPDA.toBase58(),
                name,
                description,
                isPrivate,
                metadataCid: metadataResult.cid,
                signature
            };
        } catch (error) {
            console.error('Error creating channel:', error);
            throw error;
        }
    }

    // Получение информации о канале
    async getChannelInfo(channelId) {
        try {
            const channelPubKey = new PublicKey(channelId);
            const accountInfo = await this.messageService.connection.getAccountInfo(channelPubKey);
            
            if (!accountInfo) {
                throw new Error('Channel not found');
            }

            const channelData = deserialize(accountInfo.data);
            const metadata = await this.ipfsService.getFile(channelData.metadataCid);
            
            return JSON.parse(metadata.toString());
        } catch (error) {
            console.error('Error getting channel info:', error);
            throw error;
        }
    }

    // Обновление информации о канале
    async updateChannelInfo(channelId, updates) {
        try {
            const channelInfo = await this.getChannelInfo(channelId);
            
            if (channelInfo.owner !== this.walletService.publicKey.toBase58()) {
                throw new Error('Only channel owner can update channel info');
            }

            const updatedMetadata = {
                ...channelInfo,
                ...updates,
                updatedAt: Date.now()
            };

            const metadataResult = await this.ipfsService.uploadBuffer(
                Buffer.from(JSON.stringify(updatedMetadata)),
                `${channelInfo.name}_metadata.json`
            );

            const channelPubKey = new PublicKey(channelId);
            const instruction = new Transaction().add({
                keys: [
                    { pubkey: this.walletService.publicKey, isSigner: true, isWritable: true },
                    { pubkey: channelPubKey, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId: this.messageService.programId,
                data: Buffer.from(serialize({
                    variant: 'UpdateChannel',
                    value: { metadataCid: metadataResult.cid }
                }))
            });

            const signature = await this.walletService.sendTransaction(instruction);

            return {
                channelId,
                metadataCid: metadataResult.cid,
                signature,
                ...updatedMetadata
            };
        } catch (error) {
            console.error('Error updating channel info:', error);
            throw error;
        }
    }

    // Добавление подписчика
    async addSubscriber(channelId, subscriberPublicKey) {
        try {
            const channelInfo = await this.getChannelInfo(channelId);
            
            if (!channelInfo.admins.includes(this.walletService.publicKey.toBase58())) {
                throw new Error('Only admins can add subscribers');
            }

            if (channelInfo.subscribers.includes(subscriberPublicKey)) {
                throw new Error('User is already a subscriber');
            }

            channelInfo.subscribers.push(subscriberPublicKey);
            return await this.updateChannelInfo(channelId, {
                subscribers: channelInfo.subscribers
            });
        } catch (error) {
            console.error('Error adding subscriber:', error);
            throw error;
        }
    }

    // Удаление подписчика
    async removeSubscriber(channelId, subscriberPublicKey) {
        try {
            const channelInfo = await this.getChannelInfo(channelId);
            
            if (!channelInfo.admins.includes(this.walletService.publicKey.toBase58())) {
                throw new Error('Only admins can remove subscribers');
            }

            channelInfo.subscribers = channelInfo.subscribers.filter(
                sub => sub !== subscriberPublicKey
            );

            return await this.updateChannelInfo(channelId, {
                subscribers: channelInfo.subscribers
            });
        } catch (error) {
            console.error('Error removing subscriber:', error);
            throw error;
        }
    }

    // Добавление администратора
    async addAdmin(channelId, adminPublicKey) {
        try {
            const channelInfo = await this.getChannelInfo(channelId);
            
            if (channelInfo.owner !== this.walletService.publicKey.toBase58()) {
                throw new Error('Only channel owner can add admins');
            }

            if (channelInfo.admins.includes(adminPublicKey)) {
                throw new Error('User is already an admin');
            }

            channelInfo.admins.push(adminPublicKey);
            return await this.updateChannelInfo(channelId, {
                admins: channelInfo.admins
            });
        } catch (error) {
            console.error('Error adding admin:', error);
            throw error;
        }
    }

    // Удаление администратора
    async removeAdmin(channelId, adminPublicKey) {
        try {
            const channelInfo = await this.getChannelInfo(channelId);
            
            if (channelInfo.owner !== this.walletService.publicKey.toBase58()) {
                throw new Error('Only channel owner can remove admins');
            }

            if (adminPublicKey === channelInfo.owner) {
                throw new Error('Cannot remove channel owner from admins');
            }

            channelInfo.admins = channelInfo.admins.filter(
                admin => admin !== adminPublicKey
            );

            return await this.updateChannelInfo(channelId, {
                admins: channelInfo.admins
            });
        } catch (error) {
            console.error('Error removing admin:', error);
            throw error;
        }
    }

    // Получение списка каналов пользователя
    async getUserChannels() {
        try {
            const channels = await this.messageService.connection.getProgramAccounts(
                this.messageService.programId,
                {
                    filters: [
                        {
                            memcmp: {
                                offset: 0,
                                bytes: Buffer.from('channel').toString('base64')
                            }
                        }
                    ]
                }
            );

            const channelInfos = await Promise.all(
                channels.map(async channel => {
                    try {
                        return await this.getChannelInfo(channel.pubkey.toBase58());
                    } catch (error) {
                        console.error(`Error getting channel info for ${channel.pubkey.toBase58()}:`, error);
                        return null;
                    }
                })
            );

            return channelInfos.filter(info => 
                info && (
                    info.owner === this.walletService.publicKey.toBase58() ||
                    info.admins.includes(this.walletService.publicKey.toBase58()) ||
                    info.subscribers.includes(this.walletService.publicKey.toBase58())
                )
            );
        } catch (error) {
            console.error('Error getting user channels:', error);
            throw error;
        }
    }

    // Загрузка аватара канала
    async uploadChannelAvatar(channelId, imageFile) {
        try {
            const result = await this.ipfsService.uploadFile(imageFile);
            return await this.updateChannelInfo(channelId, { avatar: result.cid });
        } catch (error) {
            console.error('Error uploading channel avatar:', error);
            throw error;
        }
    }

    // Получение сообщений канала
    async getChannelMessages(channelId, limit = 50) {
        try {
            const channelPubKey = new PublicKey(channelId);
            const messages = await this.messageService.getMessages('channel', channelPubKey);
            return messages.slice(-limit);
        } catch (error) {
            console.error('Error getting channel messages:', error);
            throw error;
        }
    }
}

module.exports = ChannelService; 