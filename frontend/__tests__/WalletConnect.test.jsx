import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WalletConnect from "../app/components/WalletConnect";
import { METAMASK_DOWNLOAD_URL } from "../app/lib/ethereum";

function renderWalletConnect(overrides = {}) {
  const props = {
    hasProvider: true,
    address: null,
    chainId: null,
    balance: null,
    isConnecting: false,
    error: null,
    isSepolia: false,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onSwitchNetwork: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<WalletConnect {...props} />) };
}

describe("WalletConnect", () => {
  it("shows install instructions when MetaMask is not installed", () => {
    renderWalletConnect({ hasProvider: false });
    expect(screen.getByText(/metamask was not detected/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /metamask\.io\/download/i });
    expect(link).toHaveAttribute("href", METAMASK_DOWNLOAD_URL);
  });

  it("shows a connect button when no wallet is connected", () => {
    renderWalletConnect();
    expect(screen.getByRole("button", { name: /connect metamask/i })).toBeEnabled();
  });

  it("calls onConnect when the connect button is clicked", async () => {
    const onConnect = jest.fn();
    renderWalletConnect({ onConnect });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /connect metamask/i }));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it("shows address, network and balance once connected", () => {
    renderWalletConnect({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 11155111,
      balance: "3.25",
      isSepolia: true,
    });
    expect(screen.getByText("0x1234…5678")).toBeInTheDocument();
    expect(screen.getByText(/sepolia testnet/i)).toBeInTheDocument();
    expect(screen.getByText(/3\.25 ETH/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeEnabled();
  });

  it("prompts to switch networks when on the wrong chain", () => {
    renderWalletConnect({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
      isSepolia: false,
    });
    expect(screen.getByRole("button", { name: /switch to sepolia/i })).toBeEnabled();
  });

  it("calls onSwitchNetwork from the switch button", async () => {
    const onSwitchNetwork = jest.fn();
    renderWalletConnect({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
      onSwitchNetwork,
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /switch to sepolia/i }));
    expect(onSwitchNetwork).toHaveBeenCalledTimes(1);
  });

  it("shows connection errors", () => {
    renderWalletConnect({ error: "Request rejected — you cancelled the request in MetaMask." });
    expect(screen.getByRole("alert")).toHaveTextContent(/cancelled/i);
  });
});
