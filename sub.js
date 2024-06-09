import {ethers} from "ethers";
import {Safe4337ModuleABI} from './abi/Safe4337Module.abi.js';
import {SafeProxyFactoryABI} from './abi/SafeProxyFactory.abi.js';
import {SafeABI} from './abi/Safe.abi.js';
import {AddModulesLibABI} from './abi/AddModulesLib.abi.js';
import {EntryPointABI} from './abi/EntryPoint.abi.js';
import dotenv from "dotenv";
dotenv.config()

const Safe4337ModuleAddress = '0xa581c4A4DB7175302464fF3C06380BC3270b4037'
const SafeProxyFactoryAddress = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67'
const SafeSingletonAddress = '0x41675C099F32341bf84BFc5382aF534df5C7461a'
const SafeModuleSetupAddress = '0x8EcD4ec46D4D2a6B64fE960B3D64e8B94B2234eb'

const AlchemyEndpoint =`https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

const provider = new ethers.JsonRpcProvider(AlchemyEndpoint)

const Safe4337ModuleContract = new ethers.Contract(Safe4337ModuleAddress, Safe4337ModuleABI, provider)
const SafeProxyFactoryContract = new ethers.Contract(SafeProxyFactoryAddress, SafeProxyFactoryABI, provider)
const SafeSingletonContract = new ethers.Contract(SafeSingletonAddress, SafeABI, provider)
const SafeModuleSetupContract = new ethers.Contract(SafeModuleSetupAddress, AddModulesLibABI, provider)

const entryPoint = new ethers.Contract("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", EntryPointABI, provider);


async function calculateProxyAddress(inititalizer, nonce){

    const proxyCreationCode = await SafeProxyFactoryContract.proxyCreationCode()

    const deploymentCode = ethers.solidityPacked(['bytes', 'uint256'], [proxyCreationCode, SafeSingletonAddress])
    const salt = ethers.solidityPackedKeccak256(['bytes32', 'uint256'], [ethers.solidityPackedKeccak256(['bytes'], [inititalizer]), nonce])
    console.log('asdas')
    return ethers.getCreate2Address(SafeProxyFactoryAddress, salt, ethers.keccak256(deploymentCode))
}


async function sub() {
    const nonce = 0
   const encodedInitializer = SafeSingletonContract.interface.encodeFunctionData("setup", [
       [process.env.ADDRESS],
       1,
       SafeModuleSetupAddress,
       SafeModuleSetupContract.interface.encodeFunctionData('enableModules', [[Safe4337ModuleAddress]]),
       Safe4337ModuleAddress,
       ethers.ZeroAddress,
       0,
       ethers.ZeroAddress,
   ]);

   const _deployedAddress = await calculateProxyAddress(encodedInitializer, nonce)
   console.log('_deployedAddress: ', _deployedAddress)

}

sub().then(() => {
    console.log('sub done')
}).catch(console.error)