# TokenVault-Upgradeable

Production-grade upgradeable smart contract system implementing the TokenVault protocol using UUPS (Universal Upgradeable Proxy Standard) proxy pattern.

## Overview

This project demonstrates production-ready implementation of upgradeable smart contracts with three versions:
- **V1**: Basic deposit/withdrawal with fee mechanism
- **V2**: Adds yield generation and pause controls
- **V3**: Implements withdrawal delays and emergency mechanisms

## Project Structure

```
├── contracts/
│   ├── TokenVaultV1.sol
│   ├── TokenVaultV2.sol
│   ├── TokenVaultV3.sol
│   └── mocks/
│       └── MockERC20.sol
├── test/
│   ├── TokenVaultV1.test.js
│   ├── upgrade-v1-to-v2.test.js
│   ├── upgrade-v2-to-v3.test.js
│   └── security.test.js
├── scripts/
│   ├── deploy-v1.js
│   ├── upgrade-to-v2.js
│   └── upgrade-to-v3.js
├── hardhat.config.js
├── package.json
└── README.md
```

## Features

### V1
- Deposit and withdrawal functionality
- Configurable deposit fee
- Access control with admin role
- UUPS proxy pattern for upgradability

### V2 (Extends V1)
- Yield rate configuration
- Automatic yield accrual
- Pause/unpause mechanism for deposits
- Storage layout preservation

### V3 (Extends V2)
- Withdrawal request system with delay
- Emergency withdrawal functionality
- Configurable withdrawal delays
- Full backward compatibility

## Installation

```bash
npm install
```

## Testing

```bash
npm test
```

## Deployment

```bash
# Deploy V1
npm run deploy-v1

# Upgrade to V2
npm run upgrade-v2

# Upgrade to V3
npm run upgrade-v3
```

## Key Characteristics

- **Storage Safety**: Proper storage gap management across versions
- **Initialization Security**: Uses initializer modifier to prevent reinitialization
- **Access Control**: Role-based permissions with OpenZeppelin AccessControl
- **State Preservation**: User data preserved across upgrades
- **UUPS Standard**: Uses latest proxy standard for upgradeable contracts

## Testing Coverage

- TokenVaultV1 basic functionality tests
- V1→V2 upgrade state preservation tests
- V2→V3 upgrade state preservation tests
- Security tests for initialization, upgrades, and storage

## License

MIT
