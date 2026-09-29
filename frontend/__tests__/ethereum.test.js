import {
  describeWalletError,
  formatBalance,
  getNetworkName,
  hexToChainId,
  shortenAddress,
} from "../app/lib/ethereum";
import { validateValueInput } from "../app/lib/contract";

describe("shortenAddress", () => {
  it("shortens long hex strings", () => {
    expect(shortenAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });

  it("leaves short values untouched", () => {
    expect(shortenAddress("0xabc")).toBe("0xabc");
  });
});

describe("hexToChainId", () => {
  it("converts Sepolia's hex chain id to 11155111", () => {
    expect(hexToChainId("0xaa36a7")).toBe(11155111);
  });

  it("converts 0x1 to 1", () => {
    expect(hexToChainId("0x1")).toBe(1);
  });

  it("returns null for invalid input", () => {
    expect(hexToChainId("not-hex")).toBeNull();
    expect(hexToChainId("")).toBeNull();
  });
});

describe("getNetworkName", () => {
  it("knows Sepolia", () => {
    expect(getNetworkName(11155111)).toBe("Sepolia Testnet");
  });

  it("knows Ethereum Mainnet", () => {
    expect(getNetworkName(1)).toBe("Ethereum Mainnet");
  });

  it("labels unknown chains by id", () => {
    expect(getNetworkName(999)).toBe("Chain ID 999");
  });

  it("returns Unknown when the chain is not known yet", () => {
    expect(getNetworkName(null)).toBe("Unknown");
  });
});

describe("describeWalletError", () => {
  it("explains MetaMask rejections (code 4001)", () => {
    const message = describeWalletError({
      code: 4001,
      message: "MetaMask Tx Signature: User denied transaction.",
    });
    expect(message).toMatch(/rejected/i);
  });

  it("explains already-pending requests (-32002)", () => {
    expect(describeWalletError({ code: -32002, message: "request already pending" })).toMatch(
      /already pending/i,
    );
  });

  it("explains insufficient funds", () => {
    expect(describeWalletError(new Error("insufficient funds for gas * price + value"))).toMatch(
      /faucet/i,
    );
  });

  it("includes the underlying message for unknown errors", () => {
    expect(describeWalletError(new Error("boom"))).toContain("boom");
  });
});

describe("formatBalance", () => {
  it("formats whole ETH", () => {
    expect(formatBalance(1_000_000_000_000_000_000n)).toBe("1");
  });

  it("keeps up to four decimals", () => {
    expect(formatBalance(1_234_000_000_000_000n)).toBe("0.0012");
  });

  it("keeps meaningful decimals", () => {
    expect(formatBalance(1_050_000_000_000_000_000n)).toBe("1.05");
  });
});

describe("validateValueInput", () => {
  it("accepts whole numbers", () => {
    expect(validateValueInput("42")).toEqual({ ok: true, value: 42n });
    expect(validateValueInput(" 7 ")).toEqual({ ok: true, value: 7n });
    expect(validateValueInput("0")).toEqual({ ok: true, value: 0n });
  });

  it("accepts the maximum uint256 value", () => {
    const max = (1n << 256n) - 1n;
    expect(validateValueInput(max.toString())).toEqual({ ok: true, value: max });
  });

  it("rejects empty input", () => {
    expect(validateValueInput("").ok).toBe(false);
    expect(validateValueInput("   ").ok).toBe(false);
  });

  it("rejects non-numeric, negative and decimal input", () => {
    expect(validateValueInput("abc").error).toMatch(/whole numbers/i);
    expect(validateValueInput("-1").error).toMatch(/whole numbers/i);
    expect(validateValueInput("1.5").error).toMatch(/whole numbers/i);
    expect(validateValueInput("1e10").error).toMatch(/whole numbers/i);
  });

  it("rejects values above the uint256 maximum", () => {
    const tooBig = (1n << 256n) - 1n + 1n;
    expect(validateValueInput(tooBig.toString()).error).toMatch(/maximum/i);
  });
});
