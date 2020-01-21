/* External Imports */
import { ethers } from 'ethers'
import {
  bufToHexString,
  remove0x,
  getLogger,
  hexStrToBuf,
  bufferUtils,
} from '@pigi/core-utils'
import {
  Address,
  bytecodeToBuffer,
  EVMBytecode,
  formatBytecode,
  Opcode,
} from '@pigi/rollup-core'

/* Internal Imports */
import {
  EvmIntrospectionUtil,
  ExecutionResult,
  StepContext,
} from '../../src/types/vm'
import { EvmIntrospectionUtilImpl } from '../../src/tools/vm'
import { setMemory } from '../helpers'
import { getCallTypeReplacement, getEXTCODECOPYReplacement } from '../../src'

const log = getLogger(`test-static-memory-opcodes`)

const abi = new ethers.utils.AbiCoder()

/* Contracts */
import * as AssemblyReturnGetter from '../contracts/build/AssemblyReturnGetter.json'
import {
  getPUSHBuffer,
  getPUSHIntegerOp,
} from '../../src/tools/transpiler/memory-substitution'

const contractDeployParams: Buffer = Buffer.from(
  remove0x(abi.encode(['bytes'], ['0xbeadfeed'])),
  'hex'
)

describe('Memory-dynamic Opcode Replacement', () => {
  let evmUtil: EvmIntrospectionUtil
  const callProxyFunctionName: string = 'get'

  const setupStackForCALL: EVMBytecode = [
    // fill memory with some random data so that we can confirm it was not modified
    ...setMemory(Buffer.alloc(32 * 10).fill(25)),
    getPUSHIntegerOp(5), // ret length
    getPUSHIntegerOp(8 * 32), // ret offset; must exceed 4 * 32, TODO: need to write new memory in a loop to fix this edge case?
    getPUSHIntegerOp(15), // args length
    getPUSHIntegerOp(4 * 32 + 17), // args offset; must exceed 4 * 32, TODO: need to write new memory in a loop to fix this edge case?
    getPUSHIntegerOp(0), // value
    getPUSHBuffer(hexStrToBuf('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')), // target address
    getPUSHIntegerOp(100100100), // gas
  ]

  const deployCallProxyContract = async (
    util: EvmIntrospectionUtil
  ): Promise<Address> => {
    const contractBytecode: Buffer = Buffer.from(
      AssemblyReturnGetter.bytecode,
      'hex'
    )
    const result: ExecutionResult = await util.deployContract(
      contractBytecode,
      contractDeployParams
    )
    return bufToHexString(result.result)
  }
  beforeEach(async () => {
    evmUtil = await EvmIntrospectionUtilImpl.create()
  })

  describe('Call-type opcode replacements', () => {
    it('should parse a CALL replacement', async () => {
      const getterAddress: Address = await deployCallProxyContract(evmUtil)
      const callReplacement: EVMBytecode = [
        ...setupStackForCALL,
        ...getCallTypeReplacement(getterAddress, callProxyFunctionName, 3),
        { opcode: Opcode.RETURN, consumedBytes: undefined },
      ]
      const proxiedCall = await evmUtil.getStepContextBeforeStep(
        bytecodeToBuffer(callReplacement),
        bytecodeToBuffer(callReplacement).length - 1
      )
    })
  })
  describe('EXTCODECOPY replacement', () => {
    const setupStackForEXTCODECOPY: EVMBytecode = [
      // fill memory with some random data so that we can confirm it was not modified
      ...setMemory(Buffer.alloc(32 * 10).fill(25)),
      getPUSHIntegerOp(4), // length
      getPUSHIntegerOp(3), // offset
      getPUSHIntegerOp(2), // destoffset
      getPUSHIntegerOp(1), // address
    ]

    it('should correctly parse an EXTCODECOPY replacement', async () => {
      const getterAddress: Address = await deployCallProxyContract(evmUtil)
      const extcodesizeReplacement: EVMBytecode = [
        ...setupStackForEXTCODECOPY,
        ...getEXTCODECOPYReplacement(getterAddress, callProxyFunctionName),
        { opcode: Opcode.RETURN, consumedBytes: undefined },
      ]
      const proxiedCall = await evmUtil.getStepContextBeforeStep(
        bytecodeToBuffer(extcodesizeReplacement),
        bytecodeToBuffer(extcodesizeReplacement).length - 1
      )
    })
  })
})
