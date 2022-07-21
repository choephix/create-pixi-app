import { Application, IApplicationOptions } from "@pixi/app";
import { Ticker } from "@pixi/ticker";
import { skipHello } from "@pixi/utils";
import { boot } from "./boot";
import { Pikachu } from "./pikachu";

const MESSAGE: string = `< Howdeh! >`;
console.log(MESSAGE as any);

const app = boot();

app.stage.addChild(new Pikachu())