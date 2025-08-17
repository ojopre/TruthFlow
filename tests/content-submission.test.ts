import { describe, it, expect, beforeEach } from "vitest";

interface Content {
  hash: string;
  submitter: string;
  source: string;
  timestamp: bigint;
  category: string;
  status: string;
  submitTime: bigint;
  flagCount: bigint;
}

const mockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" as string,
  paused: false as boolean,
  nextContentId: 1n as bigint,
  contents: new Map<bigint, Content>(),
  flags: new Map<bigint, string[]>(),
  MAX_HASH_LENGTH: 64n,
  MAX_SOURCE_LENGTH: 128n,
  MAX_CATEGORY_LENGTH: 32n,

  isAdmin(caller: string): boolean {
    return caller === this.admin;
  },

  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number } {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  submitContent(
    caller: string,
    contentHash: string,
    metadata: { source: string; timestamp: bigint; category: string }
  ): { value: bigint } | { error: number } {
    if (this.paused) return { error: 101 };
    if (contentHash.length > Number(this.MAX_HASH_LENGTH) || contentHash.length === 0) return { error: 102 };
    if (metadata.source.length > Number(this.MAX_SOURCE_LENGTH)) return { error: 108 };
    if (metadata.category.length > Number(this.MAX_CATEGORY_LENGTH)) return { error: 108 };
    const validCategories = ["politics", "economy", "technology", "health", "environment", "sports", "entertainment", "other"];
    if (!validCategories.includes(metadata.category)) return { error: 109 };

    const contentId = this.nextContentId;
    this.contents.set(contentId, {
      hash: contentHash,
      submitter: caller,
      source: metadata.source,
      timestamp: metadata.timestamp,
      category: metadata.category,
      status: "pending",
      submitTime: 100n, // Mock block height
      flagCount: 0n,
    });
    this.nextContentId += 1n;
    return { value: contentId };
  },

  flagContent(caller: string, contentId: bigint): { value: boolean } | { error: number } {
    if (this.paused) return { error: 101 };
    const content = this.contents.get(contentId);
    if (!content) return { error: 104 };
    if (content.status === "rejected") return { error: 106 };

    let currentFlags = this.flags.get(contentId) || [];
    if (currentFlags.includes(caller)) return { error: 105 };
    currentFlags = [...currentFlags, caller];
    this.flags.set(contentId, currentFlags);

    content.flagCount += 1n;
    if (content.flagCount >= 5n) {
      content.status = "flagged";
    }
    this.contents.set(contentId, content);
    return { value: true };
  },

  updateStatus(caller: string, contentId: bigint, newStatus: string): { value: boolean } | { error: number } {
    if (!this.isAdmin(caller)) return { error: 100 };
    const content = this.contents.get(contentId);
    if (!content) return { error: 104 };
    const validStatuses = ["verified", "rejected", "pending", "flagged"];
    if (!validStatuses.includes(newStatus)) return { error: 106 };
    content.status = newStatus;
    this.contents.set(contentId, content);
    return { value: true };
  },

  getContent(contentId: bigint): { value: Content | undefined } {
    return { value: this.contents.get(contentId) };
  },

  getContentStatus(contentId: bigint): { value: string | undefined } | { error: number } {
    const content = this.contents.get(contentId);
    if (!content) return { error: 104 };
    return { value: content.status };
  },

  getFlagCount(contentId: bigint): { value: bigint | undefined } | { error: number } {
    const content = this.contents.get(contentId);
    if (!content) return { error: 104 };
    return { value: content.flagCount };
  },
};

describe("TruthFlow Content Submission Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.nextContentId = 1n;
    mockContract.contents = new Map();
    mockContract.flags = new Map();
  });

  it("should allow admin to pause and unpause", () => {
    const pauseResult = mockContract.setPaused(mockContract.admin, true);
    expect(pauseResult).toEqual({ value: true });
    expect(mockContract.paused).toBe(true);

    const unpauseResult = mockContract.setPaused(mockContract.admin, false);
    expect(unpauseResult).toEqual({ value: false });
    expect(mockContract.paused).toBe(false);
  });

  it("should prevent non-admin from pausing", () => {
    const result = mockContract.setPaused("ST2CY5V39NHDPWSXMW9QDT3tIPqbNy1wARJ1XPG0", true);
    expect(result).toEqual({ error: 100 });
  });

  it("should submit content with valid inputs", () => {
    const metadata = { source: "Example News", timestamp: 1627849200n, category: "politics" };
    const result = mockContract.submitContent("ST2CY5V39NHDPWSXMW9QDT3tIPqbNy1wARJ1XPG0", "ipfs://QmExampleHash", metadata);
    expect(result).toEqual({ value: 1n });
    const content = mockContract.getContent(1n).value;
    expect(content?.hash).toBe("ipfs://QmExampleHash");
    expect(content?.status).toBe("pending");
    expect(content?.flagCount).toBe(0n);
  });

  it("should reject submission with invalid category", () => {
    const metadata = { source: "Example News", timestamp: 1627849200n, category: "invalid" };
    const result = mockContract.submitContent("ST2CY5V39NHDPWSXMW9QDT3tIPqbNy1wARJ1XPG0", "ipfs://QmExampleHash", metadata);
    expect(result).toEqual({ error: 109 });
  });

  it("should reject submission when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const metadata = { source: "Example News", timestamp: 1627849200n, category: "politics" };
    const result = mockContract.submitContent("ST2CY5V39NHDPWSXMW9QDT3tIPqbNy1wARJ1XPG0", "ipfs://QmExampleHash", metadata);
    expect(result).toEqual({ error: 101 });
  });

  it("should flag content and update count", () => {
    const metadata = { source: "Example News", timestamp: 1627849200n, category: "politics" };
    mockContract.submitContent("ST2CY5V39NHDPWSXMW9QDT3tIPqbNy1wARJ1XPG0", "ipfs://QmExampleHash", metadata);
    const flagResult = mockContract.flagContent("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDgn7dPw3nX59", 1n);
    expect(flagResult).toEqual({ value: true });
    expect(mockContract.getFlagCount(1n)).toEqual({ value: 1n });
  });

  it("should prevent duplicate flags from same user", () => {
    const metadata = { source: "Example News", timestamp: 1627849200n, category: "politics" };
    mockContract.submitContent("ST2CY5V39NHDPWSXMW9QDT3tIPqbNy1wARJ1XPG0", "ipfs://QmExampleHash", metadata);
    mockContract.flagContent("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDgn7dPw3nX59", 1n);
    const duplicateResult = mockContract.flagContent("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDgn7dPw3nX59", 1n);
    expect(duplicateResult).toEqual({ error: 105 });
  });

  it("should auto-flag status after 5 flags", () => {
    const metadata = { source: "Example News", timestamp: 1627849200n, category: "politics" };
    mockContract.submitContent("ST2CY5V39NHDPWSXMW9QDT3tIPqbNy1wARJ1XPG0", "ipfs://QmExampleHash", metadata);
    for (let i = 1; i <= 5; i++) {
      mockContract.flagContent(`ST${i}FLAGGER`, 1n);
    }
    expect(mockContract.getContentStatus(1n)).toEqual({ value: "flagged" });
    expect(mockContract.getFlagCount(1n)).toEqual({ value: 5n });
  });

  it("should allow admin to update status", () => {
    const metadata = { source: "Example News", timestamp: 1627849200n, category: "politics" };
    mockContract.submitContent("ST2CY5V39NHDPWSXMW9QDT3tIPqbNy1wARJ1XPG0", "ipfs://QmExampleHash", metadata);
    const updateResult = mockContract.updateStatus(mockContract.admin, 1n, "verified");
    expect(updateResult).toEqual({ value: true });
    expect(mockContract.getContentStatus(1n)).toEqual({ value: "verified" });
  });

  it("should prevent non-admin from updating status", () => {
    const metadata = { source: "Example News", timestamp: 1627849200n, category: "politics" };
    mockContract.submitContent("ST2CY5V39NHDPWSXMW9QDT3tIPqbNy1wARJ1XPG0", "ipfs://QmExampleHash", metadata);
    const result = mockContract.updateStatus("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDgn7dPw3nX59", 1n, "verified");
    expect(result).toEqual({ error: 100 });
  });

  it("should reject invalid status update", () => {
    const metadata = { source: "Example News", timestamp: 1627849200n, category: "politics" };
    mockContract.submitContent("ST2CY5V39NHDPWSXMW9QDT3tIPqbNy1wARJ1XPG0", "ipfs://QmExampleHash", metadata);
    const result = mockContract.updateStatus(mockContract.admin, 1n, "invalid");
    expect(result).toEqual({ error: 106 });
  });
});