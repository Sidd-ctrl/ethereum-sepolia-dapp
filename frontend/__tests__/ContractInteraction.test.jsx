import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContractInteraction from "../app/components/ContractInteraction";
import { readStoredValue, submitValue } from "../app/lib/contract";

jest.mock("../app/lib/contract", () => {
  const actual = jest.requireActual("../app/lib/contract");
  return {
    ...actual,
    readStoredValue: jest.fn(),
    submitValue: jest.fn(),
  };
});

const mockProvider = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  isMetaMask: true,
};

function renderContract(overrides = {}) {
  const props = {
    hasProvider: true,
    address: "0x1111111111111111111111111111111111111111",
    isSepolia: true,
    contractConfigured: true,
    ...overrides,
  };
  return render(<ContractInteraction {...props} />);
}

function mockSuccessfulRead(value = 42n) {
  readStoredValue.mockResolvedValue({
    value,
    lastUpdatedBy: "0x2222222222222222222222222222222222222222",
    lastUpdatedAt: new Date("2026-01-01T12:00:00Z"),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(window, "ethereum", {
    value: mockProvider,
    configurable: true,
    writable: true,
  });
});

describe("ContractInteraction", () => {
  it("renders the stored value read from the contract", async () => {
    mockSuccessfulRead(42n);
    renderContract();
    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(readStoredValue).toHaveBeenCalledTimes(1);
  });

  it("shows an error banner when the read fails", async () => {
    readStoredValue.mockRejectedValue(new Error("RPC unreachable"));
    renderContract();
    expect(await screen.findByText(/could not read the contract/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeEnabled();
  });

  it("shows guidance when no contract address is configured", () => {
    renderContract({ contractConfigured: false });
    expect(screen.getByText(/no contract address configured/i)).toBeInTheDocument();
  });

  it("disables updates until a wallet is connected", async () => {
    mockSuccessfulRead(1n);
    renderContract({ address: null });
    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update value/i })).toBeDisabled();
    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument();
  });

  it("disables updates on the wrong network", async () => {
    mockSuccessfulRead(1n);
    renderContract({ isSepolia: false });
    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update value/i })).toBeDisabled();
    expect(screen.getByText(/switch to the sepolia network/i)).toBeInTheDocument();
  });

  it("validates input before submitting anything", async () => {
    mockSuccessfulRead(1n);
    renderContract();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/new value/i), "abc");
    await user.click(screen.getByRole("button", { name: /update value/i }));
    expect(submitValue).not.toHaveBeenCalled();
    expect(screen.getByText(/whole numbers/i)).toBeInTheDocument();
  });

  it("submits the value and reports the confirmed transaction", async () => {
    mockSuccessfulRead(1n);
    submitValue.mockResolvedValue({
      hash: "0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1",
      wait: jest.fn().mockResolvedValue({ status: 1, blockNumber: 12345 }),
    });
    renderContract();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/new value/i), "123");
    await user.click(screen.getByRole("button", { name: /update value/i }));

    expect(submitValue).toHaveBeenCalledTimes(1);
    expect(submitValue).toHaveBeenCalledWith(mockProvider, 123n);

    expect(await screen.findByText(/transaction confirmed/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /view on etherscan/i });
    expect(link.getAttribute("href")).toContain("0xabc123");
  });

  it("reports rejected transactions as errors", async () => {
    mockSuccessfulRead(1n);
    submitValue.mockRejectedValue({ code: 4001, message: "User denied transaction signature." });
    renderContract();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/new value/i), "5");
    await user.click(screen.getByRole("button", { name: /update value/i }));
    expect(await screen.findByText(/transaction failed/i)).toBeInTheDocument();
    expect(screen.getByText(/rejected/i)).toBeInTheDocument();
  });
});
