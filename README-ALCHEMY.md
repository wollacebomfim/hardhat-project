# 🔌 Guia de Integração com Alchemy

Este documento explica como configurar e usar o SimpleDEX com Alchemy API.

## 🚀 Configuração Inicial

### 1. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas chaves reais:
```bash
# Obtenha suas chaves em: https://www.alchemy.com/
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/SUA_CHAVE_AQUI
ALCHEMY_MAINNET_URL=https://eth-mainnet.g.alchemy.com/v2/SUA_CHAVE_AQUI
PRIVATE_KEY=sua_chave_privada_sem_0x
ETHERSCAN_API_KEY=sua_chave_etherscan
```

### 2. Instalar Dependências

```bash
npm install dotenv
```

## 🏭 Deploy

### Deploy na Sepolia (Testnet)
```bash
npx hardhat run scripts/deploy-alchemy.js --network sepolia
```

### Deploy na Mainnet
```bash
npx hardhat run scripts/deploy-alchemy.js --network mainnet
```

### Deploy Local
```bash
npx hardhat run scripts/deploy-alchemy.js --network localhost
```

## 🧪 Testes

### Testes Locais
```bash
npx hardhat test test/contratoDEX.js
```

### Testes de Integração com Alchemy
```bash
# Sepolia
npx hardhat test test/integration-alchemy.js --network sepolia

# Mainnet (apenas leitura)
npx hardhat test test/integration-alchemy.js --network mainnet
```

## 🔌 Interação via API

### Script de Consulta
```bash
# Consultar estado do contrato
npx hardhat run scripts/interact-alchemy.js --network sepolia

# Monitorar eventos em tempo real
npx hardhat run scripts/interact-alchemy.js monitor --network sepolia
```

## 📊 Relatórios

### Relatório de Coverage
```bash
npx hardhat coverage
open coverage/index.html
```

### Relatório de Gas
```bash
npx hardhat test --gas-report
```

## 🔗 Endpoints Alchemy

### Sepolia Testnet
- **URL**: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
- **Chain ID**: 11155111
- **Explorer**: https://sepolia.etherscan.io/

### Ethereum Mainnet
- **URL**: `https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
- **Chain ID**: 1
- **Explorer**: https://etherscan.io/

## 📋 Funções do Contrato

### SimpleDEX

#### Leitura (View Functions)
```javascript
// Informações básicas
await simpleDEX.owner()
await simpleDEX.tokenA()
await simpleDEX.tokenB()
await simpleDEX.reserveA()
await simpleDEX.reserveB()

// Preços
await simpleDEX.getPrice(tokenAddress)

// Simulação de swap
await simpleDEX.getSwapResult(inputAmount, inputReserve, outputReserve)
```

#### Escrita (State-Changing Functions)
```javascript
// Apenas owner
await simpleDEX.addLiquidity(amountA, amountB)
await simpleDEX.removeLiquidity(amountA, amountB)

// Qualquer usuário
await simpleDEX.swapAforB(amountAIn)
await simpleDEX.swapBforA(amountBIn)
```

### Events
```javascript
// Monitorar eventos
simpleDEX.on("LiquidityAdded", (amountA, amountB) => {})
simpleDEX.on("LiquidityRemoved", (amountA, amountB) => {})
simpleDEX.on("Swapped", (from, direction, inputAmount, outputAmount) => {})
```

## 🔐 Segurança

- ⚠️ **NUNCA** compartilhe sua `PRIVATE_KEY`
- 🔒 Use `.env` para variáveis sensíveis
- 🧪 Teste sempre na Sepolia antes da Mainnet
- 💰 Verifique saldos antes de transações
- 🛡️ Use multisig para contratos de produção

## 🆘 Troubleshooting

### Erro de Rede
```bash
Error: could not detect network
```
**Solução**: Verifique sua `ALCHEMY_URL` no `.env`

### Erro de Gas
```bash
Error: insufficient funds for gas
```
**Solução**: Adicione ETH à sua carteira

### Erro de Nonce
```bash
Error: nonce too high
```
**Solução**: Reset do MetaMask ou use outro RPC

## 📞 Support

- 📚 [Documentação Alchemy](https://docs.alchemy.com/)
- 🛠️ [Hardhat Docs](https://hardhat.org/docs)
- 🌐 [Ethers.js Docs](https://docs.ethers.org/)

## 🎯 Exemplos de Uso

### Consultar Pool State
```javascript
const reserveA = await simpleDEX.reserveA();
const reserveB = await simpleDEX.reserveB();
console.log(`Pool: ${ethers.formatEther(reserveA)} A / ${ethers.formatEther(reserveB)} B`);
```

### Simular Swap
```javascript
const inputAmount = ethers.parseEther("100");
const output = await simpleDEX.getSwapResult(inputAmount, reserveA, reserveB);
console.log(`${ethers.formatEther(inputAmount)} A → ${ethers.formatEther(output)} B`);
```

### Monitorar Eventos
```javascript
const filter = simpleDEX.filters.Swapped();
const events = await simpleDEX.queryFilter(filter, -100); // Últimos 100 blocos
console.log(`${events.length} swaps nos últimos 100 blocos`);
```
