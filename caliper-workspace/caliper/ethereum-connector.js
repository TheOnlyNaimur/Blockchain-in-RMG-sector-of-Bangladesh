/*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';

const EthereumHDKey = require('ethereumjs-wallet/hdkey');
const Web3 = require('web3');
const EEAClient = require('web3-eea');
const {ConnectorBase, CaliperUtils, ConfigUtil, TxStatus} = require('@hyperledger/caliper-core');

const logger = CaliperUtils.getLogger('ethereum-connector');

/**
 * @typedef {Object} EthereumInvoke
 *
 * @property {string} contract Required. The name of the smart contract
 * @property {string} verb Required. The name of the smart contract function
 * @property {string} args Required. Arguments of the smart contract function in the order in which they are defined
 * @property {boolean} readOnly Optional. If method to call is a view.
 */

/**
 * Extends {BlockchainConnector} for a web3 Ethereum backend.
 */
class EthereumConnector extends ConnectorBase {

    /**
     * Create a new instance of the {Ethereum} class.
     * @param {number} workerIndex The zero-based index of the worker who wants to create an adapter instance. -1 for the manager process.
     * @param {string} bcType The target SUT type
     */
    constructor(workerIndex, bcType) {
        super(workerIndex, bcType);

        let configPath = CaliperUtils.resolvePath(ConfigUtil.get(ConfigUtil.keys.NetworkConfig));
        let ethereumConfig = require(configPath).ethereum;

        // throws on configuration error
        this.checkConfig(ethereumConfig);

        this.ethereumConfig = ethereumConfig;
        this.web3 = new Web3(this.ethereumConfig.url);
        if (this.ethereumConfig.privacy) {
            this.web3eea = new EEAClient(this.web3, ethereumConfig.chainId);
        }
        this.web3.transactionConfirmationBlocks = this.ethereumConfig.transactionConfirmationBlocks;
        this.workerIndex = workerIndex;
        this.context = undefined;
        this.gasTracking = {};
    }

    /**
     * Check the ethereum networkconfig file for errors, throw if invalid
     * @param {object} ethereumConfig The ethereum networkconfig to check.
     */
    checkConfig(ethereumConfig) {
        if (!ethereumConfig.url) {
            throw new Error(
                'No URL given to access the Ethereum SUT. Please check your network configuration. ' +
                'Please see https://hyperledger.github.io/caliper/v0.3/ethereum-config/ for more info.'
            );
        }

        if (ethereumConfig.url.toLowerCase().indexOf('http') === 0) {
            throw new Error(
                'Ethereum benchmarks must not use http(s) RPC connections, as there is no way to guarantee the ' +
                'order of submitted transactions when using other transports. For more information, please see ' +
                'https://github.com/hyperledger/caliper/issues/776#issuecomment-624771622'
            );
        }

        //TODO: add validation logic for the rest of the configuration object
    }

    /**
     * Initialize the {Ethereum} object.
     * @param {boolean} workerInit Indicates whether the initialization happens in the worker process.
     * @return {object} Promise<boolean> True if the account got unlocked successful otherwise false.
     */
    init(workerInit) {
        if (this.ethereumConfig.contractDeployerAddressPrivateKey) {
            this.web3.eth.accounts.wallet.add(this.ethereumConfig.contractDeployerAddressPrivateKey);
        } else if (this.ethereumConfig.contractDeployerAddressPassword) {
            return this.web3.eth.personal.unlockAccount(this.ethereumConfig.contractDeployerAddress, this.ethereumConfig.contractDeployerAddressPassword, 1000);
        }
    }

    /**
     * Deploy smart contracts specified in the network configuration file.
     * @return {object} Promise execution for all the contract creations.
     */
    async installSmartContract() {
        let promises = [];
        let self = this;
        logger.info('Creating contracts...');
        for (const key of Object.keys(this.ethereumConfig.contracts)) {
            const contract = this.ethereumConfig.contracts[key];
            const contractData = require(CaliperUtils.resolvePath(contract.path)); // TODO remove path property
            const contractGas = contract.gas;
            const estimateGas = contract.estimateGas;
            let privacy;
            if (this.ethereumConfig.privacy) {
                privacy = this.ethereumConfig.privacy[contract.private];
            }

            this.ethereumConfig.contracts[key].abi = contractData.abi;
            promises.push(new Promise(async function(resolve, reject) {
                let contractInstance;
                try {
                    if (privacy) {
                        contractInstance = await self.deployPrivateContract(contractData, privacy);
                        logger.info(`Deployed private contract ${contractData.name} at ${contractInstance.options.address}`);
                    } else {
                        contractInstance = await self.deployContract(contractData);
                        logger.info(`Deployed contract ${contractData.name} at ${contractInstance.options.address}`);
                    }
                } catch (err) {
                    reject(err);
                }
                self.ethereumConfig.contracts[key].address = contractInstance.options.address;
                self.ethereumConfig.contracts[key].gas = contractGas;
                self.ethereumConfig.contracts[key].estimateGas = estimateGas;
                resolve(contractInstance);
            }));
        }
        return Promise.all(promises);
    }

    /**
     * Return the Ethereum context associated with the given callback module name.
     * @param {Number} roundIndex The zero-based round index of the test.
     * @param {object} args worker arguments.
     * @return {object} The assembled Ethereum context.
     * @async
     */
    async getContext(roundIndex, args) {
        let context = {
            chainId: 1,
            clientIndex: this.workerIndex,
            gasPrice: 0,
            contracts: {},
            nonces: {},
            web3: this.web3
        };

        context.gasPrice = this.ethereumConfig.gasPrice !== undefined
            ? this.ethereumConfig.gasPrice
            : await this.web3.eth.getGasPrice();

        context.chainId = this.ethereumConfig.chainId !== undefined
            ? this.ethereumConfig.chainId
            : await this.web3.eth.getChainId();

        for (const key of Object.keys(args.contracts)) {
            context.contracts[key] = {
                contract: new this.web3.eth.Contract(args.contracts[key].abi, args.contracts[key].address),
                gas: args.contracts[key].gas,
                estimateGas: args.contracts[key].estimateGas
            };
        }

        if (this.ethereumConfig.fromAddress) {
            context.fromAddress = this.ethereumConfig.fromAddress;
        }

        if (this.ethereumConfig.contractDeployerAddress) {
            context.contractDeployerAddress = this.ethereumConfig.contractDeployerAddress;
            context.contractDeployerAddressPrivateKey = this.ethereumConfig.contractDeployerAddressPrivateKey;
        }

        if (this.ethereumConfig.fromAddressSeed) {
            let hdwallet = EthereumHDKey.fromMasterSeed(this.ethereumConfig.fromAddressSeed);
            let wallet = hdwallet.derivePath('m/44\'/60\'/' + this.workerIndex + '\'/0/0').getWallet();
            context.fromAddress = wallet.getChecksumAddressString();
            context.nonces[context.fromAddress] = await this.web3.eth.getTransactionCount(context.fromAddress);
            this.web3.eth.accounts.wallet.add(wallet.getPrivateKeyString());
        } else if (this.ethereumConfig.fromAddressPrivateKey) {
            context.nonces[this.ethereumConfig.fromAddress] = await this.web3.eth.getTransactionCount(this.ethereumConfig.fromAddress);
            this.web3.eth.accounts.wallet.add(this.ethereumConfig.fromAddressPrivateKey);
        } else if (this.ethereumConfig.fromAddressPassword) {
            await context.web3.eth.personal.unlockAccount(this.ethereumConfig.fromAddress, this.ethereumConfig.fromAddressPassword, 1000);
        }

        if (this.ethereumConfig.privacy) {
            context.web3eea = this.web3eea;
            context.privacy = this.ethereumConfig.privacy;
        }

        this.context = context;
        return context;
    }

    /**
     * Accumulate gas consumption statistics for smart contract method calls.
     * @param {string} contract Smart contract name.
     * @param {string} method Method/Function name.
     * @param {number} gasUsed Amount of gas consumed.
     */
    accumulateGas(contract, method, gasUsed) {
        if (!this.gasTracking[contract]) {
            this.gasTracking[contract] = {};
        }
        if (!this.gasTracking[contract][method]) {
            this.gasTracking[contract][method] = {
                totalGas: 0,
                count: 0,
                minGas: Infinity,
                maxGas: 0
            };
        }
        const stats = this.gasTracking[contract][method];
        stats.totalGas += gasUsed;
        stats.count += 1;
        if (gasUsed < stats.minGas) stats.minGas = gasUsed;
        if (gasUsed > stats.maxGas) stats.maxGas = gasUsed;
    }

    /**
     * Write gas consumption statistics to gas_report.md in the mounted report directory.
     */
    writeGasReport() {
        const fs = require('fs');
        const path = require('path');
        const reportDir = '/caliper-workspace/caliper/report';
        const mdPath = path.join(reportDir, 'gas_report.md');
        const htmlPath = path.join(reportDir, 'gas_report.html');

        let totalTx = 0;
        let totalGas = 0;
        let maxAvgGas = 0;
        let peakGasMethod = 'N/A';
        let peakGasValue = 0;

        let rows = [];
        for (const contract of Object.keys(this.gasTracking)) {
            for (const method of Object.keys(this.gasTracking[contract])) {
                const stats = this.gasTracking[contract][method];
                const avgGas = Math.round(stats.totalGas / stats.count);
                totalTx += stats.count;
                totalGas += stats.totalGas;
                if (avgGas > maxAvgGas) {
                    maxAvgGas = avgGas;
                }
                if (stats.maxGas > peakGasValue) {
                    peakGasValue = stats.maxGas;
                    peakGasMethod = `${contract}.${method}`;
                }
                rows.push({
                    contract,
                    method,
                    count: stats.count,
                    minGas: stats.minGas,
                    maxGas: stats.maxGas,
                    avgGas,
                    totalGas: stats.totalGas
                });
            }
        }

        // Sort by Avg Gas Used descending
        rows.sort((a, b) => b.avgGas - a.avgGas);

        // Build Markdown
        let markdown = '# Gas Consumption Report\n\n';
        markdown += '| Contract | Method / Function | Total Tx | Min Gas Used | Max Gas Used | Avg Gas Used | Total Gas Used |\n';
        markdown += '| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n';
        for (const row of rows) {
            markdown += `| ${row.contract} | **${row.method}** | ${row.count} | ${row.minGas} | ${row.maxGas} | ${row.avgGas} | ${row.totalGas} |\n`;
        }
        if (rows.length === 0) {
            markdown += '| - | - | - | - | - | - | - |\n';
        }

        // Build HTML Table Rows
        let tableRowsHtml = '';
        let chartRowsHtml = '';
        if (rows.length === 0) {
            tableRowsHtml = `                        <tr>
                            <td colspan="8" class="no-data">No transactions recorded yet</td>
                        </tr>`;
            chartRowsHtml = `<div class="no-data">No transactions recorded yet</div>`;
        } else {
            rows.forEach((row, index) => {
                const pct = maxAvgGas > 0 ? Math.round((row.avgGas / maxAvgGas) * 100) : 0;
                tableRowsHtml += `                        <tr data-contract="${row.contract}" data-method="${row.method}">
                            <td class="text-center" style="color: var(--text-secondary); font-weight: 600;">${index + 1}</td>
                            <td><span class="contract-badge">${row.contract}</span></td>
                            <td><span class="method-name">${row.method}</span></td>
                            <td class="text-center">${row.count}</td>
                            <td class="text-right">${row.minGas.toLocaleString()}</td>
                            <td class="text-right">${row.maxGas.toLocaleString()}</td>
                            <td class="text-right" style="font-weight: 600; color: #fff;">${row.avgGas.toLocaleString()}</td>
                            <td>
                                <div class="gas-bar-container">
                                    <div class="gas-bar-bg">
                                        <div class="gas-bar-fill" style="width: ${pct}%;"></div>
                                    </div>
                                    <span class="gas-bar-value">${pct}%</span>
                                </div>
                            </td>
                        </tr>\n`;

                chartRowsHtml += `                <div class="chart-row" data-contract="${row.contract}" data-method="${row.method}">
                    <div class="chart-label" title="${row.contract}.${row.method}">${row.contract}.${row.method}</div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" data-width="${pct}"></div>
                        <div class="chart-bar-value">${row.avgGas.toLocaleString()} gas</div>
                    </div>
                </div>\n`;
            });
        }

        const peakMethodName = peakGasMethod.split('.')[1] || peakGasMethod;
        const avgGasVal = totalTx > 0 ? Math.round(totalGas / totalTx) : 0;

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gas Consumption Report</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: #151d30;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent-primary: #6366f1;
            --accent-secondary: #a855f7;
            --accent-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            --border-color: #22314f;
            --success-color: #10b981;
            --warning-color: #f59e0b;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            padding: 2.5rem;
            line-height: 1.5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2.5rem;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 1.5rem;
        }

        .header-title h1 {
            font-size: 2.25rem;
            font-weight: 700;
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }

        .header-title p {
            color: var(--text-secondary);
            font-size: 0.95rem;
        }

        .timestamp {
            font-size: 0.85rem;
            color: var(--text-secondary);
            background: var(--card-bg);
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            border: 1px solid var(--border-color);
        }

        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2.5rem;
        }

        .stat-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 1rem;
            padding: 1.5rem;
            position: relative;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px -10px rgba(99, 102, 241, 0.2);
            border-color: rgba(99, 102, 241, 0.4);
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: var(--accent-gradient);
        }

        .stat-label {
            color: var(--text-secondary);
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }

        .stat-value {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
        }

        .stat-desc {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }

        /* Controls */
        .controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            gap: 1rem;
        }

        .search-wrapper {
            position: relative;
            flex-grow: 1;
            max-width: 400px;
        }

        .search-input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 2.5rem;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 0.75rem;
            color: var(--text-primary);
            font-family: inherit;
            font-size: 0.9rem;
            outline: none;
            transition: border-color 0.2s;
        }

        .search-input:focus {
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        .search-icon {
            position: absolute;
            left: 0.85rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
            pointer-events: none;
        }

        /* Table Card */
        .table-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            margin-bottom: 2.5rem;
        }

        .table-responsive {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.9rem;
        }

        th {
            background-color: rgba(34, 49, 79, 0.4);
            color: var(--text-secondary);
            font-weight: 600;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--border-color);
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        td {
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-primary);
            vertical-align: middle;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr {
            transition: background-color 0.15s;
        }

        tr:hover {
            background-color: rgba(99, 102, 241, 0.04);
        }

        .contract-badge {
            background: rgba(99, 102, 241, 0.15);
            color: #818cf8;
            padding: 0.25rem 0.5rem;
            border-radius: 0.375rem;
            font-size: 0.75rem;
            font-weight: 600;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .method-name {
            font-family: 'Courier New', Courier, monospace;
            font-weight: bold;
            color: #e2e8f0;
            font-size: 0.95rem;
        }

        .gas-bar-container {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            min-width: 180px;
        }

        .gas-bar-bg {
            flex-grow: 1;
            height: 6px;
            background: rgba(34, 49, 79, 0.6);
            border-radius: 9999px;
            overflow: hidden;
        }

        .gas-bar-fill {
            height: 100%;
            background: var(--accent-gradient);
            border-radius: 9999px;
        }

        .gas-bar-value {
            font-weight: 600;
            min-width: 60px;
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        .no-data {
            padding: 3rem;
            text-align: center;
            color: var(--text-secondary);
            font-size: 1rem;
        }

        /* Chart Section */
        .chart-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 1rem;
            padding: 1.5rem;
            margin-top: 2.5rem;
        }

        .chart-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .chart-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .chart-row {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .chart-label {
            width: 180px;
            font-size: 0.8rem;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: monospace;
        }

        .chart-bar-wrapper {
            flex-grow: 1;
            height: 24px;
            background: rgba(34, 49, 79, 0.4);
            border-radius: 4px;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
        }

        .chart-bar {
            height: 100%;
            background: var(--accent-gradient);
            transition: width 1s ease-out;
            width: 0;
        }

        .chart-bar-value {
            position: absolute;
            left: 10px;
            font-size: 0.75rem;
            font-weight: 700;
            color: #fff;
            text-shadow: 0 1px 2px rgba(0,0,0,0.6);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header-title">
                <h1>Smart Contract Gas Consumption</h1>
                <p>Performance benchmark analytical profile of transaction execution costs</p>
            </div>
            <div class="timestamp">
                Generated: <span id="generation-date"></span>
            </div>
        </header>

        <!-- Stats Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Gas Consumed</div>
                <div class="stat-value" style="color: #c084fc;">${totalGas.toLocaleString()}</div>
                <div class="stat-desc">Cumulative gas across all transactions</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Transactions</div>
                <div class="stat-value" style="color: #60a5fa;">${totalTx.toLocaleString()}</div>
                <div class="stat-desc">Successful benchmark executions</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average Gas Per Tx</div>
                <div class="stat-value" style="color: #34d399;">${avgGasVal.toLocaleString()}</div>
                <div class="stat-desc">Weighted average across all operations</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Peak Gas Operation</div>
                <div class="stat-value" style="color: #f87171; font-size: 1.25rem; height: 1.75rem; display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${peakGasMethod}">${peakMethodName}</div>
                <div class="stat-desc">Max: ${peakGasValue.toLocaleString()} gas</div>
            </div>
        </div>

        <!-- Controls -->
        <div class="controls">
            <div class="search-wrapper">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.11-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <input type="text" id="search" class="search-input" placeholder="Search by contract or function name...">
            </div>
        </div>

        <!-- Table Card -->
        <div class="table-card">
            <div class="table-responsive">
                <table id="gas-table">
                    <thead>
                        <tr>
                            <th style="width: 60px;" class="text-center">#</th>
                            <th>Contract</th>
                            <th>Method / Function</th>
                            <th class="text-center">Total Tx</th>
                            <th class="text-right">Min Gas</th>
                            <th class="text-right">Max Gas</th>
                            <th class="text-right">Avg Gas Used</th>
                            <th style="width: 250px;">Avg Gas Intensity</th>
                        </tr>
                    </thead>
                    <tbody id="table-body">
${tableRowsHtml}                    </tbody>
                </table>
            </div>
        </div>

        <!-- Chart Card -->
        <div class="chart-card">
            <div class="chart-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" style="color: var(--accent-primary);">
                    <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2zm-3 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6zM5 9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9z"/>
                </svg>
                Average Gas Consumption Breakdown (Avg Gas Used)
            </div>
            <div class="chart-container" id="chart-container">
${chartRowsHtml}            </div>
        </div>
    </div>

    <script>
        document.getElementById('generation-date').textContent = new Date().toLocaleString();

        // Animate chart bars after loading
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const bars = document.querySelectorAll('.chart-bar');
                bars.forEach(bar => {
                    const width = bar.getAttribute('data-width');
                    bar.style.width = width + '%';
                });
            }, 100);
        });

        // Search filtering
        const searchInput = document.getElementById('search');
        const tableRows = document.querySelectorAll('#table-body tr');
        const chartRows = document.querySelectorAll('.chart-row');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();

            tableRows.forEach(row => {
                const contract = row.getAttribute('data-contract') ? row.getAttribute('data-contract').toLowerCase() : '';
                const method = row.getAttribute('data-method') ? row.getAttribute('data-method').toLowerCase() : '';
                if (contract.includes(query) || method.includes(query)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });

            chartRows.forEach(row => {
                const contract = row.getAttribute('data-contract') ? row.getAttribute('data-contract').toLowerCase() : '';
                const method = row.getAttribute('data-method') ? row.getAttribute('data-method').toLowerCase() : '';
                if (contract.includes(query) || method.includes(query)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    </script>
</body>
</html>`;

        fs.writeFileSync(mdPath, markdown);
        fs.writeFileSync(htmlPath, html);
    }

    /**
     * Release the given Ethereum context.
     * @async
     */
    async releaseContext() {
        this.writeGasReport();
    }

    /**
     * Submit a transaction to the ethereum context.
     * @param {EthereumInvoke} request Methods call data.
     * @return {Promise<TxStatus>} Result and stats of the transaction invocation.
     */
    async _sendSingleRequest(request) {
        if (request.privacy) {
            return this._sendSinglePrivateRequest(request);
        }

        const context = this.context;
        let status = new TxStatus();

        let fromAddress = request.fromAddress || context.fromAddress;
        if (request.privateKey) {
            try {
                const account = this.web3.eth.accounts.privateKeyToAccount(request.privateKey);
                if (!this.web3.eth.accounts.wallet[account.address]) {
                    this.web3.eth.accounts.wallet.add(request.privateKey);
                }
                fromAddress = account.address;
            } catch (e) {
                logger.error('Failed to add private key to wallet: ' + e.message);
            }
        }

        let params = {from: fromAddress};
        if (request.hasOwnProperty('value') && request.value > 0) {
            params.value = request.value;
        }
        let contractInfo = context.contracts[request.contract];

        let receipt = null;
        let methodType = 'send';
        if (request.readOnly) {
            methodType = 'call';
        } else if (context.nonces) {
            if (typeof context.nonces[fromAddress] === 'undefined') {
                context.locks = context.locks || new Map();
                let lock = context.locks.get(fromAddress) || Promise.resolve();
                let nextLock = lock.then(async () => {
                    if (typeof context.nonces[fromAddress] === 'undefined') {
                        context.nonces[fromAddress] = await this.web3.eth.getTransactionCount(fromAddress);
                    }
                });
                context.locks.set(fromAddress, nextLock);
                await nextLock;
            }
            let nonce = context.nonces[fromAddress];
            context.nonces[fromAddress] = nonce + 1;
            params.nonce = nonce;

            // leaving these values unset causes web3 to fetch gasPrice and
            // chainId on the fly. This can cause transactions to be
            // reordered, which in turn causes nonce failures
            params.gasPrice = context.gasPrice;
            params.chainId = context.chainId;
        }

        const onFailure = (err) => {
            status.SetStatusFail();
            logger.error(`Failed tx on ${request.contract}; calling method: ${request.verb}; nonce: ${params.nonce}`);
            logger.error(err);
        };

        const onSuccess = (rec) => {
            status.SetID(rec.transactionHash);
            status.SetResult(rec);
            status.SetVerification(true);
            status.SetStatusSuccess();

            if (rec && typeof rec.gasUsed !== 'undefined') {
                const gasUsed = Number(rec.gasUsed);
                const method = request.verb;
                const contract = request.contract;
                this.accumulateGas(contract, method, gasUsed);
            }
        };

        if (request.args) {
            if (contractInfo.gas && contractInfo.gas[request.verb]) {
                params.gas = contractInfo.gas[request.verb];
            } else if (contractInfo.estimateGas) {
                params.gas = 1000 + await contractInfo.contract.methods[request.verb](...request.args).estimateGas();
            } else {
                params.gas = (this.ethereumConfig.gas && this.ethereumConfig.gas.limit) || 3000000;
            }

            try {
                receipt = await contractInfo.contract.methods[request.verb](...request.args)[methodType](params);
                onSuccess(receipt);
            } catch (err) {
                onFailure(err);
            }
        } else {
            if (contractInfo.gas && contractInfo.gas[request.verb]) {
                params.gas = contractInfo.gas[request.verb];
            } else if (contractInfo.estimateGas) {
                params.gas = 1000 + await contractInfo.contract.methods[request.verb].estimateGas(params);
            } else {
                params.gas = (this.ethereumConfig.gas && this.ethereumConfig.gas.limit) || 3000000;
            }

            try {
                receipt = await contractInfo.contract.methods[request.verb]()[methodType](params);
                onSuccess(receipt);
            } catch (err) {
                onFailure(err);
            }
        }

        return status;
    }

    /**
     * Submit a private transaction to the ethereum context.
     * @param {EthereumInvoke} request Methods call data.
     * @return {Promise<TxStatus>} Result and stats of the transaction invocation.
     */
    async _sendSinglePrivateRequest(request) {
        const context = this.context;
        const web3eea = context.web3eea;
        const contractInfo = context.contracts[request.contract];
        const privacy = request.privacy;
        const sender = privacy.sender;

        const status = new TxStatus();

        const onFailure = (err) => {
            status.SetStatusFail();
            logger.error(`Failed private tx on ${request.contract}; calling method: ${request.verb}; private nonce: ` + 0);
            logger.error(err);
        };

        const onSuccess = (rec) => {
            status.SetID(rec.transactionHash);
            status.SetResult(rec);
            status.SetVerification(true);
            status.SetStatusSuccess();

            if (rec && typeof rec.gasUsed !== 'undefined') {
                const gasUsed = Number(rec.gasUsed);
                const method = request.verb;
                const contract = request.contract;
                this.accumulateGas(contract, method, gasUsed);
            }
        };

        let payload;
        if (request.args) {
            payload = contractInfo.contract.methods[request.verb](...request.args).encodeABI();
        } else {
            payload = contractInfo.contract.methods[request.verb]().encodeABI();
        }

        const transaction = {
            to: contractInfo.contract._address,
            data: payload
        };

        try {
            if (request.readOnly) {
                transaction.privacyGroupId = await this.resolvePrivacyGroup(privacy);

                const value = await web3eea.priv.call(transaction);
                onSuccess(value);
            } else {
                transaction.nonce = sender.nonce;
                transaction.privateKey = sender.privateKey.substring(2);
                this.setPrivateTransactionParticipants(transaction, privacy);

                const txHash = await web3eea.eea.sendRawTransaction(transaction);
                const rcpt = await web3eea.priv.getTransactionReceipt(txHash, transaction.privateFrom);
                if (rcpt.status === '0x1')  {
                    onSuccess(rcpt);
                } else {
                    onFailure(rcpt);
                }
            }
        } catch(err) {
            onFailure(err);
        }

        return status;
    }


    /**
     * Deploys a new contract using the given web3 instance
     * @param {JSON} contractData Contract data with abi, bytecode and gas properties
     * @returns {Promise<web3.eth.Contract>} The deployed contract instance
     */
    async deployContract(contractData) {
        const web3 = this.web3;
        const contractDeployerAddress = this.ethereumConfig.contractDeployerAddress;
        const contract = new web3.eth.Contract(contractData.abi);
        const contractDeploy = contract.deploy({
            data: contractData.bytecode
        });

        try {
            return contractDeploy.send({
                from: contractDeployerAddress,
                gas: contractData.gas
            });
        } catch (err) {
            throw(err);
        }
    }

    /**
     * Deploys a new contract using the given web3 instance
     * @param {JSON} contractData Contract data with abi, bytecode and gas properties
     * @param {JSON} privacy Privacy options
     * @returns {Promise<web3.eth.Contract>} The deployed contract instance
     */
    async deployPrivateContract(contractData, privacy) {
        const web3 = this.web3;
        const web3eea = this.web3eea;
        // Using randomly generated account to deploy private contract to avoid public/private nonce issues
        const deployerAccount =  web3.eth.accounts.create();

        const transaction = {
            data: contractData.bytecode,
            nonce: deployerAccount.nonce,
            privateKey: deployerAccount.privateKey.substring(2),    // web3js-eea doesn't not accept private keys prefixed by '0x'
        };

        this.setPrivateTransactionParticipants(transaction, privacy);

        try {
            const txHash = await web3eea.eea.sendRawTransaction(transaction);
            const txRcpt = await web3eea.priv.getTransactionReceipt(txHash, transaction.privateFrom);

            if (txRcpt.status === '0x1') {
                return new web3.eth.Contract(contractData.abi, txRcpt.contractAddress);
            } else {
                const msg = `Failed private transaction hash ${txHash}`;
                logger.error(msg);
                throw new Error(msg);
            }
        } catch (err) {
            logger.error('Error deploying private contract: ', JSON.stringify(err));
            throw(err);
        }
    }

    /**
     * It passes deployed contracts addresses to all workers (only known after deploy contract)
     * @param {Number} number of workers to prepare
     * @returns {Array} worker args
     * @async
     */
    async prepareWorkerArguments(number) {
        let result = [];
        for (let i = 0 ; i<= number ; i++) {
            result[i] = {contracts: this.ethereumConfig.contracts};
        }
        return result;
    }

    /**
     * Returns the privacy group id depending on the privacy mode being used
     * @param {JSON} privacy Privacy options
     * @returns {Promise<string>} The privacyGroupId
     */
    async resolvePrivacyGroup(privacy) {
        const web3eea = this.context.web3eea;

        switch(privacy.groupType) {
        case 'legacy': {
            const privGroups = await web3eea.priv.findPrivacyGroup({addresses: [privacy.privateFrom, ...privacy.privateFor]});
            if (privGroups.length > 0) {
                return privGroups.filter(function(el) {
                    return el.type === 'LEGACY';
                })[0].privacyGroupId;
            } else {
                throw new Error('There are multiple legacy privacy groups with same members. Can\'t resolve privacyGroupId.');
            }
        }
        case 'pantheon':
        case 'onchain': {
            return privacy.privacyGroupId;
        } default: {
            throw new Error('Invalid privacy type');
        }
        }
    }

    /**
     * Set the participants of a privacy transaction depending on the privacy mode being used
     * @param {JSON} transaction Object representing the transaction fields
     * @param {JSON} privacy Privacy options
     */
    setPrivateTransactionParticipants(transaction, privacy) {
        switch(privacy.groupType) {
        case 'legacy': {
            transaction.privateFrom = privacy.privateFrom;
            transaction.privateFor = privacy.privateFor;
            break;
        }
        case 'pantheon':
        case 'onchain': {
            transaction.privateFrom = privacy.privateFrom;
            transaction.privacyGroupId = privacy.privacyGroupId;
            break;
        } default: {
            throw new Error('Invalid privacy type');
        }
        }
    }
}

module.exports = EthereumConnector;
