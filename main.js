import { Safe4337Pack } from '@safe-global/relay-kit'
import dotenv from 'dotenv'
import {ethers} from "ethers";
import {SafeProxyFactoryABI} from "./abi/SafeProxyFactory.abi.js";
import {AddModulesLibABI} from "./abi/AddModulesLib.abi.js";
import {SafeABI} from "./abi/Safe.abi.js";
dotenv.config()

const SIGNER_PRIVATE_KEY = process.env.PRIVATE_KEY
const SIGNER_PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2

const SIGNER_ADDRESS = process.env.ADDRESS
const SIGNER_ADDRESS_2 = process.env.ADDRESS_2
const SIGNER_ADDRESS_3 = process.env.ADDRESS_3

// const RPC_URL = 'https://rpc.ankr.com/eth_sepolia'
const BUNDLER_URL = `https://api.pimlico.io/v2/11155111/rpc?apikey=${process.env.PIMLICO_API_KEY}`
const RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
// const BUNDLER_URL = `https://api.pimlico.io/v2/421614/rpc?apikey=b75553ec-42d8-45df-8671-bf57ed3173a8`
// const RPC_URL = `https://arb-sepolia.g.alchemy.com/v2/hfCAVHciaR1dbE1vtCo0X7WmCW6OO3ET`

export const Safe4337ModuleAddress = '0xa581c4A4DB7175302464fF3C06380BC3270b4037'
export const SafeProxyFactoryAddress = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67'
export const SafeSingletonAddress = '0x41675C099F32341bf84BFc5382aF534df5C7461a'
export const SafeModuleSetupAddress = '0x8EcD4ec46D4D2a6B64fE960B3D64e8B94B2234eb'

export const provider = new ethers.JsonRpcProvider(RPC_URL)
// export const Safe4337ModuleContract = new ethers.Contract(Safe4337ModuleAddress, Safe4337ModuleABI, provider)
export const SafeProxyFactoryContract = new ethers.Contract(SafeProxyFactoryAddress, SafeProxyFactoryABI, provider)
export const SafeSingletonContract = new ethers.Contract(SafeSingletonAddress, SafeABI, provider)
export const SafeModuleSetupContract = new ethers.Contract(SafeModuleSetupAddress, AddModulesLibABI, provider)
// export const entryPoint = new ethers.Contract("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", EntryPoint, provider);


const calculateProxyAddress = async (inititalizer, nonce)=> {
    const proxyCreationCode = await SafeProxyFactoryContract.proxyCreationCode()

    const deploymentCode = ethers.solidityPacked(['bytes', 'uint256'], [proxyCreationCode, SafeSingletonAddress])
    const salt = ethers.solidityPackedKeccak256(['bytes32', 'uint256'], [ethers.solidityPackedKeccak256(['bytes'], [inititalizer]), nonce])
    return ethers.getCreate2Address(SafeProxyFactoryAddress, salt, ethers.keccak256(deploymentCode))
}

const testCalculateProxyAddress = async () => {
    const nonce = 0
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
    return _deployedAddress
}

const main = async () => {
    const safe4337Pack = await Safe4337Pack.init({
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY,
        bundlerUrl: BUNDLER_URL,
        rpcUrl: RPC_URL,
        customContracts: {
            entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
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

    const testCalculateAddress = await testCalculateProxyAddress()
    console.log('testCalculateAddress: ', testCalculateAddress)

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



main().then(() => console.log('done')).catch(console.error)
