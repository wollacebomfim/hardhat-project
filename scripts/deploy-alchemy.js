const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Iniciando deploy do SimpleDEX...");
  
  // Obter informações da rede
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Rede: ${network.name} (Chain ID: ${network.chainId})`);
  
  // Obter a conta do deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  // Verificar saldo
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Saldo: ${ethers.formatEther(balance)} ETH`);
  
  if (balance === 0n) {
    throw new Error("❌ Saldo insuficiente para deploy!");
  }
  
  console.log("\n🔨 Deployando tokens mock...");
  
  // Deploy dos tokens mock (apenas para testnet)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const initialSupply = ethers.parseEther("1000000"); // 1 milhão de tokens
  
  console.log("📦 Deployando Token A...");
  const tokenA = await MockERC20.deploy("Token A", "TKA", initialSupply);
  await tokenA.waitForDeployment();
  console.log(`✅ Token A deployado em: ${await tokenA.getAddress()}`);
  
  console.log("📦 Deployando Token B...");
  const tokenB = await MockERC20.deploy("Token B", "TKB", initialSupply);
  await tokenB.waitForDeployment();
  console.log(`✅ Token B deployado em: ${await tokenB.getAddress()}`);
  
  console.log("\n🏭 Deployando SimpleDEX...");
  
  // Deploy do SimpleDEX
  const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
  const simpleDEX = await SimpleDEX.deploy(
    await tokenA.getAddress(),
    await tokenB.getAddress()
  );
  await simpleDEX.waitForDeployment();
  
  const dexAddress = await simpleDEX.getAddress();
  console.log(`✅ SimpleDEX deployado em: ${dexAddress}`);
  
  // Informações do contrato
  console.log("\n📋 Informações dos contratos:");
  console.log(`Token A: ${await tokenA.getAddress()}`);
  console.log(`Token B: ${await tokenB.getAddress()}`);
  console.log(`SimpleDEX: ${dexAddress}`);
  console.log(`Owner: ${deployer.address}`);
  
  // Verificar na Etherscan (se não for rede local)
  if (network.chainId !== 31337n) { // 31337 é o chainId do Hardhat local
    console.log("\n🔍 Para verificar os contratos:");
    console.log(`Token A: https://etherscan.io/address/${await tokenA.getAddress()}`);
    console.log(`Token B: https://etherscan.io/address/${await tokenB.getAddress()}`);
    console.log(`SimpleDEX: https://etherscan.io/address/${dexAddress}`);
    
    if (network.chainId === 11155111n) { // Sepolia
      console.log("\n🧪 Links Sepolia:");
      console.log(`Token A: https://sepolia.etherscan.io/address/${await tokenA.getAddress()}`);
      console.log(`Token B: https://sepolia.etherscan.io/address/${await tokenB.getAddress()}`);
      console.log(`SimpleDEX: https://sepolia.etherscan.io/address/${dexAddress}`);
    }
  }
  
  // Salvar endereços em arquivo
  const deployData = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      tokenA: await tokenA.getAddress(),
      tokenB: await tokenB.getAddress(),
      simpleDEX: dexAddress
    }
  };
  
  const fs = require('fs');
  const deploymentFile = `deployments/${network.name}-${Date.now()}.json`;
  
  // Criar pasta deployments se não existir
  if (!fs.existsSync('deployments')) {
    fs.mkdirSync('deployments');
  }
  
  fs.writeFileSync(deploymentFile, JSON.stringify(deployData, null, 2));
  console.log(`\n💾 Informações de deploy salvas em: ${deploymentFile}`);
  
  console.log("\n🎉 Deploy concluído com sucesso!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erro no deploy:", error);
    process.exit(1);
  });
