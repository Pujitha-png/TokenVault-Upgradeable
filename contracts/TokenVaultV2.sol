// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenVaultV2 is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IERC20 public token;
    uint256 public depositFee;
    uint256 public totalDeposits;
    mapping(address => uint256) public balances;

    // V2 additions
    uint256 public yieldRate;
    mapping(address => uint256) public lastYieldClaim;
    bool public depositsPaused;

    // Storage gap adjusted for new variables
    uint256[47] private __gap;

    event Deposit(address indexed user, uint256 amount, uint256 fee);
    event Withdraw(address indexed user, uint256 amount);
    event YieldClaimed(address indexed user, uint256 yield);
    event YieldRateChanged(uint256 newRate);

    function initialize(
        address _token,
        address _admin,
        uint256 _depositFee
    ) external initializer {
        require(_token != address(0), "Invalid token");
        require(_admin != address(0), "Invalid admin");
        require(_depositFee <= 10000, "Fee too high");

        token = IERC20(_token);
        depositFee = _depositFee;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    function deposit(uint256 amount) external {
        require(!depositsPaused, "Deposits paused");
        require(amount > 0, "Amount must be > 0");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        uint256 fee = (amount * depositFee) / 10000;
        uint256 creditAmount = amount - fee;

        balances[msg.sender] += creditAmount;
        totalDeposits += creditAmount;
        lastYieldClaim[msg.sender] = block.timestamp;

        emit Deposit(msg.sender, creditAmount, fee);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        totalDeposits -= amount;

        require(token.transfer(msg.sender, amount), "Transfer failed");
        emit Withdraw(msg.sender, amount);
    }

    function setYieldRate(uint256 _yieldRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        yieldRate = _yieldRate;
        emit YieldRateChanged(_yieldRate);
    }

    function getYieldRate() external view returns (uint256) {
        return yieldRate;
    }

    function getUserYield(address user) external view returns (uint256) {
        if (balances[user] == 0) return 0;
        uint256 timeElapsed = block.timestamp - lastYieldClaim[user];
        return (balances[user] * yieldRate * timeElapsed) / (365 days * 10000);
    }

    function claimYield() external returns (uint256) {
        uint256 yield = (balances[msg.sender] * yieldRate * (block.timestamp - lastYieldClaim[msg.sender])) / (365 days * 10000);
        require(yield > 0, "No yield to claim");

        lastYieldClaim[msg.sender] = block.timestamp;
        balances[msg.sender] += yield;
        totalDeposits += yield;

        emit YieldClaimed(msg.sender, yield);
        return yield;
    }

    function pauseDeposits() external onlyRole(PAUSER_ROLE) {
        depositsPaused = true;
    }

    function unpauseDeposits() external onlyRole(PAUSER_ROLE) {
        depositsPaused = false;
    }

    function isDepositsPaused() external view returns (bool) {
        return depositsPaused;
    }

    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }

    function getDepositFee() external view returns (uint256) {
        return depositFee;
    }

    function getImplementationVersion() external pure returns (string memory) {
        return "V2";
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
