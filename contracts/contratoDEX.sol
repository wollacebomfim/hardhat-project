// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title SimpleDEX - A minimal decentralized exchange for TokenA and TokenB
/// @author wollacebomfim

interface IERC20 {
function transfer(address to, uint256 amount) external returns (bool);
function transferFrom(address from, address to, uint256 amount) external returns (bool);
function balanceOf(address account) external view returns (uint256);
}

contract SimpleDEX {
address public owner;
IERC20 public tokenA;
IERC20 public tokenB;

uint256 public reserveA;
uint256 public reserveB;

event LiquidityAdded(uint256 amountA, uint256 amountB);
event LiquidityRemoved(uint256 amountA, uint256 amountB);
event Swapped(address indexed from, string direction, uint256 inputAmount, uint256 outputAmount);

constructor(address _tokenA, address _tokenB) {
owner = msg.sender;
tokenA = IERC20(_tokenA);
tokenB = IERC20(_tokenB);
}

modifier onlyOwner() {
require(msg.sender == owner, "Not the owner");
_;
}

function addLiquidity(uint256 amountA, uint256 amountB) external onlyOwner {
require(amountA > 0 && amountB > 0, "Amounts must be > 0");

if (reserveA > 0 && reserveB > 0) {
require(reserveA * amountB == reserveB * amountA, "Invalid ratio");
}

tokenA.transferFrom(msg.sender, address(this), amountA);
tokenB.transferFrom(msg.sender, address(this), amountB);

reserveA += amountA;
reserveB += amountB;

emit LiquidityAdded(amountA, amountB);
}

function removeLiquidity(uint256 amountA, uint256 amountB) external onlyOwner {
require(amountA <= reserveA && amountB <= reserveB, "Insufficient reserves");

reserveA -= amountA;
reserveB -= amountB;

tokenA.transfer(msg.sender, amountA);
tokenB.transfer(msg.sender, amountB);

emit LiquidityRemoved(amountA, amountB);
}

function swapAforB(uint256 amountAIn) external {
require(amountAIn > 0, "Amount must be > 0");

uint256 amountBOut = getSwapResult(amountAIn, reserveA, reserveB);
require(amountBOut > 0 && amountBOut < reserveB, "Invalid output amount");

tokenA.transferFrom(msg.sender, address(this), amountAIn);
tokenB.transfer(msg.sender, amountBOut);

reserveA += amountAIn;
reserveB -= amountBOut;

emit Swapped(msg.sender, "A->B", amountAIn, amountBOut);
}

function swapBforA(uint256 amountBIn) external {
require(amountBIn > 0, "Amount must be > 0");

uint256 amountAOut = getSwapResult(amountBIn, reserveB, reserveA);
require(amountAOut > 0 && amountAOut < reserveA, "Invalid output amount");

tokenB.transferFrom(msg.sender, address(this), amountBIn);
tokenA.transfer(msg.sender, amountAOut);

reserveB += amountBIn;
reserveA -= amountAOut;

emit Swapped(msg.sender, "B->A", amountBIn, amountAOut);
}

function getPrice(address _token) external view returns (uint256 price) {
if (_token == address(tokenA)) {
require(reserveA > 0 && reserveB > 0, "Empty reserves");
return reserveB * 1e18 / reserveA;
} else if (_token == address(tokenB)) {
require(reserveA > 0 && reserveB > 0, "Empty reserves");
return reserveA * 1e18 / reserveB;
} else {
revert("Invalid token address");
}
}

function getSwapResult(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) public pure returns (uint256) {
uint256 inputWithFee = inputAmount * 997; // 0.3% fee
uint256 numerator = inputWithFee * outputReserve;
uint256 denominator = (inputReserve * 1000) + inputWithFee;
return numerator / denominator;
}
}