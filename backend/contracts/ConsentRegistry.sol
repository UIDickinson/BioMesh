// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title ConsentRegistry
 * @notice Manages consent forms and identity verification for the BioMesh platform
 * @dev Integrates with Worldcoin World ID for Sybil-resistant identity verification
 * 
 * Features:
 * 1. Patient Consent - Consent to share data for research with payment terms
 * 2. Researcher Consent - Agreement to data usage terms and ethical guidelines
 * 3. World ID Verification - Sybil-resistant identity verification via Worldcoin
 * 4. Consent Management - Update, revoke, and track consent status
 */
contract ConsentRegistry {
    
    // ============ Enums ============
    
    /// @notice User roles in the platform
    enum UserRole {
        None,           // 0: Not registered
        Patient,        // 1: Data contributor
        Researcher,     // 2: Data consumer
        Both            // 3: Both roles (rare but possible)
    }
    
    /// @notice Consent status
    enum ConsentStatus {
        NotGiven,       // 0: No consent provided
        Active,         // 1: Consent is active
        Revoked,        // 2: Consent was revoked
        Expired         // 3: Consent expired (if time-bound)
    }
    
    // ============ Structs ============
    
    /// @notice World ID verification data
    struct WorldIdVerification {
        bool isVerified;
        uint256 nullifierHash;      // Unique hash for this app + user
        uint256 verificationTime;
        uint256 expirationTime;     // Optional: 0 means no expiration
    }
    
    /// @notice Patient consent form data
    struct PatientConsent {
        ConsentStatus status;
        uint256 consentTimestamp;
        uint256 lastUpdated;
        
        // Consent acknowledgments
        bool acknowledgesDataUsage;         // Understands data will be used for research
        bool acknowledgesAnonymization;     // Understands data is encrypted/anonymized
        bool acknowledgesPaymentTerms;      // Understands payment calculation
        bool acknowledgesRevocationRights;  // Understands they can revoke consent
        bool acknowledgesRisks;             // Understands potential risks
        
        // Payment preferences
        bool acceptsAggregateQueries;       // Allows aggregate statistics queries
        bool acceptsIndividualQueries;      // Allows individual anonymized record access
        uint8 minimumPaymentTier;           // 0 = any, 1 = standard, 2 = premium
        
        // Data sharing preferences
        uint8 dataRetentionMonths;          // How long data can be retained (0 = indefinite)
        bool allowsInternationalResearch;   // Allows data use by international researchers
        
        // Signature
        bytes32 consentHash;                // Hash of the consent form for verification
    }
    
    /// @notice Researcher consent form data
    struct ResearcherConsent {
        ConsentStatus status;
        uint256 consentTimestamp;
        uint256 lastUpdated;
        
        // Researcher acknowledgments
        bool acknowledgesDataPrivacy;       // Will not attempt to re-identify patients
        bool acknowledgesEthicalUse;        // Will use data ethically for research only
        bool acknowledgesPaymentTerms;      // Understands query fees and distribution
        bool acknowledgesDataLimitations;   // Understands data limitations
        bool acknowledgesSecurityObligations; // Agrees to security requirements
        
        // Research details
        string institutionName;             // Research institution/company name
        string researchPurpose;             // Brief description of research goals
        bool isInstitutionalReviewed;       // Has IRB/ethics board approval
        string irpApprovalReference;        // IRB approval reference number (optional)
        
        // Usage agreement
        bool agreesToNotRedistribute;       // Won't share query results externally
        bool agreesToCiteDataSource;        // Will cite BioMesh in publications
        bool agreesToReportFindings;        // Will report adverse findings to platform
        
        // Signature
        bytes32 consentHash;                // Hash of the consent form for verification
    }
    
    /// @notice User profile combining all verification states
    struct UserProfile {
        UserRole role;
        bool isWorldIdVerified;
        bool hasPatientConsent;
        bool hasResearcherConsent;
        uint256 registrationTime;
        uint256 lastActivityTime;
    }
    
    // ============ Constants ============
    
    /// @notice World ID app ID (to be set during deployment)
    string public constant WORLD_ID_APP_ID = "app_biomesh_research";
    
    /// @notice World ID action for verification
    string public constant WORLD_ID_ACTION = "biomesh-verify";
    
    /// @notice Consent expiration period (365 days, can be renewed)
    uint256 public constant CONSENT_VALIDITY_PERIOD = 365 days;
    
    /// @notice Grace period for consent renewal (30 days)
    uint256 public constant CONSENT_GRACE_PERIOD = 30 days;
    
    // ============ State Variables ============
    
    /// @notice Contract owner
    address public owner;
    
    /// @notice World ID verifier contract address
    address public worldIdVerifier;
    
    /// @notice World ID verification data per user
    mapping(address => WorldIdVerification) public worldIdVerifications;
    
    /// @notice Patient consent data per user
    mapping(address => PatientConsent) public patientConsents;
    
    /// @notice Researcher consent data per user
    mapping(address => ResearcherConsent) public researcherConsents;
    
    /// @notice User profiles
    mapping(address => UserProfile) public userProfiles;
    
    /// @notice Nullifier hash => used (to prevent double verification)
    mapping(uint256 => bool) public usedNullifiers;
    
    /// @notice Total registered patients
    uint256 public totalPatients;
    
    /// @notice Total registered researchers
    uint256 public totalResearchers;
    
    /// @notice Total World ID verified users
    uint256 public totalVerifiedUsers;
    
    // ============ Events ============
    
    event WorldIdVerified(address indexed user, uint256 nullifierHash, uint256 timestamp);
    event WorldIdVerificationExpired(address indexed user, uint256 timestamp);
    
    event PatientConsentGiven(address indexed patient, bytes32 consentHash, uint256 timestamp);
    event PatientConsentUpdated(address indexed patient, bytes32 newConsentHash, uint256 timestamp);
    event PatientConsentRevoked(address indexed patient, uint256 timestamp);
    
    event ResearcherConsentGiven(address indexed researcher, bytes32 consentHash, string institution, uint256 timestamp);
    event ResearcherConsentUpdated(address indexed researcher, bytes32 newConsentHash, uint256 timestamp);
    event ResearcherConsentRevoked(address indexed researcher, uint256 timestamp);
    
    event UserRoleUpdated(address indexed user, UserRole oldRole, UserRole newRole);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyWorldIdVerified() {
        require(isUserWorldIdVerified(msg.sender), "World ID verification required");
        _;
    }
    
    // ============ Constructor ============
    
    /// @param _worldIdVerifier World ID verifier address (can be address(0) for demo mode)
    constructor(address _worldIdVerifier) {
        owner = msg.sender;
        worldIdVerifier = _worldIdVerifier;
    }
    
    // ============ World ID Verification ============
    
    /**
     * @notice Verify a user's World ID
     * @dev In production, this would call the World ID verifier contract
     * @param nullifierHash Unique nullifier hash from World ID proof
     * @param proof The World ID zero-knowledge proof (simplified for demo)
     */
    function verifyWorldId(
        uint256 nullifierHash,
        bytes calldata proof
    ) external {
        require(!usedNullifiers[nullifierHash], "Nullifier already used");
        require(nullifierHash != 0, "Invalid nullifier hash");
        
        // In production, verify the proof with World ID contract:
        // IWorldID(worldIdVerifier).verifyProof(root, groupId, signalHash, nullifierHash, externalNullifierHash, proof);
        
        // For demo/testnet, we simulate verification (proof must be non-empty)
        require(proof.length > 0, "Proof required");
        
        // Mark nullifier as used
        usedNullifiers[nullifierHash] = true;
        
        // Store verification
        worldIdVerifications[msg.sender] = WorldIdVerification({
            isVerified: true,
            nullifierHash: nullifierHash,
            verificationTime: block.timestamp,
            expirationTime: 0 // No expiration by default
        });
        
        // Update user profile
        if (userProfiles[msg.sender].registrationTime == 0) {
            userProfiles[msg.sender].registrationTime = block.timestamp;
        }
        userProfiles[msg.sender].isWorldIdVerified = true;
        userProfiles[msg.sender].lastActivityTime = block.timestamp;
        
        totalVerifiedUsers++;
        
        emit WorldIdVerified(msg.sender, nullifierHash, block.timestamp);
    }
    
    /**
     * @notice Check if a user has valid World ID verification
     * @param user Address to check
     * @return bool True if verified and not expired
     */
    function isUserWorldIdVerified(address user) public view returns (bool) {
        WorldIdVerification storage verification = worldIdVerifications[user];
        
        if (!verification.isVerified) {
            return false;
        }
        
        // Check expiration if set
        if (verification.expirationTime > 0 && block.timestamp > verification.expirationTime) {
            return false;
        }
        
        return true;
    }
    
    // ============ Patient Consent ============
    
    /**
     * @notice Submit patient consent form
     * @param acknowledgesDataUsage Acknowledges data usage for research
     * @param acknowledgesAnonymization Acknowledges data encryption/anonymization
     * @param acknowledgesPaymentTerms Acknowledges payment terms
     * @param acknowledgesRevocationRights Acknowledges right to revoke
     * @param acknowledgesRisks Acknowledges potential risks
     * @param acceptsAggregateQueries Allows aggregate queries
     * @param acceptsIndividualQueries Allows individual record queries
     * @param minimumPaymentTier Minimum payment tier preference
     * @param dataRetentionMonths Data retention period (months)
     * @param allowsInternationalResearch Allows international research
     */
    function submitPatientConsent(
        bool acknowledgesDataUsage,
        bool acknowledgesAnonymization,
        bool acknowledgesPaymentTerms,
        bool acknowledgesRevocationRights,
        bool acknowledgesRisks,
        bool acceptsAggregateQueries,
        bool acceptsIndividualQueries,
        uint8 minimumPaymentTier,
        uint8 dataRetentionMonths,
        bool allowsInternationalResearch
    ) external {
        // All core acknowledgments must be true
        require(acknowledgesDataUsage, "Must acknowledge data usage");
        require(acknowledgesAnonymization, "Must acknowledge anonymization");
        require(acknowledgesPaymentTerms, "Must acknowledge payment terms");
        require(acknowledgesRevocationRights, "Must acknowledge revocation rights");
        require(acknowledgesRisks, "Must acknowledge risks");
        
        // At least one query type must be accepted
        require(acceptsAggregateQueries || acceptsIndividualQueries, "Must accept at least one query type");
        
        // Generate consent hash
        bytes32 consentHash = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            acknowledgesDataUsage,
            acknowledgesAnonymization,
            acknowledgesPaymentTerms,
            acceptsAggregateQueries,
            acceptsIndividualQueries
        ));
        
        bool isNewPatient = patientConsents[msg.sender].status == ConsentStatus.NotGiven;
        
        // Store consent
        patientConsents[msg.sender] = PatientConsent({
            status: ConsentStatus.Active,
            consentTimestamp: block.timestamp,
            lastUpdated: block.timestamp,
            acknowledgesDataUsage: acknowledgesDataUsage,
            acknowledgesAnonymization: acknowledgesAnonymization,
            acknowledgesPaymentTerms: acknowledgesPaymentTerms,
            acknowledgesRevocationRights: acknowledgesRevocationRights,
            acknowledgesRisks: acknowledgesRisks,
            acceptsAggregateQueries: acceptsAggregateQueries,
            acceptsIndividualQueries: acceptsIndividualQueries,
            minimumPaymentTier: minimumPaymentTier,
            dataRetentionMonths: dataRetentionMonths,
            allowsInternationalResearch: allowsInternationalResearch,
            consentHash: consentHash
        });
        
        // Update user profile
        if (userProfiles[msg.sender].registrationTime == 0) {
            userProfiles[msg.sender].registrationTime = block.timestamp;
        }
        userProfiles[msg.sender].hasPatientConsent = true;
        _updateUserRole(msg.sender);
        userProfiles[msg.sender].lastActivityTime = block.timestamp;
        
        if (isNewPatient) {
            totalPatients++;
            emit PatientConsentGiven(msg.sender, consentHash, block.timestamp);
        } else {
            emit PatientConsentUpdated(msg.sender, consentHash, block.timestamp);
        }
    }
    
    /**
     * @notice Revoke patient consent
     * @dev Existing records remain but no new queries can access them
     */
    function revokePatientConsent() external {
        require(patientConsents[msg.sender].status == ConsentStatus.Active, "No active consent");
        
        patientConsents[msg.sender].status = ConsentStatus.Revoked;
        patientConsents[msg.sender].lastUpdated = block.timestamp;
        
        userProfiles[msg.sender].hasPatientConsent = false;
        _updateUserRole(msg.sender);
        userProfiles[msg.sender].lastActivityTime = block.timestamp;
        
        emit PatientConsentRevoked(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Check if a patient has valid active consent
     * @param patient Address to check
     * @return bool True if consent is active
     */
    function hasActivePatientConsent(address patient) public view returns (bool) {
        return patientConsents[patient].status == ConsentStatus.Active;
    }
    
    // ============ Researcher Consent ============
    
    /**
     * @notice Submit researcher consent form
     * @param acknowledgesDataPrivacy Acknowledges privacy obligations
     * @param acknowledgesEthicalUse Acknowledges ethical use requirements
     * @param acknowledgesPaymentTerms Acknowledges payment terms
     * @param acknowledgesDataLimitations Acknowledges data limitations
     * @param acknowledgesSecurityObligations Acknowledges security obligations
     * @param institutionName Research institution name
     * @param researchPurpose Brief research purpose description
     * @param isInstitutionalReviewed Has IRB/ethics approval
     * @param irpApprovalReference IRB reference number (optional)
     * @param agreesToNotRedistribute Agrees not to redistribute
     * @param agreesToCiteDataSource Agrees to cite BioMesh
     * @param agreesToReportFindings Agrees to report findings
     */
    function submitResearcherConsent(
        bool acknowledgesDataPrivacy,
        bool acknowledgesEthicalUse,
        bool acknowledgesPaymentTerms,
        bool acknowledgesDataLimitations,
        bool acknowledgesSecurityObligations,
        string calldata institutionName,
        string calldata researchPurpose,
        bool isInstitutionalReviewed,
        string calldata irpApprovalReference,
        bool agreesToNotRedistribute,
        bool agreesToCiteDataSource,
        bool agreesToReportFindings
    ) external {
        // All core acknowledgments must be true
        require(acknowledgesDataPrivacy, "Must acknowledge data privacy");
        require(acknowledgesEthicalUse, "Must acknowledge ethical use");
        require(acknowledgesPaymentTerms, "Must acknowledge payment terms");
        require(acknowledgesDataLimitations, "Must acknowledge data limitations");
        require(acknowledgesSecurityObligations, "Must acknowledge security obligations");
        
        // All agreements must be accepted
        require(agreesToNotRedistribute, "Must agree to not redistribute");
        require(agreesToCiteDataSource, "Must agree to cite data source");
        require(agreesToReportFindings, "Must agree to report findings");
        
        // Institution name and research purpose are now optional
        // (removed as mandatory fields per user request)
        
        // Generate consent hash
        bytes32 consentHash = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            acknowledgesDataPrivacy,
            acknowledgesEthicalUse,
            acknowledgesPaymentTerms,
            institutionName,
            researchPurpose
        ));
        
        bool isNewResearcher = researcherConsents[msg.sender].status == ConsentStatus.NotGiven;
        
        // Store consent
        researcherConsents[msg.sender] = ResearcherConsent({
            status: ConsentStatus.Active,
            consentTimestamp: block.timestamp,
            lastUpdated: block.timestamp,
            acknowledgesDataPrivacy: acknowledgesDataPrivacy,
            acknowledgesEthicalUse: acknowledgesEthicalUse,
            acknowledgesPaymentTerms: acknowledgesPaymentTerms,
            acknowledgesDataLimitations: acknowledgesDataLimitations,
            acknowledgesSecurityObligations: acknowledgesSecurityObligations,
            institutionName: institutionName,
            researchPurpose: researchPurpose,
            isInstitutionalReviewed: isInstitutionalReviewed,
            irpApprovalReference: irpApprovalReference,
            agreesToNotRedistribute: agreesToNotRedistribute,
            agreesToCiteDataSource: agreesToCiteDataSource,
            agreesToReportFindings: agreesToReportFindings,
            consentHash: consentHash
        });
        
        // Update user profile
        if (userProfiles[msg.sender].registrationTime == 0) {
            userProfiles[msg.sender].registrationTime = block.timestamp;
        }
        userProfiles[msg.sender].hasResearcherConsent = true;
        _updateUserRole(msg.sender);
        userProfiles[msg.sender].lastActivityTime = block.timestamp;
        
        if (isNewResearcher) {
            totalResearchers++;
            emit ResearcherConsentGiven(msg.sender, consentHash, institutionName, block.timestamp);
        } else {
            emit ResearcherConsentUpdated(msg.sender, consentHash, block.timestamp);
        }
    }
    
    /**
     * @notice Revoke researcher consent
     */
    function revokeResearcherConsent() external {
        require(researcherConsents[msg.sender].status == ConsentStatus.Active, "No active consent");
        
        researcherConsents[msg.sender].status = ConsentStatus.Revoked;
        researcherConsents[msg.sender].lastUpdated = block.timestamp;
        
        userProfiles[msg.sender].hasResearcherConsent = false;
        _updateUserRole(msg.sender);
        userProfiles[msg.sender].lastActivityTime = block.timestamp;
        
        emit ResearcherConsentRevoked(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Check if a researcher has valid active consent
     * @param researcher Address to check
     * @return bool True if consent is active
     */
    function hasActiveResearcherConsent(address researcher) public view returns (bool) {
        return researcherConsents[researcher].status == ConsentStatus.Active;
    }
    
    // ============ Composite Checks ============
    
    /**
     * @notice Check if user can submit health data (patient)
     * @dev World ID verification is optional but provides higher trust level
     * @param user Address to check
     * @return bool True if user has active patient consent (required)
     */
    function canSubmitData(address user) external view returns (bool) {
        // Consent is required, World ID is optional (enhances trust)
        return hasActivePatientConsent(user);
    }
    
    /**
     * @notice Check if user can execute queries (researcher)
     * @dev World ID verification is optional but provides higher trust level
     * @param user Address to check
     * @return bool True if user has active researcher consent (required)
     */
    function canExecuteQueries(address user) external view returns (bool) {
        // Consent is required, World ID is optional (enhances trust)
        return hasActiveResearcherConsent(user);
    }
    
    /**
     * @notice Check if user can submit data with enhanced trust (World ID + Consent)
     * @param user Address to check
     * @return bool True if user has both World ID and patient consent
     */
    function canSubmitDataWithTrust(address user) external view returns (bool) {
        return isUserWorldIdVerified(user) && hasActivePatientConsent(user);
    }
    
    /**
     * @notice Check if user can execute queries with enhanced trust (World ID + Consent)
     * @param user Address to check
     * @return bool True if user has both World ID and researcher consent
     */
    function canExecuteQueriesWithTrust(address user) external view returns (bool) {
        return isUserWorldIdVerified(user) && hasActiveResearcherConsent(user);
    }
    
    /**
     * @notice Get user's complete verification status
     * @param user Address to check
     * @return isWorldIdVerified_ Whether World ID is verified
     * @return hasPatientConsent_ Whether patient consent is active
     * @return hasResearcherConsent_ Whether researcher consent is active
     * @return role Current user role
     */
    function getUserStatus(address user) external view returns (
        bool isWorldIdVerified_,
        bool hasPatientConsent_,
        bool hasResearcherConsent_,
        UserRole role
    ) {
        return (
            isUserWorldIdVerified(user),
            hasActivePatientConsent(user),
            hasActiveResearcherConsent(user),
            userProfiles[user].role
        );
    }
    
    /**
     * @notice Get patient consent details
     * @param patient Address to get consent for
     * @return PatientConsent struct
     */
    function getPatientConsent(address patient) external view returns (PatientConsent memory) {
        return patientConsents[patient];
    }
    
    /**
     * @notice Get researcher consent details
     * @param researcher Address to get consent for
     * @return ResearcherConsent struct
     */
    function getResearcherConsent(address researcher) external view returns (ResearcherConsent memory) {
        return researcherConsents[researcher];
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Update user role based on consent status
     * @param user Address to update
     */
    function _updateUserRole(address user) internal {
        UserRole oldRole = userProfiles[user].role;
        UserRole newRole;
        
        bool hasPatient = hasActivePatientConsent(user);
        bool hasResearcher = hasActiveResearcherConsent(user);
        
        if (hasPatient && hasResearcher) {
            newRole = UserRole.Both;
        } else if (hasPatient) {
            newRole = UserRole.Patient;
        } else if (hasResearcher) {
            newRole = UserRole.Researcher;
        } else {
            newRole = UserRole.None;
        }
        
        if (oldRole != newRole) {
            userProfiles[user].role = newRole;
            emit UserRoleUpdated(user, oldRole, newRole);
        }
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update World ID verifier address
     * @param _newVerifier New verifier address
     */
    function setWorldIdVerifier(address _newVerifier) external onlyOwner {
        require(_newVerifier != address(0), "Invalid address");
        worldIdVerifier = _newVerifier;
    }
    
    /**
     * @notice Transfer ownership
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }
    
    // ============ View Functions for Payment Terms ============
    
    /**
     * @notice Get current payment terms explanation (for frontend display)
     * @return patientShare Percentage of query fee going to patients
     * @return platformShare Percentage of query fee for platform
     * @return baseQueryFee Base fee for aggregate queries in wei
     * @return individualQueryFee Fee for individual record queries in wei
     */
    function getPaymentTerms() external pure returns (
        uint256 patientShare,
        uint256 platformShare,
        uint256 baseQueryFee,
        uint256 individualQueryFee
    ) {
        // These values should match PaymentProcessor contract
        return (
            70,                     // 70% to patients
            30,                     // 30% platform fee
            0.01 ether,            // 0.01 ETH base query fee
            0.02 ether             // 0.02 ETH individual query fee
        );
    }
}
