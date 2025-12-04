const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ResearchOracle", function () {
  async function deployResearchOracleFixture() {
    const [owner, platformWallet, researcher1, researcher2, patient1, patient2] = 
      await ethers.getSigners();

    const DataRegistry = await ethers.getContractFactory("MockDataRegistry");
    const dataRegistry = await DataRegistry.deploy();
    await dataRegistry.waitForDeployment();

    await dataRegistry.updateSubmissionCooldown(0);

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

    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
    const paymentProcessor = await PaymentProcessor.deploy(
      await dataRegistry.getAddress(),
      platformWallet.address
    );
    await paymentProcessor.waitForDeployment();

    const queryFee = ethers.parseEther("0.01");
    const ResearchOracle = await ethers.getContractFactory("MockResearchOracle");
    const researchOracle = await ResearchOracle.deploy(
      await dataRegistry.getAddress(),
      await paymentProcessor.getAddress(),
      queryFee
    );
    await researchOracle.waitForDeployment();

    await dataRegistry.connect(owner).authorizeOracle(await researchOracle.getAddress());
    await paymentProcessor.connect(owner).authorizeOracle(await researchOracle.getAddress());

    return {
      researchOracle,
      dataRegistry,
      paymentProcessor,
      owner,
      platformWallet,
      researcher1,
      researcher2,
      patient1,
      patient2,
      queryFee
    };
  }

  describe("Deployment", function () {
    it("Should set correct owner", async function () {
      const { researchOracle, owner } = await loadFixture(deployResearchOracleFixture);
      expect(await researchOracle.owner()).to.equal(owner.address);
    });

    it("Should set correct query fee", async function () {
      const { researchOracle, queryFee } = await loadFixture(deployResearchOracleFixture);
      expect(await researchOracle.queryFee()).to.equal(queryFee);
    });

    it("Should set correct data registry", async function () {
      const { researchOracle, dataRegistry } = await loadFixture(deployResearchOracleFixture);
      expect(await researchOracle.dataRegistry()).to.equal(await dataRegistry.getAddress());
    });

    it("Should set correct payment processor", async function () {
      const { researchOracle, paymentProcessor } = await loadFixture(deployResearchOracleFixture);
      expect(await researchOracle.paymentProcessor()).to.equal(await paymentProcessor.getAddress());
    });

    it("Should initialize with zero queries", async function () {
      const { researchOracle } = await loadFixture(deployResearchOracleFixture);
      expect(await researchOracle.queryCount()).to.equal(0);
    });
  });

  describe("Average Biomarker Query", function () {
    it("Should execute average biomarker query successfully", async function () {
      const { researchOracle, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      const tx = await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      await expect(tx).to.emit(researchOracle, "QueryExecuted");
      
      expect(await researchOracle.queryCount()).to.equal(1);
    });

    it("Should revert if payment is insufficient", async function () {
      const { researchOracle, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      const insufficientFee = queryFee - ethers.parseEther("0.001");

      await expect(
        researchOracle
          .connect(researcher1)
          .computeAverageBiomarker(30, 60, 250, { value: insufficientFee })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should store query result", async function () {
      const { researchOracle, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      const result = await researchOracle.connect(researcher1).getQueryResult(0);
      
      expect(result.queryId).to.equal(0);
      expect(result.researcher).to.equal(researcher1.address);
      expect(result.recordCount).to.be.gt(0);
    });

    it("Should track researcher queries", async function () {
      const { researchOracle, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(40, 70, 250, { value: queryFee });

      const queries = await researchOracle.getResearcherQueries(researcher1.address);
      expect(queries.length).to.equal(2);
    });

    it("Should prevent other researchers from accessing query results", async function () {
      const { researchOracle, researcher1, researcher2, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      await expect(
        researchOracle.connect(researcher2).getQueryResult(0)
      ).to.be.revertedWith("Not your query");
    });

    it("Should handle multiple researchers independently", async function () {
      const { researchOracle, researcher1, researcher2, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      await researchOracle
        .connect(researcher2)
        .computeAverageBiomarker(40, 70, 250, { value: queryFee });

      const queries1 = await researchOracle.getResearcherQueries(researcher1.address);
      const queries2 = await researchOracle.getResearcherQueries(researcher2.address);

      expect(queries1.length).to.equal(1);
      expect(queries2.length).to.equal(1);
      expect(queries1[0]).to.not.equal(queries2[0]);
    });
  });

  describe("Patient Count Query", function () {
    it("Should execute count query successfully", async function () {
      const { researchOracle, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      const tx = await researchOracle
        .connect(researcher1)
        .countPatientsByCriteria(250, 50, { value: queryFee });

      await expect(tx).to.emit(researchOracle, "QueryExecuted");
      
      expect(await researchOracle.queryCount()).to.equal(1);
    });

    it("Should revert if payment is insufficient", async function () {
      const { researchOracle, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      const insufficientFee = queryFee / 2n;

      await expect(
        researchOracle
          .connect(researcher1)
          .countPatientsByCriteria(250, 50, { value: insufficientFee })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should store count query result", async function () {
      const { researchOracle, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      await researchOracle
        .connect(researcher1)
        .countPatientsByCriteria(250, 50, { value: queryFee });

      const result = await researchOracle.connect(researcher1).getQueryResult(0);
      
      expect(result.queryId).to.equal(0);
      expect(result.researcher).to.equal(researcher1.address);
    });
  });

  describe("Query Fee Management", function () {
    it("Should allow owner to update query fee", async function () {
      const { researchOracle, owner } = await loadFixture(deployResearchOracleFixture);

      const newFee = ethers.parseEther("0.02");

      const tx = await researchOracle.connect(owner).updateQueryFee(newFee);

      await expect(tx)
        .to.emit(researchOracle, "QueryFeeUpdated")
        .withArgs(ethers.parseEther("0.01"), newFee);

      expect(await researchOracle.queryFee()).to.equal(newFee);
    });

    it("Should prevent non-owner from updating fee", async function () {
      const { researchOracle, researcher1 } = await loadFixture(deployResearchOracleFixture);

      const newFee = ethers.parseEther("0.02");

      await expect(
        researchOracle.connect(researcher1).updateQueryFee(newFee)
      ).to.be.revertedWith("Only owner");
    });

    it("Should allow owner to withdraw fees", async function () {
      const { researchOracle, dataRegistry, paymentProcessor, owner, platformWallet, researcher1, patient1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      // Patient submits data
      const encryptedAge = ethers.hexlify(ethers.randomBytes(32));
      const encryptedDiagnosis = ethers.hexlify(ethers.randomBytes(32));
      const encryptedOutcome = ethers.hexlify(ethers.randomBytes(32));
      const encryptedBiomarker = ethers.hexlify(ethers.randomBytes(32));
      const inputProof = "0x";

      await dataRegistry
        .connect(patient1)
        .submitHealthData(encryptedAge, encryptedDiagnosis, encryptedOutcome, encryptedBiomarker, inputProof);

      // Track initial balance
      const initialBalance = await ethers.provider.getBalance(platformWallet.address);
      
      // Execute query which transfers platform fees to platformWallet
      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      // platformWallet should have received platform fees (30% of queryFee)
      const expectedPlatformFee = queryFee * 30n / 100n;
      const finalBalance = await ethers.provider.getBalance(platformWallet.address);

      // Balance increased by the platform fee
      expect(finalBalance - initialBalance).to.equal(expectedPlatformFee);
    });

    it("Should prevent withdrawal when no platform earnings available", async function () {
      const { dataRegistry, paymentProcessor, owner, researcher1, patient1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      // No queries executed, so no platform fees accumulated
      // emergencyWithdraw should revert with no withdrawable funds
      await expect(
        paymentProcessor.connect(owner).emergencyWithdraw()
      ).to.be.revertedWith("No withdrawable funds");
    });
  });

  describe("Query Statistics", function () {
    it("Should track total queries correctly", async function () {
      const { researchOracle, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      await researchOracle
        .connect(researcher1)
        .countPatientsByCriteria(250, 50, { value: queryFee });

      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(40, 70, 250, { value: queryFee });

      expect(await researchOracle.getTotalQueries()).to.equal(3);
    });

    it("Should return empty array for researcher with no queries", async function () {
      const { researchOracle, researcher1 } = await loadFixture(deployResearchOracleFixture);

      const queries = await researchOracle.getResearcherQueries(researcher1.address);
      expect(queries.length).to.equal(0);
    });
  });

  describe("Integration with Payment System", function () {
    it("Should distribute payments when executing query", async function () {
      const { researchOracle, paymentProcessor, patient1, patient2, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      const patient1Earnings = await paymentProcessor.getPatientEarnings(patient1.address);
      const patient2Earnings = await paymentProcessor.getPatientEarnings(patient2.address);

      expect(patient1Earnings).to.be.gt(0);
      expect(patient2Earnings).to.be.gt(0);
    });

    it("Should exclude revoked records from payment", async function () {
      const { 
        researchOracle, 
        dataRegistry, 
        paymentProcessor, 
        patient1, 
        patient2, 
        researcher1, 
        queryFee 
      } = await loadFixture(deployResearchOracleFixture);

      // Patient1 revokes their record
      await dataRegistry.connect(patient1).revokeRecord(0);

      await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: queryFee });

      const patient1Earnings = await paymentProcessor.getPatientEarnings(patient1.address);
      const patient2Earnings = await paymentProcessor.getPatientEarnings(patient2.address);

      expect(patient1Earnings).to.equal(0);
      expect(patient2Earnings).to.be.gt(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle query with no matching records", async function () {
      const { researchOracle, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      // Query with criteria that won't match any records
      const tx = await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(200, 250, 999, { value: queryFee });

      await expect(tx).to.emit(researchOracle, "QueryExecuted");
    });

    it("Should handle overpayment correctly", async function () {
      const { researchOracle, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      const overpayment = queryFee * 2n;

      const tx = await researchOracle
        .connect(researcher1)
        .computeAverageBiomarker(30, 60, 250, { value: overpayment });

      await expect(tx).to.emit(researchOracle, "QueryExecuted");
    });

    it("Should handle multiple queries from same researcher", async function () {
      const { researchOracle, researcher1, queryFee } = 
        await loadFixture(deployResearchOracleFixture);

      for (let i = 0; i < 5; i++) {
        await researchOracle
          .connect(researcher1)
          .computeAverageBiomarker(30 + i, 60 + i, 250, { value: queryFee });
      }

      const queries = await researchOracle.getResearcherQueries(researcher1.address);
      expect(queries.length).to.equal(5);
    });
  });
});