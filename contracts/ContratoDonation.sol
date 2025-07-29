
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract ArrecadacaoDeFundos {
    address public owner;
    address[] public doadores;
    mapping(address => uint256) public valoresDoacoes;
    uint256 public totalDonate;

    constructor() {
        owner = msg.sender;
    }

    // 1. Função para doar Ether ao contrato
    function doar() public payable {
        require(msg.value > 0, "Valor deve ser maior que zero");
        if (valoresDoacoes[msg.sender] == 0) {
            doadores.push(msg.sender);
        }
        valoresDoacoes[msg.sender] += msg.value;
        totalDonate += msg.value;
    }

    // 2. Função para obter todos os doadores
    function getDoadores() public view returns (address[] memory) {
        return doadores;
    }

    // 3. Função para resgatar fundos (apenas owner)
    function resgatar() public {
        require(msg.sender == owner, "Apenas o dono pode resgatar");
        uint256 saldo = address(this).balance;
        require(saldo > 0, "Sem saldo para resgatar");
        payable(owner).transfer(saldo);
    }

    // 4. Função para consultar saldo do contrato
    function saldoContrato() public view returns (uint256) {
        return address(this).balance;
    }
}


