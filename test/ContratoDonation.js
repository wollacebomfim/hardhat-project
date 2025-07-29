const { expect } = require("chai");
const { ethers } = require("hardhat");

// Corrige o acesso ao parseEther
const parseEther = require("ethers").parseEther || ethers.parseEther || (ethers.utils && ethers.utils.parseEther);

function toBigIntSafe(val) {
  if (val === undefined || val === null) return 0n;
  if (typeof val === "bigint") return val;
  if (typeof val === "string" && val.match(/^\d+$/)) return BigInt(val);
  if (val.toBigInt) return val.toBigInt();
  return BigInt(val.toString());
}

describe("ArrecadacaoDeFundos", function () {
  let arrecadacao, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const Arrecadacao = await ethers.getContractFactory("ArrecadacaoDeFundos");
    arrecadacao = await Arrecadacao.deploy();
    await arrecadacao.waitForDeployment();
  });

  it("deve definir o dono corretamente", async function () {
    expect(await arrecadacao.owner()).to.equal(owner.address);
  });

  it("deve aceitar doação e atualizar saldo", async function () {
    const valor = parseEther("1.0");
    await arrecadacao.connect(addr1).doar({ value: valor });
    expect(await arrecadacao.saldoContrato()).to.equal(valor);
    expect(await arrecadacao.totalDonate()).to.equal(valor);
    expect(await arrecadacao.valoresDoacoes(addr1.address)).to.equal(valor);
    const doadores = await arrecadacao.getDoadores();
    expect(doadores).to.include(addr1.address);
  });

  it("deve impedir resgate por não-dono", async function () {
    await arrecadacao.connect(addr1).doar({ value: parseEther("0.5") });
    await expect(
      arrecadacao.connect(addr1).resgatar()
    ).to.be.revertedWith("Apenas o dono pode resgatar");
  });

  it("deve permitir resgate pelo dono e transferir fundos", async function () {
    const valor = parseEther("2.0");
    await arrecadacao.connect(addr2).doar({ value: valor });
    const saldoAntes = await ethers.provider.getBalance(owner.address);
    const tx = await arrecadacao.connect(owner).resgatar();
    const receipt = await tx.wait();
    // Corrige para BigInt, mesmo se undefined
    const gasUsed = toBigIntSafe(receipt.gasUsed) * toBigIntSafe(receipt.effectiveGasPrice);
    const saldoDepois = await ethers.provider.getBalance(owner.address);
    expect(
      toBigIntSafe(saldoDepois)
    ).to.be.closeTo(
      toBigIntSafe(saldoAntes) + toBigIntSafe(valor) - gasUsed,
      toBigIntSafe(parseEther("0.01"))
    );
    expect(await arrecadacao.saldoContrato()).to.equal(0);
  });
});
