const hre = require('hardhat');
const { ethers, upgrades } = require('hardhat');

async function main() {
  console.log('Deploying TokenVaultV1...');
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  
  // Deploy mock token
  const MockERC20 = await ethers.getContractFactory('MockERC20');
  const token = await MockERC20.deploy(1000000000); // 1 billion tokens
  await token.deployed();
  console.log('MockERC20 deployed to:', token.address);
  
  // Deploy TokenVaultV1 proxy
  const TokenVaultV1 = await ethers.getContractFactory('TokenVaultV1');
  const vault = await upgrades.deployProxy(TokenVaultV1, 
    [
      token.address,
      deployer.address,  // admin
      500                // 5% deposit fee
    ],
    { initializer: 'initialize' }
  );
  
  await vault.deployed();
  console.log('TokenVaultV1 proxy deployed to:', vault.address);
  
  // Get implementation address
  const implAddress = await upgrades.erc1967.getImplementationAddress(vault.address);
  console.log('Implementation deployed to:', implAddress);
  
  // Verify initialization
  console.log('\nVerifying initialization...');
  console.log('Deposit fee:', (await vault.getDepositFee()).toString());
  console.log('Implementation version:', await vault.getImplementationVersion());
  
  return {
    token: token.address,
    vault: vault.address,
    implementation: implAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
