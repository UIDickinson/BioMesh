const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

/**
 * Tests for BioMesh Enhanced Features:
 * - Consent Management (Individual vs Aggregate)
 * - K-Anonymity Protection
 * - Individual Record Queries
 */
describe("BioMesh Enhanced Features", function () {
  
  // ============ Fixtures ============
  
  async function deployFullSystemFixture() {
    const signers = await ethers.getSigners();
    const [owner, platformWallet, researcher1, researcher2, ...patients] = signers;
    
    // Deploy MockDataRegistry
    const DataRegistry = await ethers.getContractFactory("MockDataRegistry");
    const dataRegistry = await DataRegistry.deploy();
    await dataRegistry.waitForDeployment();
    await dataRegistry.updateSubmissionCooldown(0);
    
    // Deploy PaymentProcessor
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
    const paymentProcessor = await PaymentProcessor.deploy(
      await dataRegistry.getAddress(),
      platformWallet.address
    );
    await paymentProcessor.waitForDeployment();
    
    // Deploy MockResearchOracle
    const ResearchOracle = await ethers.getContractFactory("MockResearchOracle");
    const queryFee = ethers.parseEther("0.01");
    const researchOracle = await ResearchOracle.deploy(
      await dataRegistry.getAddress(),
      await paymentProcessor.getAddress(),
      queryFee
    );
    await researchOracle.waitForDeployment();
    
    // Authorize oracle
    await dataRegistry.authorizeOracle(await researchOracle.getAddress());
    await paymentProcessor.authorizeOracle(await researchOracle.getAddress());
    
    // Set individual query fee
    const individualFee = ethers.parseEther("0.02"); // 2x aggregate
    await researchOracle.setIndividualQueryFee(individualFee);
    
    return {
      dataRegistry,
      paymentProcessor,
      researchOracle,
      owner,
      platformWallet,
      researcher1,
      researcher2,
      patients: patients.slice(0, 10), // 10 patients for testing
      queryFee,
      individualFee
    };
  }
  
  // Helper to submit health data
  async function submitRecord(dataRegistry, patient, diagnosisCode = 100) {
    const encryptedAge = ethers.zeroPadValue("0x30", 32); // age ~48
    const encryptedDiagnosis = ethers.zeroPadValue(ethers.toBeHex(diagnosisCode), 32);
    const encryptedOutcome = ethers.zeroPadValue("0x50", 32); // outcome 80
    const encryptedBiomarker = ethers.zeroPadValue("0x64", 32); // biomarker 100
    const inputProof = ethers.zeroPadValue("0x00", 64);
    
    return dataRegistry.connect(patient).submitHealthData(
      encryptedAge,
      encryptedDiagnosis,
      encryptedOutcome,
      encryptedBiomarker,
      inputProof
    );
  }
  
  // ============ Consent Management Tests ============
  
  describe("Consent Management", function () {
    
    it("Should default to AggregateOnly consent", async function () {
      const { dataRegistry, patients } = await loadFixture(deployFullSystemFixture);
      
      await submitRecord(dataRegistry, patients[0]);
      
      const consentLevel = await dataRegistry.getConsentLevel(0);
      expect(consentLevel).to.equal(0); // AggregateOnly
      
      const allowsIndividual = await dataRegistry.allowsIndividualAccess(0);
      expect(allowsIndividual).to.equal(false);
    });
    
    it("Should allow patient to set IndividualAllowed consent", async function () {
      const { dataRegistry, patients } = await loadFixture(deployFullSystemFixture);
      
      await submitRecord(dataRegistry, patients[0]);
      
      // Set consent to IndividualAllowed (1)
      await dataRegistry.connect(patients[0]).setConsent(0, 1);
      
      const consentLevel = await dataRegistry.getConsentLevel(0);
      expect(consentLevel).to.equal(1); // IndividualAllowed
      
      const allowsIndividual = await dataRegistry.allowsIndividualAccess(0);
      expect(allowsIndividual).to.equal(true);
    });
    
    it("Should allow patient to change consent back to AggregateOnly", async function () {
      const { dataRegistry, patients } = await loadFixture(deployFullSystemFixture);
      
      await submitRecord(dataRegistry, patients[0]);
      await dataRegistry.connect(patients[0]).setConsent(0, 1); // IndividualAllowed
      await dataRegistry.connect(patients[0]).setConsent(0, 0); // Back to AggregateOnly
      
      const allowsIndividual = await dataRegistry.allowsIndividualAccess(0);
      expect(allowsIndividual).to.equal(false);
    });
    
    it("Should emit ConsentUpdated event", async function () {
      const { dataRegistry, patients } = await loadFixture(deployFullSystemFixture);
      
      await submitRecord(dataRegistry, patients[0]);
      
      await expect(dataRegistry.connect(patients[0]).setConsent(0, 1))
        .to.emit(dataRegistry, "ConsentUpdated")
        .withArgs(0, 1);
    });
    
    it("Should prevent non-owner from setting consent", async function () {
      const { dataRegistry, patients } = await loadFixture(deployFullSystemFixture);
      
      await submitRecord(dataRegistry, patients[0]);
      
      await expect(
        dataRegistry.connect(patients[1]).setConsent(0, 1)
      ).to.be.revertedWith("Not record owner");
    });
    
    it("Should prevent setting invalid consent level", async function () {
      const { dataRegistry, patients } = await loadFixture(deployFullSystemFixture);
      
      await submitRecord(dataRegistry, patients[0]);
      
      await expect(
        dataRegistry.connect(patients[0]).setConsent(0, 2)
      ).to.be.revertedWith("Invalid consent level");
    });
    
    it("Should prevent setting consent on revoked record", async function () {
      const { dataRegistry, patients } = await loadFixture(deployFullSystemFixture);
      
      await submitRecord(dataRegistry, patients[0]);
      await dataRegistry.connect(patients[0]).revokeRecord(0);
      
      await expect(
        dataRegistry.connect(patients[0]).setConsent(0, 1)
      ).to.be.revertedWith("Record not active");
    });
    
    it("Should not allow individual access on revoked record even if consent was given", async function () {
      const { dataRegistry, patients } = await loadFixture(deployFullSystemFixture);
      
      await submitRecord(dataRegistry, patients[0]);
      await dataRegistry.connect(patients[0]).setConsent(0, 1); // IndividualAllowed
      await dataRegistry.connect(patients[0]).revokeRecord(0);
      
      const allowsIndividual = await dataRegistry.allowsIndividualAccess(0);
      expect(allowsIndividual).to.equal(false);
    });
  });
  
  // ============ K-Anonymity Tests ============
  
  describe("K-Anonymity Protection", function () {
    
    it("Should have K_ANONYMITY_THRESHOLD of 1 on DataRegistry (initial deployment)", async function () {
      const { dataRegistry } = await loadFixture(deployFullSystemFixture);
      
      const threshold = await dataRegistry.K_ANONYMITY_THRESHOLD();
      expect(threshold).to.equal(1);
    });
    
    it("Should have K_ANONYMITY_THRESHOLD of 1 on ResearchOracle (initial deployment)", async function () {
      const { researchOracle } = await loadFixture(deployFullSystemFixture);
      
      const threshold = await researchOracle.K_ANONYMITY_THRESHOLD();
      expect(threshold).to.equal(1);
    });
    
    it("Should correctly count individual consent records", async function () {
      const { dataRegistry, patients } = await loadFixture(deployFullSystemFixture);
      
      // Submit 6 records: 4 with individual consent, 2 aggregate only
      for (let i = 0; i < 6; i++) {
        await submitRecord(dataRegistry, patients[i]);
        if (i < 4) {
          await dataRegistry.connect(patients[i]).setConsent(i, 1); // IndividualAllowed
        }
      }
      
      const recordIds = [0, 1, 2, 3, 4, 5];
      const count = await dataRegistry.countIndividualConsent(recordIds);
      expect(count).to.equal(4);
    });
    
    it("Should return 0 count when no records have individual consent", async function () {
      const { dataRegistry, patients } = await loadFixture(deployFullSystemFixture);
      
      // Submit 3 records without setting individual consent
      for (let i = 0; i < 3; i++) {
        await submitRecord(dataRegistry, patients[i]);
      }
      
      const recordIds = [0, 1, 2];
      const count = await dataRegistry.countIndividualConsent(recordIds);
      expect(count).to.equal(0);
    });
    
    it("Should exclude revoked records from individual consent count", async function () {
      const { dataRegistry, patients } = await loadFixture(deployFullSystemFixture);
      
      // Submit 5 records with individual consent
      for (let i = 0; i < 5; i++) {
        await submitRecord(dataRegistry, patients[i]);
        await dataRegistry.connect(patients[i]).setConsent(i, 1);
      }
      
      // Revoke 2 records
      await dataRegistry.connect(patients[0]).revokeRecord(0);
      await dataRegistry.connect(patients[1]).revokeRecord(1);
      
      const recordIds = [0, 1, 2, 3, 4];
      const count = await dataRegistry.countIndividualConsent(recordIds);
      expect(count).to.equal(3); // Only 3 active records with individual consent
    });
  });
  
  // ============ Individual Records Query Tests ============
  
  describe("Individual Records Query", function () {
    
    it("Should have configurable individual query fee", async function () {
      const { researchOracle, individualFee } = await loadFixture(deployFullSystemFixture);
      
      const fee = await researchOracle.individualQueryFee();
      expect(fee).to.equal(individualFee);
    });
    
    it("Should execute individual query when k-anonymity is met", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, individualFee } = await loadFixture(deployFullSystemFixture);
      
      // Submit 6 records with individual consent (above k=5 threshold)
      for (let i = 0; i < 6; i++) {
        await submitRecord(dataRegistry, patients[i], 100); // Same diagnosis
        await dataRegistry.connect(patients[i]).setConsent(i, 1);
      }
      
      const tx = await researchOracle.connect(researcher1).queryIndividualRecords(
        100, // diagnosisCode
        18,  // minAge
        100, // maxAge
        10,  // maxResults
        { value: individualFee }
      );
      
      await expect(tx).to.emit(researchOracle, "IndividualAccessGranted");
    });
    
    it("Should return records when k-anonymity is met", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, individualFee } = await loadFixture(deployFullSystemFixture);
      
      // Submit 6 records with individual consent
      for (let i = 0; i < 6; i++) {
        await submitRecord(dataRegistry, patients[i], 100);
        await dataRegistry.connect(patients[i]).setConsent(i, 1);
      }
      
      await researchOracle.connect(researcher1).queryIndividualRecords(100, 18, 100, 10, { value: individualFee });
      
      const result = await researchOracle.connect(researcher1).getIndividualQueryResult(0);
      
      expect(result.kAnonymityMet).to.equal(true);
      expect(result.matchCount).to.equal(6);
      expect(result.recordCount).to.be.at.least(5);
    });
    
    it("Should return records when k-anonymity is met with few records", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, individualFee } = await loadFixture(deployFullSystemFixture);
      
      // Submit only 3 records with individual consent - with k=1, this is above threshold
      for (let i = 0; i < 3; i++) {
        await submitRecord(dataRegistry, patients[i], 100);
        await dataRegistry.connect(patients[i]).setConsent(i, 1);
      }
      
      await researchOracle.connect(researcher1).queryIndividualRecords(100, 18, 100, 10, { value: individualFee });
      
      const result = await researchOracle.connect(researcher1).getIndividualQueryResult(0);
      
      expect(result.kAnonymityMet).to.equal(true); // k=1 so 3 records is above threshold
      expect(result.matchCount).to.equal(3);
      expect(result.recordCount).to.equal(3); // All 3 returned
    });
    
    it("Should filter out records without individual consent", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, individualFee } = await loadFixture(deployFullSystemFixture);
      
      // Submit 6 records: 4 with individual consent, 2 aggregate only
      for (let i = 0; i < 6; i++) {
        await submitRecord(dataRegistry, patients[i], 100);
        if (i < 4) {
          await dataRegistry.connect(patients[i]).setConsent(i, 1);
        }
      }
      
      await researchOracle.connect(researcher1).queryIndividualRecords(100, 18, 100, 10, { value: individualFee });
      
      const result = await researchOracle.connect(researcher1).getIndividualQueryResult(0);
      
      expect(result.kAnonymityMet).to.equal(true);
      expect(result.matchCount).to.equal(4); // Only 4 with consent matched
    });
    
    it("Should revert if individual query fee is insufficient", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, queryFee } = await loadFixture(deployFullSystemFixture);
      
      await submitRecord(dataRegistry, patients[0], 100);
      
      // Try to use less than individual fee
      await expect(
        researchOracle.connect(researcher1).queryIndividualRecords(100, 18, 100, 10, { value: queryFee })
      ).to.be.revertedWith("Insufficient payment");
    });
    
    it("Should prevent non-researcher from accessing results", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, researcher2, individualFee } = await loadFixture(deployFullSystemFixture);
      
      for (let i = 0; i < 6; i++) {
        await submitRecord(dataRegistry, patients[i], 100);
        await dataRegistry.connect(patients[i]).setConsent(i, 1);
      }
      
      await researchOracle.connect(researcher1).queryIndividualRecords(100, 18, 100, 10, { value: individualFee });
      
      // researcher2 tries to access researcher1's results
      await expect(
        researchOracle.connect(researcher2).getIndividualQueryResult(0)
      ).to.be.revertedWith("Not your query");
    });
    
    it("Should return anonymized records with hashed IDs", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, individualFee } = await loadFixture(deployFullSystemFixture);
      
      for (let i = 0; i < 6; i++) {
        await submitRecord(dataRegistry, patients[i], 100);
        await dataRegistry.connect(patients[i]).setConsent(i, 1);
      }
      
      await researchOracle.connect(researcher1).queryIndividualRecords(100, 18, 100, 10, { value: individualFee });
      
      // Get first individual record
      const record = await researchOracle.connect(researcher1).getIndividualRecord(0, 0);
      
      // anonymousId should be a non-zero bytes32
      expect(record.anonymousId).to.not.equal(ethers.ZeroHash);
    });
  });
  
  // ============ Integration Tests ============
  
  describe("Integration: Full Individual Access Flow", function () {
    
    it("Should complete full flow: submit → consent → query → retrieve", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, individualFee } = await loadFixture(deployFullSystemFixture);
      
      // Step 1: Patients submit health data (use 5 patients)
      for (let i = 0; i < 5; i++) {
        await submitRecord(dataRegistry, patients[i], 200); // Diagnosis code 200
      }
      
      // Step 2: Patients set consent to individual access
      for (let i = 0; i < 5; i++) {
        await dataRegistry.connect(patients[i]).setConsent(i, 1);
      }
      
      // Step 3: Researcher executes individual query
      const tx = await researchOracle.connect(researcher1).queryIndividualRecords(
        200, // diagnosisCode
        18, 100, // Age range 18-100
        10, // max results
        { value: individualFee }
      );
      
      // Verify event emitted
      await expect(tx).to.emit(researchOracle, "IndividualAccessGranted");
      
      // Step 4: Researcher retrieves results
      const result = await researchOracle.connect(researcher1).getIndividualQueryResult(0);
      
      expect(result.kAnonymityMet).to.equal(true);
      expect(result.matchCount).to.equal(5);
      expect(result.recordCount).to.equal(5);
    });
    
    it("Should handle mixed consent levels correctly", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, individualFee } = await loadFixture(deployFullSystemFixture);
      
      // Submit 6 records with varying consent
      for (let i = 0; i < 6; i++) {
        await submitRecord(dataRegistry, patients[i], 300);
        // 4 patients allow individual access, 2 aggregate only
        if (i < 4) {
          await dataRegistry.connect(patients[i]).setConsent(i, 1);
        }
      }
      
      await researchOracle.connect(researcher1).queryIndividualRecords(300, 18, 100, 10, { value: individualFee });
      
      const result = await researchOracle.connect(researcher1).getIndividualQueryResult(0);
      
      expect(result.kAnonymityMet).to.equal(true);
      expect(result.matchCount).to.equal(4); // Only 4 with individual consent matched
      expect(result.recordCount).to.equal(4); // Only 4 returned
    });
  });
  
  // ============ Edge Cases ============
  
  describe("Edge Cases", function () {
    
    it("Should handle empty record set", async function () {
      const { researchOracle, researcher1, individualFee } = await loadFixture(deployFullSystemFixture);
      
      await researchOracle.connect(researcher1).queryIndividualRecords(999, 18, 100, 10, { value: individualFee });
      
      const result = await researchOracle.connect(researcher1).getIndividualQueryResult(0);
      
      expect(result.kAnonymityMet).to.equal(false);
      expect(result.matchCount).to.equal(0);
      expect(result.recordCount).to.equal(0);
    });
    
    it("Should work with single record (k=1 for initial deployment)", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, individualFee } = await loadFixture(deployFullSystemFixture);
      
      // Submit exactly 1 record with individual consent
      await submitRecord(dataRegistry, patients[0], 600);
      await dataRegistry.connect(patients[0]).setConsent(0, 1);
      
      await researchOracle.connect(researcher1).queryIndividualRecords(600, 18, 100, 10, { value: individualFee });
      
      const result = await researchOracle.connect(researcher1).getIndividualQueryResult(0);
      
      expect(result.kAnonymityMet).to.equal(true); // k=1 allows single record
      expect(result.recordCount).to.equal(1);
    });
    
    it("Should return no records when no matching records exist", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, individualFee } = await loadFixture(deployFullSystemFixture);
      
      // Submit records with different diagnosis code
      await submitRecord(dataRegistry, patients[0], 700);
      await dataRegistry.connect(patients[0]).setConsent(0, 1);
      
      // Query for non-existent diagnosis code
      await researchOracle.connect(researcher1).queryIndividualRecords(999, 18, 100, 10, { value: individualFee });
      
      const result = await researchOracle.connect(researcher1).getIndividualQueryResult(0);
      
      expect(result.kAnonymityMet).to.equal(false); // No matches
      expect(result.recordCount).to.equal(0);
    });
    
    it("Should allow owner to set individual query fee", async function () {
      const { researchOracle, owner } = await loadFixture(deployFullSystemFixture);
      
      const newFee = ethers.parseEther("0.05");
      await researchOracle.connect(owner).setIndividualQueryFee(newFee);
      
      expect(await researchOracle.individualQueryFee()).to.equal(newFee);
    });
    
    it("Should limit results to maxResults parameter", async function () {
      const { dataRegistry, researchOracle, patients, researcher1, individualFee } = await loadFixture(deployFullSystemFixture);
      
      // Submit 6 records with individual consent
      for (let i = 0; i < 6; i++) {
        await submitRecord(dataRegistry, patients[i], 800);
        await dataRegistry.connect(patients[i]).setConsent(i, 1);
      }
      
      // Request only 3 results
      await researchOracle.connect(researcher1).queryIndividualRecords(800, 18, 100, 3, { value: individualFee });
      
      const result = await researchOracle.connect(researcher1).getIndividualQueryResult(0);
      
      expect(result.kAnonymityMet).to.equal(true);
      expect(result.matchCount).to.equal(6); // 6 matched
      expect(result.recordCount).to.equal(3); // But only 3 returned
    });
  });
});
