import { boot } from './boot';
import { Pikachu } from './pikachu';

const MESSAGE: string = `< Howdeh! >`;
console.log(MESSAGE as any);

const app = boot();

app.stage.addChild(new Pikachu()).tint = 0xffff00;
app.stage.addChild(new Pikachu()).x = 200;
