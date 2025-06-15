
import { initWeb3, submitShot } from "../utils/blockchain.js";

export default class GameScene extends Phaser.Scene {
    preload() {
        // --- Simplified Assets ---
        this.load.image('background', 'https://labs.phaser.io/assets/skies/sky4.png');
        this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
        this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
        this.load.image('ball', 'https://labs.phaser.io/assets/sprites/red_ball.png');
    }

    async create() {
        this.isAnimating = false;
        this.isDragging = false;

        // --- Initialize Web3 and connect to the contracts ---
        const waitingText = this.add.text(400, 300, 'Connecting to Wallet...', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
        try {
            await initWeb3();
            waitingText.destroy();
        } catch (error) {
            waitingText.setText('Failed to connect wallet.\nPlease refresh and try again.');
            console.error(error);
            return; // Stop scene creation if wallet connection fails
        }
        
        // Setup world
        this.add.image(400, 300, 'background');
        this.add.tileSprite(400, 580, 800, 40, 'ground');

        // Setup player data
        this.players = [
            { id: 0, name: 'Player 1', health: 3, maxHealth: 3, sprite: null, x: 150, y: 535, minX: 50, maxX: 350, tint: 0xffffff },
            { id: 1, name: 'Player 2', health: 3, maxHealth: 3, sprite: null, x: 650, y: 535, minX: 450, maxX: 750, tint: 0xff8888 }
        ];
        this.currentPlayerId = 0;

        // Create player sprites
        this.players.forEach(p => {
            p.sprite = this.add.image(p.x, p.y, 'player').setScale(1.5);
            p.sprite.setTint(p.tint);
        });

        this.players[1].sprite.setFlipX(true);

        this.setupUI();
        this.setupInput();
    }
    
    setupUI() {
        this.healthBars = this.players.map((p, i) => {
            const x = i === 0 ? 150 : 650;
            this.add.text(x, 30, p.name, { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
            const bg = this.add.rectangle(x, 60, 152, 22, 0x000000).setOrigin(0.5);
            const bar = this.add.rectangle(x, 60, 150, 20, 0x00ff00).setOrigin(0.5);
            return { bg, bar };
        });
        this.turnText = this.add.text(400, 30, `Your Turn, ${this.players[this.currentPlayerId].name}`, { fontSize: '24px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);
        this.powerText = this.add.text(400, 60, 'Power: 0', { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
        this.angleText = this.add.text(400, 80, 'Angle: 0°', { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
        this.trajectoryLine = this.add.graphics({ lineStyle: { width: 2, color: 0xffffff, alpha: 0.5 } });
    }

    setupInput() {
        this.input.on('pointerdown', (pointer) => { if (this.isAnimating) return; this.isDragging = true; });
        this.input.on('pointermove', (pointer) => { if (!this.isDragging || this.isAnimating) return; this.updateAim(pointer); });
        this.input.on('pointerup', (pointer) => { if (!this.isDragging || this.isAnimating) return; this.isDragging = false; this.trajectoryLine.clear(); this.fireShot(); });
        this.input.keyboard.on('keydown-SPACE', () => { if (!this.isAnimating) this.fireShot(); });
        this.input.keyboard.on('keydown-LEFT', () => this.movePlayer(-10));
        this.input.keyboard.on('keydown-RIGHT', () => this.movePlayer(10));
    }

    updateAim(pointer) {
        const attacker = this.players[this.currentPlayerId];
        const dx = attacker.x - pointer.x;
        const dy = attacker.y - pointer.y;
        const angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDrag = 150;
        const power = Phaser.Math.Clamp(distance, 0, maxDrag);
        this.currentVelocity = (power / maxDrag) * 100;
        this.currentAngle = angle;
        this.powerText.setText(`Power: ${this.currentVelocity.toFixed(0)}`);
        this.angleText.setText(`Angle: ${this.currentAngle.toFixed(1)}°`);
        this.drawTrajectory(attacker.x, attacker.y - 20, this.currentVelocity, this.currentAngle);
    }
    
    drawTrajectory(startX, startY, velocity, angle) {
        this.trajectoryLine.clear();
        this.trajectoryLine.lineStyle(2, 0xffffff, 0.7);
        const angleRad = Phaser.Math.DegToRad(angle);
        const gravity = 0.16;
        const direction = this.currentPlayerId === 0 ? 1 : -1;
        let x = startX;
        let y = startY;
        for (let t = 0; t < 120; t += 2) {
            const newX = startX + (t * velocity / 10 * Math.cos(angleRad)) * direction;
            const newY = startY - (t * velocity / 10 * Math.sin(angleRad) - 0.5 * gravity * t * t);
            this.trajectoryLine.lineBetween(x, y, newX, newY);
            x = newX;
            y = newY;
        }
    }

    async fireShot() {
        if (this.isAnimating || !this.currentVelocity || this.currentVelocity < 5) return;
        this.isAnimating = true;

        const attacker = this.players[this.currentPlayerId];
        const defender = this.players[1 - this.currentPlayerId];
        
        const target = { x: defender.x, y: defender.y, width: 50, height: 80 };
        const waitingText = this.add.text(400, 120, 'Checking for hit on-chain...', { fontSize: '20px', color: '#ffaa00' }).setOrigin(0.5);
        
        // --- NEW LOGIC: Calculate projectile position at target's X-line using client-side physics ---
        const startX = attacker.x;
        const startY = attacker.y - 20;
        const targetX = defender.x;
        const direction = this.currentPlayerId === 0 ? 1 : -1;
        const angleRad = Phaser.Math.DegToRad(this.currentAngle);
        const gravity = 0.16;
        const velocity = this.currentVelocity;

        // Solve for time 't' when projectile reaches the target's X coordinate
        const cosAngle = Math.cos(angleRad);
        // Avoid division by zero if angle is ~90 degrees
        const timeToTargetX = ((targetX - startX) * 10) / (velocity * (Math.abs(cosAngle) < 0.0001 ? 0.0001 : cosAngle) * direction);

        // Calculate the projectile's Y position at that time 't'
        const projectileYAtTarget = startY - (timeToTargetX * velocity / 10 * Math.sin(angleRad) - 0.5 * gravity * timeToTargetX * timeToTargetX);

        // Now, send this calculated impact point to the smart contract for the hit detection
        const { hit } = await submitShot({ 
            projectileX: targetX, 
            projectileY: projectileYAtTarget,
            target: target 
        });
        
        waitingText.destroy();
        console.log("On-chain hit detection result:", { hit });

        // Animate the projectile using the initial client-side parameters for perfect visual consistency.
        this.animateProjectile(this.currentVelocity, this.currentAngle, hit);
    }

    animateProjectile(velocity, angle, hit) {
        const attacker = this.players[this.currentPlayerId];
        const defender = this.players[1 - this.currentPlayerId];
        
        const startX = attacker.x;
        const startY = attacker.y - 20; 
        
        const projectile = this.add.image(startX, startY, 'ball');
        
        const direction = this.currentPlayerId === 0 ? 1 : -1;
        const angleRad = Phaser.Math.DegToRad(angle);
        const gravity = 0.16;
        let t = 0; // time step
        
        const animationTimer = this.time.addEvent({
            delay: 16, // roughly 60fps
            loop: true,
            callback: () => {
                // Use the same parametric equations as drawTrajectory for consistent visuals
                const newX = startX + (t * velocity / 10 * Math.cos(angleRad)) * direction;
                const newY = startY - (t * velocity / 10 * Math.sin(angleRad) - 0.5 * gravity * t * t);

                projectile.x = newX;
                projectile.y = newY;
                
                t += 1; // increment time

                const defenderRect = defender.sprite.getBounds();
                // Check for collision or if the projectile is out of bounds
                if (Phaser.Geom.Rectangle.Contains(defenderRect, projectile.x, projectile.y) || projectile.y > 600 || projectile.y < -100 || projectile.x < 0 || projectile.x > 800) {
                    animationTimer.remove();
                    projectile.destroy();
                    // The OUTCOME of the shot is determined by the 'hit' variable from the blockchain
                    this.onShotComplete(hit);
                }
            }
        });
    }
    
    onShotComplete(hit) {
        if (hit) {
            const defender = this.players[1 - this.currentPlayerId];
            defender.health--;
            this.updateHealthBar(1 - this.currentPlayerId);
            this.showFlash('HIT!', '#00ff00');
            this.cameras.main.shake(200, 0.01);
        } else {
            this.showFlash('MISS!', '#ff0000');
        }
        const defender = this.players[1 - this.currentPlayerId];
        if (defender.health <= 0) { this.showGameOver(); }
        else {
            this.time.delayedCall(1000, () => {
                this.currentPlayerId = 1 - this.currentPlayerId;
                this.turnText.setText(`Your Turn, ${this.players[this.currentPlayerId].name}`);
                this.isAnimating = false;
                this.currentVelocity = 0;
                this.currentAngle = 0;
            });
        }
    }

    movePlayer(deltaX) {
        if (this.isAnimating) return;
        const player = this.players[this.currentPlayerId];
        const newX = Phaser.Math.Clamp(player.x + deltaX, player.minX, player.maxX);
        player.x = newX;
        player.sprite.x = newX;
    }

    updateHealthBar(playerIndex) {
        const player = this.players[playerIndex];
        const width = (player.health / player.maxHealth) * 150;
        this.healthBars[playerIndex].bar.width = Phaser.Math.Clamp(width, 0, 150);
    }

    showFlash(message, color) {
        const flashText = this.add.text(400, 250, message, { fontSize: '48px', color: color, fontStyle: 'bold' }).setOrigin(0.5);
        this.tweens.add({ targets: flashText, alpha: 0, y: 200, duration: 1500, ease: 'Power2', onComplete: () => flashText.destroy() });
    }
    
    showGameOver() {
        this.isAnimating = true;
        const winner = this.players.find(p => p.health > 0);
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.5);
        this.add.text(400, 300, `GAME OVER\n${winner.name} Wins!`, { fontSize: '48px', color: '#ffff00', align: 'center', fontStyle: 'bold' }).setOrigin(0.5);
        const restartButton = this.add.text(400, 400, 'Restart Game', { fontSize: '24px', color: '#ffffff', backgroundColor: '#008800', padding: { x: 15, y: 10 } }).setOrigin(0.5).setInteractive();
        restartButton.on('pointerdown', () => this.scene.restart());
    }
}