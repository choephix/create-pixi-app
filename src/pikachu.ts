import { Texture } from '@pixi/core';
import { Sprite } from '@pixi/sprite';

const T = {
  PIKACHU: `https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Pok%C3%A9mon_Pikachu_art.png/220px-Pok%C3%A9mon_Pikachu_art.png`
}

export class Pikachu extends Sprite {
  interactive: boolean;
  buttonMode: boolean;
  addListener: any;

  constructor() {
    super(Texture.from(T.PIKACHU));
  }
  
  static loadTexture() {
    return Texture.fromURL(T.PIKACHU);
  }
}