# ADR-003: Skills Taxonomy Design

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-12-20 |
| **Deciders** | Product Team |
| **Related PRD** | PRD-001 |

---

## Context

The CRM needs a skills/capabilities system that enables:

1. Querying "who do I know that can do X?"
2. AI-powered inference from LinkedIn profiles
3. Hierarchical browsing (Category → Subcategory → Skill)
4. Coverage of investor/founder/security professional networks

The founder's background (IBM security architect, NTT principal consultant, Deloitte risk advisory) requires deep coverage of Security, Compliance, Legal, and Consulting domains.

---

## Decision

### Hierarchical Taxonomy with Three Levels

```
Level 0: Category     (e.g., "Security")
Level 1: Subcategory  (e.g., "Investigative Security")
Level 2: Skill        (e.g., "Digital Forensics")
```

### Storage Model

Self-referential table with `parent_id`:

```sql
skills (
    id UUID,
    name TEXT,           -- "Digital Forensics"
    slug TEXT,           -- "digital-forensics"
    parent_id UUID,      -- references parent skill
    level INT,           -- 0, 1, or 2
    sort_order INT       -- display ordering
)
```

### Full Taxonomy

#### Security

```
Security (L0)
├── Governance & Strategy (L1)
│   ├── Security Architecture
│   ├── Security Program Management
│   ├── Risk Management
│   ├── Policy & Standards Development
│   └── Board/Executive Advisory
├── Offensive Security (L1)
│   ├── Penetration Testing
│   ├── Red Teaming
│   ├── Vulnerability Research
│   ├── Exploit Development
│   ├── Physical Security Testing
│   └── Social Engineering
├── Defensive Security (L1)
│   ├── SOC / Security Operations
│   ├── SIEM
│   ├── EDR/XDR
│   ├── Threat Intelligence
│   ├── Threat Hunting
│   └── Detection Engineering
├── Investigative Security (L1)
│   ├── Incident Response
│   ├── Digital Forensics
│   ├── eDiscovery
│   └── Fraud Investigation
├── Application Security (L1)
│   ├── Secure SDLC
│   ├── SAST/DAST/IAST
│   ├── DevSecOps
│   └── Threat Modeling
├── Cloud Security (L1)
│   ├── AWS Security
│   ├── Azure Security
│   ├── GCP Security
│   ├── CSPM/CNAPP
│   └── Container Security
├── Identity & Access (L1)
│   ├── IAM Strategy
│   ├── PAM
│   ├── SSO/Federation
│   ├── IGA
│   └── CIAM
├── Network Security (L1)
│   ├── Firewalls
│   ├── ZTNA/SASE
│   ├── DDoS Protection
│   └── Microsegmentation
├── Data Security (L1)
│   ├── DLP
│   ├── Encryption/Key Management
│   ├── Data Classification
│   └── Database Security
└── Specialized Domains (L1)
    ├── OT/ICS Security
    ├── IoT Security
    ├── Automotive Security
    ├── Healthcare Security
    └── Financial Security
```

#### Compliance & Risk

```
Compliance & Risk (L0)
├── Frameworks & Standards (L1)
│   ├── ISO 27001/27002
│   ├── NIST CSF / 800-53
│   ├── SOC 2
│   ├── COBIT
│   ├── CIS Controls
│   └── CSA CCM
├── Regulatory (L1)
│   ├── Privacy (GDPR, CCPA, LGPD, PIPL)
│   ├── Financial (SOX, PCI-DSS, GLBA, MAS TRM)
│   ├── Healthcare (HIPAA, HITRUST)
│   ├── Government (FedRAMP, StateRAMP, IRAP)
│   └── Critical Infrastructure (NIS2, CIRCIA)
├── Audit & Assurance (L1)
│   ├── IT Audit
│   ├── Third-Party Risk Management
│   ├── Vendor Security Assessment
│   └── Control Testing
├── GRC Platforms (L1)
│   ├── ServiceNow GRC
│   ├── OneTrust
│   ├── Archer
│   └── Vanta/Drata/Secureframe
└── Business Continuity (L1)
    ├── BCP/DR Planning
    ├── Crisis Management
    └── Tabletop Exercises
```

#### Legal

```
Legal (L0)
├── Litigation Support (L1)
│   ├── Expert Witness - Digital Forensics
│   ├── Expert Witness - Cybersecurity
│   ├── Expert Witness - Privacy
│   ├── Expert Witness - IP/Trade Secrets
│   ├── Expert Witness - Fraud
│   ├── Expert Report Writing
│   ├── Deposition/Testimony
│   └── Trial Consulting
├── Practice Areas (L1)
│   ├── Privacy & Data Protection Law
│   ├── Cybersecurity Law
│   ├── Intellectual Property
│   ├── White Collar Crime
│   ├── Employment Law
│   ├── Regulatory Enforcement
│   └── M&A Due Diligence (Cyber)
├── Investigations (L1)
│   ├── Internal Corporate Investigations
│   ├── Regulatory Investigations
│   ├── Anti-Corruption/FCPA
│   └── AML/KYC Investigations
├── Certifications (L1)
│   ├── CFE
│   ├── CAMS
│   ├── EnCE/CCE/GCFE
│   └── JD/Bar Admission
└── Legal Tech (L1)
    ├── Contract Analysis
    ├── Legal Research
    └── AI in Legal
```

#### Consulting & Advisory

```
Consulting & Advisory (L0)
├── Firm Types (L1)
│   ├── Big 4
│   ├── Strategy (MBB)
│   ├── Tech Consulting
│   ├── Boutique/Specialty
│   └── Independent/Fractional
├── Delivery Models (L1)
│   ├── Staff Augmentation
│   ├── Managed Services
│   ├── Project-Based
│   ├── Retainer/Advisory
│   └── Interim Leadership
├── Practice Areas (L1)
│   ├── Strategy & Transformation
│   ├── Implementation
│   ├── Assessment/Audit
│   ├── M&A Advisory
│   └── Training/Enablement
├── Industries (L1)
│   ├── Financial Services
│   ├── Healthcare
│   ├── Telecommunications
│   ├── Government
│   ├── Energy & Utilities
│   ├── Retail
│   ├── Technology/SaaS
│   └── Manufacturing
└── Seniority (L1)
    ├── Analyst/Associate
    ├── Consultant
    ├── Senior Consultant
    ├── Manager
    ├── Senior Manager
    ├── Director/Principal
    └── Partner/MD
```

#### Enterprise Tech

```
Enterprise Tech (L0)
├── Mainframe & Legacy (L1)
│   ├── z/OS
│   ├── RACF/ACF2/Top Secret
│   ├── CICS/IMS
│   ├── DB2/VSAM
│   ├── COBOL
│   └── Mainframe Modernization
├── Middleware (L1)
│   ├── IBM MQ
│   ├── WebSphere
│   ├── API Management
│   ├── ESB/Integration
│   └── BPM
├── Enterprise Software (L1)
│   ├── ERP
│   ├── CRM
│   ├── HCM
│   ├── ITSM
│   └── ECM
├── Database & Data Platform (L1)
│   ├── Oracle DB
│   ├── SQL Server
│   ├── DB2
│   ├── Teradata
│   ├── Snowflake/Databricks
│   └── Data Warehousing
├── System Integration (L1)
│   ├── Large Program Delivery
│   ├── Multi-Vendor Coordination
│   ├── Legacy Modernization
│   └── Cloud Migration
└── Ecosystems & Platforms (L1)
    ├── IBM
    ├── Microsoft
    ├── AWS
    ├── Google Cloud
    ├── Oracle
    ├── SAP
    ├── Salesforce
    ├── ServiceNow
    ├── Alibaba Cloud
    ├── Tencent Cloud
    ├── Huawei Cloud
    └── NTT/Dimension Data
```

#### Engineering

```
Engineering (L0)
├── Frontend (L1)
│   ├── React
│   ├── Vue
│   ├── Angular
│   ├── TypeScript
│   └── CSS/Tailwind
├── Backend (L1)
│   ├── Node.js
│   ├── Python
│   ├── Go
│   ├── Java
│   ├── Ruby
│   └── Rust
├── Mobile (L1)
│   ├── iOS/Swift
│   ├── Android/Kotlin
│   ├── React Native
│   └── Flutter
├── Infrastructure (L1)
│   ├── AWS
│   ├── GCP
│   ├── Azure
│   ├── Kubernetes
│   ├── Docker
│   └── Terraform
├── Data (L1)
│   ├── SQL
│   ├── PostgreSQL
│   ├── MongoDB
│   ├── Redis
│   └── Elasticsearch
└── AI/ML (L1)
    ├── PyTorch
    ├── TensorFlow
    ├── LLMs
    ├── Computer Vision
    └── NLP
```

#### Additional Categories

```
Design (L0)
├── Product Design
├── Brand Design
└── UX Writing

Product (L0)
├── Product Management
├── Growth
└── Analytics

Business (L0)
├── Sales
├── Marketing
├── Operations
└── Strategy

Investing (L0)
├── Angel Investor
├── VC (Pre-seed/Seed/Series A+)
├── LP
└── Advisor
```

---

## AI Inference Strategy

### Prompt Template

```
You are analyzing a LinkedIn profile to extract professional skills.

Profile:
- Name: {{name}}
- Headline: {{headline}}
- Current role: {{current_employer}} - {{current_title}}
- Previous roles: {{employment_history}}

Map this person's skills to the following taxonomy (JSON structure provided).
Return a JSON array of objects with:
- skill_id: The UUID of the skill
- confidence: Float 0.0-1.0 representing your certainty

Rules:
1. Only return skills with confidence >= 0.6
2. Prefer specific skills (Level 2) over categories (Level 0)
3. Consider job titles, company types, and career progression
4. A "Security Architect at IBM" implies: Security Architecture, IBM ecosystem
5. A "Partner at Deloitte Risk Advisory" implies: Big 4, Risk Management, Partner-level

Return only valid JSON, no explanation.
```

### Confidence Calibration

| Signal | Confidence Boost |
|--------|-----------------|
| Exact title match | +0.3 |
| Company in ecosystem | +0.2 |
| Multiple roles in domain | +0.2 |
| Certification mentioned | +0.3 |
| Generic/unclear title | -0.2 |

---

## Alternatives Considered

### Freeform Tags

**Pros:** Maximum flexibility, no maintenance
**Cons:** "React" vs "ReactJS" vs "React.js" proliferation, hard to query
**Decision:** Rejected

### Predefined Flat List

**Pros:** Simple, no hierarchy to manage
**Cons:** Can't query "all engineers" or drill down
**Decision:** Rejected

### AI-Normalized Freeform

**Pros:** Flexible input, cleaned output
**Cons:** Normalization logic is complex, still messy
**Decision:** Rejected — hierarchy is more powerful

---

## Consequences

### Positive

- Powerful queries: "Show all Security people" or drill to "Digital Forensics experts"
- AI can reliably map to known taxonomy
- Consistent skill representation across contacts

### Negative

- Taxonomy needs maintenance as industries evolve
- Edge cases may not fit cleanly
- Initial population requires seeding ~200 skills

### Maintenance Plan

1. Quarterly review of unmapped AI suggestions
2. User feedback mechanism ("suggest a skill")
3. Admin UI for taxonomy management (Phase 2)

---

## References

- [LinkedIn Skills Taxonomy](https://developer.linkedin.com/docs/ref/v2/standardized-data/skills)
- [O*NET Skills Framework](https://www.onetonline.org/skills/)
- [SFIA Framework](https://sfia-online.org/)
