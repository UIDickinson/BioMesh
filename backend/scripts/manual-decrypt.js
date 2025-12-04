/**
 * Manual Decryption Helper Script
 * 
 * This script demonstrates how to manually submit decrypted results
 * for testing purposes. In production, a relayer service would do this automatically.
 * 
 * Usage: 
 *   QUERY_ID=0 SUM=1500 COUNT=3 npx hardhat run scripts/manual-decrypt.js --network sepolia
 */

const hre = require("hardhat");

async function main() {
    const ORACLE_ADDRESS = process.env.RESEARCH_ORACLE_ADDRESS || "0xa1183Dc5cD9bC0772067fC80E31956a63FD17a70";
    
    const queryId = process.env.QUERY_ID;
    const decryptedSum = process.env.SUM;
    const decryptedCount = process.env.COUNT;
    
    if (!queryId || !decryptedSum || !decryptedCount) {
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║              Manual Decryption Helper Script                  ║
╠════════════════════════════════════════════════════════════════╣
║                                                               ║
║  This script submits decrypted results for testing purposes.  ║
║                                                               ║
║  Usage:                                                       ║
║    QUERY_ID=0 SUM=1500 COUNT=3 \\                              ║
║      npx hardhat run scripts/manual-decrypt.js --network sepolia║
║                                                               ║
║  Environment Variables:                                       ║
║    QUERY_ID  - The query ID to decrypt                        ║
║    SUM       - The decrypted sum value (e.g., total biomarker)║
║    COUNT     - The decrypted count of matching records        ║
║                                                               ║
║  Example (for a query that found 3 patients with avg=500):    ║
║    QUERY_ID=0 SUM=1500 COUNT=3 npx hardhat run ...            ║
║                                                               ║
║  ⚠️  WARNING: This is for TESTING ONLY.                       ║
║      In production, the Zama Gateway provides real values.    ║
║                                                               ║
╚════════════════════════════════════════════════════════════════╝
        `);
        
        // List pending decryption requests
        await listPendingDecryptions(ORACLE_ADDRESS);
        return;
    }
    
    console.log("🔓 Manual Decryption Submission");
    console.log("================================\n");
    
    const [signer] = await hre.ethers.getSigners();
    console.log("Using account:", signer.address);
    
    const oracleABI = [
        "function submitDecryptedResult(uint256 queryId, uint64 decryptedSum, uint32 decryptedCount, bytes calldata decryptionProof) external",
        "function queryResults(uint256) view returns (uint256 queryId, address researcher, uint256 recordCount, uint256 encryptedSum, uint256 encryptedCount, uint256 timestamp, bool isDecrypted, uint64 decryptedSum, uint32 decryptedCount)",
        "function isDecryptionRequested(uint256 queryId) view returns (bool)",
        "function decryptionRequested(uint256) view returns (bool)"
    ];
    
    const oracle = new hre.ethers.Contract(ORACLE_ADDRESS, oracleABI, signer);
    
    // Check query status
    console.log(`📋 Query #${queryId} Status:`);
    const result = await oracle.queryResults(queryId);
    console.log("   Researcher:", result.researcher);
    console.log("   Record Count:", result.recordCount.toString());
    console.log("   Is Decrypted:", result.isDecrypted);
    
    if (result.isDecrypted) {
        console.log("\n⚠️  Query is already decrypted!");
        console.log("   Decrypted Sum:", result.decryptedSum.toString());
        console.log("   Decrypted Count:", result.decryptedCount.toString());
        return;
    }
    
    const isRequested = await oracle.isDecryptionRequested(queryId);
    console.log("   Decryption Requested:", isRequested);
    
    if (!isRequested) {
        console.log("\n⚠️  Decryption has not been requested for this query.");
        console.log("   The researcher must first call requestDecryption() from the frontend.");
        return;
    }
    
    // Submit decrypted result
    console.log("\n⏳ Submitting decrypted result...");
    console.log("   Sum:", decryptedSum);
    console.log("   Count:", decryptedCount);
    console.log("   Average:", Math.floor(parseInt(decryptedSum) / parseInt(decryptedCount)));
    
    // Empty proof for testing (in production, this would be KMS signatures)
    const emptyProof = "0x";
    
    try {
        const tx = await oracle.submitDecryptedResult(
            queryId,
            decryptedSum,
            decryptedCount,
            emptyProof
        );
        console.log("\n📝 Transaction submitted:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
        
        // Verify
        const updated = await oracle.queryResults(queryId);
        console.log("\n✅ Decryption Complete!");
        console.log("   Is Decrypted:", updated.isDecrypted);
        console.log("   Decrypted Sum:", updated.decryptedSum.toString());
        console.log("   Decrypted Count:", updated.decryptedCount.toString());
        
    } catch (err) {
        console.error("\n❌ Error:", err.message);
        
        if (err.message.includes("Not your query")) {
            console.log("\n💡 Note: submitDecryptedResult must be called by the query's researcher.");
            console.log("   In production, the contract should accept Gateway signatures instead.");
        }
    }
}

async function listPendingDecryptions(oracleAddress) {
    console.log("\n📋 Checking for pending decryption requests...\n");
    
    const oracleABI = [
        "function queryCount() view returns (uint256)",
        "function queryResults(uint256) view returns (uint256 queryId, address researcher, uint256 recordCount, uint256 encryptedSum, uint256 encryptedCount, uint256 timestamp, bool isDecrypted, uint64 decryptedSum, uint32 decryptedCount)",
        "function isDecryptionRequested(uint256 queryId) view returns (bool)"
    ];
    
    const oracle = new hre.ethers.Contract(oracleAddress, oracleABI, hre.ethers.provider);
    
    try {
        const totalQueries = await oracle.queryCount();
        console.log("Total Queries:", totalQueries.toString());
        
        let pendingCount = 0;
        for (let i = 0; i < totalQueries; i++) {
            const result = await oracle.queryResults(i);
            const isRequested = await oracle.isDecryptionRequested(i);
            
            if (isRequested && !result.isDecrypted) {
                pendingCount++;
                console.log(`\n🔐 Query #${i} - PENDING DECRYPTION`);
                console.log(`   Researcher: ${result.researcher}`);
                console.log(`   Records: ${result.recordCount}`);
                console.log(`   Timestamp: ${new Date(Number(result.timestamp) * 1000).toISOString()}`);
            }
        }
        
        if (pendingCount === 0) {
            console.log("\n✅ No pending decryption requests.");
        } else {
            console.log(`\n📊 Total pending: ${pendingCount}`);
        }
    } catch (err) {
        console.error("Error checking queries:", err.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
