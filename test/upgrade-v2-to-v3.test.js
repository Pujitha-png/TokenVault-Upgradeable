const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('Upgrade V2 to V3', function () {
  let proxyAddress, token, admin, user1;

  beforeEach(async function () {
    [admin, user1] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    token = await MockERC20.deploy(1000);
    
    const TokenVaultV1 = await ethers.getContractFactory('TokenVaultV1');
    const vault = await upgrades.deployProxy(TokenVaultV1, [token.address, admin.address, 500], { initializer: 'initialize' });
    proxyAddress = vault.address;
    
    await token.transfer(user1.address, 100);
    await token.connect(user1).approve(proxyAddress, 100);
    await vault.connect(user1).deposit(100);
  });

  it('should preserve all V2 state after upgrade', async function () {
    const vaultV2 = await ethers.getContractAt('TokenVaultV2', proxyAddress);
    await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory('TokenVaultV2'));
    await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory('TokenVaultV3'));
    
    const vaultV3 = await ethers.getContractAt('TokenVaultV3', proxyAddress);
    expect(await vaultV3.balanceOf(user1.address)).to.be.gt(0);
  });

  it('should allow setting withdrawal delay', async function () {
    const TokenVaultV3 = await ethers.getContractFactory('TokenVaultV3');
    await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory('TokenVaultV2'));
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV3);
    
    const vaultV3 = await ethers.getContractAt('TokenVaultV3', proxyAddress);
    await vaultV3.connect(admin).setWithdrawalDelay(86400);
    expect(await vaultV3.getWithdrawalDelay()).to.equal(86400);
  });

  it('should handle withdrawal requests correctly', async function () {
    const TokenVaultV3 = await ethers.getContractFactory('TokenVaultV3');
    await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory('TokenVaultV2'));
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV3);
    
    const vaultV3 = await ethers.getContractAt('TokenVaultV3', proxyAddress);
    const balance = await vaultV3.balanceOf(user1.address);
    await vaultV3.connect(user1).requestWithdrawal(balance);
    
    const req = await vaultV3.getWithdrawalRequest(user1.address);
    expect(req.amount).to.equal(balance);
  });

  it('should enforce withdrawal delay', async function () {
    const TokenVaultV3 = await ethers.getContractFactory('TokenVaultV3');
    await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory('TokenVaultV2'));
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV3);
    
    const vaultV3 = await ethers.getContractAt('TokenVaultV3', proxyAddress);
    await vaultV3.connect(admin).setWithdrawalDelay(86400);
    
    const balance = await vaultV3.balanceOf(user1.address);
    await vaultV3.connect(user1).requestWithdrawal(balance);
    
    await expect(vaultV3.connect(user1).executeWithdrawal()).to.be.revertedWith('Delay not met');
  });

  it('should allow emergency withdrawals', async function () {
    const TokenVaultV3 = await ethers.getContractFactory('TokenVaultV3');
    await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory('TokenVaultV2'));
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV3);
    
    const vaultV3 = await ethers.getContractAt('TokenVaultV3', proxyAddress);
    const balance = await vaultV3.balanceOf(user1.address);
    await expect(vaultV3.connect(user1).emergencyWithdraw()).to.emit(vaultV3, 'EmergencyWithdrawn');
  });

  it('should prevent premature withdrawal execution', async function () {
    const TokenVaultV3 = await ethers.getContractFactory('TokenVaultV3');
    await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory('TokenVaultV2'));
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV3);
    
    const vaultV3 = await ethers.getContractAt('TokenVaultV3', proxyAddress);
    const balance = await vaultV3.balanceOf(user1.address);
    await vaultV3.connect(user1).requestWithdrawal(balance);
    
    await expect(vaultV3.connect(user1).executeWithdrawal()).to.be.reverted;
  });
});
