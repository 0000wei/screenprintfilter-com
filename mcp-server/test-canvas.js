import { createCanvas } from 'canvas';

console.log('Canvas module loaded successfully');
const canvas = createCanvas(100, 100);
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 100, 100);
console.log('Canvas test passed');
