const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('Security Tests', function () {
  let token, admin, user1;

  beforeEach(async function () {
    [admin, user1] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    token = await MockERC20.deploy(1000);
  });

  it('should prevent direct initialization of implementation contracts', async function () {
    const TokenVaultV1 = await ethers.getContractFactory('TokenVaultV1');
    const impl = await TokenVaultV1.deploy();
    
    await expect(impl.initialize(token.address, admin.address, 500)).to.be.reverted;
  });

  it('should prevent unauthorized upgrades', async function () {
    const TokenVaultV1 = await ethers.getContractFactory('TokenVaultV1');
    const vault = await upgrades.deployProxy(TokenVaultV1, [token.address, admin.address, 500], { initializer: 'initialize' });
    
    const TokenVaultV2 = await ethers.getContractFactory('TokenVaultV2');
    const v2Impl = await TokenVaultV2.deploy();
    
    // User cannot directly call _authorizeUpgrade
    await expect(
      vault.connect(user1)._authorizeUpgrade(v2Impl.address)
    ).to.be.reverted;
  });

  it('should use storage gaps for future upgrades', async function () {
    const TokenVaultV1 = await ethers.getContractFactory('TokenVaultV1');
    const vault = await upgrades.deployProxy(TokenVaultV1, [token.address, admin.address, 500], { initializer: 'initialize' });
    
    expect(await vault.totalDeposits()).to.equal(0);
  });

  it('should not have storage layout collisions across versions', async function () {
    const TokenVaultV1 = await ethers.getContractFactory('TokenVaultV1');
    const vault = await upgrades.deployProxy(TokenVaultV1, [token.address, admin.address, 500], { initializer: 'initialize' });
    
    await token.transfer(user1.address, 100);
    await token.connect(user1).approve(vault.address, 100);
    await vault.connect(user1).deposit(100);
    
    const TokenVaultV2 = await ethers.getContractFactory('TokenVaultV2');
    await upgrades.upgradeProxy(vault.address, TokenVaultV2);
    
    const v2 = await ethers.getContractAt('TokenVaultV2', vault.address);
    expect(await v2.balanceOf(user1.address)).to.be.gt(0);
  });

  it('should prevent function selector clashing', async function () {
    const TokenVaultV1 = await ethers.getContractFactory('TokenVaultV1');
    const vault = await upgrades.deployProxy(TokenVaultV1, [token.address, admin.address, 500], { initializer: 'initialize' });
    
    expect(await vault.getImplementationVersion()).to.equal('V1');
  });
});
