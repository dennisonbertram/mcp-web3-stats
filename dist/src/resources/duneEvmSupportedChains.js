import { callDuneApi } from "../utils/api.js";
export function registerDuneEvmSupportedChainsResource(server) {
    server.resource("dune_evm_supported_chains", // Internal registration name
    "dune://evm/supported-chains", // The URI clients will use to request this resource
    {
        name: "Dune EVM Supported Chains",
        description: "Provides a list of EVM chains supported by the Dune API and their capabilities per endpoint.",
        mimeType: "application/json"
    }, async (uri) => {
        const path = "/v1/evm/supported-chains";
        try {
            const data = await callDuneApi(path);
            return {
                contents: [{
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify(data, null, 2),
                    }],
            };
        }
        catch (error) {
            return {
                contents: [{
                        uri: uri.href,
                        mimeType: "text/plain",
                        text: error.message, // Error message from callDuneApi is already detailed
                    }],
            };
        }
    });
}
