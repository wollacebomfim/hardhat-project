const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("SimpleDEX - Testes de Integração com Alchemy", function () {
  let simpleDEX;
  let tokenA;
  let tokenB;
  let owner;
  let user1;
  
  // Configurações para diferentes redes
  const getNetworkConfig = () => {
    const network = hre.network.name;
    
    if (network === "sepolia") {
      return {
        // Substitua pelos endereços reais após deploy
        tokenA: "0x...", // Endereço do Token A na Sepolia
        tokenB: "0x...", // Endereço do Token B na Sepolia
        simpleDEX: "0x...", // Endereço do SimpleDEX na Sepolia
        rpcUrl: process.env.ALCHEMY_SEPOLIA_URL
      };
    } else if (network === "mainnet") {
      return {
        tokenA: "0x...", // Endereço do Token A na Mainnet
        tokenB: "0x...", // Endereço do Token B na Mainnet
        simpleDEX: "0x...", // Endereço do SimpleDEX na Mainnet
        rpcUrl: process.env.ALCHEMY_MAINNET_URL
      };
    }
    
    return null; // Usar contratos deployados localmente
  };

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    
    const config = getNetworkConfig();
    
    if (config && config.simpleDEX !== "0x...") {
      // Conectar a contratos já deployados
      console.log("🔗 Conectando a contratos deployados...");
      
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
      
      tokenA = MockERC20.attach(config.tokenA);
      tokenB = MockERC20.attach(config.tokenB);
      simpleDEX = SimpleDEX.attach(config.simpleDEX);
      
      console.log(`Token A: ${config.tokenA}`);
      console.log(`Token B: ${config.tokenB}`);
      console.log(`SimpleDEX: ${config.simpleDEX}`);
    } else {
      // Deploy local para testes
      console.log("🏠 Deployando contratos localmente...");
      
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const initialSupply = ethers.parseEther("1000000");
      
      tokenA = await MockERC20.deploy("Token A", "TKA", initialSupply);
      tokenB = await MockERC20.deploy("Token B", "TKB", initialSupply);
      
      const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
      simpleDEX = await SimpleDEX.deploy(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      
      // Distribuir tokens para testes
      await tokenA.transfer(user1.address, ethers.parseEther("10000"));
      await tokenB.transfer(user1.address, ethers.parseEther("10000"));
    }
  });

  describe("Verificações de Estado via API", function () {
    it("Deve conectar corretamente via Alchemy", async function () {
      const network = await ethers.provider.getNetwork();
      console.log(`📡 Conectado à rede: ${network.name} (${network.chainId})`);
      
      expect(network.chainId).to.be.a('bigint');
    });
    
    it("Deve ler informações básicas do contrato", async function () {
      const owner = await simpleDEX.owner();
      const tokenAAddr = await simpleDEX.tokenA();
      const tokenBAddr = await simpleDEX.tokenB();
      
      expect(owner).to.be.a('string');
      expect(tokenAAddr).to.be.a('string');
      expect(tokenBAddr).to.be.a('string');
      
      console.log(`👤 Owner: ${owner}`);
      console.log(`🪙 Token A: ${tokenAAddr}`);
      console.log(`🪙 Token B: ${tokenBAddr}`);
    });
    
    it("Deve ler reservas do pool", async function () {
      const reserveA = await simpleDEX.reserveA();
      const reserveB = await simpleDEX.reserveB();
      
      console.log(`💰 Reserve A: ${ethers.formatEther(reserveA)} tokens`);
      console.log(`💰 Reserve B: ${ethers.formatEther(reserveB)} tokens`);
      
      expect(reserveA).to.be.a('bigint');
      expect(reserveB).to.be.a('bigint');
    });
  });
  
  describe("Consultas de Preço via API", function () {
    it("Deve calcular preços quando há liquidez", async function () {
      const reserveA = await simpleDEX.reserveA();
      const reserveB = await simpleDEX.reserveB();
      
      if (reserveA > 0n && reserveB > 0n) {
        const priceA = await simpleDEX.getPrice(await tokenA.getAddress());
        const priceB = await simpleDEX.getPrice(await tokenB.getAddress());
        
        console.log(`💱 Preço Token A: ${ethers.formatEther(priceA)}`);
        console.log(`💱 Preço Token B: ${ethers.formatEther(priceB)}`);
        
        expect(priceA).to.be.greaterThan(0n);
        expect(priceB).to.be.greaterThan(0n);
      } else {
        console.log("⚠️ Pool sem liquidez - pulando teste de preço");
        this.skip();
      }
    });
  });
  
  describe("Simulação de Swaps via API", function () {
    it("Deve simular resultado de swap", async function () {
      const inputAmount = ethers.parseEther("100");
      const reserveA = await simpleDEX.reserveA();
      const reserveB = await simpleDEX.reserveB();
      
      if (reserveA > 0n && reserveB > 0n) {
        const outputAmount = await simpleDEX.getSwapResult(
          inputAmount,
          reserveA,
          reserveB
        );
        
        console.log(`🔄 Input: ${ethers.formatEther(inputAmount)}`);
        console.log(`🔄 Output: ${ethers.formatEther(outputAmount)}`);
        
        expect(outputAmount).to.be.greaterThan(0n);
        expect(outputAmount).to.be.lessThan(reserveB);
      } else {
        console.log("⚠️ Pool sem liquidez - pulando simulação de swap");
        this.skip();
      }
    });
  });
  
  describe("Verificação de Events via API", function () {
    it("Deve consultar eventos históricos", async function () {
      // Filtrar eventos de LiquidityAdded
      const filter = simpleDEX.filters.LiquidityAdded();
      const events = await simpleDEX.queryFilter(filter, -1000); // Últimos 1000 blocos
      
      console.log(`📊 Eventos LiquidityAdded encontrados: ${events.length}`);
      
      events.forEach((event, index) => {
        console.log(`  ${index + 1}. Bloco ${event.blockNumber}: ${ethers.formatEther(event.args[0])} A, ${ethers.formatEther(event.args[1])} B`);
      });
    });
    
    it("Deve consultar eventos de Swap", async function () {
      const filter = simpleDEX.filters.Swapped();
      const events = await simpleDEX.queryFilter(filter, -1000);
      
      console.log(`🔄 Eventos Swapped encontrados: ${events.length}`);
      
      events.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.args[0]} - ${event.args[1]}: ${ethers.formatEther(event.args[2])} → ${ethers.formatEther(event.args[3])}`);
      });
    });
  });
  
  describe("Informações da Blockchain via Alchemy", function () {
    it("Deve obter informações do bloco atual", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      
      console.log(`📦 Bloco atual: ${blockNumber}`);
      console.log(`⏰ Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
      console.log(`⛽ Gas usado: ${block.gasUsed.toString()}`);
      
      expect(blockNumber).to.be.greaterThan(0);
    });
    
    it("Deve verificar gas price atual", async function () {
      const feeData = await ethers.provider.getFeeData();
      
      console.log(`⛽ Gas Price: ${ethers.formatUnits(feeData.gasPrice || 0n, 'gwei')} gwei`);
      console.log(`🚀 Max Fee: ${ethers.formatUnits(feeData.maxFeePerGas || 0n, 'gwei')} gwei`);
      console.log(`💡 Priority Fee: ${ethers.formatUnits(feeData.maxPriorityFeePerGas || 0n, 'gwei')} gwei`);
    });
  });
});
