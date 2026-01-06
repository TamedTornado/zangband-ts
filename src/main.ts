import * as ROT from 'rot-js';

// Proof of life: Display @ symbol on a rot.js canvas
const display = new ROT.Display({ width: 80, height: 25 });
const container = display.getContainer();
if (container) {
  document.querySelector<HTMLDivElement>('#app')?.appendChild(container);
}

display.drawText(35, 12, 'Zangband-TS');
display.draw(40, 14, '@', '#fff', '#000');
