const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { ethers } = require("hardhat");

describe("SimpleStorage", function () {
  let simpleStorage;
  let owner;
  let otherAccount;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();
    const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
    simpleStorage = await SimpleStorage.deploy();
    await simpleStorage.waitForDeployment();
  });

  describe("initial state", function () {
    it("starts with a stored value of zero", async function () {
      expect(await simpleStorage.getValue()).to.equal(0n);
    });

    it("has no last updater initially", async function () {
      expect(await simpleStorage.lastUpdatedBy()).to.equal(ethers.ZeroAddress);
    });

    it("has never been updated initially", async function () {
      expect(await simpleStorage.lastUpdatedAt()).to.equal(0n);
    });
  });

  describe("setValue", function () {
    it("stores a new value that getValue() returns", async function () {
      await simpleStorage.setValue(42n);
      expect(await simpleStorage.getValue()).to.equal(42n);
    });

    it("overwrites the previous value", async function () {
      await simpleStorage.setValue(1n);
      await simpleStorage.setValue(2n);
      expect(await simpleStorage.getValue()).to.equal(2n);
    });

    it("accepts zero as a value", async function () {
      await simpleStorage.setValue(0n);
      expect(await simpleStorage.getValue()).to.equal(0n);
    });

    it("accepts the maximum uint256 value", async function () {
      const maxUint256 = (1n << 256n) - 1n;
      await simpleStorage.setValue(maxUint256);
      expect(await simpleStorage.getValue()).to.equal(maxUint256);
    });

    it("records who last updated the value and when", async function () {
      await simpleStorage.connect(otherAccount).setValue(7n);
      expect(await simpleStorage.lastUpdatedBy()).to.equal(otherAccount.address);
      expect(await simpleStorage.lastUpdatedAt()).to.not.equal(0n);
    });

    it("emits a ValueUpdated event with the old and new value", async function () {
      await simpleStorage.setValue(1n);
      await expect(simpleStorage.setValue(99n))
        .to.emit(simpleStorage, "ValueUpdated")
        .withArgs(owner.address, 1n, 99n, anyValue);
    });
  });

  describe("getValue", function () {
    it("can be read by any account", async function () {
      await simpleStorage.setValue(5n);
      expect(await simpleStorage.connect(otherAccount).getValue()).to.equal(5n);
    });
  });
});
