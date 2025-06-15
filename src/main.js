import Phaser from 'phaser';
import GameScene from './game/gameScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [GameScene],
    backgroundColor: '#a3cef1',
    physics: { default: 'arcade' }
};

new Phaser.Game(config);
