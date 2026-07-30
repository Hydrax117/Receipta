#![allow(unused)]

use soroban_sdk::{contracttype, contracterror, Address, BytesN};

/// On-chain receipt record stored in persistent storage.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Receipt {
    pub receipt_id: BytesN<32>,
    pub sender: Address,
    pub receiver: Address,
    /// Amount in stroops (1 XLM = 10_000_000 stroops)
    pub amount: i128,
    /// Stellar asset contract address
    pub token: Address,
    /// Ledger timestamp at creation
    pub timestamp: u64,
    pub status: ReceiptStatus,
    /// Platform fee collected at confirmation
    pub fee_amount: i128,
}

/// Lifecycle states of a receipt.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ReceiptStatus {
    Pending,
    Confirmed,
    Failed,
}

/// Platform fee configuration stored in instance storage.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct FeeConfig {
    pub fee_address: Address,
    /// Fee in basis points, e.g. 75 = 0.75%
    pub fee_bps: u32,
    /// Minimum fee in stroops
    pub min_fee: i128,
}

/// Storage keys for persistent and instance storage.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DataKey {
    /// Maps receipt_id → Receipt
    Receipt(BytesN<32>),
    /// Maps receiver address → Vec<BytesN<32>> (list of receipt IDs)
    ReceiverIndex(Address),
    /// Singleton fee configuration
    FeeConfig,
}

/// Contract error codes surfaced as Soroban contract errors.
#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
pub enum ReceiptError {
    InvalidAmount = 1,
    InvalidAddress = 2,
    SelfPayment = 3,
    DuplicateReceiptId = 4,
    ReceiptNotFound = 5,
    InvalidStatusTransition = 6,
    Unauthorized = 7,
    FeeTransferFailed = 8,
}
