require('dotenv').config();
const { ethers } = require('ethers');
const readline = require('readline');

const CONFIG = {
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    RPC_URL: process.env.RPC_URL || 'https://rpc.soneium.org',
    
    L2_POOL_ADDRESS: '0xDd3d7A7d03D9fD9ef45f3E587287922eF65CA38B',
    USDC_ADDRESS: '0xbA9986D2381edf1DA03B0B9c1f8b00dc4AacC369',
    
    SUPPLY_AMOUNT: ethers.parseUnits('1.1', 6), 
    MAX_UINT256: ethers.MaxUint256, 
    GAS_LIMIT: 300000
};

const L2_POOL_ABI = [
    "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
    "function withdraw(address asset, uint256 amount, address to) external returns (uint256)"
];

const USDC_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)"
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class BotSupplyAuto {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
        this.l2Pool = new ethers.Contract(CONFIG.L2_POOL_ADDRESS, L2_POOL_ABI, this.wallet);
        this.usdc = new ethers.Contract(CONFIG.USDC_ADDRESS, USDC_ABI, this.wallet);
        
        this.mbote = false;
        this.loopSaiki = 0;
        this.totalLoop = 0;
        this.sudahApprove = false; 
    }

    async turu(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async tanyaLoop() {
        return new Promise((resolve) => {
            rl.question('📝 Piyé, arep loop ping pira? Ketik angka: ', (jawaban) => {
                const jumlah = parseInt(jawaban);
                if (isNaN(jumlah) || jumlah <= 0) {
                    console.log('❌ Oalah, ketik angka sing bener!');
                    process.exit(1);
                }
                resolve(jumlah);
            });
        });
    }

    async cekGas() {
        try {
            const feeData = await this.provider.getFeeData();
            return feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
        } catch (error) {
            return ethers.parseUnits('0.001', 'gwei');
        }
    }

    async approveUSDCE() {
        try {
            console.log('🔄 Lagi approve USDC MAX UINT256...');
            
            const gasPrice = await this.cekGas();
            const tx = await this.usdc.approve(
                CONFIG.L2_POOL_ADDRESS,
                CONFIG.MAX_UINT256, 
                { gasLimit: CONFIG.GAS_LIMIT, gasPrice }
            );

            console.log(`📝 Transaksi approve: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Approve MAX UINT256 wes rampung nang block: ${receipt.blockNumber}`);
            
            this.sudahApprove = true; 
            return true;
        } catch (error) {
            console.error('❌ Gagal approve:', error);
            return false;
        }
    }

    async supplyMbok() {
        try {
            console.log('💰 Lagi supply 1.1 USDC...');
            
            const gasPrice = await this.cekGas();
            
            const tx = await this.l2Pool.supply(
                CONFIG.USDC_ADDRESS,
                CONFIG.SUPPLY_AMOUNT, 
                this.wallet.address,
                0, 
                { gasLimit: CONFIG.GAS_LIMIT, gasPrice }
            );

            console.log(`📝 Transaksi supply: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Supply 1.1 USDC wes rampung nang block: ${receipt.blockNumber}`);
            
            if (receipt.logs && receipt.logs.length > 0) {
                console.log(`📊 Jumlah log: ${receipt.logs.length}`);
            }
            
            return receipt;
        } catch (error) {
            console.error('❌ Gagal supply:', error);
            
            if (error.data) {
                console.log('📋 Error data:', error.data);
            }
            if (error.reason) {
                console.log('📋 Error reason:', error.reason);
            }
            
            throw error;
        }
    }

    async withdrawMbok() {
        try {
            console.log('💸 Lagi withdraw MAX UINT256...');
            
            const gasPrice = await this.cekGas();
            const tx = await this.l2Pool.withdraw(
                CONFIG.USDC_ADDRESS,
                CONFIG.MAX_UINT256, 
                this.wallet.address,
                { gasLimit: CONFIG.GAS_LIMIT, gasPrice }
            );

            console.log(`📝 Transaksi withdraw: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Withdraw MAX UINT256 wes rampung nang block: ${receipt.blockNumber}`);
            
            return receipt;
        } catch (error) {
            console.error('❌ Gagal withdraw:', error);
            
            if (error.data) {
                console.log('📋 Error data:', error.data);
            }
            if (error.reason) {
                console.log('📋 Error reason:', error.reason);
            }
            
            throw error;
        }
    }

    async cekDuite() {
        try {
            const balance = await this.usdc.balanceOf(this.wallet.address);
            const decimals = await this.usdc.decimals();
            const balanceFormatted = ethers.formatUnits(balance, decimals);
            
            console.log(`💳 Duite USDC jane: ${balanceFormatted}`);
            return balance;
        } catch (error) {
            console.error('❌ Gagal cek duit:', error);
            return 0;
        }
    }

    async cekAllowance() {
        try {
            const allowance = await this.usdc.allowance(this.wallet.address, CONFIG.L2_POOL_ADDRESS);
            const decimals = await this.usdc.decimals();
            const allowanceFormatted = ethers.formatUnits(allowance, decimals);
            
            console.log(`📊 Allowance USDC: ${allowanceFormatted}`);
            
            if (allowance >= CONFIG.SUPPLY_AMOUNT) {
                console.log('✅ Allowance wes cukup, ora perlu approve maneh');
                this.sudahApprove = true;
            } else {
                console.log('❌ Allowance kurang, perlu approve');
                this.sudahApprove = false;
            }
            
            return allowance;
        } catch (error) {
            console.error('❌ Gagal cek allowance:', error);
            return 0;
        }
    }

    async cekBalanceAToken() {
        try {
            const aTokenAddress = await this.getATokenAddress();
            if (aTokenAddress && aTokenAddress !== ethers.ZeroAddress) {
                const aTokenContract = new ethers.Contract(aTokenAddress, USDC_ABI, this.wallet);
                const balance = await aTokenContract.balanceOf(this.wallet.address);
                const decimals = await aTokenContract.decimals();
                const balanceFormatted = ethers.formatUnits(balance, decimals);
                console.log(`🏦 Balance aToken: ${balanceFormatted}`);
                return balance;
            }
        } catch (error) {
            console.log('ℹ️ Ora iso cek aToken balance (mungkin ora penting)');
        }
        return 0;
    }

    async getATokenAddress() {
        return null; 
    }

    async jalankanLoop() {
        try {
            this.loopSaiki++;
            console.log(`\n🔄 Mbok loop sing ke-${this.loopSaiki}/${this.totalLoop}`);
            console.log('='.repeat(50));

            const duite = await this.cekDuite();
            if (duite < CONFIG.SUPPLY_AMOUNT) {
                throw new Error('Duite USDC kurang, ora cukup! Perlu minimal 1.1 USDC');
            }

            if (this.loopSaiki === 1) {
                await this.cekAllowance();
                
                if (!this.sudahApprove) {
                    console.log('🔄 Allowance kurang, perlu approve MAX UINT256 dulu...');
                    const approved = await this.approveUSDCE();
                    if (!approved) {
                        throw new Error('Gagal approve USDC');
                    }
                    await this.turu(8000); // Turu 8 detik sakwise approve
                }
            }

            console.log('🚀 Lagi eksekusi supply 1.1 USDC...');
            await this.supplyMbok();
            await this.turu(6000); // Turu 6 detik

            await this.cekBalanceAToken();

            console.log('🚀 Lagi eksekusi withdraw MAX UINT256...');
            await this.withdrawMbok();
            await this.turu(6000); // Turu 6 detik maneh

            console.log(`✅ Loop sing ke-${this.loopSaiki} wes rampung!`);
            return true;

        } catch (error) {
            console.error(`❌ Loop sing ke-${this.loopSaiki} gagal:`, error.message);
            
            if (error.message.includes('reverted')) {
                console.log('💡 Saran: Cek maneh contract address lan ABI, pastikan bener');
            }
            
            return false;
        }
    }

    async miwiti() {
        if (this.mbote) {
            console.log('⚠️ Wis mbote kok!');
            return;
        }

        this.mbote = true;
        
        this.totalLoop = await this.tanyaLoop();
        
        console.log('\n🤖 Mbote supply/withdraw auto lagi miwiti...');
        console.log(`📍 Wallet: ${this.wallet.address}`);
        console.log(`🔁 Arep loop: ${this.totalLoop} ping`);
        console.log(`💰 Jumlah supply: 1.1 USDC`);
        console.log(`💸 Jumlah withdraw: MAX UINT256 (semua)`);
        console.log(`⛽ Gas limit: ${CONFIG.GAS_LIMIT}`);
        console.log('='.repeat(50));

        try {
            await this.cekDuite();

            for (let i = 0; i < this.totalLoop && this.mbote; i++) {
                const sukses = await this.jalankanLoop();
                
                if (!sukses) {
                    console.log('⏹️ Mbote ditokne mergo gagal');
                    break;
                }

                if (i < this.totalLoop - 1) {
                    console.log('⏳ Turu 12 detik sakwise loop...');
                    await this.turu(12000);
                }
            }

            console.log('\n🎉 Kabeh loop wes rampung!');
            console.log(`📊 Total loop sing wes dilakoni: ${this.loopSaiki}`);

        } catch (error) {
            console.error('💥 Mbote gagal:', error);
        } finally {
            this.mbote = false;
            rl.close();
        }
    }

    mandeg() {
        this.mbote = false;
        console.log('🛑 Mbote ditokne...');
        rl.close();
    }
}

async function main() {
    if (!process.env.PRIVATE_KEY) {
        console.error('❌ PRIVATE_KEY ra ono nang file .env!');
        process.exit(1);
    }

    if (!process.env.RPC_URL) {
        console.error('❌ RPC_URL ra ono nang file .env!');
        console.log('💡 Contoh: https://arb-mainnet.g.alchemy.com/v2/KEY_NDEKO_KENE');
        process.exit(1);
    }

    const bot = new BotSupplyAuto();
    
    process.on('SIGINT', () => {
        console.log('\n🛑 Ditokne mbote...');
        bot.mandeg();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n🛑 Ditokne mbote...');
        bot.mandeg();
        process.exit(0);
    });

    await bot.miwiti();
}

main().catch(error => {
    console.error('💥 Error:', error);
    rl.close();
    process.exit(1);
});
