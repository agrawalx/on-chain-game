import { BrowserProvider, Contract } from 'ethers';

// --- NEW: Contract addresses and ABIs for the two contracts ---
const PROJECTILE_CONTRACT_ADDRESS = '0x2F5A49eb283027a9701958F3C6974f76987bEBb9';
const GEOMETRY_CONTRACT_ADDRESS = '0x7e67d15E88C98090457C3b395FCc2b76A91506cE';

// A dummy address for the 'rustContract' parameter.
// You should replace this with the actual address if it's different.
const RUST_CONTRACT_ADDRESS = '0xa7Fb75158F73E05C13DED5cFb2412AF5dca68967';


const PROJECTILE_ABI = [
	{
		"inputs": [
			{ "internalType": "address", "name": "rustContract", "type": "address" },
			{ "internalType": "uint32", "name": "angle", "type": "uint32" },
			{ "internalType": "uint64", "name": "initialVelocity", "type": "uint64" },
			{ "internalType": "uint64", "name": "gravity", "type": "uint64" }
		],
		"name": "callGetProjectileTrajectoryCoefficients",
		"outputs": [
			{ "internalType": "int64", "name": "c1", "type": "int64" },
			{ "internalType": "int64", "name": "c2", "type": "int64" }
		],
		"stateMutability": "view", "type": "function"
	},
	{
		"inputs": [
			{ "internalType": "address", "name": "rustContract", "type": "address" },
			{ "internalType": "uint32", "name": "angle", "type": "uint32" },
			{ "internalType": "uint64", "name": "initialVelocity", "type": "uint64" },
			{ "internalType": "uint64", "name": "initialX", "type": "uint64" },
			{ "internalType": "uint64", "name": "initialY", "type": "uint64" },
			{ "internalType": "uint64", "name": "gravity", "type": "uint64" },
			{ "internalType": "uint64", "name": "targetX", "type": "uint64" }
		],
		"name": "callProjectileYAtX",
		"outputs": [
			{ "internalType": "int64", "name": "", "type": "int64" }
		],
		"stateMutability": "view", "type": "function"
	}
];

const GEOMETRY_ABI = [
	{
		"inputs": [
			{ "internalType": "address", "name": "rustContract", "type": "address" },
			{ "internalType": "uint64", "name": "px", "type": "uint64" },
			{ "internalType": "uint64", "name": "py", "type": "uint64" },
			{ "internalType": "uint64", "name": "rect_x", "type": "uint64" },
			{ "internalType": "uint64", "name": "rect_y", "type": "uint64" },
			{ "internalType": "uint64", "name": "rect_width", "type": "uint64" },
			{ "internalType": "uint64", "name": "rect_height", "type": "uint64" }
		],
		"name": "callIsPointInRect",
		"outputs": [
			{ "internalType": "bool", "name": "", "type": "bool" }
		],
		"stateMutability": "view", "type": "function"
	}
];


// --- NEW: Contract instances ---
let projectileContract;
let geometryContract;
let provider;

export async function initWeb3() {
    if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
    }

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    projectileContract = new Contract(PROJECTILE_CONTRACT_ADDRESS, PROJECTILE_ABI, signer);
    geometryContract = new Contract(GEOMETRY_CONTRACT_ADDRESS, GEOMETRY_ABI, signer);

    console.log("Web3 Initialized and contracts are ready.");
}

/**
 * Checks if a given point lies within a target rectangle by calling the smart contract.
 * @param {object} params - The parameters for the collision check.
 * @param {number} params.projectileX - The calculated X coordinate of the projectile.
 * @param {number} params.projectileY - The calculated Y coordinate of the projectile.
 * @param {object} params.target - The target's hitbox.
 * @returns {Promise<{hit: boolean}>} - The result from the smart contract.
 */
export async function submitShot({ projectileX, projectileY, target }) {
    if (!geometryContract) {
        throw new Error("Geometry contract not initialized. Please call initWeb3 first.");
    }
    
    // Scale all coordinate data by 100 for the contract's fixed-point math.
    // This converts floating-point numbers to integers (e.g., 150.75 becomes 15075).
    const px = Math.trunc(projectileX * 100);
    const py = Math.trunc(projectileY * 100);
    // The contract expects the top-left corner of the rectangle.
    const rectX = Math.trunc((target.x - target.width / 2) * 100);
    const rectY = Math.trunc((target.y - target.height / 2) * 100);
    const rectWidth = Math.trunc(target.width * 100);
    const rectHeight = Math.trunc(target.height * 100);

    try {
        // Call the 'callIsPointInRect' function on the smart contract.
        const hit = await geometryContract.callIsPointInRect(
            RUST_CONTRACT_ADDRESS,
            px,
            py,
            rectX,
            rectY,
            rectWidth,
            rectHeight
        );
        
        // Return the boolean result from the contract.
        return { hit };

    } catch (error) {
        console.error("Error calling the callIsPointInRect contract function:", error);
        // If the contract call fails, return a 'miss' to prevent the game from crashing.
        return { hit: false };
    }
}