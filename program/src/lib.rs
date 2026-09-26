//! cairin-proof: a public receipt for every IDRX payout Cairin settles.
//!
//! The money moves on Base (IDRX burn, then the issuer pays the bank).
//! This program keeps the paper trail on Solana: one account per Base burn,
//! keyed by the burn's transaction hash, so anyone can check that a payout
//! was recorded, how much it was, and whether it settled or failed.
//!
//! Accounts
//!   Config  PDA ["cfg"]                authority, attester, pause flag, counters
//!   Receipt PDA ["rcpt", base_tx_hash] one per burn, never reusable
//!
//! Instructions (first byte of data)
//!   0 Init        [payer s w, config w, system]            attester[32]
//!   1 Record      [attester s w, config w, receipt w, system] base_tx[32] dest_hash[32] amount_idr u64
//!   2 Settle      [attester s, config, receipt w]           status u8 (2 settled, 3 failed)
//!   3 SetPaused   [authority s, config w]                   paused u8
//!   4 SetRoles    [authority s, config w]                   authority[32] attester[32]
//!   5 Close       [authority s w, config, receipt w]        (final receipts only)
#![no_std]

use pinocchio::{
    cpi::{Seed, Signer},
    error::ProgramError,
    sysvars::{clock::Clock, Sysvar},
    AccountView, Address, ProgramResult,
};
use pinocchio_system::instructions::CreateAccount;

#[cfg(target_os = "solana")]
pinocchio::program_entrypoint!(process);
#[cfg(target_os = "solana")]
pinocchio::no_allocator!();
#[cfg(target_os = "solana")]
pinocchio::nostd_panic_handler!();

pub const CONFIG_SEED: &[u8] = b"cfg";
pub const RECEIPT_SEED: &[u8] = b"rcpt";

pub const TAG_CONFIG: u8 = 0xC1;
pub const TAG_RECEIPT: u8 = 0xC2;

pub const STATUS_RECORDED: u8 = 1;
pub const STATUS_SETTLED: u8 = 2;
pub const STATUS_FAILED: u8 = 3;

// Config: tag, bump, paused, pad[5], authority[32], attester[32], recorded u64, settled u64
pub const CONFIG_LEN: usize = 8 + 32 + 32 + 8 + 8;
// Receipt: tag, bump, status, pad[5], base_tx[32], dest_hash[32], amount u64, recorded_slot u64, final_slot u64
pub const RECEIPT_LEN: usize = 8 + 32 + 32 + 8 + 8 + 8;

#[repr(u32)]
pub enum CairinError {
    Paused = 0x100,
    NotAttester,
    NotAuthority,
    BadStatus,
    AlreadyFinal,
    NotFinal,
    BadAccount,
    ZeroAmount,
}

impl From<CairinError> for ProgramError {
    fn from(e: CairinError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

pub fn process(program_id: &Address, accounts: &mut [AccountView], data: &[u8]) -> ProgramResult {
    let (&ix, rest) = data.split_first().ok_or(ProgramError::InvalidInstructionData)?;
    match ix {
        0 => init(program_id, accounts, rest),
        1 => record(program_id, accounts, rest),
        2 => settle(program_id, accounts, rest),
        3 => set_paused(program_id, accounts, rest),
        4 => set_roles(program_id, accounts, rest),
        5 => close(program_id, accounts),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

#[inline(always)]
fn arr32(d: &[u8], at: usize) -> Result<[u8; 32], ProgramError> {
    d.get(at..at + 32)
        .and_then(|s| s.try_into().ok())
        .ok_or(ProgramError::InvalidInstructionData)
}

#[inline(always)]
fn u64_at(d: &[u8], at: usize) -> u64 {
    let mut b = [0u8; 8];
    b.copy_from_slice(&d[at..at + 8]);
    u64::from_le_bytes(b)
}

/// Loads the config account after checking owner, address, and tag.
fn check_config(program_id: &Address, cfg: &AccountView) -> ProgramResult {
    if !cfg.owned_by(program_id) || cfg.data_len() != CONFIG_LEN {
        return Err(CairinError::BadAccount.into());
    }
    let d = cfg.try_borrow()?;
    if d[0] != TAG_CONFIG {
        return Err(CairinError::BadAccount.into());
    }
    let expected = Address::create_program_address(&[CONFIG_SEED, &[d[1]]], program_id)
        .map_err(|_| ProgramError::InvalidSeeds)?;
    if cfg.address() != &expected {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok(())
}

fn check_receipt(program_id: &Address, r: &AccountView) -> ProgramResult {
    if !r.owned_by(program_id) || r.data_len() != RECEIPT_LEN {
        return Err(CairinError::BadAccount.into());
    }
    let d = r.try_borrow()?;
    if d[0] != TAG_RECEIPT {
        return Err(CairinError::BadAccount.into());
    }
    let expected = Address::create_program_address(&[RECEIPT_SEED, &d[8..40], &[d[1]]], program_id)
        .map_err(|_| ProgramError::InvalidSeeds)?;
    if r.address() != &expected {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok(())
}

fn require_role(cfg: &AccountView, who: &AccountView, offset: usize, err: CairinError) -> ProgramResult {
    if !who.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let d = cfg.try_borrow()?;
    if &d[offset..offset + 32] != who.address().as_ref() {
        return Err(err.into());
    }
    Ok(())
}

fn init(program_id: &Address, accounts: &mut [AccountView], d: &[u8]) -> ProgramResult {
    let [payer, cfg, _system, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !payer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let attester = arr32(d, 0)?;
    let (pda, bump) = Address::find_program_address(&[CONFIG_SEED], program_id);
    if cfg.address() != &pda {
        return Err(ProgramError::InvalidSeeds);
    }
    if !cfg.is_data_empty() || cfg.lamports() != 0 {
        return Err(ProgramError::AccountAlreadyInitialized);
    }
    let bump_b = [bump];
    let seeds = [Seed::from(CONFIG_SEED), Seed::from(&bump_b)];
    CreateAccount::with_minimum_balance(payer, cfg, CONFIG_LEN as u64, program_id, None)?
        .invoke_signed(&[Signer::from(&seeds[..])])?;

    let mut w = cfg.try_borrow_mut()?;
    w[0] = TAG_CONFIG;
    w[1] = bump;
    w[8..40].copy_from_slice(payer.address().as_ref());
    w[40..72].copy_from_slice(&attester);
    log("cairin:init");
    Ok(())
}

fn record(program_id: &Address, accounts: &mut [AccountView], d: &[u8]) -> ProgramResult {
    let [attester, cfg, receipt, _system, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if d.len() != 72 {
        return Err(ProgramError::InvalidInstructionData);
    }
    check_config(program_id, cfg)?;
    require_role(cfg, attester, 40, CairinError::NotAttester)?;
    if cfg.try_borrow()?[2] != 0 {
        return Err(CairinError::Paused.into());
    }
    let base_tx = arr32(d, 0)?;
    let amount = u64_at(d, 64);
    if amount == 0 {
        return Err(CairinError::ZeroAmount.into());
    }
    let (pda, bump) = Address::find_program_address(&[RECEIPT_SEED, &base_tx], program_id);
    if receipt.address() != &pda {
        return Err(ProgramError::InvalidSeeds);
    }
    // A burn hash can be recorded once. A second attempt fails in CreateAccount.
    let bump_b = [bump];
    let seeds = [Seed::from(RECEIPT_SEED), Seed::from(&base_tx), Seed::from(&bump_b)];
    CreateAccount::with_minimum_balance(attester, receipt, RECEIPT_LEN as u64, program_id, None)?
        .invoke_signed(&[Signer::from(&seeds[..])])?;

    let slot = Clock::get()?.slot;
    {
        let mut w = receipt.try_borrow_mut()?;
        w[0] = TAG_RECEIPT;
        w[1] = bump;
        w[2] = STATUS_RECORDED;
        w[8..72].copy_from_slice(&d[0..64]);
        w[72..80].copy_from_slice(&amount.to_le_bytes());
        w[80..88].copy_from_slice(&slot.to_le_bytes());
    }
    let mut c = cfg.try_borrow_mut()?;
    let n = u64_at(&c, 72).checked_add(1).ok_or(ProgramError::ArithmeticOverflow)?;
    c[72..80].copy_from_slice(&n.to_le_bytes());
    log("cairin:record");
    Ok(())
}

fn settle(program_id: &Address, accounts: &mut [AccountView], d: &[u8]) -> ProgramResult {
    let [attester, cfg, receipt, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_config(program_id, cfg)?;
    check_receipt(program_id, receipt)?;
    require_role(cfg, attester, 40, CairinError::NotAttester)?;
    let status = *d.first().ok_or(ProgramError::InvalidInstructionData)?;
    if status != STATUS_SETTLED && status != STATUS_FAILED {
        return Err(CairinError::BadStatus.into());
    }
    let slot = Clock::get()?.slot;
    let mut w = receipt.try_borrow_mut()?;
    if w[2] != STATUS_RECORDED {
        return Err(CairinError::AlreadyFinal.into());
    }
    w[2] = status;
    w[88..96].copy_from_slice(&slot.to_le_bytes());
    drop(w);
    if status == STATUS_SETTLED {
        let mut c = cfg.try_borrow_mut()?;
        let n = u64_at(&c, 80).checked_add(1).ok_or(ProgramError::ArithmeticOverflow)?;
        c[80..88].copy_from_slice(&n.to_le_bytes());
    }
    log("cairin:settle");
    Ok(())
}

fn set_paused(program_id: &Address, accounts: &mut [AccountView], d: &[u8]) -> ProgramResult {
    let [authority, cfg, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_config(program_id, cfg)?;
    require_role(cfg, authority, 8, CairinError::NotAuthority)?;
    let p = *d.first().ok_or(ProgramError::InvalidInstructionData)?;
    cfg.try_borrow_mut()?[2] = (p != 0) as u8;
    Ok(())
}

fn set_roles(program_id: &Address, accounts: &mut [AccountView], d: &[u8]) -> ProgramResult {
    let [authority, cfg, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_config(program_id, cfg)?;
    require_role(cfg, authority, 8, CairinError::NotAuthority)?;
    let new_auth = arr32(d, 0)?;
    let new_att = arr32(d, 32)?;
    let mut w = cfg.try_borrow_mut()?;
    w[8..40].copy_from_slice(&new_auth);
    w[40..72].copy_from_slice(&new_att);
    Ok(())
}

fn close(program_id: &Address, accounts: &mut [AccountView]) -> ProgramResult {
    let [authority, cfg, receipt, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_config(program_id, cfg)?;
    check_receipt(program_id, receipt)?;
    require_role(cfg, authority, 8, CairinError::NotAuthority)?;
    if receipt.try_borrow()?[2] == STATUS_RECORDED {
        return Err(CairinError::NotFinal.into());
    }
    let lamports = receipt.lamports();
    let total = authority
        .lamports()
        .checked_add(lamports)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    authority.set_lamports(total);
    receipt.set_lamports(0);
    receipt.close()
}

#[inline(always)]
fn log(msg: &str) {
    #[cfg(target_os = "solana")]
    unsafe {
        pinocchio::syscalls::sol_log_(msg.as_ptr(), msg.len() as u64)
    };
    #[cfg(not(target_os = "solana"))]
    let _ = msg;
}
