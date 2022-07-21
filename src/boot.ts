import { Application, IApplicationOptions } from "@pixi/app";
import { Ticker } from "@pixi/ticker";
import { Renderer } from '@pixi/core';

import "@pixi/events";
import '@pixi/math-extras';

import { InteractionManager } from '@pixi/interaction';
Renderer.registerPlugin('interaction', InteractionManager);

import { BatchRenderer } from '@pixi/core';
Renderer.registerPlugin('batch', BatchRenderer);

import { AppLoaderPlugin } from '@pixi/loaders';
Application.registerPlugin(AppLoaderPlugin);

import { Loader } from '@pixi/loaders';
import { SpritesheetLoader } from '@pixi/spritesheet';
Loader.registerPlugin(SpritesheetLoader);

import { skipHello } from '@pixi/utils';
skipHello();

const APP_DIV_ID = "app";

export function boot(applicationOptions: Partial<IApplicationOptions> = {}) {
  const parentElement = document.getElementById(APP_DIV_ID) ?? document.body;

  const app = new Application({
    backgroundColor: 0x1f1f1f,
    //backgroundColor: 0xFFFFFF,
    resolution: window.devicePixelRatio || 1,
    resizeTo: parentElement,
    autoDensity: true,
    antialias: true,
    autoStart: true,
    ...applicationOptions
  });

  parentElement.appendChild(app.view);

  const ticker = new Ticker();
  ticker.add(() => app.render());
  ticker.start();
  app.ticker = ticker;

  return app;
}
