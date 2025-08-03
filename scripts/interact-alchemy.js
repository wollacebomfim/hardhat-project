const { ethers } = require("hardhat");

async function main() {
  console.log("🔌 Script de Interação com SimpleDEX via Alchemy API");
  console.log("=" .repeat(60));
  
  // Configurações do contrato (substitua pelos endereços reais)
  const CONTRACT_ADDRESSES = {
    // Sepolia Testnet
    sepolia: {
      tokenA: "0x...", // Substitua pelo endereço real
      tokenB: "0x...", // Substitua pelo endereço real
      simpleDEX: "0x..." // Substitua pelo endereço real
    },
    // Mainnet
    mainnet: {
      tokenA: "0x...", // Substitua pelo endereço real
      tokenB: "0x...", // Substitua pelo endereço real
      simpleDEX: "0x..." // Substitua pelo endereço real
    }
  };
  
  // Obter informações da rede
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  console.log(`📡 Rede: ${networkName} (Chain ID: ${network.chainId})`);
  
  // Verificar se temos endereços para esta rede
  const addresses = CONTRACT_ADDRESSES[networkName];
  if (!addresses || addresses.simpleDEX === "0x...") {
    console.log("⚠️ Endereços de contrato não configurados para esta rede");
    console.log("📝 Configure os endereços no script após o deploy");
    return;
  }
  
  // Conectar aos contratos
  const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  
  const simpleDEX = SimpleDEX.attach(addresses.simpleDEX);
  const tokenA = MockERC20.attach(addresses.tokenA);
  const tokenB = MockERC20.attach(addresses.tokenB);
  
  console.log("\n📋 Endereços dos Contratos:");
  console.log(`Token A: ${addresses.tokenA}`);
  console.log(`Token B: ${addresses.tokenB}`);
  console.log(`SimpleDEX: ${addresses.simpleDEX}`);
  
  try {
    // 1. Informações básicas
    console.log("\n🔍 1. INFORMAÇÕES BÁSICAS");
    console.log("-".repeat(40));
    
    const owner = await simpleDEX.owner();
    const reserveA = await simpleDEX.reserveA();
    const reserveB = await simpleDEX.reserveB();
    
    console.log(`👤 Owner: ${owner}`);
    console.log(`💰 Reserve A: ${ethers.formatEther(reserveA)} tokens`);
    console.log(`💰 Reserve B: ${ethers.formatEther(reserveB)} tokens`);
    
    // 2. Informações dos tokens
    console.log("\n🪙 2. INFORMAÇÕES DOS TOKENS");
    console.log("-".repeat(40));
    
    const nameA = await tokenA.name();
    const symbolA = await tokenA.symbol();
    const nameB = await tokenB.name();
    const symbolB = await tokenB.symbol();
    
    console.log(`Token A: ${nameA} (${symbolA})`);
    console.log(`Token B: ${nameB} (${symbolB})`);
    
    // 3. Preços (se há liquidez)
    if (reserveA > 0n && reserveB > 0n) {
      console.log("\n💱 3. PREÇOS ATUAIS");
      console.log("-".repeat(40));
      
      const priceA = await simpleDEX.getPrice(addresses.tokenA);
      const priceB = await simpleDEX.getPrice(addresses.tokenB);
      
      console.log(`Preço ${symbolA}: ${ethers.formatEther(priceA)} ${symbolB}`);
      console.log(`Preço ${symbolB}: ${ethers.formatEther(priceB)} ${symbolA}`);
      
      // 4. Simulação de swap
      console.log("\n🔄 4. SIMULAÇÃO DE SWAP");
      console.log("-".repeat(40));
      
      const swapAmounts = [
        ethers.parseEther("1"),
        ethers.parseEther("10"),
        ethers.parseEther("100")
      ];
      
      for (const amount of swapAmounts) {
        try {
          const outputAtoB = await simpleDEX.getSwapResult(amount, reserveA, reserveB);
          const outputBtoA = await simpleDEX.getSwapResult(amount, reserveB, reserveA);
          
          console.log(`${ethers.formatEther(amount)} ${symbolA} → ${ethers.formatEther(outputAtoB)} ${symbolB}`);
          console.log(`${ethers.formatEther(amount)} ${symbolB} → ${ethers.formatEther(outputBtoA)} ${symbolA}`);
          console.log("");
        } catch (error) {
          console.log(`❌ Erro ao simular swap de ${ethers.formatEther(amount)}: ${error.message}`);
        }
      }
    } else {
      console.log("\n⚠️ Pool sem liquidez - não é possível calcular preços");
    }
    
    // 5. Eventos recentes
    console.log("\n📊 5. EVENTOS RECENTES");
    console.log("-".repeat(40));
    
    // Eventos de liquidez
    const liquidityFilter = simpleDEX.filters.LiquidityAdded();
    const liquidityEvents = await simpleDEX.queryFilter(liquidityFilter, -1000);
    
    console.log(`💧 Eventos de Liquidez (últimos 1000 blocos): ${liquidityEvents.length}`);
    liquidityEvents.slice(-5).forEach((event, index) => {
      console.log(`  ${liquidityEvents.length - 4 + index}. Bloco ${event.blockNumber}: +${ethers.formatEther(event.args[0])} A, +${ethers.formatEther(event.args[1])} B`);
    });
    
    // Eventos de swap
    const swapFilter = simpleDEX.filters.Swapped();
    const swapEvents = await simpleDEX.queryFilter(swapFilter, -1000);
    
    console.log(`\n🔄 Eventos de Swap (últimos 1000 blocos): ${swapEvents.length}`);
    swapEvents.slice(-5).forEach((event, index) => {
      console.log(`  ${swapEvents.length - 4 + index}. ${event.args[1]}: ${ethers.formatEther(event.args[2])} → ${ethers.formatEther(event.args[3])}`);
    });
    
    // 6. Informações da blockchain
    console.log("\n⛓️ 6. INFORMAÇÕES DA BLOCKCHAIN");
    console.log("-".repeat(40));
    
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    const feeData = await ethers.provider.getFeeData();
    
    console.log(`📦 Bloco atual: ${blockNumber}`);
    console.log(`⏰ Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
    console.log(`⛽ Gas Price: ${ethers.formatUnits(feeData.gasPrice || 0n, 'gwei')} gwei`);
    
    // 7. Links úteis
    console.log("\n🔗 7. LINKS ÚTEIS");
    console.log("-".repeat(40));
    
    if (networkName === "sepolia") {
      console.log(`🔍 Etherscan: https://sepolia.etherscan.io/address/${addresses.simpleDEX}`);
      console.log(`🪙 Token A: https://sepolia.etherscan.io/address/${addresses.tokenA}`);
      console.log(`🪙 Token B: https://sepolia.etherscan.io/address/${addresses.tokenB}`);
    } else if (networkName === "mainnet") {
      console.log(`🔍 Etherscan: https://etherscan.io/address/${addresses.simpleDEX}`);
      console.log(`🪙 Token A: https://etherscan.io/address/${addresses.tokenA}`);
      console.log(`🪙 Token B: https://etherscan.io/address/${addresses.tokenB}`);
    }
    
  } catch (error) {
    console.error("❌ Erro ao interagir com o contrato:", error.message);
  }
  
  console.log("\n✅ Script concluído!");
}

// Função auxiliar para monitorar eventos em tempo real
async function monitorEvents() {
  console.log("👀 Iniciando monitoramento de eventos...");
  
  const addresses = CONTRACT_ADDRESSES[network.name];
  if (!addresses) return;
  
  const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
  const simpleDEX = SimpleDEX.attach(addresses.simpleDEX);
  
  // Monitorar swaps
  simpleDEX.on("Swapped", (from, direction, inputAmount, outputAmount) => {
    console.log(`🔄 NOVO SWAP: ${direction}`);
    console.log(`   De: ${from}`);
    console.log(`   Input: ${ethers.formatEther(inputAmount)}`);
    console.log(`   Output: ${ethers.formatEther(outputAmount)}`);
  });
  
  // Monitorar liquidez
  simpleDEX.on("LiquidityAdded", (amountA, amountB) => {
    console.log(`💧 LIQUIDEZ ADICIONADA:`);
    console.log(`   Token A: ${ethers.formatEther(amountA)}`);
    console.log(`   Token B: ${ethers.formatEther(amountB)}`);
  });
  
  console.log("✅ Monitoramento ativo - pressione Ctrl+C para parar");
}

// Executar script principal ou monitoramento
if (process.argv[2] === "monitor") {
  monitorEvents().catch(console.error);
} else {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
