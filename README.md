# TruthFlow

A blockchain-powered decentralized news curation platform that empowers communities to verify, curate, and reward high-quality news content, combating misinformation and algorithmic bias through transparent, on-chain governance.

---

## Overview

TruthFlow addresses the real-world problem of misinformation and centralized control in news media by creating a decentralized platform where users collectively curate, verify, and distribute news. Using the Stacks blockchain and Clarity smart contracts, TruthFlow ensures transparency, immutability, and user ownership over content curation processes. The platform incentivizes credible contributions and penalizes bad actors through a token-based economy and DAO governance.

The project consists of four main smart contracts:

1. **Content Submission Contract** – Manages the submission and initial review of news articles or content.
2. **Governance DAO Contract** – Enables token holders to vote on content credibility and platform policies.
3. **Reputation and Rewards Contract** – Tracks user reputation and distributes token rewards for accurate contributions.
4. **Oracle Integration Contract** – Connects to off-chain data for fact-checking and external verification.

---

## Problem Solved

- **Misinformation**: Centralized news platforms often suffer from editorial bias or unverified content. TruthFlow uses community-driven verification and transparent voting to ensure credibility.
- **Algorithmic Bias**: Unlike traditional platforms with opaque algorithms, TruthFlow’s DAO allows users to govern content ranking and visibility.
- **Lack of User Agency**: Readers and contributors have no ownership over news platforms. TruthFlow gives users control via tokenized governance and rewards.
- **Incentive Misalignment**: Traditional media incentivizes clicks over truth. TruthFlow rewards accuracy and penalizes misinformation through reputation systems.

---

## Features

- **Decentralized Content Submission**: Anyone can submit news articles or summaries, stored on-chain for transparency.
- **Community Verification**: Token holders vote on content credibility, with weighted votes based on reputation scores.
- **Reputation System**: Contributors earn reputation for accurate submissions and lose it for misinformation, influencing their voting power.
- **Token Rewards**: Users receive platform tokens (TFLOW) for submitting, verifying, or curating credible content.
- **Transparent Governance**: A DAO governs platform rules, content moderation policies, and reward distribution.
- **External Data Integration**: Oracles connect to trusted fact-checking services or APIs to validate claims.
- **Immutable Audit Trail**: All submissions, votes, and rewards are recorded on-chain for accountability.

---

## Smart Contracts

### Content Submission Contract
- Allows users to submit news articles or summaries with metadata (source, timestamp, category).
- Stores content hashes on-chain for immutability.
- Triggers initial review by community verifiers.
- Functions:
  - `submit-content(content-hash: string, metadata: {source: string, timestamp: uint, category: string})`
  - `get-content(content-id: uint)`
  - `flag-content(content-id: uint)`

### Governance DAO Contract
- Manages token-weighted voting for content credibility and platform policies.
- Executes approved proposals (e.g., content approval, policy changes).
- Enforces quorum and voting deadlines.
- Functions:
  - `create-proposal(proposal-type: string, content-id: uint, details: string)`
  - `vote(proposal-id: uint, vote: bool)`
  - `execute-proposal(proposal-id: uint)`

### Reputation and Rewards Contract
- Tracks user reputation scores based on successful/failed content submissions or verifications.
- Distributes TFLOW tokens for contributions (e.g., submitting verified content, accurate voting).
- Penalizes users for flagged misinformation by reducing reputation.
- Functions:
  - `update-reputation(user: principal, score-delta: int)`
  - `distribute-rewards(content-id: uint, contributors: (list principal))`
  - `get-reputation(user: principal)`

### Oracle Integration Contract
- Connects to off-chain fact-checking APIs or trusted sources (e.g., via Chainlink on Stacks).
- Provides external data for content verification (e.g., cross-referencing claims).
- Ensures secure data feeds for governance and reward calculations.
- Functions:
  - `request-fact-check(content-id: uint, api-endpoint: string)`
  - `receive-oracle-data(request-id: uint, result: bool)`
  - `get-oracle-result(content-id: uint)`

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started) for Stacks development.
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/truthflow.git
   ```
3. Navigate to the project directory:
   ```bash
   cd truthflow
   ```
4. Run tests:
   ```bash
   clarinet test
   ```
5. Deploy contracts to the Stacks testnet:
   ```bash
   clarinet deploy
   ```

---

## Usage

1. **Submit Content**: Users submit news articles or summaries via the Content Submission Contract, providing a content hash and metadata.
2. **Vote on Content**: Token holders use the Governance DAO Contract to vote on content credibility or platform proposals.
3. **Earn Rewards**: The Reputation and Rewards Contract tracks contributions and distributes TFLOW tokens for verified content or accurate votes.
4. **Verify with Oracles**: The Oracle Integration Contract fetches external fact-checking data to support voting decisions.
5. Refer to individual contract documentation for detailed function calls and parameters.

---

## Example Workflow

1. A user submits a news article hash with metadata (e.g., source: "Reuters", category: "Politics").
2. The community votes on its credibility via the Governance DAO Contract, weighted by reputation.
3. The Oracle Integration Contract fetches fact-checking data from a trusted API.
4. If approved, the submitter and verifiers earn TFLOW tokens and reputation points via the Reputation and Rewards Contract.
5. Flagged misinformation reduces the submitter’s reputation, limiting their future influence.

---

## License

MIT License

