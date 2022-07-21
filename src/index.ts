import { Point } from '@pixi/math';
import { BitmapFont, BitmapText } from '@pixi/text-bitmap';
import { boot } from './boot';
import { MSDFText, MSDFTextOption } from './msdf/MSDFText';
// import { MSDFText, MSDFTextOption } from './MSDFText';
import { Pikachu } from './pikachu';

const MESSAGE: string = `< Howdeh! >`;
console.log(MESSAGE as any);

const app = boot();

app.stage.addChild(new Pikachu()).tint = 0xffff00;
app.stage.addChild(new Pikachu()).x = 200;

const resourceList = [
  'https://public.cx/4/Celestial_Typeface.fnt',
  //'https://raw.githubusercontent.com/soimy/pixi-msdf-text/master/demo/assets/fonts/DimboR.fnt',
];
app.loader.add(resourceList).load(onAssetsLoaded);

function onAssetsLoaded() {
  const textOptions: MSDFTextOption = {
    fontFace: 'Celestial_Typeface',
    fontSize: 100,
    fillColor: 0xffffff,
    weight: 0.6,
    strokeThickness: 0.15,
    strokeColor: 0x051855,
    dropShadow: true,
    dropShadowColor: 0x000000,
    dropShadowOffset: new Point(0.004, 0.004),
    dropShadowAlpha: 0.4,
    dropShadowBlur: 0.1,
    align: 'center',
    letterSpacing: 0,
    baselineOffset: 8,
    debugLevel: 2,
  };
  const sampleText = new MSDFText('Train of the Century', textOptions);
  app.stage.addChild(sampleText);
  sampleText.pivot.set(sampleText.textWidth / 2, sampleText.textHeight / 2);
  sampleText.position.set(app.screen.width / 2, app.screen.height / 2);
}

Object.assign(window, {
  BitmapFont,
  BitmapText,
});
