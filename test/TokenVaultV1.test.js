const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('TokenVaultV1', function () {
  let vault, token, admin, user1, user2;

  beforeEach(async function () {
    [admin, user1, user2] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    token = await MockERC20.deploy(1000);
    
    const TokenVaultV1 = await ethers.getContractFactory('TokenVaultV1');
    vault = await upgrades.deployProxy(TokenVaultV1, [token.address, admin.address, 500], { initializer: 'initialize' });
    
    await token.transfer(user1.address, 100);
    await token.transfer(user2.address, 100);
  });

  it('should initialize with correct parameters', async function () {
    expect(await vault.getDepositFee()).to.equal(500);
    expect(await vault.getImplementationVersion()).to.equal('V1');
  });

  it('should allow deposits and update balances', async function () {
    await token.connect(user1).approve(vault.address, 100);
    await vault.connect(user1).deposit(100);
    expect(await vault.balanceOf(user1.address)).to.equal(95);
  });

  it('should deduct deposit fee correctly', async function () {
    await token.connect(user1).approve(vault.address, 100);
    await vault.connect(user1).deposit(100);
    const balance = await vault.balanceOf(user1.address);
    expect(balance).to.equal(95);
  });

  it('should allow withdrawals and update balances', async function () {
    await token.connect(user1).approve(vault.address, 100);
    await vault.connect(user1).deposit(100);
    const balance = await vault.balanceOf(user1.address);
    await vault.connect(user1).withdraw(balance);
    expect(await vault.balanceOf(user1.address)).to.equal(0);
  });

  it('should prevent withdrawal of more than balance', async function () {
    await expect(vault.connect(user1).withdraw(100)).to.be.revertedWith('Insufficient balance');
  });

  it('should prevent reinitialization', async function () {
    await expect(vault.initialize(token.address, admin.address, 500)).to.be.reverted;
  });
});
