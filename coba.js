const fs = require("fs");
const { ethers } = require("ethers");
const wcwidth = require("wcwidth");

// Load ABI dari abi.json
const abiData = JSON.parse(fs.readFileSync("abi.json", "utf8"));
const ROUTER_ABI = abiData.ROUTER_ABI;
const USDT_ABI = abiData.USDT_ABI;

// Konfigurasi RPC & contract
const RPC_ENDPOINTS = ["https://evmrpc-testnet.0g.ai"];
const routerAddress = "0xD86b764618c6E3C078845BE3c3fCe50CE9535Da7";
const usdtAddress = "0x9A87C2412d500343c073E5Ae5394E3bE3874F76b";
const ethAddress = "0xce830D0905e0f7A9b300401729761579c5FB6bd6";

// Load private keys dari file
const privateKeys = fs.readFileSync("pk.txt", "utf8").trim().split("\n");

// Setup provider
const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[0]);

// Fungsi untuk menampilkan banner dengan warna-warni
function showBanner() {
  const banner = `
    \x1b[34m____\x1b[0m                           
   \x1b[34m/ __ \\____ __________ ______\x1b[0m    
  \x1b[34m/ / / / __ \`/ ___/ __ \`/ ___/\x1b[0m    
 \x1b[34m/ /_/ / /_/ (__  ) /_/ / /\x1b[0m        
\x1b[34m/_____/_\__,_/____/\__,_/_/\x1b[0m          
    
    \x1b[32m____\x1b[0m                       \x1b[33m__\x1b[0m    
   \x1b[32m/ __ \\___  ____ ___  __  __/ /_\x1b[0m \x1b[33m ______  ____ _\x1b[0m    
  \x1b[32m/ /_/ / _ \\/ __ \`__ \\/ / / / / /\x1b[0m \x1b[33m/ __ \/ __ \`/\x1b[0m    
 \x1b[32m/ ____/  __/ / / / / / /_/ / / /\x1b[0m \x1b[33m/ / / / /_/ /\x1b[0m     
\x1b[32m/_/    \___/_/ /_/ /_/\__,_/_/\x1b[0m \x1b[33m/ / /_/\__, /\x1b[0m      
                                         \x1b[33m/____/\x1b[0m        
    
====================================================    
     \x1b[35mAutomation\x1b[0m         : \x1b[36mAuto Install Node and Bot\x1b[0m    
     \x1b[35mTelegram Channel\x1b[0m   : \x1b[36m@dasarpemulung\x1b[0m    
     \x1b[35mTelegram Group\x1b[0m     : \x1b[36m@parapemulung\x1b[0m    
====================================================    
    `;

  console.log(banner);
}

function logSuccess(message) {
  const statusText = "✅ [SUCCESS]"; // Tanpa kode warna ANSI untuk perhitungan wcwidth
  const statusTextWithColor = "\x1b[32m✅ [SUCCESS]\x1b[0m"; // Dengan kode warna ANSI
  const paddedStatus = statusTextWithColor.padEnd(20 - (wcwidth(statusText) - statusText.length));
  console.log(`${paddedStatus} \x1b[32m${message}\x1b[0m`); // Teks berwarna hijau
}

function logError(message) {
  const statusText = "❌ [ERROR]"; // Tanpa kode warna ANSI untuk perhitungan wcwidth
  const statusTextWithColor = "\x1b[31m❌ [ERROR]\x1b[0m"; // Dengan kode warna ANSI
  const paddedStatus = statusTextWithColor.padEnd(20 - (wcwidth(statusText) - statusText.length));
  console.log(`${paddedStatus} \x1b[31m${message}\x1b[0m`); // Teks berwarna merah
}

function logInfo(message) {
  const statusText = "ℹ️ [INFO]"; // Tanpa kode warna ANSI untuk perhitungan wcwidth
  const statusTextWithColor = "\x1b[33mℹ️ [INFO]\x1b[0m"; // Dengan kode warna ANSI
  const paddedStatus = statusTextWithColor.padEnd(20 - (wcwidth(statusText) - statusText.length));
  console.log(`${paddedStatus} \x1b[33m${message}\x1b[0m`); // Teks berwarna kuning
}

// Fungsi untuk menghitung dan menampilkan countdown
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

  // Tampilkan countdown di tempat yang sama
  process.stdout.write(
    `\r\x1b[33mCountdown hingga swap berikutnya: ${hours} jam ${minutes} menit ${seconds} detik\x1b[0m`
  );
}

// Fungsi untuk swap USDT ke ETH
async function swapUsdtToEth(wallet, amountIn) {
    try {
        const nonce = await provider.getTransactionCount(wallet.address, "pending");
        logInfo(`[${wallet.address}] Using nonce ${nonce} for USDT approval`);

        // Inisialisasi contract
        const usdtContract = new ethers.Contract(usdtAddress, USDT_ABI, wallet);
        const routerContract = new ethers.Contract(routerAddress, ROUTER_ABI, wallet);

        // Approve USDT
        const approveTx = await usdtContract.approve(routerAddress, amountIn, {
            nonce,
            gasLimit: 100000,
            gasPrice: (await provider.getFeeData()).gasPrice,
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
            gasLimit: 300000,
            gasPrice: (await provider.getFeeData()).gasPrice,
        });

        await swapTx.wait();
        logSuccess(`[${wallet.address}] Transaction successful: ${swapTx.hash}`);
    } catch (error) {
        logError(`[${wallet.address}] Error swapping USDT to ETH: ${error.message}`);
    }
}

// Fungsi untuk swap ETH ke USDT
async function swapEthToUsdt(wallet, amountIn) {
    try {
        // Inisialisasi kontrak ETH (diperlakukan seperti token ERC-20)
        const ethContract = new ethers.Contract(ethAddress, USDT_ABI, wallet); // Gunakan ABI yang sesuai untuk ETH di jaringan 0g

        // Ambil nonce terbaru
        const nonce = await provider.getTransactionCount(wallet.address, "pending");
        logInfo(`[${wallet.address}] Using nonce ${nonce} for ETH approval`);

        // Approve ETH untuk router
        const approveTx = await ethContract.approve(routerAddress, amountIn, {
            nonce,
            gasLimit: 100000,
            gasPrice: (await provider.getFeeData()).gasPrice,
        });
        await approveTx.wait();
        logSuccess(`[${wallet.address}] ETH approval successful: ${approveTx.hash}`);

        // Inisialisasi kontrak router
        const routerContract = new ethers.Contract(routerAddress, ROUTER_ABI, wallet);

        // Swap ETH ke USDT
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 menit dari sekarang
        const swapTx = await routerContract.exactInputSingle(
            {
                tokenIn: ethAddress, // Alamat ETH (diperlakukan seperti token ERC-20)
                tokenOut: usdtAddress, // Alamat USDT
                fee: 3000, // Fee pool (misalnya, 0.3%)
                recipient: wallet.address, // Alamat penerima USDT
                deadline, // Waktu kadaluarsa
                amountIn, // Jumlah ETH yang akan di-swap
                amountOutMinimum: 0, // Minimum jumlah USDT yang diharapkan
                sqrtPriceLimitX96: 0, // Batas harga (0 untuk tidak ada batasan)
            },
            {
                gasLimit: 300000, // Gas limit
                gasPrice: (await provider.getFeeData()).gasPrice, // Gas price
            }
        );

        await swapTx.wait();
        logSuccess(`[${wallet.address}] Swap ETH to USDT successful: ${swapTx.hash}`);
    } catch (error) {
        logError(`[${wallet.address}] Error swapping ETH to USDT: ${error.message}`);
    }
}
// Fungsi utama untuk menjalankan swap
async function runSwap(usdtAmountIn, ethAmountIn, swapCount) {
    for (const privateKey of privateKeys) {
        const wallet = new ethers.Wallet(privateKey.trim(), provider);
        logInfo(`[${wallet.address}] Starting swap process...`);

        for (let i = 0; i < swapCount; i++) {
            logInfo(`[${wallet.address}] Swap attempt ${i + 1}/${swapCount}`);
            await swapUsdtToEth(wallet, usdtAmountIn);
            await swapEthToUsdt(wallet, ethAmountIn);
        }
    }
}

showBanner();

// Input jumlah USDT, ETH, dan jumlah transaksi swap dari pengguna
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});

readline.question("Masukkan jumlah USDT yang ingin di-swap: ", async (usdtAmount) => {
    const usdtAmountIn = ethers.parseUnits(usdtAmount, 18); // Konversi ke unit yang sesuai

    readline.question("Masukkan jumlah ETH yang ingin di-swap: ", async (ethAmount) => {
        const ethAmountIn = ethers.parseUnits(ethAmount, 18); // Konversi ke unit yang sesuai

        readline.question("Masukkan jumlah transaksi swap per akun: ", async (count) => {
            const swapCount = parseInt(count, 10); // Konversi ke integer
            readline.close();

            // Jalankan swap pertama kali
            await runSwap(usdtAmountIn, ethAmountIn, swapCount);

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
                    await runSwap(usdtAmountIn, ethAmountIn, swapCount);
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