const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("BioMesh Integration Tests", function () {
  async function deployFullSystemFixture() {
    const [owner, platformWallet, patient1, patient2, patient3, researcher1, researcher2] = 
      await ethers.getSigners();

    // Deploy DataRegistry
    const DataRegistry = await ethers.getContractFactory("DataRegistry");
    const dataRegistry = await DataRegistry.deploy();
    await dataRegistry.waitForDeployment();

    // Disable cooldown for testing
    await dataRegistry.updateSubmissionCooldown(0);

    // Deploy PaymentProcessor
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
    const paymentProcessor = await PaymentProcessor.deploy(
      await dataRegistry.getAddress(),
      platformWallet.address
    );
    await paymentProcessor.waitForDeployment();

    // Deploy ResearchOracle
    const queryFee = ethers.parseEther("0.01");
    const ResearchOracle = await ethers.getContractFactory("ResearchOracle");
    const researchOracle = await ResearchOracle.deploy(
      await dataRegistry.getAddress(),
      await paymentProcessor.getAddress(),
      queryFee
    );
    await researchOracle.waitForDeployment();

    // Setup permissions
    await dataRegistry.connect(owner).authorizeOracle(await researchOracle.getAddress());
    await paymentProcessor.connect(owner).authorizeOracle(await researchOracle.getAddress());

    return {
      dataRegistry,
      paymentProcessor,
      researchOracle,
      owner,
      platformWallet,
      patient1,
      patient2,
      patient3,
      researcher1,
      researcher2,
      queryFee
    };
  }

  describe("Complete Data Submission Flow", function () {
    it("Should allow multiple patients to submit health data", async function () {
      const { dataRegistry, patient1, patient2, patient3 } = 
        await loadFixture(deployFullSystemFixture);

      const encryptedAge = ethers.zeroPadValue("0x01", 32);
      const encryptedDiagnosis = ethers.zeroPadValue("0x02", 32);
      const encryptedOutcome = ethers.zeroPadValue("0x03", 32);
      const encryptedBiomarker = ethers.zeroPadValue("0x04", 32);
      const inputProof = ethers.zeroPadValue("0x00", 64);

      // Patient 1 submits data
      await expect(
        dataRegistry.connect(patient1).submitHealthData(
          encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
        )
      ).to.emit(dataRegistry, "RecordSubmitted");

      // Patient 2 submits data
      await expect(
        dataRegistry.connect(patient2).submitHealthData(
          encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
        )
      ).to.emit(dataRegistry, "RecordSubmitted");

      // Patient 3 submits data
      await expect(
        dataRegistry.connect(patient3).submitHealthData(
          encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
        )
      ).to.emit(dataRegistry, "RecordSubmitted");

      expect(await dataRegistry.recordCount()).to.equal(3);
    });

    it("Should allow patient to submit multiple records over time", async function () {
      const { dataRegistry, patient1 } = await loadFixture(deployFullSystemFixture);

      const encryptedAge = ethers.zeroPadValue("0x01", 32);
      const encryptedDiagnosis = ethers.zeroPadValue("0x02", 32);
      const encryptedOutcome = ethers.zeroPadValue("0x03", 32);
      const encryptedBiomarker = ethers.zeroPadValue("0x04", 32);
      const inputProof = ethers.zeroPadValue("0x00", 64);

      // Submit initial record
      await dataRegistry.connect(patient1).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );

      // Submit follow-up record
      await dataRegistry.connect(patient1).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );

      const patientRecords = await dataRegistry.getPatientRecords(patient1.address);
      expect(patientRecords.length).to.equal(2);
    });
  });

  describe("Complete Query and Payment Flow", function () {
    it("Should execute query and distribute payments correctly", async function () {
      const { 
        dataRegistry, 
        researchOracle, 
        paymentProcessor,
        patient1, 
        patient2,
        researcher1,
        queryFee 
      } = await loadFixture(deployFullSystemFixture);

      // Submit patient data
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

      // Researcher executes query
      const initialBalance = await ethers.provider.getBalance(researcher1.address);
      
      const tx = await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      await expect(tx).to.emit(researchOracle, "QueryExecuted");

      // Verify patients received earnings
      const patient1Earnings = await paymentProcessor.getPatientEarnings(patient1.address);
      const patient2Earnings = await paymentProcessor.getPatientEarnings(patient2.address);

      expect(patient1Earnings).to.be.gt(0);
      expect(patient2Earnings).to.be.gt(0);
      expect(patient1Earnings).to.equal(patient2Earnings); // Equal split
    });

    it("Should handle multiple queries from different researchers", async function () {
      const { 
        dataRegistry, 
        researchOracle, 
        paymentProcessor,
        patient1,
        researcher1,
        researcher2,
        queryFee 
      } = await loadFixture(deployFullSystemFixture);

      // Submit patient data
      const encryptedAge = ethers.zeroPadValue("0x01", 32);
      const encryptedDiagnosis = ethers.zeroPadValue("0x02", 32);
      const encryptedOutcome = ethers.zeroPadValue("0x03", 32);
      const encryptedBiomarker = ethers.zeroPadValue("0x04", 32);
      const inputProof = ethers.zeroPadValue("0x00", 64);

      await dataRegistry.connect(patient1).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );

      // Researcher 1 query
      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      const patient1EarningsAfterQuery1 = await paymentProcessor.getPatientEarnings(patient1.address);

      // Researcher 2 query
      await researchOracle
        .connect(researcher2)
        .countPatientsByCriteria(250, 50, { value: queryFee });

      const patient1EarningsAfterQuery2 = await paymentProcessor.getPatientEarnings(patient1.address);

      // Patient should earn from both queries
      expect(patient1EarningsAfterQuery2).to.be.gt(patient1EarningsAfterQuery1);
    });

    it("Should accumulate earnings across multiple queries", async function () {
      const { 
        dataRegistry, 
        researchOracle, 
        paymentProcessor,
        patient1,
        researcher1,
        queryFee 
      } = await loadFixture(deployFullSystemFixture);

      const encryptedAge = ethers.zeroPadValue("0x01", 32);
      const encryptedDiagnosis = ethers.zeroPadValue("0x02", 32);
      const encryptedOutcome = ethers.zeroPadValue("0x03", 32);
      const encryptedBiomarker = ethers.zeroPadValue("0x04", 32);
      const inputProof = ethers.zeroPadValue("0x00", 64);

      await dataRegistry.connect(patient1).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );

      // Execute 3 queries
      await researchOracle.connect(researcher1).computeAverageBiomarker(30, 60, 250, { value: queryFee });
      await researchOracle.connect(researcher1).countPatientsByCriteria(250, 50, { value: queryFee });
      await researchOracle.connect(researcher1).computeAverageBiomarker(30, 60, 250, { value: queryFee });

      const totalEarnings = await paymentProcessor.getPatientEarnings(patient1.address);
      const expectedEarnings = (queryFee * 70n) / 100n * 3n; // 70% of 3 queries

      expect(totalEarnings).to.equal(expectedEarnings);
    });
  });

  describe("Patient Data Control", function () {
    it("Should exclude revoked records from queries", async function () {
      const { 
        dataRegistry, 
        researchOracle, 
        paymentProcessor,
        patient1,
        patient2,
        researcher1,
        queryFee 
      } = await loadFixture(deployFullSystemFixture);

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

      // Patient1 revokes their record
      await dataRegistry.connect(patient1).revokeRecord(0);

      // Execute query
      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      // Only patient2 should receive earnings (patient1's record is revoked)
      const patient1Earnings = await paymentProcessor.getPatientEarnings(patient1.address);
      const patient2Earnings = await paymentProcessor.getPatientEarnings(patient2.address);

      expect(patient1Earnings).to.equal(0);
      expect(patient2Earnings).to.be.gt(0);
    });

    it("Should allow patient to revoke and re-submit data", async function () {
      const { dataRegistry, patient1 } = await loadFixture(deployFullSystemFixture);

      const encryptedAge = ethers.zeroPadValue("0x01", 32);
      const encryptedDiagnosis = ethers.zeroPadValue("0x02", 32);
      const encryptedOutcome = ethers.zeroPadValue("0x03", 32);
      const encryptedBiomarker = ethers.zeroPadValue("0x04", 32);
      const inputProof = ethers.zeroPadValue("0x00", 64);

      // Submit initial record
      await dataRegistry.connect(patient1).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );

      // Revoke record
      await dataRegistry.connect(patient1).revokeRecord(0);
      expect(await dataRegistry.isRecordActive(0)).to.equal(false);

      // Submit new record
      await dataRegistry.connect(patient1).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );

      expect(await dataRegistry.isRecordActive(1)).to.equal(true);
      expect(await dataRegistry.recordCount()).to.equal(2);
    });
  });

  describe("Earnings Withdrawal", function () {
    it("Should allow patient to withdraw accumulated earnings", async function () {
      const { 
        dataRegistry, 
        researchOracle, 
        paymentProcessor,
        patient1,
        researcher1,
        queryFee 
      } = await loadFixture(deployFullSystemFixture);

      const encryptedAge = ethers.zeroPadValue("0x01", 32);
      const encryptedDiagnosis = ethers.zeroPadValue("0x02", 32);
      const encryptedOutcome = ethers.zeroPadValue("0x03", 32);
      const encryptedBiomarker = ethers.zeroPadValue("0x04", 32);
      const inputProof = ethers.zeroPadValue("0x00", 64);

      await dataRegistry.connect(patient1).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );

      // Execute multiple queries
      await researchOracle.connect(researcher1).computeAverageBiomarker(30, 60, 250, { value: queryFee });
      await researchOracle.connect(researcher1).countPatientsByCriteria(250, 50, { value: queryFee });

      const earningsBeforeWithdraw = await paymentProcessor.getPatientEarnings(patient1.address);
      expect(earningsBeforeWithdraw).to.be.gt(0);

      // Withdraw earnings
      const initialBalance = await ethers.provider.getBalance(patient1.address);
      const tx = await paymentProcessor.connect(patient1).withdrawEarnings();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const finalBalance = await ethers.provider.getBalance(patient1.address);

      // Verify withdrawal
      expect(finalBalance).to.equal(initialBalance + earningsBeforeWithdraw - gasUsed);
      expect(await paymentProcessor.getPatientEarnings(patient1.address)).to.equal(0);
    });
  });

  describe("Platform Fees", function () {
    it("Should correctly distribute platform fees", async function () {
      const { 
        dataRegistry, 
        researchOracle, 
        paymentProcessor,
        platformWallet,
        patient1,
        researcher1,
        queryFee 
      } = await loadFixture(deployFullSystemFixture);

      const encryptedAge = ethers.zeroPadValue("0x01", 32);
      const encryptedDiagnosis = ethers.zeroPadValue("0x02", 32);
      const encryptedOutcome = ethers.zeroPadValue("0x03", 32);
      const encryptedBiomarker = ethers.zeroPadValue("0x04", 32);
      const inputProof = ethers.zeroPadValue("0x00", 64);

      await dataRegistry.connect(patient1).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );

      const platformBalanceBefore = await ethers.provider.getBalance(platformWallet.address);

      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      const platformBalanceAfter = await ethers.provider.getBalance(platformWallet.address);
      const expectedPlatformFee = (queryFee * 30n) / 100n; // 30% platform share

      expect(platformBalanceAfter - platformBalanceBefore).to.equal(expectedPlatformFee);
    });
  });

  describe("Query History", function () {
    it("Should track researcher query history", async function () {
      const { 
        dataRegistry, 
        researchOracle,
        patient1,
        researcher1,
        queryFee 
      } = await loadFixture(deployFullSystemFixture);

      const encryptedAge = ethers.zeroPadValue("0x01", 32);
      const encryptedDiagnosis = ethers.zeroPadValue("0x02", 32);
      const encryptedOutcome = ethers.zeroPadValue("0x03", 32);
      const encryptedBiomarker = ethers.zeroPadValue("0x04", 32);
      const inputProof = ethers.zeroPadValue("0x00", 64);

      await dataRegistry.connect(patient1).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );

      // Execute queries
      await researchOracle.connect(researcher1).computeAverageBiomarker(30, 60, 250, { value: queryFee });
      await researchOracle.connect(researcher1).countPatientsByCriteria(250, 50, { value: queryFee });

      const queries = await researchOracle.getResearcherQueries(researcher1.address);
      expect(queries.length).to.equal(2);
    });
  });

  describe("System Statistics", function () {
    it("Should track overall system metrics", async function () {
      const { 
        dataRegistry, 
        researchOracle, 
        paymentProcessor,
        patient1,
        patient2,
        researcher1,
        queryFee 
      } = await loadFixture(deployFullSystemFixture);

      const encryptedAge = ethers.zeroPadValue("0x01", 32);
      const encryptedDiagnosis = ethers.zeroPadValue("0x02", 32);
      const encryptedOutcome = ethers.zeroPadValue("0x03", 32);
      const encryptedBiomarker = ethers.zeroPadValue("0x04", 32);
      const inputProof = ethers.zeroPadValue("0x00", 64);

      // Submit data
      await dataRegistry.connect(patient1).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );
      await dataRegistry.connect(patient2).submitHealthData(
        encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof
      );

      // Execute queries
      await researchOracle.connect(researcher1).computeAverageBiomarker(30, 60, 250, { value: queryFee });
      await researchOracle.connect(researcher1).countPatientsByCriteria(250, 50, { value: queryFee });

      // Check statistics
      expect(await dataRegistry.recordCount()).to.equal(2);
      expect(await researchOracle.getTotalQueries()).to.equal(2);

      const stats = await paymentProcessor.getStats();
      expect(stats.totalFees).to.equal(queryFee * 2n);
      expect(stats.totalDist).to.equal((queryFee * 2n * 70n) / 100n);
    });
  });
});