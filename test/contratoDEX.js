const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleDEX", function () {
  let simpleDEX;
  let tokenA;
  let tokenB;
  let owner;
  let user1;
  let user2;

  // Valores para testes
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1 milhão de tokens
  const LIQUIDITY_A = ethers.parseEther("1000"); // 1000 tokens A
  const LIQUIDITY_B = ethers.parseEther("2000"); // 2000 tokens B (ratio 1:2)

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy dos tokens ERC20 mock
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA", INITIAL_SUPPLY);
    tokenB = await MockERC20.deploy("Token B", "TKB", INITIAL_SUPPLY);

    // Deploy do SimpleDEX
    const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
    simpleDEX = await SimpleDEX.deploy(await tokenA.getAddress(), await tokenB.getAddress());

    // Distribuir tokens para os usuários
    await tokenA.transfer(user1.address, ethers.parseEther("10000"));
    await tokenA.transfer(user2.address, ethers.parseEther("10000"));
    await tokenB.transfer(user1.address, ethers.parseEther("10000"));
    await tokenB.transfer(user2.address, ethers.parseEther("10000"));

    // Aprovar o DEX para gastar tokens do owner (para adicionar liquidez)
    await tokenA.approve(await simpleDEX.getAddress(), INITIAL_SUPPLY);
    await tokenB.approve(await simpleDEX.getAddress(), INITIAL_SUPPLY);
  });

  describe("Deployment", function () {
    it("Deve definir o owner correto", async function () {
      expect(await simpleDEX.owner()).to.equal(owner.address);
    });

    it("Deve definir os tokens corretos", async function () {
      expect(await simpleDEX.tokenA()).to.equal(await tokenA.getAddress());
      expect(await simpleDEX.tokenB()).to.equal(await tokenB.getAddress());
    });

    it("Deve inicializar com reservas zeradas", async function () {
      expect(await simpleDEX.reserveA()).to.equal(0);
      expect(await simpleDEX.reserveB()).to.equal(0);
    });
  });

  describe("Adicionar Liquidez", function () {
    it("Deve permitir que o owner adicione liquidez inicial", async function () {
      await expect(simpleDEX.addLiquidity(LIQUIDITY_A, LIQUIDITY_B))
        .to.emit(simpleDEX, "LiquidityAdded")
        .withArgs(LIQUIDITY_A, LIQUIDITY_B);

      expect(await simpleDEX.reserveA()).to.equal(LIQUIDITY_A);
      expect(await simpleDEX.reserveB()).to.equal(LIQUIDITY_B);
    });

    it("Deve falhar se não for o owner", async function () {
      await expect(
        simpleDEX.connect(user1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B)
      ).to.be.revertedWith("Not the owner");
    });

    it("Deve falhar com quantidades zero", async function () {
      await expect(
        simpleDEX.addLiquidity(0, LIQUIDITY_B)
      ).to.be.revertedWith("Amounts must be > 0");

      await expect(
        simpleDEX.addLiquidity(LIQUIDITY_A, 0)
      ).to.be.revertedWith("Amounts must be > 0");
    });

    it("Deve falhar se ratio estiver incorreto ao adicionar liquidez adicional", async function () {
      // Adicionar liquidez inicial
      await simpleDEX.addLiquidity(LIQUIDITY_A, LIQUIDITY_B);

      // Tentar adicionar liquidez com ratio incorreto
      await expect(
        simpleDEX.addLiquidity(LIQUIDITY_A, LIQUIDITY_A) // ratio errado
      ).to.be.revertedWith("Invalid ratio");
    });

    it("Deve permitir adicionar liquidez com ratio correto", async function () {
      // Adicionar liquidez inicial (1:2 ratio)
      await simpleDEX.addLiquidity(LIQUIDITY_A, LIQUIDITY_B);

      // Adicionar mais liquidez com o mesmo ratio
      const additionalA = ethers.parseEther("500");
      const additionalB = ethers.parseEther("1000");

      await simpleDEX.addLiquidity(additionalA, additionalB);

      expect(await simpleDEX.reserveA()).to.equal(LIQUIDITY_A + additionalA);
      expect(await simpleDEX.reserveB()).to.equal(LIQUIDITY_B + additionalB);
    });
  });

  describe("Remover Liquidez", function () {
    beforeEach(async function () {
      await simpleDEX.addLiquidity(LIQUIDITY_A, LIQUIDITY_B);
    });

    it("Deve permitir que o owner remova liquidez", async function () {
      const removeA = ethers.parseEther("500");
      const removeB = ethers.parseEther("1000");

      await expect(simpleDEX.removeLiquidity(removeA, removeB))
        .to.emit(simpleDEX, "LiquidityRemoved")
        .withArgs(removeA, removeB);

      expect(await simpleDEX.reserveA()).to.equal(LIQUIDITY_A - removeA);
      expect(await simpleDEX.reserveB()).to.equal(LIQUIDITY_B - removeB);
    });

    it("Deve falhar se não for o owner", async function () {
      await expect(
        simpleDEX.connect(user1).removeLiquidity(ethers.parseEther("100"), ethers.parseEther("200"))
      ).to.be.revertedWith("Not the owner");
    });

    it("Deve falhar se tentar remover mais do que as reservas", async function () {
      await expect(
        simpleDEX.removeLiquidity(LIQUIDITY_A + ethers.parseEther("1"), LIQUIDITY_B)
      ).to.be.revertedWith("Insufficient reserves");
    });
  });

  describe("Swap A por B", function () {
    beforeEach(async function () {
      // Adicionar liquidez inicial
      await simpleDEX.addLiquidity(LIQUIDITY_A, LIQUIDITY_B);

      // Aprovar tokens para o user1
      await tokenA.connect(user1).approve(await simpleDEX.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).approve(await simpleDEX.getAddress(), ethers.parseEther("1000"));
    });

    it("Deve permitir swap de A por B", async function () {
      const swapAmount = ethers.parseEther("100");
      const expectedOutput = await simpleDEX.getSwapResult(swapAmount, LIQUIDITY_A, LIQUIDITY_B);

      const balanceABefore = await tokenA.balanceOf(user1.address);
      const balanceBBefore = await tokenB.balanceOf(user1.address);

      await expect(simpleDEX.connect(user1).swapAforB(swapAmount))
        .to.emit(simpleDEX, "Swapped")
        .withArgs(user1.address, "A->B", swapAmount, expectedOutput);

      const balanceAAfter = await tokenA.balanceOf(user1.address);
      const balanceBAfter = await tokenB.balanceOf(user1.address);

      expect(balanceAAfter).to.equal(balanceABefore - swapAmount);
      expect(balanceBAfter).to.equal(balanceBBefore + expectedOutput);
    });

    it("Deve falhar com quantidade zero", async function () {
      await expect(
        simpleDEX.connect(user1).swapAforB(0)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Deve falhar se não houver aprovação suficiente", async function () {
      await tokenA.connect(user2).approve(await simpleDEX.getAddress(), 0);
      
      await expect(
        simpleDEX.connect(user2).swapAforB(ethers.parseEther("100"))
      ).to.be.reverted;
    });
  });

  describe("Swap B por A", function () {
    beforeEach(async function () {
      // Adicionar liquidez inicial
      await simpleDEX.addLiquidity(LIQUIDITY_A, LIQUIDITY_B);

      // Aprovar tokens para o user1
      await tokenA.connect(user1).approve(await simpleDEX.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).approve(await simpleDEX.getAddress(), ethers.parseEther("1000"));
    });

    it("Deve permitir swap de B por A", async function () {
      const swapAmount = ethers.parseEther("200");
      const expectedOutput = await simpleDEX.getSwapResult(swapAmount, LIQUIDITY_B, LIQUIDITY_A);

      const balanceABefore = await tokenA.balanceOf(user1.address);
      const balanceBBefore = await tokenB.balanceOf(user1.address);

      await expect(simpleDEX.connect(user1).swapBforA(swapAmount))
        .to.emit(simpleDEX, "Swapped")
        .withArgs(user1.address, "B->A", swapAmount, expectedOutput);

      const balanceAAfter = await tokenA.balanceOf(user1.address);
      const balanceBAfter = await tokenB.balanceOf(user1.address);

      expect(balanceAAfter).to.equal(balanceABefore + expectedOutput);
      expect(balanceBAfter).to.equal(balanceBBefore - swapAmount);
    });

    it("Deve falhar com quantidade zero", async function () {
      await expect(
        simpleDEX.connect(user1).swapBforA(0)
      ).to.be.revertedWith("Amount must be > 0");
    });
  });

  describe("Preços", function () {
    beforeEach(async function () {
      await simpleDEX.addLiquidity(LIQUIDITY_A, LIQUIDITY_B);
    });

    it("Deve retornar preço correto para Token A", async function () {
      const price = await simpleDEX.getPrice(await tokenA.getAddress());
      // Preço de A em termos de B (com 18 decimais)
      // Se temos 1000 A e 2000 B, preço de A = 2000/1000 = 2
      const expectedPrice = (LIQUIDITY_B * ethers.parseEther("1")) / LIQUIDITY_A;
      expect(price).to.equal(expectedPrice);
    });

    it("Deve retornar preço correto para Token B", async function () {
      const price = await simpleDEX.getPrice(await tokenB.getAddress());
      // Preço de B em termos de A (com 18 decimais)
      // Se temos 1000 A e 2000 B, preço de B = 1000/2000 = 0.5
      const expectedPrice = (LIQUIDITY_A * ethers.parseEther("1")) / LIQUIDITY_B;
      expect(price).to.equal(expectedPrice);
    });

    it("Deve falhar para endereço de token inválido", async function () {
      await expect(
        simpleDEX.getPrice(user1.address)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Deve falhar se não houver liquidez", async function () {
      // Deploy novo DEX sem liquidez
      const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
      const emptyDEX = await SimpleDEX.deploy(await tokenA.getAddress(), await tokenB.getAddress());

      await expect(
        emptyDEX.getPrice(await tokenA.getAddress())
      ).to.be.revertedWith("Empty reserves");
    });
  });

  describe("Cálculo de Swap", function () {
    it("Deve calcular resultado de swap corretamente", async function () {
      // Teste da fórmula de AMM com taxa de 0.3%
      const inputAmount = ethers.parseEther("100");
      const inputReserve = ethers.parseEther("1000");
      const outputReserve = ethers.parseEther("2000");

      // Fórmula: (inputAmount * 997 * outputReserve) / ((inputReserve * 1000) + (inputAmount * 997))
      const inputWithFee = inputAmount * 997n;
      const numerator = inputWithFee * outputReserve;
      const denominator = (inputReserve * 1000n) + inputWithFee;
      const expectedOutput = numerator / denominator;

      const result = await simpleDEX.getSwapResult(inputAmount, inputReserve, outputReserve);
      expect(result).to.equal(expectedOutput);
    });
  });

  describe("Cenários de Integração", function () {
    it("Deve manter invariante após múltiplos swaps", async function () {
      // Adicionar liquidez
      await simpleDEX.addLiquidity(LIQUIDITY_A, LIQUIDITY_B);

      // Aprovar tokens para usuários
      await tokenA.connect(user1).approve(await simpleDEX.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).approve(await simpleDEX.getAddress(), ethers.parseEther("1000"));

      // Capturar invariante inicial
      const initialReserveA = await simpleDEX.reserveA();
      const initialReserveB = await simpleDEX.reserveB();
      const initialInvariant = initialReserveA * initialReserveB;

      // Fazer swap A -> B
      await simpleDEX.connect(user1).swapAforB(ethers.parseEther("10"));

      // Fazer swap B -> A
      await simpleDEX.connect(user1).swapBforA(ethers.parseEther("15"));

      // Verificar que o invariante aumentou (devido às taxas)
      const finalReserveA = await simpleDEX.reserveA();
      const finalReserveB = await simpleDEX.reserveB();
      const finalInvariant = finalReserveA * finalReserveB;

      expect(finalInvariant).to.be.greaterThan(initialInvariant);
    });

    it("Deve manter propriedades do AMM após swaps", async function () {
      // Adicionar liquidez
      await simpleDEX.addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));

      // Aprovar tokens
      await tokenA.connect(user1).approve(await simpleDEX.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).approve(await simpleDEX.getAddress(), ethers.parseEther("1000"));

      // Verificar que fazer um swap A->B e depois B->A não retorna à posição original
      // (devido às taxas de 0.3%)
      const initialBalanceA = await tokenA.balanceOf(user1.address);
      const initialBalanceB = await tokenB.balanceOf(user1.address);

      // Swap A->B
      const swapAmountA = ethers.parseEther("10");
      await simpleDEX.connect(user1).swapAforB(swapAmountA);
      
      const balanceAfterFirstSwap = await tokenB.balanceOf(user1.address);
      const gainedB = balanceAfterFirstSwap - initialBalanceB;
      
      // Swap B->A (todo o B ganho)
      await simpleDEX.connect(user1).swapBforA(gainedB);
      
      const finalBalanceA = await tokenA.balanceOf(user1.address);
      
      // Devido às taxas, devemos ter perdido alguns tokens A
      expect(finalBalanceA).to.be.lessThan(initialBalanceA);
    });
  });
});