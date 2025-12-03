const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("PaymentProcessor", function () {
  async function deployPaymentProcessorFixture() {
    const [owner, platformWallet, oracle, patient1, patient2, researcher] = await ethers.getSigners();

    // Deploy mock DataRegistry first
    const DataRegistry = await ethers.getContractFactory("DataRegistry");
    const dataRegistry = await DataRegistry.deploy();
    await dataRegistry.waitForDeployment();

    // Disable cooldown for testing
    await dataRegistry.updateSubmissionCooldown(0);

    // Submit test records
    const encryptedAge = ethers.zeroPadValue("0x01", 32);
    const encryptedDiagnosis = ethers.zeroPadValue("0x02", 32);
    const encryptedOutcome = ethers.zeroPadValue("0x03", 32);
    const encryptedBiomarker = ethers.zeroPadValue("0x04", 32);
    const inputProof = ethers.zeroPadValue("0x00", 64);

    await dataRegistry.connect(patient1).submitHealthData(
      encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
    );
    await dataRegistry.connect(patient2).submitHealthData(
      encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
    );

    // Deploy PaymentProcessor
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
    const paymentProcessor = await PaymentProcessor.deploy(
      await dataRegistry.getAddress(),
      platformWallet.address
    );
    await paymentProcessor.waitForDeployment();

    return { 
      paymentProcessor, 
      dataRegistry, 
      owner, 
      platformWallet, 
      oracle, 
      patient1, 
      patient2, 
      researcher 
    };
  }

  describe("Deployment", function () {
    it("Should set correct owner", async function () {
      const { paymentProcessor, owner } = await loadFixture(deployPaymentProcessorFixture);
      expect(await paymentProcessor.owner()).to.equal(owner.address);
    });

    it("Should set correct platform wallet", async function () {
      const { paymentProcessor, platformWallet } = await loadFixture(deployPaymentProcessorFixture);
      expect(await paymentProcessor.platformWallet()).to.equal(platformWallet.address);
    });

    it("Should set correct fee shares", async function () {
      const { paymentProcessor } = await loadFixture(deployPaymentProcessorFixture);
      expect(await paymentProcessor.patientShare()).to.equal(7000); // 70%
      expect(await paymentProcessor.platformShare()).to.equal(3000); // 30%
    });

    it("Should prevent deployment with zero address registry", async function () {
      const [owner, platformWallet] = await ethers.getSigners();
      const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
      
      await expect(
        PaymentProcessor.deploy(ethers.ZeroAddress, platformWallet.address)
      ).to.be.revertedWith("Invalid registry");
    });

    it("Should prevent deployment with zero address platform wallet", async function () {
      const { dataRegistry } = await loadFixture(deployPaymentProcessorFixture);
      const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
      
      await expect(
        PaymentProcessor.deploy(await dataRegistry.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid platform wallet");
    });
  });

  describe("Oracle Authorization", function () {
    it("Should allow owner to authorize oracle", async function () {
      const { paymentProcessor, owner, oracle } = await loadFixture(deployPaymentProcessorFixture);

      const tx = await paymentProcessor.connect(owner).authorizeOracle(oracle.address);
      
      await expect(tx)
        .to.emit(paymentProcessor, "OracleAuthorized")
        .withArgs(oracle.address);

      expect(await paymentProcessor.isAuthorizedOracle(oracle.address)).to.equal(true);
    });

    it("Should prevent non-owner from authorizing oracle", async function () {
      const { paymentProcessor, oracle, patient1 } = await loadFixture(deployPaymentProcessorFixture);

      await expect(
        paymentProcessor.connect(patient1).authorizeOracle(oracle.address)
      ).to.be.revertedWith("Only owner");
    });

    it("Should prevent authorizing zero address oracle", async function () {
      const { paymentProcessor, owner } = await loadFixture(deployPaymentProcessorFixture);

      await expect(
        paymentProcessor.connect(owner).authorizeOracle(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid oracle");
    });

    it("Should allow owner to revoke oracle", async function () {
      const { paymentProcessor, owner, oracle } = await loadFixture(deployPaymentProcessorFixture);

      await paymentProcessor.connect(owner).authorizeOracle(oracle.address);
      
      const tx = await paymentProcessor.connect(owner).revokeOracle(oracle.address);
      
      await expect(tx)
        .to.emit(paymentProcessor, "OracleRevoked")
        .withArgs(oracle.address);

      expect(await paymentProcessor.isAuthorizedOracle(oracle.address)).to.equal(false);
    });
  });

  describe("Payment Distribution", function () {
    it("Should distribute earnings to patients", async function () {
      const { paymentProcessor, owner, oracle, patient1, patient2, researcher } = 
        await loadFixture(deployPaymentProcessorFixture);

      // Authorize oracle
      await paymentProcessor.connect(owner).authorizeOracle(oracle.address);

      const paymentAmount = ethers.parseEther("1.0");
      const recordIds = [0, 1]; // Two records from patient1 and patient2

      const tx = await paymentProcessor
        .connect(oracle)
        .distributeEarnings(recordIds, researcher.address, { value: paymentAmount });

      // Check event emission
      await expect(tx).to.emit(paymentProcessor, "PaymentReceived");
      await expect(tx).to.emit(paymentProcessor, "EarningsDistributed");

      // Verify patient earnings (70% of 1 ETH = 0.7 ETH, split between 2 patients)
      const expectedPerPatient = ethers.parseEther("0.35");
      expect(await paymentProcessor.getPatientEarnings(patient1.address)).to.equal(expectedPerPatient);
      expect(await paymentProcessor.getPatientEarnings(patient2.address)).to.equal(expectedPerPatient);
    });

    it("Should track researcher spending", async function () {
      const { paymentProcessor, owner, oracle, researcher } = 
        await loadFixture(deployPaymentProcessorFixture);

      await paymentProcessor.connect(owner).authorizeOracle(oracle.address);

      const paymentAmount = ethers.parseEther("1.0");
      const recordIds = [0, 1];

      await paymentProcessor
        .connect(oracle)
        .distributeEarnings(recordIds, researcher.address, { value: paymentAmount });

      expect(await paymentProcessor.getResearcherSpending(researcher.address)).to.equal(paymentAmount);
    });

    it("Should prevent distribution from unauthorized oracle", async function () {
      const { paymentProcessor, patient1, researcher } = 
        await loadFixture(deployPaymentProcessorFixture);

      const paymentAmount = ethers.parseEther("1.0");
      const recordIds = [0];

      await expect(
        paymentProcessor
          .connect(patient1)
          .distributeEarnings(recordIds, researcher.address, { value: paymentAmount })
      ).to.be.revertedWith("Only authorized oracle");
    });

    it("Should prevent distribution with zero payment", async function () {
      const { paymentProcessor, owner, oracle, researcher } = 
        await loadFixture(deployPaymentProcessorFixture);

      await paymentProcessor.connect(owner).authorizeOracle(oracle.address);

      const recordIds = [0];

      await expect(
        paymentProcessor
          .connect(oracle)
          .distributeEarnings(recordIds, researcher.address, { value: 0 })
      ).to.be.revertedWith("No payment received");
    });

    it("Should prevent distribution with empty record array", async function () {
      const { paymentProcessor, owner, oracle, researcher } = 
        await loadFixture(deployPaymentProcessorFixture);

      await paymentProcessor.connect(owner).authorizeOracle(oracle.address);

      const paymentAmount = ethers.parseEther("1.0");
      const recordIds = [];

      await expect(
        paymentProcessor
          .connect(oracle)
          .distributeEarnings(recordIds, researcher.address, { value: paymentAmount })
      ).to.be.revertedWith("No records provided");
    });

    it("Should handle duplicate patients correctly", async function () {
      const { paymentProcessor, owner, oracle, patient1, researcher, dataRegistry } = 
        await loadFixture(deployPaymentProcessorFixture);

      // Submit another record from patient1
      const encryptedAge = ethers.zeroPadValue("0x01", 32);
      const encryptedDiagnosis = ethers.zeroPadValue("0x02", 32);
      const encryptedOutcome = ethers.zeroPadValue("0x03", 32);
      const encryptedBiomarker = ethers.zeroPadValue("0x04", 32);
      const inputProof = ethers.zeroPadValue("0x00", 64);

      await dataRegistry.connect(patient1).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );

      await paymentProcessor.connect(owner).authorizeOracle(oracle.address);

      const paymentAmount = ethers.parseEther("1.0");
      const recordIds = [0, 2]; // Both records from patient1

      await paymentProcessor
        .connect(oracle)
        .distributeEarnings(recordIds, researcher.address, { value: paymentAmount });

      // Should get full 70% as there's only one unique patient
      const expectedEarnings = ethers.parseEther("0.7");
      expect(await paymentProcessor.getPatientEarnings(patient1.address)).to.equal(expectedEarnings);
    });
  });

  describe("Earnings Withdrawal", function () {
    it("Should allow patient to withdraw earnings", async function () {
      const { paymentProcessor, owner, oracle, patient1, researcher } = 
        await loadFixture(deployPaymentProcessorFixture);

      await paymentProcessor.connect(owner).authorizeOracle(oracle.address);

      const paymentAmount = ethers.parseEther("1.0");
      const recordIds = [0];

      await paymentProcessor
        .connect(oracle)
        .distributeEarnings(recordIds, researcher.address, { value: paymentAmount });

      const initialBalance = await ethers.provider.getBalance(patient1.address);
      const earnings = await paymentProcessor.getPatientEarnings(patient1.address);

      const tx = await paymentProcessor.connect(patient1).withdrawEarnings();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(patient1.address);

      expect(finalBalance).to.equal(initialBalance + earnings - gasUsed);
      expect(await paymentProcessor.getPatientEarnings(patient1.address)).to.equal(0);
    });

    it("Should emit withdrawal event", async function () {
      const { paymentProcessor, owner, oracle, patient1, researcher } = 
        await loadFixture(deployPaymentProcessorFixture);

      await paymentProcessor.connect(owner).authorizeOracle(oracle.address);

      const paymentAmount = ethers.parseEther("1.0");
      const recordIds = [0];

      await paymentProcessor
        .connect(oracle)
        .distributeEarnings(recordIds, researcher.address, { value: paymentAmount });

      const earnings = await paymentProcessor.getPatientEarnings(patient1.address);

      const tx = await paymentProcessor.connect(patient1).withdrawEarnings();

      await expect(tx)
        .to.emit(paymentProcessor, "EarningsWithdrawn")
        .withArgs(patient1.address, earnings);
    });

    it("Should prevent withdrawal with no earnings", async function () {
      const { paymentProcessor, patient1 } = await loadFixture(deployPaymentProcessorFixture);

      await expect(
        paymentProcessor.connect(patient1).withdrawEarnings()
      ).to.be.revertedWith("No earnings to withdraw");
    });
  });

  describe("Fee Configuration", function () {
    it("Should allow owner to update fee shares", async function () {
      const { paymentProcessor, owner } = await loadFixture(deployPaymentProcessorFixture);

      const newPatientShare = 8000; // 80%
      const newPlatformShare = 2000; // 20%

      const tx = await paymentProcessor
        .connect(owner)
        .updateFeeShares(newPatientShare, newPlatformShare);

      await expect(tx)
        .to.emit(paymentProcessor, "FeeShareUpdated")
        .withArgs(newPatientShare, newPlatformShare);

      expect(await paymentProcessor.patientShare()).to.equal(newPatientShare);
      expect(await paymentProcessor.platformShare()).to.equal(newPlatformShare);
    });

    it("Should prevent invalid fee share totals", async function () {
      const { paymentProcessor, owner } = await loadFixture(deployPaymentProcessorFixture);

      await expect(
        paymentProcessor.connect(owner).updateFeeShares(7500, 2000)
      ).to.be.revertedWith("Shares must sum to 10000");
    });

    it("Should allow owner to update platform wallet", async function () {
      const { paymentProcessor, owner, patient1 } = await loadFixture(deployPaymentProcessorFixture);

      const tx = await paymentProcessor
        .connect(owner)
        .updatePlatformWallet(patient1.address);

      await expect(tx)
        .to.emit(paymentProcessor, "PlatformWalletUpdated")
        .withArgs(patient1.address);

      expect(await paymentProcessor.platformWallet()).to.equal(patient1.address);
    });

    it("Should prevent updating to zero address platform wallet", async function () {
      const { paymentProcessor, owner } = await loadFixture(deployPaymentProcessorFixture);

      await expect(
        paymentProcessor.connect(owner).updatePlatformWallet(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid wallet");
    });
  });

  describe("Statistics", function () {
    it("Should track total fees and distributions correctly", async function () {
      const { paymentProcessor, owner, oracle, researcher } = 
        await loadFixture(deployPaymentProcessorFixture);

      await paymentProcessor.connect(owner).authorizeOracle(oracle.address);

      const paymentAmount = ethers.parseEther("1.0");
      const recordIds = [0, 1];

      await paymentProcessor
        .connect(oracle)
        .distributeEarnings(recordIds, researcher.address, { value: paymentAmount });

      const stats = await paymentProcessor.getStats();
      
      expect(stats.totalFees).to.equal(paymentAmount);
      expect(stats.totalDist).to.equal(ethers.parseEther("0.7")); // 70% distributed
    });
  });
});