import { Safe4337Pack } from '@safe-global/relay-kit'
import dotenv from 'dotenv'
import {ethers} from "ethers";
import {SafeProxyFactoryABI} from "./abi/SafeProxyFactory.abi.js";
import {AddModulesLibABI} from "./abi/AddModulesLib.abi.js";
import {SafeABI} from "./abi/Safe.abi.js";
import { keccak_256 } from '@noble/hashes/sha3'
import {
    EthSafeSignature,
} from '@safe-global/protocol-kit'
import {EIP712_SAFE_OPERATION_TYPE} from "@safe-global/relay-kit/dist/src/packs/safe-4337/constants.js";
import {EntryPointABI} from "./abi/EntryPoint.abi.js";
dotenv.config()


const SIGNER_PRIVATE_KEY = process.env.PRIVATE_KEY
const SIGNER_PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2

const SIGNER_ADDRESS = process.env.ADDRESS
const SIGNER_ADDRESS_2 = process.env.ADDRESS_2
const SIGNER_ADDRESS_3 = process.env.ADDRESS_3

// const RPC_URL = 'https://rpc.ankr.com/eth_sepolia'
// const BUNDLER_URL = `https://api.pimlico.io/v2/11155111/rpc?apikey=${process.env.PIMLICO_API_KEY}`
// const RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
const RPC_URL = `https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

export const Safe4337ModuleAddress = '0xa581c4A4DB7175302464fF3C06380BC3270b4037'
export const SafeProxyFactoryAddress = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67'
export const SafeSingletonAddress = '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762'
export const SafeModuleSetupAddress = '0x8EcD4ec46D4D2a6B64fE960B3D64e8B94B2234eb'
const EntryPointAddress = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'

export const provider = new ethers.JsonRpcProvider(RPC_URL)
// export const Safe4337ModuleContract = new ethers.Contract(Safe4337ModuleAddress, Safe4337ModuleABI, provider)
export const SafeProxyFactoryContract = new ethers.Contract(SafeProxyFactoryAddress, SafeProxyFactoryABI, provider)
export const SafeSingletonContract = new ethers.Contract(SafeSingletonAddress, SafeABI, provider)
export const SafeModuleSetupContract = new ethers.Contract(SafeModuleSetupAddress, AddModulesLibABI, provider)
const executeWallet = new ethers.Wallet(SIGNER_PRIVATE_KEY, provider)
export const entryPoint = new ethers.Contract("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", EntryPointABI, executeWallet);


// keccak256(toUtf8Bytes('Safe Account Abstraction'))
export const PREDETERMINED_SALT_NONCE =
    '0xb1073742015cbcf5a3a4d9d1ae33ecf619439710b89475f92e2abd2117e90f90'
function getChainSpecificDefaultSaltNonce(chainId) {
    return `0x${Buffer.from(keccak_256(PREDETERMINED_SALT_NONCE + chainId)).toString('hex')}`
}

const calculateProxyAddress = async (inititalizer, nonce)=> {
    const proxyCreationCode = await SafeProxyFactoryContract.proxyCreationCode()

    const deploymentCode = ethers.solidityPacked(['bytes', 'uint256'], [proxyCreationCode, SafeSingletonAddress])
    const salt = ethers.solidityPackedKeccak256(['bytes32', 'uint256'], [ethers.solidityPackedKeccak256(['bytes'], [inititalizer]), nonce])
    return ethers.getCreate2Address(SafeProxyFactoryAddress, salt, ethers.keccak256(deploymentCode))
}

const buildSignatureBytes = (signatures) => {
    const SIGNATURE_LENGTH_BYTES = 65

    signatures.sort((left, right) =>
        left.signer.toLowerCase().localeCompare(right.signer.toLowerCase())
    )

    let signatureBytes = '0x'
    let dynamicBytes = ''

    for (const signature of signatures) {
        if (signature.isContractSignature) {
            /*
              A contract signature has a static part of 65 bytes and the dynamic part that needs to be appended
              at the end of signature bytes.
              The signature format is
              Signature type == 0
              Constant part: 65 bytes
              {32-bytes signature verifier}{32-bytes dynamic data position}{1-byte signature type}
              Dynamic part (solidity bytes): 32 bytes + signature data length
              {32-bytes signature length}{bytes signature data}
            */
            const dynamicPartPosition = (
                signatures.length * SIGNATURE_LENGTH_BYTES +
                dynamicBytes.length / 2
            )
                .toString(16)
                .padStart(64, '0')

            signatureBytes += signature.staticPart(dynamicPartPosition)
            dynamicBytes += signature.dynamicPart()
        } else {
            signatureBytes += signature.data.slice(2)
        }
    }

    return signatureBytes + dynamicBytes
}

async function signSafeOp(
    signer,
    safeUserOperation,
    safe4337ModuleAddress = Safe4337ModuleAddress
) {
    const network = await provider.getNetwork()
    const chainId = network.chainId
    const signerAddress = await signer.getAddress()
    console.log('adasdsad')
    const signature = await signer.signTypedData(
        {
            chainId,
            verifyingContract: safe4337ModuleAddress
        },
        EIP712_SAFE_OPERATION_TYPE,
        {
            ...safeUserOperation,
            nonce: ethers.toBeHex(safeUserOperation.nonce),
            validAfter: ethers.toBeHex(safeUserOperation.validAfter),
            validUntil: ethers.toBeHex(safeUserOperation.validUntil),
            maxFeePerGas: ethers.toBeHex(safeUserOperation.maxFeePerGas),
            maxPriorityFeePerGas: ethers.toBeHex(safeUserOperation.maxPriorityFeePerGas)
        }
    )

    return new EthSafeSignature(signerAddress, signature)
}

const testCreateOpsManual = async () => {
    const network = await provider.getNetwork()
    const nonce = getChainSpecificDefaultSaltNonce(network.chainId)
    const encodedInitializer = SafeSingletonContract.interface.encodeFunctionData("setup", [
        [SIGNER_ADDRESS, SIGNER_ADDRESS_2, SIGNER_ADDRESS_3],
        2,
        SafeModuleSetupAddress,
        SafeModuleSetupContract.interface.encodeFunctionData('enableModules', [[Safe4337ModuleAddress]]),
        Safe4337ModuleAddress,
        ethers.ZeroAddress,
        0,
        ethers.ZeroAddress,
    ]);
    const _initCode = ethers.concat([
        SafeProxyFactoryAddress,
        SafeProxyFactoryContract.interface.encodeFunctionData("createProxyWithNonce", [SafeSingletonAddress, encodedInitializer, nonce]),
    ]);
    console.log('before calculate')
    const _deployedAddress = await calculateProxyAddress(encodedInitializer, nonce)
    console.log('deployedAddress: ', _deployedAddress)
    const opNonce = await entryPoint.getNonce(_deployedAddress, 0)
    const op = {
        "initCode": opNonce ? '0x' : _initCode,
        "sender": _deployedAddress,
        "nonce": opNonce,
        "callData": "0x7bb3742800000000000000000000000038869bf66a61cf6bdb996a6ae40d5853fd43b52600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001048d80ff0a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000aa00eabcd21b75349c59a4177e10ed17fbf2955fe6970000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ad2ada4b2ab6b09ac980d47a314c54e9782f1d0c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        // "signature": "0x0000000000000000000000003150023d6b3c1955098cd692b237a683668b47c0c94c3d53c98c40ed9566f21f4d7c6d0ddb529be61d8e628da5a013e84fba2f2fd23ab7b36b976da1f019cd411b",
        "signature": "0x",
        "paymasterAndData": "0x",
        "maxPriorityFeePerGas": "38413944",
        "maxFeePerGas": "2389585618",
        "callGasLimit": "139044",
        "verificationGasLimit": "794148",
        "preVerificationGas": "58031"
    }

    const validAfter = 0
    const validUntil = 0
    const safeOp =  {
        safe: op.sender,
        nonce: BigInt(op.nonce),
        initCode: op.initCode,
        callData: op.callData,
        callGasLimit: op.callGasLimit,
        verificationGasLimit: op.verificationGasLimit,
        preVerificationGas: op.preVerificationGas,
        maxFeePerGas: op.maxFeePerGas,
        maxPriorityFeePerGas: op.maxPriorityFeePerGas,
        paymasterAndData: op.paymasterAndData,
        validAfter: validAfter,
        validUntil: validUntil,
        entryPoint: EntryPointAddress
    }

    const signature1 = await signSafeOp(
        new ethers.Wallet(SIGNER_PRIVATE_KEY),
        safeOp,
    )
    console.log('signature1: ', signature1)

    const signature2 = await signSafeOp(
        new ethers.Wallet(SIGNER_PRIVATE_KEY_2),
        safeOp,
    )

    const encodedSignatures = buildSignatureBytes([signature1, signature2])

    console.log('encodedSignatures: ', encodedSignatures)

    op.signature = ethers.solidityPacked(
        ['uint48', 'uint48', 'bytes'],
        [validAfter, validUntil, encodedSignatures]
    )
    console.log('op: ', op)

    const tx = await entryPoint.handleOps([op], SIGNER_ADDRESS);
console.log('tx: ', tx)

}

const main = async () => {
    const safe4337Pack = await Safe4337Pack.init({
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY,
        bundlerUrl: BUNDLER_URL,
        rpcUrl: RPC_URL,
        customContracts: {
            entryPointAddress: EntryPointAddress,
            safe4337ModuleAddress: Safe4337ModuleAddress,
            addModulesLibAddress: SafeModuleSetupAddress
        },
        options: {

            // safeAddress: SafeSingletonAddress,
            // owners: [SIGNER_ADDRESS],
            // threshold: 1,
            owners: [SIGNER_ADDRESS, SIGNER_ADDRESS_2, SIGNER_ADDRESS_3],
            threshold: 2,
            saltNonce: 0
        },
    })
    const safe4337Pack2 = await Safe4337Pack.init({
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY_2,
        bundlerUrl: BUNDLER_URL,
        rpcUrl: RPC_URL,
        options: {
            owners: [SIGNER_ADDRESS, SIGNER_ADDRESS_2, SIGNER_ADDRESS_3],
            threshold: 2
        },
    })

    // Define the transactions to execute
    const transaction1 = { to: '0xeaBcd21B75349c59a4177E10ed17FBf2955fE697', data: "0x", value: "0" }
    const transaction2 = { to: '0xad2ada4B2aB6B09AC980d47a314C54e9782f1D0C', data: "0x", value: "0" }

    // Build the transaction array
    const transactions = [transaction1, transaction2]
    const address = await safe4337Pack.protocolKit.getAddress()
    console.log('address: ', address)
    const address2 = await safe4337Pack2.protocolKit.getAddress()
    console.log('address2: ', address2)


    // const testCalculateAddress = await testCalculateProxyAddress()
    // console.log('testCalculateAddress: ', testCalculateAddress)

    // // Create the SafeOperation with all the transactions
    // const safeOperation = await safe4337Pack.createTransaction({ transactions })
    // console.log('safeOperation: ', safeOperation)
    //
    // const signedSafeOperation = await safe4337Pack.signSafeOperation(safeOperation)
    // console.log('signedSafeOperation: ', signedSafeOperation)
    //
    // const userOperationHash = await safe4337Pack.executeTransaction({
    //     executable: signedSafeOperation
    // })
    //
    //
    // let userOperationReceipt = null
    //
    // while (!userOperationReceipt) {
    //     // Wait 2 seconds before checking the status again
    //     await new Promise((resolve) => setTimeout(resolve, 2000))
    //     userOperationReceipt = await safe4337Pack.getUserOperationReceipt(
    //         userOperationHash
    //     )
    // }
    // console.log('userOperationReceipt: ', userOperationReceipt)
    //
    // const userOperationPayload = await safe4337Pack.getUserOperationByHash(
    //     userOperationHash
    // )
    //
    // console.log('userOperationPayload: ', userOperationPayload)

}

const main2 = async () => {
    await testCreateOpsManual()
}



// main().then(() => console.log('done')).catch(console.error)
main2().then(() => console.log('done')).catch(console.error)
