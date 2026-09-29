// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SimpleStorage
 * @notice Minimal example contract: stores a single uint256 value that anyone
 *         can read and update. Intentionally simple — built for learning.
 */
contract SimpleStorage {
    /// @dev The value stored in the contract. Zero until setValue() is called.
    uint256 private storedValue;

    /// @notice Address of the account that last called setValue().
    address public lastUpdatedBy;

    /// @notice Unix timestamp of the last setValue() call. Zero if never updated.
    uint256 public lastUpdatedAt;

    /// @notice Emitted every time the stored value changes.
    event ValueUpdated(
        address indexed updater,
        uint256 oldValue,
        uint256 newValue,
        uint256 timestamp
    );

    /**
     * @notice Store `newValue` in the contract.
     * @param newValue The new value to store (any uint256).
     */
    function setValue(uint256 newValue) external {
        uint256 oldValue = storedValue;
        storedValue = newValue;
        lastUpdatedBy = msg.sender;
        lastUpdatedAt = block.timestamp;
        emit ValueUpdated(msg.sender, oldValue, newValue, block.timestamp);
    }

    /**
     * @notice Read the currently stored value.
     * @return The stored uint256 value.
     */
    function getValue() external view returns (uint256) {
        return storedValue;
    }
}
