import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Lottery, Lottery__factory } from "../../artifacts-types";

describe("Lottery", () => {
  let lottery: Lottery;
  let owner: SignerWithAddress;

  beforeEach(async () => {
    const lotteryFactory = await ethers.getContractFactory("Lottery");
    [owner] = await hre.ethers.getSigners();

    lottery = await lotteryFactory.deploy();
    await lottery.deployed();
  });

  describe("registration", async () => {
    it("should allow draw ticket", async () => {
      await lottery.drawTicket(1, 1);
    });

    it("should reject draw ticket with same id", async () => {
      await lottery.drawTicket(1, 1);
      await expect(lottery.drawTicket(1, 1)).to.be.revertedWith("Lottery: already known candidate");
    });

    it("should reject 0 weight", async () => {
      await expect(lottery.drawTicket(0, 1)).to.be.revertedWith("Lottery: weight should be more than 0");
    });

    it("after draw 1 ticket list should be 1", async () => {
      await lottery.drawTicket(1, 1);
      const tickets = await lottery.callStatic.allCandidates();
      expect(tickets.map(({ id }) => id.toNumber()).join(",")).to.be.equal("1");
    });

    it("after draw ticket list should contains expected weight", async () => {
      await lottery.drawTicket(42, 1);
      const tickets = await lottery.callStatic.allCandidates();
      expect(tickets[0].weight).to.be.equal(42);
    });

    it("after draw 10 ticket list should be 10", async () => {
      for (let index = 0; index < 10; index++) {
        await lottery.drawTicket(1, index);
      }

      const tickets = await lottery.callStatic.allCandidates();
      expect(tickets.length).to.be.equal(10);
    });

    describe.skip("randomness", async () => {
      const candidates = [
        { weight: 1, id: 1 },
        { weight: 1, id: 2 },
        { weight: 1, id: 3 },
        { weight: 100, id: 9 },
      ];

      [10, 20, 50, 100, 200, 300].forEach(steps => {
        it(`check randomness in ${steps} epochs`, async () => {
          console.log(`Candidates: ${candidates.map(({ weight, id }) => `${id}: ${weight}`).join(", ")}`);
          const winners: Record<number, number> = {};
          for (let step = 0; step < steps; step++) {
            lottery = await new Lottery__factory(owner).deploy();
            await lottery.drawTickets(candidates);

            const [winnerAddress] = await lottery.callStatic.shuffle(1, Math.ceil(Math.random() * 1000000));
            const winner = Number(winnerAddress.slice(-1));
            winners[winner] = winners[winner] + 1 || 1;
          }

          console.log(
            Object.entries(winners)
              .map(([id, count]) => `${id}: ${((count / steps) * 100).toFixed(2)}%`)
              .join(", "),
          );
        }).timeout(60000);
      });
    });

    describe.skip("benchmark", async () => {
      const counts = 2 ** 5;
      const weights = 300;

      for (let count = 1; count <= counts; count *= 2) {
        it(`shuffle ${count} weights ${weights}`, async () => {
          expect(false);
          lottery.drawTickets(
            new Array(count)
              .fill(0)
              .map((_, index) => ({ weight: Math.ceil(((index + 1) / count) * weights), id: index })),
          );

          const gasSpent = await lottery.estimateGas.shuffle(5, 42);
          console.log(`Calculated snapshot for ${count} candidate with ${gasSpent} gas`);
        }).timeout(60000);
      }
    });
  });
});
