const fs = require("fs");
const { ethers } = require("ethers");
const wcwidth = require("wcwidth");

// Load ABI dari abi.json
const abiData = JSON.parse(fs.readFileSync("abi.json", "utf8"));
const ROUTER_ABI = abiData.ROUTER_ABI;
const USDT_ABI = abiData.USDT_ABI;

// Konfigurasi RPC & contract
const RPC_ENDPOINTS = ["https://evmrpc-testnet.0g.ai"];
const usdtAddress = "0x9A87C2412d500343c073E5Ae5394E3bE3874F76b";
const ethAddress = "0xce830D0905e0f7A9b300401729761579c5FB6bd6";

// Router addresses
const ROUTER_ADDRESSES = {
    1: "0xD86b764618c6E3C078845BE3c3fCe50CE9535Da7", // Swap 0g Platform (hub.0g.ai)
    2: "0xE233D75Ce6f04C04610947188DEC7C55790beF3b", // Swap Zer0 Platform
};

// Load private keys dari file
const privateKeys = fs.readFileSync("pk.txt", "utf8").trim().split("\n");

// Setup provider
const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[0]);
function showBanner() {
    const banner = `
    \x1b[34m███████╗███╗   ██╗██████╗     \x1b[0m   
   \x1b[34m██╔════╝████╗  ██║██╔══██╗    \x1b[0m   
  \x1b[34m█████╗  ██╔██╗ ██║██║  ██║    \x1b[0m   
 \x1b[34m██╔══╝  ██║╚██╗██║██║  ██║    \x1b[0m   
\x1b[34m███████╗██║ ╚████║██████╔╝    \x1b[0m   
\x1b[34m╚══════╝╚═╝  ╚═══╝╚═════╝     \x1b[0m
    
====================================================    
     \x1b[35mAutomation\x1b[0m         : \x1b[36mAuto Install Node and Bot\x1b[0m    
     \x1b[35mTelegram Channel\x1b[0m   : \x1b[36m@endingdrop\x1b[0m    
     \x1b[35mTelegram Group\x1b[0m     : \x1b[36m@endingdrop\x1b[0m    
====================================================    
    `;
    console.log(banner);
}

function logSuccess(message) {
    const statusText = "✅ [SUCCESS]"; 
    const statusTextWithColor = "\x1b[32m✅ [SUCCESS]\x1b[0m"; 
    const paddedStatus = statusTextWithColor.padEnd(20 - (wcwidth(statusText) - statusText.length));
    console.log(`${paddedStatus} \x1b[32m${message}\x1b[0m`); 
}

function logError(message) {
    const statusText = "❌ [ERROR]"; 
    const statusTextWithColor = "\x1b[31m❌ [ERROR]\x1b[0m"; 
    const paddedStatus = statusTextWithColor.padEnd(20 - (wcwidth(statusText) - statusText.length));
    console.log(`${paddedStatus} \x1b[31m${message}\x1b[0m`); 
}

function logInfo(message) {
    const statusText = "ℹ️ [INFO]";
    const statusTextWithColor = "\x1b[33mℹ️ [INFO]\x1b[0m"; 
    const paddedStatus = statusTextWithColor.padEnd(20 - (wcwidth(statusText) - statusText.length));
    console.log(`${paddedStatus} \x1b[33m${message}\x1b[0m`); 
}

function showCountdown(targetTime) {
    const now = new Date();
    const timeDiff = targetTime - now;

    if (timeDiff <= 0) {
        process.stdout.write("\r\x1b[33mWaktu swap berikutnya telah tiba!\x1b[0m\n");
        return;
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    process.stdout.write(
        `\r\x1b[33mCountdown hingga swap berikutnya: ${hours} jam ${minutes} menit ${seconds} detik\x1b[0m`
    );
}

async function swapUsdtToEth(wallet, amountIn, routerAddress) {
    try {
        const nonce = await provider.getTransactionCount(wallet.address, "pending");
        logInfo(`[${wallet.address}] Using nonce ${nonce} for USDT approval`);

        // Inisialisasi contract
        const usdtContract = new ethers.Contract(usdtAddress, USDT_ABI, wallet);
        const routerContract = new ethers.Contract(routerAddress, ROUTER_ABI, wallet);

        // Approve USDT
        const approveTx = await usdtContract.approve(routerAddress, amountIn, {
            nonce,
            gasLimit: 105646, // Gas limit untuk approve (75% dari 140,861)
            gasPrice: 100000,
        });
        await approveTx.wait();
        logSuccess(`[${wallet.address}] Approval successful: ${approveTx.hash}`);

        // Ambil nonce baru
        const swapNonce = await provider.getTransactionCount(wallet.address, "pending");
        logInfo(`[${wallet.address}] Using nonce ${swapNonce} for swap USDT to ETH`);

        const deadline = Math.floor(Date.now() / 1000) + 300;
        const swapTx = await routerContract.exactInputSingle({
            tokenIn: usdtAddress,
            tokenOut: ethAddress,
            fee: 3000,
            recipient: wallet.address,
            deadline,
            amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0,
        }, {
            nonce: swapNonce,
            gasLimit: 140861, // Gas limit untuk swap
            gasPrice: 100000,
        });

        await swapTx.wait();
        logSuccess(`[${wallet.address}] Transaction successful: ${swapTx.hash}`);
    } catch (error) {
        logError(`[${wallet.address}] Error swapping USDT to ETH: ${error.message}`);
    }
}
// Fungsi untuk swap ETH ke USDT
async function swapEthToUsdt(wallet, amountIn, routerAddress) {
    try {
        const ethContract = new ethers.Contract(ethAddress, USDT_ABI, wallet);
        const nonce = await provider.getTransactionCount(wallet.address, "pending");
        logInfo(`[${wallet.address}] Using nonce ${nonce} for ETH approval`);

        const approveTx = await ethContract.approve(routerAddress, amountIn, {
            nonce,
            gasLimit: 105646,
            gasPrice: 100000, 
        });
        await approveTx.wait();
        logSuccess(`[${wallet.address}] ETH approval successful: ${approveTx.hash}`);

        // Inisialisasi kontrak router
        const routerContract = new ethers.Contract(routerAddress, ROUTER_ABI, wallet);

        // Swap ETH ke USDT
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 menit dari sekarang
        const swapTx = await routerContract.exactInputSingle(
            {
                tokenIn: ethAddress,
                tokenOut: usdtAddress,
                fee: 3000,
                recipient: wallet.address,
                deadline,
                amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            },
            {
                gasLimit: 140861,
                gasPrice: 100000,
            }
        );

        await swapTx.wait();
        logSuccess(`[${wallet.address}] Swap ETH to USDT successful: ${swapTx.hash}`);
    } catch (error) {
        logError(`[${wallet.address}] Error swapping ETH to USDT: ${error.message}`);
    }
}

// Fungsi utama untuk menjalankan swap
async function runSwap(usdtAmountIn, ethAmountIn, swapCount, routerAddress) {
    for (const privateKey of privateKeys) {
        const wallet = new ethers.Wallet(privateKey.trim(), provider);
        logInfo(`[${wallet.address}] Starting swap process...`);

        for (let i = 0; i < swapCount; i++) {
            logInfo(`[${wallet.address}] Swap attempt ${i + 1}/${swapCount}`);
            await swapUsdtToEth(wallet, usdtAmountIn, routerAddress);
            await swapEthToUsdt(wallet, ethAmountIn, routerAddress);
        }
    }
}

showBanner();

// Input jumlah USDT, ETH, dan jumlah transaksi swap dari pengguna
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Pilih platform
readline.question(
    "Pilih platform:\n1. Swap 0g Platform (hub.0g.ai)\n2. Swap Zer0 Platform\nPilihan Anda: ",
    async (choice) => {
        const routerAddress = ROUTER_ADDRESSES[choice];
        if (!routerAddress) {
            logError("Pilihan tidak valid!");
            readline.close();
            return;
        }
        readline.question("Masukkan jumlah USDT yang ingin di-swap: ", async (usdtAmount) => {
            const usdtAmountIn = ethers.parseUnits(usdtAmount, 18); // Konversi ke unit yang sesuai

            readline.question("Masukkan jumlah ETH yang ingin di-swap: ", async (ethAmount) => {
                const ethAmountIn = ethers.parseUnits(ethAmount, 18); // Konversi ke unit yang sesuai

                readline.question("Masukkan jumlah transaksi swap per akun: ", async (count) => {
                    const swapCount = parseInt(count, 10); // Konversi ke integer
                    readline.close();

                    // Jalankan swap pertama kali
                    await runSwap(usdtAmountIn, ethAmountIn, swapCount, routerAddress);

                    // Set interval untuk menjalankan swap setiap jam 09:00
                    const interval = setInterval(async () => {
                        const now = new Date();
                        const targetTime = new Date(now);
                        targetTime.setHours(9, 0, 0, 0); // Set target waktu ke jam 09:00

                        // Jika hari ini sudah lewat jam 09:00, set target ke jam 09:00 besok
                        if (now > targetTime) {
                            targetTime.setDate(targetTime.getDate() + 1);
                        }

                        // Tampilkan countdown
                        showCountdown(targetTime);

                        // Jika waktu saat ini adalah jam 09:00, jalankan swap
                        if (now.getHours() === 9 && now.getMinutes() === 0) {
                            process.stdout.write("\n"); // Pindah ke baris baru setelah countdown
                            logInfo("Running scheduled swap at 09:00...");
                            await runSwap(usdtAmountIn, ethAmountIn, swapCount, routerAddress);
                        }
                    }, 1000); // Cek setiap detik

                    // Hentikan interval jika program selesai
                    process.on("SIGINT", () => {
                        clearInterval(interval);
                        process.exit();
                    });
                });
            });
        });
    }
);
