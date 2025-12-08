const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VerificationRegistry", function () {
  let verificationRegistry;
  let dataRegistry;
  let owner, patient, aiOracle, provider, reporter, other;
  
  const MIN_STAKE = ethers.parseEther("0.001");
  const MAX_STAKE = ethers.parseEther("0.1");
  const VALID_STAKE = ethers.parseEther("0.01");
  const AI_CONFIDENCE_THRESHOLD = 70;
  const INITIAL_REPUTATION = 500;

  // Verification Status enum
  const VerificationStatus = {
    Unverified: 0,
    Pending: 1,
    AIVerified: 2,
    ProviderAttested: 3,
    Flagged: 4,
    Slashed: 5
  };

  // Evidence Type enum
  const EvidenceType = {
    None: 0,
    LabReport: 1,
    Prescription: 2,
    MedicalRecord: 3,
    InsuranceClaim: 4,
    ProviderLetter: 5
  };

  beforeEach(async function () {
    [owner, patient, aiOracle, provider, reporter, other] = await ethers.getSigners();

    // Deploy mock DataRegistry (just for address reference)
    const DataRegistry = await ethers.getContractFactory("DataRegistry");
    dataRegistry = await DataRegistry.deploy();
    await dataRegistry.waitForDeployment();

    // Deploy VerificationRegistry
    const VerificationRegistry = await ethers.getContractFactory("VerificationRegistry");
    verificationRegistry = await VerificationRegistry.deploy();
    await verificationRegistry.waitForDeployment();

    // Configure VerificationRegistry
    await verificationRegistry.setDataRegistry(await dataRegistry.getAddress());
    await verificationRegistry.setAIOracle(aiOracle.address);
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await verificationRegistry.owner()).to.equal(owner.address);
    });

    it("Should set the correct DataRegistry", async function () {
      expect(await verificationRegistry.dataRegistry()).to.equal(await dataRegistry.getAddress());
    });

    it("Should set the correct AI Oracle", async function () {
      expect(await verificationRegistry.aiOracle()).to.equal(aiOracle.address);
    });

    it("Should have correct constants", async function () {
      expect(await verificationRegistry.MIN_STAKE()).to.equal(MIN_STAKE);
      expect(await verificationRegistry.MAX_STAKE()).to.equal(MAX_STAKE);
      expect(await verificationRegistry.AI_CONFIDENCE_THRESHOLD()).to.equal(AI_CONFIDENCE_THRESHOLD);
      expect(await verificationRegistry.INITIAL_REPUTATION()).to.equal(INITIAL_REPUTATION);
    });
  });

  describe("Configuration", function () {
    it("Should allow owner to set DataRegistry", async function () {
      await expect(verificationRegistry.setDataRegistry(other.address))
        .to.not.be.reverted;
      expect(await verificationRegistry.dataRegistry()).to.equal(other.address);
    });

    it("Should prevent non-owner from setting DataRegistry", async function () {
      await expect(verificationRegistry.connect(other).setDataRegistry(other.address))
        .to.be.revertedWith("Only owner");
    });

    it("Should prevent setting zero address DataRegistry", async function () {
      await expect(verificationRegistry.setDataRegistry(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
    });

    it("Should allow owner to set AI Oracle", async function () {
      await expect(verificationRegistry.setAIOracle(other.address))
        .to.not.be.reverted;
      expect(await verificationRegistry.aiOracle()).to.equal(other.address);
    });

    it("Should prevent non-owner from setting AI Oracle", async function () {
      await expect(verificationRegistry.connect(other).setAIOracle(other.address))
        .to.be.revertedWith("Only owner");
    });
  });

  describe("Stake Functions", function () {
    const recordId = 1;

    it("Should allow depositing stake within valid range", async function () {
      await expect(verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE }))
        .to.emit(verificationRegistry, "StakeDeposited")
        .withArgs(recordId, patient.address, VALID_STAKE);

      const verification = await verificationRegistry.getVerification(recordId);
      expect(verification.stakeAmount).to.equal(VALID_STAKE);
    });

    it("Should initialize patient reputation on first stake", async function () {
      await verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE });
      
      const reputation = await verificationRegistry.getReputation(patient.address);
      expect(reputation.reputationScore).to.equal(INITIAL_REPUTATION);
      expect(reputation.totalSubmissions).to.equal(1);
    });

    it("Should reject stake below minimum", async function () {
      const lowStake = ethers.parseEther("0.0001");
      await expect(verificationRegistry.connect(patient).depositStake(recordId, { value: lowStake }))
        .to.be.revertedWith("Stake below minimum");
    });

    it("Should reject stake above maximum", async function () {
      const highStake = ethers.parseEther("0.2");
      await expect(verificationRegistry.connect(patient).depositStake(recordId, { value: highStake }))
        .to.be.revertedWith("Stake above maximum");
    });

    it("Should prevent double staking on same record", async function () {
      await verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE });
      await expect(verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE }))
        .to.be.revertedWith("Already staked");
    });

    it("Should track total stakes held", async function () {
      await verificationRegistry.connect(patient).depositStake(1, { value: VALID_STAKE });
      await verificationRegistry.connect(other).depositStake(2, { value: VALID_STAKE });
      
      expect(await verificationRegistry.totalStakesHeld()).to.equal(VALID_STAKE * 2n);
    });
  });

  describe("AI Document Verification", function () {
    const recordId = 1;
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
    const evidenceType = EvidenceType.LabReport;

    beforeEach(async function () {
      // Patient deposits stake first
      await verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE });
    });

    it("Should allow record owner to request AI verification", async function () {
      await expect(verificationRegistry.connect(patient).requestAIVerification(recordId, documentHash, evidenceType))
        .to.emit(verificationRegistry, "AIVerificationRequested")
        .withArgs(recordId, documentHash, evidenceType);

      const verification = await verificationRegistry.getVerification(recordId);
      expect(verification.status).to.equal(VerificationStatus.Pending);
      expect(verification.documentHash).to.equal(documentHash);
      expect(verification.evidenceType).to.equal(evidenceType);
    });

    it("Should reject AI verification request from non-owner", async function () {
      await expect(verificationRegistry.connect(other).requestAIVerification(recordId, documentHash, evidenceType))
        .to.be.revertedWith("Not record owner");
    });

    it("Should reject AI verification with invalid evidence type", async function () {
      await expect(verificationRegistry.connect(patient).requestAIVerification(recordId, documentHash, EvidenceType.None))
        .to.be.revertedWith("Invalid evidence type");
    });

    it("Should allow AI Oracle to submit verification result (passed)", async function () {
      await verificationRegistry.connect(patient).requestAIVerification(recordId, documentHash, evidenceType);
      
      const confidenceScore = 85;
      const summary = "Document verified: Age=45, Diagnosis=E11.9, Glucose=126";
      
      await expect(verificationRegistry.connect(aiOracle).submitAIVerification(recordId, confidenceScore, summary))
        .to.emit(verificationRegistry, "AIVerificationCompleted")
        .withArgs(recordId, confidenceScore, true);

      const verification = await verificationRegistry.getVerification(recordId);
      expect(verification.status).to.equal(VerificationStatus.AIVerified);
      expect(verification.aiConfidenceScore).to.equal(confidenceScore);
    });

    it("Should flag record when AI confidence is below threshold", async function () {
      await verificationRegistry.connect(patient).requestAIVerification(recordId, documentHash, evidenceType);
      
      const lowConfidence = 50;
      const summary = "Low confidence: Data mismatch detected";
      
      await expect(verificationRegistry.connect(aiOracle).submitAIVerification(recordId, lowConfidence, summary))
        .to.emit(verificationRegistry, "AIVerificationCompleted")
        .withArgs(recordId, lowConfidence, false);

      const verification = await verificationRegistry.getVerification(recordId);
      expect(verification.status).to.equal(VerificationStatus.Flagged);
    });

    it("Should reject AI verification from non-oracle", async function () {
      await verificationRegistry.connect(patient).requestAIVerification(recordId, documentHash, evidenceType);
      
      await expect(verificationRegistry.connect(other).submitAIVerification(recordId, 85, "Summary"))
        .to.be.revertedWith("Only AI Oracle");
    });

    it("Should update reputation on successful verification", async function () {
      await verificationRegistry.connect(patient).requestAIVerification(recordId, documentHash, evidenceType);
      await verificationRegistry.connect(aiOracle).submitAIVerification(recordId, 85, "Verified");
      
      const reputation = await verificationRegistry.getReputation(patient.address);
      expect(reputation.verifiedCount).to.equal(1);
      expect(reputation.reputationScore).to.be.gt(INITIAL_REPUTATION);
    });

    it("Should update reputation negatively on failed verification", async function () {
      await verificationRegistry.connect(patient).requestAIVerification(recordId, documentHash, evidenceType);
      await verificationRegistry.connect(aiOracle).submitAIVerification(recordId, 40, "Failed");
      
      const reputation = await verificationRegistry.getReputation(patient.address);
      expect(reputation.flaggedCount).to.equal(1);
      expect(reputation.reputationScore).to.be.lt(INITIAL_REPUTATION);
    });
  });

  describe("Provider Attestation", function () {
    const recordId = 1;

    beforeEach(async function () {
      await verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE });
    });

    it("Should allow provider registration", async function () {
      await expect(verificationRegistry.connect(provider).registerProvider("Dr. Smith Clinic", "MD-123456"))
        .to.emit(verificationRegistry, "ProviderRegistered")
        .withArgs(provider.address, "Dr. Smith Clinic");

      expect(await verificationRegistry.isProviderRegistered(provider.address)).to.be.true;
    });

    it("Should prevent double registration", async function () {
      await verificationRegistry.connect(provider).registerProvider("Clinic", "LIC-123");
      await expect(verificationRegistry.connect(provider).registerProvider("Clinic 2", "LIC-456"))
        .to.be.revertedWith("Already registered");
    });

    it("Should require name for registration", async function () {
      await expect(verificationRegistry.connect(provider).registerProvider("", "LIC-123"))
        .to.be.revertedWith("Name required");
    });

    it("Should require license for registration", async function () {
      await expect(verificationRegistry.connect(provider).registerProvider("Clinic", ""))
        .to.be.revertedWith("License required");
    });

    it("Should allow registered provider to attest record", async function () {
      await verificationRegistry.connect(provider).registerProvider("Clinic", "LIC-123");
      
      await expect(verificationRegistry.connect(provider).attestRecord(recordId))
        .to.emit(verificationRegistry, "ProviderAttestationSubmitted")
        .withArgs(recordId, provider.address);

      const verification = await verificationRegistry.getVerification(recordId);
      expect(verification.status).to.equal(VerificationStatus.ProviderAttested);
      expect(verification.attestingProvider).to.equal(provider.address);
    });

    it("Should reject attestation from unregistered provider", async function () {
      await expect(verificationRegistry.connect(other).attestRecord(recordId))
        .to.be.revertedWith("Not registered provider");
    });
  });

  describe("Flagging and Slashing", function () {
    const recordId = 1;

    beforeEach(async function () {
      await verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE });
    });

    it("Should allow anyone to flag a record", async function () {
      await expect(verificationRegistry.connect(reporter).flagRecord(recordId, "Suspected fraudulent data"))
        .to.emit(verificationRegistry, "RecordFlagged")
        .withArgs(recordId, reporter.address, "Suspected fraudulent data");

      const verification = await verificationRegistry.getVerification(recordId);
      expect(verification.status).to.equal(VerificationStatus.Flagged);
    });

    it("Should require reason for flagging", async function () {
      await expect(verificationRegistry.connect(reporter).flagRecord(recordId, ""))
        .to.be.revertedWith("Reason required");
    });

    it("Should allow owner to slash flagged record", async function () {
      await verificationRegistry.connect(reporter).flagRecord(recordId, "Fraud detected");
      
      const patientBalanceBefore = await ethers.provider.getBalance(patient.address);
      
      await expect(verificationRegistry.slashStake(recordId, reporter.address))
        .to.emit(verificationRegistry, "StakeSlashed")
        .withArgs(recordId, patient.address, VALID_STAKE, reporter.address);

      const verification = await verificationRegistry.getVerification(recordId);
      expect(verification.status).to.equal(VerificationStatus.Slashed);
      expect(verification.stakeAmount).to.equal(0);
      
      // Reporter should have reward available
      const reporterReward = await verificationRegistry.slashRewards(reporter.address);
      expect(reporterReward).to.equal(VALID_STAKE / 2n);
    });

    it("Should allow reporter to withdraw slash rewards", async function () {
      await verificationRegistry.connect(reporter).flagRecord(recordId, "Fraud");
      await verificationRegistry.slashStake(recordId, reporter.address);
      
      const reporterBalanceBefore = await ethers.provider.getBalance(reporter.address);
      
      await verificationRegistry.connect(reporter).withdrawSlashRewards();
      
      const reporterBalanceAfter = await ethers.provider.getBalance(reporter.address);
      expect(reporterBalanceAfter).to.be.gt(reporterBalanceBefore);
    });

    it("Should prevent slashing non-flagged record", async function () {
      await expect(verificationRegistry.slashStake(recordId, reporter.address))
        .to.be.revertedWith("Not flagged");
    });

    it("Should prevent non-owner from slashing", async function () {
      await verificationRegistry.connect(reporter).flagRecord(recordId, "Fraud");
      await expect(verificationRegistry.connect(other).slashStake(recordId, reporter.address))
        .to.be.revertedWith("Only owner");
    });
  });

  describe("Stake Return", function () {
    const recordId = 1;
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("doc"));

    beforeEach(async function () {
      await verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE });
      await verificationRegistry.connect(patient).requestAIVerification(recordId, documentHash, EvidenceType.LabReport);
      await verificationRegistry.connect(aiOracle).submitAIVerification(recordId, 85, "Verified");
    });

    it("Should return stake after dispute window", async function () {
      // Fast forward 7 days
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      
      const patientBalanceBefore = await ethers.provider.getBalance(patient.address);
      
      await expect(verificationRegistry.connect(patient).returnStake(recordId))
        .to.emit(verificationRegistry, "StakeReturned")
        .withArgs(recordId, patient.address, VALID_STAKE);

      const verification = await verificationRegistry.getVerification(recordId);
      expect(verification.stakeAmount).to.equal(0);
    });

    it("Should reject stake return before dispute window closes", async function () {
      await expect(verificationRegistry.connect(patient).returnStake(recordId))
        .to.be.revertedWith("Dispute window not closed");
    });

    it("Should reject stake return from non-owner", async function () {
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(verificationRegistry.connect(other).returnStake(recordId))
        .to.be.revertedWith("Not record owner");
    });

    it("Should reject stake return for unverified record", async function () {
      const newRecordId = 2;
      await verificationRegistry.connect(patient).depositStake(newRecordId, { value: VALID_STAKE });
      
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(verificationRegistry.connect(patient).returnStake(newRecordId))
        .to.be.revertedWith("Not verified");
    });
  });

  describe("Trust Score Calculation", function () {
    const recordId = 1;
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("doc"));

    it("Should calculate trust score for verified record with stake", async function () {
      await verificationRegistry.connect(patient).depositStake(recordId, { value: MAX_STAKE });
      await verificationRegistry.connect(patient).requestAIVerification(recordId, documentHash, EvidenceType.LabReport);
      await verificationRegistry.connect(aiOracle).submitAIVerification(recordId, 90, "High confidence");
      
      const trustScore = await verificationRegistry.calculateTrustScore(recordId);
      expect(trustScore).to.be.gt(50); // Should be reasonably high
    });

    it("Should return zero trust score for flagged record", async function () {
      await verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE });
      await verificationRegistry.connect(reporter).flagRecord(recordId, "Fraud");
      
      const trustScore = await verificationRegistry.calculateTrustScore(recordId);
      expect(trustScore).to.equal(0);
    });

    it("Should return higher trust score with provider attestation", async function () {
      await verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE });
      await verificationRegistry.connect(provider).registerProvider("Clinic", "LIC-123");
      await verificationRegistry.connect(provider).attestRecord(recordId);
      
      const trustScore = await verificationRegistry.calculateTrustScore(recordId);
      expect(trustScore).to.be.gte(40); // Provider attestation gives 40 points
    });
  });

  describe("Reputation System", function () {
    it("Should track multiple submissions", async function () {
      await verificationRegistry.connect(patient).depositStake(1, { value: VALID_STAKE });
      await verificationRegistry.connect(patient).depositStake(2, { value: VALID_STAKE });
      await verificationRegistry.connect(patient).depositStake(3, { value: VALID_STAKE });
      
      const reputation = await verificationRegistry.getReputation(patient.address);
      expect(reputation.totalSubmissions).to.equal(3);
    });

    it("Should cap reputation at 1000", async function () {
      // Make many successful verifications
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("doc"));
      
      for (let i = 1; i <= 60; i++) {
        await verificationRegistry.connect(patient).depositStake(i, { value: VALID_STAKE });
        await verificationRegistry.connect(patient).requestAIVerification(i, documentHash, EvidenceType.LabReport);
        await verificationRegistry.connect(aiOracle).submitAIVerification(i, 85, "Verified");
      }
      
      const reputation = await verificationRegistry.getReputation(patient.address);
      expect(reputation.reputationScore).to.equal(1000);
    });

    it("Should decrease reputation on failed verification", async function () {
      await verificationRegistry.connect(patient).depositStake(1, { value: VALID_STAKE });
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("doc"));
      await verificationRegistry.connect(patient).requestAIVerification(1, documentHash, EvidenceType.LabReport);
      await verificationRegistry.connect(aiOracle).submitAIVerification(1, 30, "Failed");
      
      const reputation = await verificationRegistry.getReputation(patient.address);
      expect(reputation.reputationScore).to.be.lt(INITIAL_REPUTATION);
    });
  });

  describe("View Functions", function () {
    const recordId = 1;

    it("Should return verification data", async function () {
      await verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE });
      
      const verification = await verificationRegistry.getVerification(recordId);
      expect(verification.stakeAmount).to.equal(VALID_STAKE);
      expect(verification.status).to.equal(VerificationStatus.Unverified);
    });

    it("Should return reputation data", async function () {
      await verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE });
      
      const reputation = await verificationRegistry.getReputation(patient.address);
      expect(reputation.reputationScore).to.equal(INITIAL_REPUTATION);
    });

    it("Should return reputation score only", async function () {
      await verificationRegistry.connect(patient).depositStake(recordId, { value: VALID_STAKE });
      
      const score = await verificationRegistry.getReputationScore(patient.address);
      expect(score).to.equal(INITIAL_REPUTATION);
    });

    it("Should check provider registration status", async function () {
      expect(await verificationRegistry.isProviderRegistered(provider.address)).to.be.false;
      
      await verificationRegistry.connect(provider).registerProvider("Clinic", "LIC-123");
      
      expect(await verificationRegistry.isProviderRegistered(provider.address)).to.be.true;
    });
  });
});
