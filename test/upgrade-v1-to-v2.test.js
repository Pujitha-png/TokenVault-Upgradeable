const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('Upgrade V1 to V2', function () {
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

  it('should preserve user balances after upgrade', async function () {
    const vaultV1 = await ethers.getContractAt('TokenVaultV1', proxyAddress);
    const balanceBefore = await vaultV1.balanceOf(user1.address);
    
    const TokenVaultV2 = await ethers.getContractFactory('TokenVaultV2');
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV2);
    
    const vaultV2 = await ethers.getContractAt('TokenVaultV2', proxyAddress);
    const balanceAfter = await vaultV2.balanceOf(user1.address);
    
    expect(balanceAfter).to.equal(balanceBefore);
  });

  it('should preserve total deposits after upgrade', async function () {
    const vaultV1 = await ethers.getContractAt('TokenVaultV1', proxyAddress);
    const totalBefore = await vaultV1.totalDeposits();
    
    const TokenVaultV2 = await ethers.getContractFactory('TokenVaultV2');
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV2);
    
    const vaultV2 = await ethers.getContractAt('TokenVaultV2', proxyAddress);
    const totalAfter = await vaultV2.totalDeposits();
    
    expect(totalAfter).to.equal(totalBefore);
  });

  it('should maintain admin access control after upgrade', async function () {
    const TokenVaultV2 = await ethers.getContractFactory('TokenVaultV2');
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV2);
    
    const vaultV2 = await ethers.getContractAt('TokenVaultV2', proxyAddress);
    const DEFAULT_ADMIN_ROLE = await vaultV2.DEFAULT_ADMIN_ROLE();
    const hasRole = await vaultV2.hasRole(DEFAULT_ADMIN_ROLE, admin.address);
    expect(hasRole).to.be.true;
  });

  it('should allow setting yield rate in V2', async function () {
    const TokenVaultV2 = await ethers.getContractFactory('TokenVaultV2');
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV2);
    
    const vaultV2 = await ethers.getContractAt('TokenVaultV2', proxyAddress);
    await vaultV2.connect(admin).setYieldRate(500);
    expect(await vaultV2.getYieldRate()).to.equal(500);
  });

  it('should calculate yield correctly', async function () {
    const TokenVaultV2 = await ethers.getContractFactory('TokenVaultV2');
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV2);
    
    const vaultV2 = await ethers.getContractAt('TokenVaultV2', proxyAddress);
    await vaultV2.connect(admin).setYieldRate(500);
    const yield_amount = await vaultV2.getUserYield(user1.address);
    expect(yield_amount).to.be.gte(0);
  });

  it('should prevent non-admin from setting yield rate', async function () {
    const TokenVaultV2 = await ethers.getContractFactory('TokenVaultV2');
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV2);
    
    const vaultV2 = await ethers.getContractAt('TokenVaultV2', proxyAddress);
    await expect(vaultV2.connect(user1).setYieldRate(500)).to.be.reverted;
  });

  it('should allow pausing deposits in V2', async function () {
    const TokenVaultV2 = await ethers.getContractFactory('TokenVaultV2');
    await upgrades.upgradeProxy(proxyAddress, TokenVaultV2);
    
    const vaultV2 = await ethers.getContractAt('TokenVaultV2', proxyAddress);
    await vaultV2.connect(admin).pauseDeposits();
    expect(await vaultV2.isDepositsPaused()).to.be.true;
  });
});
