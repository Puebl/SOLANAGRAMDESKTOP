use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};

// Точка входа в программу
entrypoint!(process_instruction);

// Типы сообщений
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum MessageType {
    Direct,
    Group,
    Channel,
}

// Структура сообщения
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Message {
    pub message_type: MessageType,
    pub sender: Pubkey,
    pub content: String,
    pub timestamp: i64,
    pub reply_to: Option<Pubkey>,
}

// Структура группы
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Group {
    pub owner: Pubkey,
    pub name: String,
    pub description: String,
    pub members: Vec<Pubkey>,
    pub admins: Vec<Pubkey>,
    pub created_at: i64,
}

// Структура канала
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Channel {
    pub owner: Pubkey,
    pub name: String,
    pub description: String,
    pub subscribers: Vec<Pubkey>,
    pub admins: Vec<Pubkey>,
    pub created_at: i64,
}

// Инструкции программы
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum ProgramInstruction {
    // Сообщения
    SendMessage {
        content: String,
        message_type: MessageType,
        reply_to: Option<Pubkey>,
    },
    DeleteMessage {
        message_account: Pubkey,
    },
    EditMessage {
        message_account: Pubkey,
        new_content: String,
    },
    
    // Группы
    CreateGroup {
        name: String,
        description: String,
    },
    AddGroupMember {
        group: Pubkey,
        member: Pubkey,
    },
    RemoveGroupMember {
        group: Pubkey,
        member: Pubkey,
    },
    AddGroupAdmin {
        group: Pubkey,
        admin: Pubkey,
    },
    
    // Каналы
    CreateChannel {
        name: String,
        description: String,
    },
    AddChannelSubscriber {
        channel: Pubkey,
        subscriber: Pubkey,
    },
    RemoveChannelSubscriber {
        channel: Pubkey,
        subscriber: Pubkey,
    },
    AddChannelAdmin {
        channel: Pubkey,
        admin: Pubkey,
    },
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = ProgramInstruction::try_from_slice(instruction_data)?;
    
    match instruction {
        ProgramInstruction::SendMessage { content, message_type, reply_to } => {
            process_send_message(program_id, accounts, content, message_type, reply_to)
        }
        ProgramInstruction::CreateGroup { name, description } => {
            process_create_group(program_id, accounts, name, description)
        }
        ProgramInstruction::CreateChannel { name, description } => {
            process_create_channel(program_id, accounts, name, description)
        }
        // Другие инструкции...
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

fn process_send_message(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    content: String,
    message_type: MessageType,
    reply_to: Option<Pubkey>,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let sender = next_account_info(accounts_iter)?;
    let message_account = next_account_info(accounts_iter)?;
    
    if !sender.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    let message = Message {
        message_type,
        sender: *sender.key,
        content,
        timestamp: solana_program::clock::Clock::get()?.unix_timestamp,
        reply_to,
    };
    
    message.serialize(&mut &mut message_account.data.borrow_mut()[..])?;
    
    Ok(())
}

fn process_create_group(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    name: String,
    description: String,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let owner = next_account_info(accounts_iter)?;
    let group_account = next_account_info(accounts_iter)?;
    
    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    let group = Group {
        owner: *owner.key,
        name,
        description,
        members: vec![*owner.key],
        admins: vec![*owner.key],
        created_at: solana_program::clock::Clock::get()?.unix_timestamp,
    };
    
    group.serialize(&mut &mut group_account.data.borrow_mut()[..])?;
    
    Ok(())
}

fn process_create_channel(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    name: String,
    description: String,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let owner = next_account_info(accounts_iter)?;
    let channel_account = next_account_info(accounts_iter)?;
    
    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    let channel = Channel {
        owner: *owner.key,
        name,
        description,
        subscribers: vec![*owner.key],
        admins: vec![*owner.key],
        created_at: solana_program::clock::Clock::get()?.unix_timestamp,
    };
    
    channel.serialize(&mut &mut channel_account.data.borrow_mut()[..])?;
    
    Ok(())
} 