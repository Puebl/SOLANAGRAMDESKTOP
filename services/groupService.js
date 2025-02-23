const { PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');
const { serialize } = require('borsh');
const IPFSService = require('./ipfs');

class GroupService {
    constructor(walletService, messageService) {
        this.walletService = walletService;
        this.messageService = messageService;
        this.ipfsService = new IPFSService();
    }

    // Создание новой группы
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
                this.messageService.programId
            );

            // Создаем метаданные группы
            const groupMetadata = {
                name,
                description,
                avatar: null,
                createdAt: Date.now(),
                owner: creator.toBase58(),
                admins: [creator.toBase58()],
                members: [creator.toBase58()]
            };

            // Загружаем метаданные в IPFS
            const metadataResult = await this.ipfsService.uploadBuffer(
                Buffer.from(JSON.stringify(groupMetadata)),
                `${name}_metadata.json`
            );

            const instruction = new Transaction().add(
                SystemProgram.createAccountWithSeed({
                    fromPubkey: creator,
                    newAccountPubkey: groupPDA,
                    basePubkey: creator,
                    seed: name,
                    lamports: await this.messageService.connection.getMinimumBalanceForRentExemption(1024),
                    space: 1024,
                    programId: this.messageService.programId,
                })
            );

            // Добавляем инструкцию создания группы
            instruction.add({
                keys: [
                    { pubkey: creator, isSigner: true, isWritable: true },
                    { pubkey: groupPDA, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId: this.messageService.programId,
                data: Buffer.from(serialize({
                    variant: 'CreateGroup',
                    value: { 
                        name,
                        description,
                        metadataCid: metadataResult.cid
                    }
                }))
            });

            const signature = await this.walletService.sendTransaction(instruction);

            return {
                groupId: groupPDA.toBase58(),
                name,
                description,
                metadataCid: metadataResult.cid,
                signature
            };
        } catch (error) {
            console.error('Error creating group:', error);
            throw error;
        }
    }

    // Получение информации о группе
    async getGroupInfo(groupId) {
        try {
            const groupPubKey = new PublicKey(groupId);
            const accountInfo = await this.messageService.connection.getAccountInfo(groupPubKey);
            
            if (!accountInfo) {
                throw new Error('Group not found');
            }

            const groupData = deserialize(accountInfo.data);
            const metadata = await this.ipfsService.getFile(groupData.metadataCid);
            
            return JSON.parse(metadata.toString());
        } catch (error) {
            console.error('Error getting group info:', error);
            throw error;
        }
    }

    // Обновление информации о группе
    async updateGroupInfo(groupId, updates) {
        try {
            const groupInfo = await this.getGroupInfo(groupId);
            
            if (groupInfo.owner !== this.walletService.publicKey.toBase58()) {
                throw new Error('Only group owner can update group info');
            }

            const updatedMetadata = {
                ...groupInfo,
                ...updates,
                updatedAt: Date.now()
            };

            const metadataResult = await this.ipfsService.uploadBuffer(
                Buffer.from(JSON.stringify(updatedMetadata)),
                `${groupInfo.name}_metadata.json`
            );

            const groupPubKey = new PublicKey(groupId);
            const instruction = new Transaction().add({
                keys: [
                    { pubkey: this.walletService.publicKey, isSigner: true, isWritable: true },
                    { pubkey: groupPubKey, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId: this.messageService.programId,
                data: Buffer.from(serialize({
                    variant: 'UpdateGroup',
                    value: { metadataCid: metadataResult.cid }
                }))
            });

            const signature = await this.walletService.sendTransaction(instruction);

            return {
                groupId,
                metadataCid: metadataResult.cid,
                signature,
                ...updatedMetadata
            };
        } catch (error) {
            console.error('Error updating group info:', error);
            throw error;
        }
    }

    // Добавление участника
    async addMember(groupId, memberPublicKey) {
        try {
            const groupInfo = await this.getGroupInfo(groupId);
            
            if (!groupInfo.admins.includes(this.walletService.publicKey.toBase58())) {
                throw new Error('Only admins can add members');
            }

            if (groupInfo.members.includes(memberPublicKey)) {
                throw new Error('User is already a member');
            }

            groupInfo.members.push(memberPublicKey);
            return await this.updateGroupInfo(groupId, {
                members: groupInfo.members
            });
        } catch (error) {
            console.error('Error adding member:', error);
            throw error;
        }
    }

    // Удаление участника
    async removeMember(groupId, memberPublicKey) {
        try {
            const groupInfo = await this.getGroupInfo(groupId);
            
            if (!groupInfo.admins.includes(this.walletService.publicKey.toBase58())) {
                throw new Error('Only admins can remove members');
            }

            if (memberPublicKey === groupInfo.owner) {
                throw new Error('Cannot remove group owner');
            }

            groupInfo.members = groupInfo.members.filter(
                member => member !== memberPublicKey
            );

            // Если участник был администратором, удаляем его и из списка администраторов
            if (groupInfo.admins.includes(memberPublicKey)) {
                groupInfo.admins = groupInfo.admins.filter(
                    admin => admin !== memberPublicKey
                );
            }

            return await this.updateGroupInfo(groupId, {
                members: groupInfo.members,
                admins: groupInfo.admins
            });
        } catch (error) {
            console.error('Error removing member:', error);
            throw error;
        }
    }

    // Добавление администратора
    async addAdmin(groupId, adminPublicKey) {
        try {
            const groupInfo = await this.getGroupInfo(groupId);
            
            if (groupInfo.owner !== this.walletService.publicKey.toBase58()) {
                throw new Error('Only group owner can add admins');
            }

            if (groupInfo.admins.includes(adminPublicKey)) {
                throw new Error('User is already an admin');
            }

            // Если пользователь не является участником группы, добавляем его
            if (!groupInfo.members.includes(adminPublicKey)) {
                groupInfo.members.push(adminPublicKey);
            }

            groupInfo.admins.push(adminPublicKey);
            return await this.updateGroupInfo(groupId, {
                members: groupInfo.members,
                admins: groupInfo.admins
            });
        } catch (error) {
            console.error('Error adding admin:', error);
            throw error;
        }
    }

    // Удаление администратора
    async removeAdmin(groupId, adminPublicKey) {
        try {
            const groupInfo = await this.getGroupInfo(groupId);
            
            if (groupInfo.owner !== this.walletService.publicKey.toBase58()) {
                throw new Error('Only group owner can remove admins');
            }

            if (adminPublicKey === groupInfo.owner) {
                throw new Error('Cannot remove group owner from admins');
            }

            groupInfo.admins = groupInfo.admins.filter(
                admin => admin !== adminPublicKey
            );

            return await this.updateGroupInfo(groupId, {
                admins: groupInfo.admins
            });
        } catch (error) {
            console.error('Error removing admin:', error);
            throw error;
        }
    }

    // Получение списка групп пользователя
    async getUserGroups() {
        try {
            const groups = await this.messageService.connection.getProgramAccounts(
                this.messageService.programId,
                {
                    filters: [
                        {
                            memcmp: {
                                offset: 0,
                                bytes: Buffer.from('group').toString('base64')
                            }
                        }
                    ]
                }
            );

            const groupInfos = await Promise.all(
                groups.map(async group => {
                    try {
                        return await this.getGroupInfo(group.pubkey.toBase58());
                    } catch (error) {
                        console.error(`Error getting group info for ${group.pubkey.toBase58()}:`, error);
                        return null;
                    }
                })
            );

            return groupInfos.filter(info => 
                info && (
                    info.owner === this.walletService.publicKey.toBase58() ||
                    info.admins.includes(this.walletService.publicKey.toBase58()) ||
                    info.members.includes(this.walletService.publicKey.toBase58())
                )
            );
        } catch (error) {
            console.error('Error getting user groups:', error);
            throw error;
        }
    }

    // Загрузка аватара группы
    async uploadGroupAvatar(groupId, imageFile) {
        try {
            const result = await this.ipfsService.uploadFile(imageFile);
            return await this.updateGroupInfo(groupId, { avatar: result.cid });
        } catch (error) {
            console.error('Error uploading group avatar:', error);
            throw error;
        }
    }

    // Получение сообщений группы
    async getGroupMessages(groupId, limit = 50) {
        try {
            const groupPubKey = new PublicKey(groupId);
            const messages = await this.messageService.getMessages('group', groupPubKey);
            return messages.slice(-limit);
        } catch (error) {
            console.error('Error getting group messages:', error);
            throw error;
        }
    }
}

module.exports = GroupService; 