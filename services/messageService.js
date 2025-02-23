const { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } = require('@solana/web3.js');
const { serialize } = require('borsh');
const bs58 = require('bs58');

class MessageService {
    constructor(walletService) {
        this.walletService = walletService;
        this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        this.programId = new PublicKey('YOUR_PROGRAM_ID'); // Замените на ID вашей программы
    }

    // Отправка личного сообщения
    async sendDirectMessage(recipientPublicKey, content, replyTo = null) {
        try {
            const sender = this.walletService.publicKey;
            const recipient = new PublicKey(recipientPublicKey);

            // Создаем PDA для сообщения
            const [messagePDA] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('message'),
                    sender.toBuffer(),
                    recipient.toBuffer(),
                    Buffer.from(new Date().getTime().toString())
                ],
                this.programId
            );

            // Создаем инструкцию
            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: sender, isSigner: true, isWritable: true },
                    { pubkey: recipient, isSigner: false, isWritable: true },
                    { pubkey: messagePDA, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId: this.programId,
                data: Buffer.from(serialize({
                    variant: 'SendMessage',
                    value: {
                        content,
                        messageType: { Direct: {} },
                        replyTo: replyTo ? new PublicKey(replyTo) : null
                    }
                }))
            });

            const transaction = new Transaction().add(instruction);
            const signature = await this.walletService.sendTransaction(transaction);

            return {
                signature,
                timestamp: Date.now(),
                sender,
                recipient,
                content,
                type: 'direct'
            };
        } catch (error) {
            console.error('Error sending direct message:', error);
            throw error;
        }
    }

    // Создание группы
    async createGroup(name, description) {
        try {
            const creator = this.walletService.publicKey;
            
            // Создаем PDA для группы
            const [groupPDA] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('group'),
                    creator.toBuffer(),
                    Buffer.from(name)
                ],
                this.programId
            );

            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: creator, isSigner: true, isWritable: true },
                    { pubkey: groupPDA, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId: this.programId,
                data: Buffer.from(serialize({
                    variant: 'CreateGroup',
                    value: { name, description }
                }))
            });

            const transaction = new Transaction().add(instruction);
            const signature = await this.walletService.sendTransaction(transaction);

            return {
                signature,
                groupId: groupPDA,
                name,
                description,
                owner: creator
            };
        } catch (error) {
            console.error('Error creating group:', error);
            throw error;
        }
    }

    // Отправка сообщения в группу
    async sendGroupMessage(groupId, content, replyTo = null) {
        try {
            const sender = this.walletService.publicKey;
            const groupPubKey = new PublicKey(groupId);

            // Создаем PDA для сообщения
            const [messagePDA] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('message'),
                    sender.toBuffer(),
                    groupPubKey.toBuffer(),
                    Buffer.from(new Date().getTime().toString())
                ],
                this.programId
            );

            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: sender, isSigner: true, isWritable: true },
                    { pubkey: groupPubKey, isSigner: false, isWritable: true },
                    { pubkey: messagePDA, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId: this.programId,
                data: Buffer.from(serialize({
                    variant: 'SendMessage',
                    value: {
                        content,
                        messageType: { Group: {} },
                        replyTo: replyTo ? new PublicKey(replyTo) : null
                    }
                }))
            });

            const transaction = new Transaction().add(instruction);
            const signature = await this.walletService.sendTransaction(transaction);

            return {
                signature,
                timestamp: Date.now(),
                sender,
                groupId: groupPubKey,
                content,
                type: 'group'
            };
        } catch (error) {
            console.error('Error sending group message:', error);
            throw error;
        }
    }

    // Создание канала
    async createChannel(name, description) {
        try {
            const creator = this.walletService.publicKey;
            
            // Создаем PDA для канала
            const [channelPDA] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('channel'),
                    creator.toBuffer(),
                    Buffer.from(name)
                ],
                this.programId
            );

            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: creator, isSigner: true, isWritable: true },
                    { pubkey: channelPDA, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId: this.programId,
                data: Buffer.from(serialize({
                    variant: 'CreateChannel',
                    value: { name, description }
                }))
            });

            const transaction = new Transaction().add(instruction);
            const signature = await this.walletService.sendTransaction(transaction);

            return {
                signature,
                channelId: channelPDA,
                name,
                description,
                owner: creator
            };
        } catch (error) {
            console.error('Error creating channel:', error);
            throw error;
        }
    }

    // Отправка сообщения в канал
    async sendChannelMessage(channelId, content) {
        try {
            const sender = this.walletService.publicKey;
            const channelPubKey = new PublicKey(channelId);

            // Создаем PDA для сообщения
            const [messagePDA] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('message'),
                    sender.toBuffer(),
                    channelPubKey.toBuffer(),
                    Buffer.from(new Date().getTime().toString())
                ],
                this.programId
            );

            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: sender, isSigner: true, isWritable: true },
                    { pubkey: channelPubKey, isSigner: false, isWritable: true },
                    { pubkey: messagePDA, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId: this.programId,
                data: Buffer.from(serialize({
                    variant: 'SendMessage',
                    value: {
                        content,
                        messageType: { Channel: {} },
                        replyTo: null
                    }
                }))
            });

            const transaction = new Transaction().add(instruction);
            const signature = await this.walletService.sendTransaction(transaction);

            return {
                signature,
                timestamp: Date.now(),
                sender,
                channelId: channelPubKey,
                content,
                type: 'channel'
            };
        } catch (error) {
            console.error('Error sending channel message:', error);
            throw error;
        }
    }

    // Получение сообщений
    async getMessages(accountType, publicKey) {
        try {
            const messages = await this.connection.getProgramAccounts(this.programId, {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: Buffer.from('message').toString('base64')
                        }
                    },
                    {
                        memcmp: {
                            offset: 33, // После дискриминатора и типа сообщения
                            bytes: publicKey.toBase58()
                        }
                    }
                ]
            });

            return messages.map(message => {
                const data = message.account.data;
                const messageType = data[32]; // 0 = Direct, 1 = Group, 2 = Channel
                
                return {
                    sender: new PublicKey(data.slice(33, 65)),
                    content: data.slice(97).toString(), // После sender и timestamp
                    timestamp: new Date(data.slice(65, 97).readBigInt64LE()),
                    type: ['direct', 'group', 'channel'][messageType]
                };
            });
        } catch (error) {
            console.error('Error getting messages:', error);
            throw error;
        }
    }

    // Получение групп пользователя
    async getUserGroups() {
        try {
            const groups = await this.connection.getProgramAccounts(this.programId, {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: Buffer.from('group').toString('base64')
                        }
                    },
                    {
                        memcmp: {
                            offset: 33,
                            bytes: this.walletService.publicKey.toBase58()
                        }
                    }
                ]
            });

            return groups.map(group => {
                const data = group.account.data;
                return {
                    id: group.pubkey,
                    name: data.slice(65, 97).toString().trim(),
                    description: data.slice(97, 161).toString().trim(),
                    owner: new PublicKey(data.slice(33, 65))
                };
            });
        } catch (error) {
            console.error('Error getting user groups:', error);
            throw error;
        }
    }

    // Получение каналов пользователя
    async getUserChannels() {
        try {
            const channels = await this.connection.getProgramAccounts(this.programId, {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: Buffer.from('channel').toString('base64')
                        }
                    },
                    {
                        memcmp: {
                            offset: 33,
                            bytes: this.walletService.publicKey.toBase58()
                        }
                    }
                ]
            });

            return channels.map(channel => {
                const data = channel.account.data;
                return {
                    id: channel.pubkey,
                    name: data.slice(65, 97).toString().trim(),
                    description: data.slice(97, 161).toString().trim(),
                    owner: new PublicKey(data.slice(33, 65))
                };
            });
        } catch (error) {
            console.error('Error getting user channels:', error);
            throw error;
        }
    }
}

module.exports = MessageService; 