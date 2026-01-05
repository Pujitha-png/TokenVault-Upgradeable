const { ethers, upgrades } = require('hardhat');

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;
  if (!PROXY_ADDRESS) {
    throw new Error('Please provide PROXY_ADDRESS environment variable');
  }
  
  console.log('Upgrading TokenVault from V2 to V3...');
  console.log('Proxy address:', PROXY_ADDRESS);
  
  const TokenVaultV3 = await ethers.getContractFactory('TokenVaultV3');
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, TokenVaultV3);
  
  console.log('TokenVaultV3 upgraded successfully at:', upgraded.address);
  console.log('New implementation version:', await upgraded.getImplementationVersion());
  
  const implAddress = await upgrades.erc1967.getImplementationAddress(upgraded.address);
  console.log('New implementation address:', implAddress);
  
  return {
    proxyAddress: upgraded.address,
    implementationAddress: implAddress,
    version: await upgraded.getImplementationVersion()
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
