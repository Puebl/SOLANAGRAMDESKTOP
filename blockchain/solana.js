const { Connection, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');
const { Program } = require('@project-serum/anchor');
const { encrypt, decrypt, box, randomBytes } = require('tweetnacl');
const { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } = require('tweetnacl-util');

class SolanaClient {
    constructor(connection, programId) {
        this.connection = connection;
        this.programId = new PublicKey(programId);
    }

    async initializeProfile(wallet, username, displayName) {
        const program = await this.getProgram(wallet);
        const [profilePda] = await PublicKey.findProgramAddress(
            [Buffer.from('profile'), wallet.publicKey.toBuffer()],
            this.programId
        );

        await program.methods
            .initializeProfile(username, displayName)
            .accounts({
                profile: profilePda,
                user: wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    async sendMessage(wallet, recipientPubkey, content) {
        const program = await this.getProgram(wallet);
        const message = encrypt(
            decodeUTF8(content),
            recipientPubkey.toBuffer()
        );

        const [senderProfilePda] = await PublicKey.findProgramAddress(
            [Buffer.from('profile'), wallet.publicKey.toBuffer()],
            this.programId
        );

        await program.methods
            .sendMessage(message, recipientPubkey)
            .accounts({
                message: wallet.publicKey,
                sender: wallet.publicKey,
                senderProfile: senderProfilePda,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    async createGroup(wallet, name, description) {
        const program = await this.getProgram(wallet);
        
        await program.methods
            .createGroup(name, description)
            .accounts({
                group: wallet.publicKey,
                admin: wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    async addMember(wallet, groupPubkey, memberPubkey) {
        const program = await this.getProgram(wallet);
        
        await program.methods
            .addMember()
            .accounts({
                group: groupPubkey,
                member: memberPubkey,
            })
            .rpc();
    }

    async getMessages(wallet) {
        const program = await this.getProgram(wallet);
        const messages = await program.account.message.all([
            {
                memcmp: {
                    offset: 8,
                    bytes: wallet.publicKey.toBase58(),
                },
            },
        ]);

        return messages.map(msg => ({
            ...msg.account,
            content: decodeUTF8(decrypt(msg.account.content, wallet.secretKey))
        }));
    }

    async getProfile(publicKey) {
        const program = await this.getProgram();
        const [profilePda] = await PublicKey.findProgramAddress(
            [Buffer.from('profile'), publicKey.toBuffer()],
            this.programId
        );

        return await program.account.userProfile.fetch(profilePda);
    }

    async getProgram(wallet) {
        // Здесь должна быть логика получения программы через Anchor
        // Это заглушка, так как нам нужен IDL и провайдер
        return null;
    }
}

module.exports = SolanaClient;
