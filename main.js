import { Safe4337Pack } from '@safe-global/relay-kit'
import dotenv from 'dotenv'
dotenv.config()

const SIGNER_ADDRESS = process.env.ADDRESS
const SIGNER_PRIVATE_KEY = process.env.PRIVATE_KEY
// const RPC_URL = 'https://rpc.ankr.com/eth_sepolia'
// const BUNDLER_URL = `https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
const RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

const main = async () => {
    const safe4337Pack = await Safe4337Pack.init({
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY,
        rpcUrl: RPC_URL,
        bundlerUrl: `https://api.pimlico.io/v1/sepolia/rpc?apikey=${process.env.PIMLICO_API_KEY}`,
        options: {
            owners: [SIGNER_ADDRESS],
            threshold: 1
        },
        // ...
    })

    // Define the transactions to execute
    const transaction1 = { to: '0xeaBcd21B75349c59a4177E10ed17FBf2955fE697', data: "0x", value: "0" }
    const transaction2 = { to: '0xad2ada4B2aB6B09AC980d47a314C54e9782f1D0C', data: "0x", value: "0" }

    // Build the transaction array
    const transactions = [transaction1, transaction2]
    const address = await safe4337Pack.protocolKit.getAddress()
    console.log('address: ', address)
    // Create the SafeOperation with all the transactions
    const safeOperation = await safe4337Pack.createTransaction({ transactions })
    console.log('safeOperation: ', safeOperation)

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
