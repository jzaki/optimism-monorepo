import { expect } from '../setup'

/* External Imports */
import { ethers } from '@nomiclabs/buidler'

/* Internal Imports */
import { deployAllContracts } from '../../src'
import {
  RollupDeployConfig,
  factoryToContractName,
} from '../../src/deployment/types'
import { Signer } from 'ethers'
import { GAS_LIMIT, DEFAULT_FORCE_INCLUSION_PERIOD } from '../test-helpers'

describe('Contract Deployment', () => {
  let wallet: Signer
  let sequencer: Signer
  let l1ToL2TransactionPasser: Signer
  before(async () => {
    ;[wallet, sequencer, l1ToL2TransactionPasser] = await ethers.getSigners()
  })

  describe('deployAllContracts', () => {
    it('should deploy contracts in a default configuration', async () => {
      const config: RollupDeployConfig = {
        signer: wallet,
        rollupOptions: {
          forceInclusionPeriod: DEFAULT_FORCE_INCLUSION_PERIOD,
          owner: wallet,
          sequencer,
          l1ToL2TransactionPasser,
          gasMeterConfig: {
            ovmTxFlatGasFee: 1000,
            ovmTxMaxGas: 1000,
            gasRateLimitEpochLength: 1000,
            maxSequencedGasPerEpoch: 1000,
            maxQueuedGasPerEpoch: 1000
          }
        },
      }

      const resolver = await deployAllContracts(config)

      expect(
        Object.values(factoryToContractName).every((contractName) => {
          return contractName in resolver.contracts
        })
      ).to.be.true
    })
  })
})