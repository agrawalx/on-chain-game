# Fireball On-Chain: A Phaser.js Artillery Game

📖 Overview
 Fireball On-Chain is a classic turn-based artillery game, similar to Angry Birds or Pocket Tanks, built with a modern web3 twist. Players take turns adjusting the angle and power of their shots to hit their opponent. The game's visual animations are handled client-side for a smooth user experience, while the critical hit-or-miss outcome of each shot is determined by a smart contract on the blockchain, ensuring fair and verifiable results.

## ✨ Features
* Classic Artillery Gameplay: Simple and intuitive turn-based mechanics.

* Physics-Based Trajectory: Aim your shots by adjusting angle and power. A preview line shows the expected path.

* On-Chain Hit Detection: The final outcome of each shot is decided by a smart contract, providing a decentralized source of truth.

* MetaMask Integration: Connects to the user's Ethereum wallet to interact with the smart contracts.

* Real-time Feedback: The game provides instant visual feedback, while the on-chain result confirms the outcome of each turn.

## 💻 Tech Stack
* Game Engine: Phaser.js (v3) for rendering the game world, handling animations, and managing client-side physics.

- Blockchain Interaction: Ethers.js (v6) for connecting to the user's wallet and interacting with the smart contracts.

- Frontend Bundler: Parcel for bundling the game assets and serving the project.

- Smart Contracts:

- Solidity: A wrapper contract that provides a simple interface.

- Rust: The core game logic is implemented in Rust and deployed as a separate contract, which is called by the Solidity wrapper.

## 🚀 How It Works
- The game cleverly separates responsibilities between the client and the blockchain to provide a seamless experience:

- Aiming & Animation (Client-Side): The player aims, and the game uses Phaser's physics engine to draw a predictive trajectory line. When the player fires, the game calculates the projectile's flight path using these same client-side physics. This ensures the animation the player sees is perfectly smooth.

- Impact Calculation (Client-Side): As the animation plays, the game calculates the exact (x, y) coordinate where the projectile's path will intersect with the opponent's vertical line.

- Hit Verification (On-Chain): This calculated impact point, along with the opponent's hitbox coordinates, is sent to the Geometry smart contract. The contract's callIsPointInRect function performs a simple, gas-efficient check and returns a true (hit) or false (miss).

- Final Outcome: The game uses the boolean result from the smart contract to determine the final outcome, update the player's health, and proceed to the next turn.

- This hybrid approach leverages the best of both worlds: the responsiveness of client-side rendering and the verifiability of on-chain logic.

## 🛠️ Installation and Setup
**To get the game running locally, follow these steps:**

> Clone the repository:
```sh
git clone https://github.com/agrawalx/on-chain-game
cd angry-onchain
```
> Install dependencies:
This will install Phaser, Ethers.js, and Parcel.
```bash
npm install
```
>Start the development server:
>This command will launch the game in your web browser.
```sh
npm run start
```
Connect MetaMask:

Ensure you have the MetaMask browser extension installed.

Switch MetaMask to the Westend Testnet.

The game will prompt you to connect your wallet upon loading.

## ⛓️ On-Chain Components
-The game interacts with two smart contracts deployed on the Sepolia testnet.

**Geometry Contract**:

- Address: 0x7e67d15E88C98090457C3b395FCc2b76A91506cE

- Purpose: Acts as a Solidity wrapper that exposes the callIsPointInRect function. This is the contract the frontend directly communicates with.

**Rust Logic Contract**:

Address: 0xa7Fb75158F73E05C13DED5cFb2412AF5dca68967

Purpose: Contains the core logic for the geometric calculation. The Geometry Contract calls this contract to get the result.

## 📁 File Structure

.
├── src  \
│   ├── game
│   │   └── GameScene.js     # Main Phaser scene, contains all game logic.
│   └── utils
│       └── blockchain.js    # Handles MetaMask connection and contract calls.
├── index.html               # Entry point for the application.
├── package.json             # Project dependencies and scripts.
└── README.md                # This file.
