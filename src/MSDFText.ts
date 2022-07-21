import { Geometry, Program, Shader, Texture } from "@pixi/core";
import { ObservablePoint, Point, Rectangle } from "@pixi/math";
import { Mesh } from "@pixi/mesh";
import { Buffer } from '@pixi/core';
import { BitmapFont } from '@pixi/text-bitmap';
import * as utils from '@pixi/utils';
import { Graphics } from "@pixi/graphics";

const vertShader = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;
uniform float u_fontInfoSize;

varying vec2 vTextureCoord;

void main(void)
{
    vTextureCoord = aTextureCoord;
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition * u_fontInfoSize, 1.0)).xy, 0.0, 1.0);
}
`;

const fragShader = `
varying vec2 vTextureCoord;
uniform vec3 u_color;
uniform sampler2D uSampler;
uniform float u_alpha;
uniform float u_fontSize;
uniform float u_weight;
uniform float u_pxrange;

uniform vec3 tint;
// Stroke effect parameters
uniform float strokeWeight;
uniform vec3 strokeColor;

// Shadow effect parameters
uniform bool hasShadow;
uniform vec2 shadowOffset;
uniform float shadowSmoothing;
uniform vec3 shadowColor;
uniform float shadowAlpha;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main(void)
{
    float smoothing = clamp(2.0 * u_pxrange / u_fontSize, 0.0, 0.5);

    vec2 textureCoord = vTextureCoord * 2.;
    vec3 sample = texture2D(uSampler, vTextureCoord).rgb;
    float dist = median(sample.r, sample.g, sample.b);

    float alpha;
    vec3 color;

    // dirty if statment, will change soon
    if (strokeWeight > 0.0) {
        alpha = smoothstep(strokeWeight - smoothing, strokeWeight + smoothing, dist);
        float outlineFactor = smoothstep(u_weight - smoothing, u_weight + smoothing, dist);
        color = mix(strokeColor, u_color, outlineFactor) * alpha;
    } else {
        alpha = smoothstep(u_weight - smoothing, u_weight + smoothing, dist);
        color = u_color * alpha;
    }
    vec4 text = vec4(color * tint, alpha) * u_alpha;
    if (hasShadow == false) {
        gl_FragColor = text;
    } else {
        vec3 shadowSample = texture2D(uSampler, vTextureCoord - shadowOffset).rgb;
        float shadowDist = median(shadowSample.r, shadowSample.g, shadowSample.b);
        float distAlpha = smoothstep(0.5 - shadowSmoothing, 0.5 + shadowSmoothing, shadowDist);
        vec4 shadow = vec4(shadowColor, shadowAlpha * distAlpha);
        gl_FragColor = mix(shadow, text, text.a);
    }
}
`;

export interface MSDFTextOption {
  // Basic
  fontFace: string;
  fontSize: number;
  fillColor?: number;
  weight?: number;
  // Effect
  texture?: Texture;
  strokeColor?: number;
  strokeThickness?: number;
  dropShadow?: boolean;
  dropShadowColor?: number;
  dropShadowAlpha?: number;
  dropShadowOffset?: Point;
  dropShadowBlur?: number;
  // Layout
  align?: 'left' | 'right' | 'center';
  baselineOffset?: number;
  letterSpacing?: number;
  kerning?: boolean;
  lineSpacing?: number;
  maxWidth?: number;
  // Debug
  debugLevel?: 1 | 2 | 3;
  pxrange?: number;
}

export class MSDFText extends Mesh {
  private _text: string;
  // Font data passed to renderer
  private _font: any;
  private _textWidth: number;
  private _textHeight: number;
  private _maxWidth: number;
  private _anchor: ObservablePoint;

  // TODO: add Effect & Layout
  private _baselineOffset: number;
  private _letterSpacing: number;
  private _lineSpacing: number;

  // Debug
  private _debugLevel: number;
  // TODO: Metrics object
  private _textMetricsBound: Rectangle;

  // private indices: Buffer;
  // private uvs: Buffer;
  private vertices: Buffer;

  constructor(text: string, options: MSDFTextOption) {
    // Steve -- Create default geometry, uniforms and shader for our base constructor
    const geometry = new Geometry();

    const indices = new Buffer([] as any, false, true);
    const uvs = new Buffer([] as any, false, false);
    const vertices = new Buffer([] as any, false, false);

    geometry
      .addIndex(indices)
      .addAttribute('aVertexPosition', vertices)
      .addAttribute('aTextureCoord', uvs);

    const program = new Program(vertShader, fragShader, 'MSDFShader');
    const uniforms = {};
    const shader = new Shader(program, uniforms);

    super(geometry, shader as any);

    // Steve -- Now we've called the constructor, we're free to use `this`.
    this.indices = indices as any;
    this.uvs = uvs as any;
    this.vertices = vertices;
    this.shader = shader as any;

    this.texture = options.texture || Texture.WHITE;

    this._text = text;
    this._font = {
      fontFace: options.fontFace,
      fontSize: options.fontSize,
      color: options.fillColor === undefined ? 0xff0000 : options.fillColor,
      weight: options.weight === undefined ? 0.5 : 1 - options.weight,
      align: options.align,
      kerning: options.kerning === undefined ? true : options.kerning,
      strokeColor: options.strokeColor || 0,
      dropShadow: options.dropShadow || false,
      dropShadowColor: options.dropShadowColor || 0,
      dropShadowAlpha: options.dropShadowAlpha === undefined ? 0.5 : options.dropShadowAlpha,
      dropShadowBlur: options.dropShadowBlur || 0,
      dropShadowOffset: options.dropShadowOffset || new Point(2, 2),
      pxrange: options.pxrange === undefined ? 3 : options.pxrange,
    };
    if (options.strokeThickness === undefined || options.strokeThickness === 0) {
      this._font.strokeWeight = 0;
    } else {
      this._font.strokeWeight = this._font.weight - options.strokeThickness;
    }

    // TODO: layout option initialze
    this._baselineOffset = options.baselineOffset === undefined ? 0 : options.baselineOffset;
    this._letterSpacing = options.letterSpacing === undefined ? 0 : options.letterSpacing;
    this._lineSpacing = options.lineSpacing === undefined ? 0 : options.lineSpacing;

    this._textWidth = this._textHeight = 0;
    this._maxWidth = options.maxWidth || 0;
    // Steve -- Don't believe this is needed?, as it now seems to take care of all the dirty flags itself, when we update the buffers.
    // this._anchor = new ObservablePoint(() => { }, this, 0, 0);
    this._textMetricsBound = new Rectangle();

    // Debug initialize
    this._debugLevel = options.debugLevel || 0;
    this.updateText();
  }

  public updateText() {
    // clear all gizmo
    this.removeChildren();

    // Steve -- Typescript casting hack to reference the static fonts array
    const fontData = (BitmapFont as any).available[this._font.fontFace];
    if (!fontData) throw new Error('Invalid fontFace: ' + this._font.fontFace);
    // No beauty way to get bitmap font texture
    const texture = this.getBitmapTexture(this._font.fontFace);
    this._font.rawSize = fontData.size;

    const scale = this._font.fontSize / fontData.size;
    const pos = new Point(0, -this._baselineOffset * scale);
    const chars = [];
    const lineWidths: number[] = [];
    const texWidth = texture.width;
    const texHeight = texture.height;

    let prevCharCode = -1;
    let lastLineWidth = 0;
    let maxLineWidth = 0;
    let line = 0;
    let lastSpace = -1;
    let lastSpaceWidth = 0;
    let spacesRemoved = 0;
    let maxLineHeight = 0;

    for (let i = 0; i < this._text.length; i++) {
      const charCode = this._text.charCodeAt(i);

      // If char is space, cache to lastSpace
      if (/(\s)/.test(this._text.charAt(i))) {
        lastSpace = i;
        lastSpaceWidth = lastLineWidth;
      }

      // If char is return
      if (/(?:\r\n|\r|\n)/.test(this._text.charAt(i))) {
        lastLineWidth -= this._letterSpacing;
        lineWidths.push(lastLineWidth);
        maxLineWidth = Math.max(maxLineWidth, lastLineWidth);
        line++;

        pos.x = 0;
        pos.y += fontData.lineHeight * scale + this._lineSpacing * scale;
        prevCharCode = -1;
        continue;
      }

      if (lastSpace !== -1 && this._maxWidth > 0 && pos.x > this._maxWidth) {
        utils.removeItems(chars, lastSpace - spacesRemoved, i - lastSpace);
        i = lastSpace;
        lastSpace = -1;
        ++spacesRemoved;

        lastSpaceWidth -= this._letterSpacing;
        lineWidths.push(lastSpaceWidth);
        maxLineWidth = Math.max(maxLineWidth, lastSpaceWidth);
        line++;

        pos.x = 0;
        pos.y += fontData.lineHeight * scale + this._lineSpacing * scale;
        prevCharCode = -1;
        continue;
      }

      const charData = fontData.chars[charCode];

      if (!charData) continue;

      if (this._font.kerning && prevCharCode !== -1 && charData.kerning[prevCharCode]) {
        pos.x += charData.kerning[prevCharCode] * scale;
      }

      chars.push({
        line,
        charCode,
        drawRect: new Rectangle(
          pos.x + charData.xOffset * scale,
          pos.y + charData.yOffset * scale,
          charData.texture.width * scale,
          charData.texture.height * scale
        ),
        rawRect: new Rectangle(
          charData.texture.orig.x,
          charData.texture.orig.y,
          charData.texture.width,
          charData.texture.height
        ),
      });
      // lastLineWidth = pos.x + (charData.texture.width * scale + charData.xOffset);
      pos.x += (charData.xAdvance + this._letterSpacing) * scale;
      lastLineWidth = pos.x;
      maxLineHeight = Math.max(maxLineHeight, pos.y + fontData.lineHeight * scale);
      prevCharCode = charCode;
    }

    lineWidths.push(lastLineWidth);
    maxLineWidth = Math.max(maxLineWidth, lastLineWidth);

    const lineAlignOffsets = [];
    for (let i = 0; i <= line; i++) {
      let alignOffset = 0;

      if (this._font.align === 'right') {
        alignOffset = maxLineWidth - lineWidths[i];
      } else if (this._font.align === 'center') {
        alignOffset = (maxLineWidth - lineWidths[i]) / 2;
      }
      lineAlignOffsets.push(alignOffset);
    }

    // Update line alignment and fontSize
    let lineNo = -1;
    for (const char of chars) {
      char.drawRect.x = char.drawRect.x + lineAlignOffsets[char.line];
      if (lineNo !== char.line) {
        lineNo = char.line;
        // draw line gizmo
        if (this._debugLevel > 1) {
          this.drawGizmoRect(
            new Rectangle(
              char.drawRect.x - fontData.chars[char.charCode].xOffset * scale,
              char.drawRect.y - fontData.chars[char.charCode].yOffset * scale,
              lineWidths[lineNo],
              fontData.lineHeight * scale
            ),
            1,
            0x00ff00,
            0.5
          );
        }
      }
    }
    // draw text bound gizmo
    if (this._debugLevel > 0) {
      this.drawGizmoRect(this.getLocalBounds(), 1, 0xffffff, 0.5);
    }

    this._textWidth = maxLineWidth;
    this._textHeight = maxLineHeight;
    this._textMetricsBound = new Rectangle(0, 0, maxLineWidth, maxLineHeight);

    this.vertices.update(this.toVertices(chars));
    this.uvs.update(this.toUVs(chars, texWidth, texHeight));
    this.indices.update(this.createIndicesForQuads(chars.length));

    this.shader.uniforms.uSampler = texture; // Steve -- Binding is no longer required, apparently.

    // Steve -- Not sure we need this, since Mesh has it's own blendmode?
    // If we do -- then we can pass State into the Mesh constructor, same way we passed the geometry & shader.
    //if (renderer.state) renderer.state.setBlendMode(msdfText.blendMode);

    this.shader.uniforms.translationMatrix = this.worldTransform.toArray(true);
    this.shader.uniforms.u_alpha = this.worldAlpha;
    this.shader.uniforms.u_color = utils.hex2rgb(this._font.color);
    this.shader.uniforms.u_fontSize = this._font.fontSize * this.scale.x;
    this.shader.uniforms.u_fontInfoSize = 1;
    this.shader.uniforms.u_weight = this._font.weight;
    this.shader.uniforms.u_pxrange = this._font.pxrange;
    this.shader.uniforms.strokeWeight = this._font.strokeWeight;
    this.shader.uniforms.strokeColor = utils.hex2rgb(this._font.strokeColor);
    this.shader.uniforms.tint = utils.hex2rgb(this.tint);
    this.shader.uniforms.hasShadow = this._font.dropShadow;
    this.shader.uniforms.shadowOffset = new Float32Array([
      this._font.dropShadowOffset.x,
      this._font.dropShadowOffset.x,
    ]);
    this.shader.uniforms.shadowColor = utils.hex2rgb(this._font.dropShadowColor);
    this.shader.uniforms.shadowAlpha = this._font.dropShadowAlpha;
    this.shader.uniforms.shadowSmoothing = this._font.dropShadowBlur;

    console.log('clr', this.shader.uniforms.u_color);
  }

  public get text(): string {
    return this._text;
  }
  public set text(value) {
    this._text = this.unescape(value);
    this.updateText();
  }
  public get fontData(): any {
    return this._font;
  }
  // public get glDatas(): any { return this._glDatas; } --> Steve -- Don't believe this is needed anymore?
  public get textWidth(): number {
    return this._textWidth;
  }
  public get textHeight(): number {
    return this._textHeight;
  }
  public get maxWidth(): number {
    return this._maxWidth;
  }
  public get textMetric(): Rectangle {
    return this._textMetricsBound;
  }

  private getBitmapTexture(fontFace: string): Texture {
    // Steve -- Typescript casting hack
    const fontData = (BitmapFont as any).available[fontFace];
    if (!fontData) return Texture.EMPTY;
    // No beauty way to get bitmap font texture, hack needed
    const texturePath: string =
      fontData.chars[Object.keys(fontData.chars)[0]].texture.baseTexture.resource.url;
    return utils.TextureCache[texturePath];
  }

  private toVertices(chars: any[]): Float32Array {
    const positions = new Float32Array(chars.length * 4 * 2);
    let i = 0;
    chars.forEach(char => {
      // top left position
      const x = char.drawRect.x;
      const y = char.drawRect.y;
      // quad size
      const w = char.drawRect.width;
      const h = char.drawRect.height;

      // BL
      positions[i++] = x;
      positions[i++] = y;
      // TL
      positions[i++] = x;
      positions[i++] = y + h;
      // TR
      positions[i++] = x + w;
      positions[i++] = y + h;
      // BR
      positions[i++] = x + w;
      positions[i++] = y;

      // draw Gizmo
      if (this._debugLevel > 2) this.drawGizmoRect(char.drawRect, 1, 0x0000aa, 0.5);
    });
    return positions;
  }

  private toUVs(chars: any[], texWidth: number, texHeight: number): Float32Array {
    const uvs = new Float32Array(chars.length * 4 * 2);
    let i = 0;
    chars.forEach(char => {
      // Note: v coordinate is reversed 2D space Y coordinate
      const u0 = char.rawRect.x / texWidth;
      const u1 = (char.rawRect.x + char.rawRect.width) / texWidth;
      const v0 = (char.rawRect.y + char.rawRect.height) / texHeight;
      const v1 = char.rawRect.y / texHeight;
      // BL
      uvs[i++] = u0;
      uvs[i++] = v1;
      // TL
      uvs[i++] = u0;
      uvs[i++] = v0;
      // TR
      uvs[i++] = u1;
      uvs[i++] = v0;
      // BR
      uvs[i++] = u1;
      uvs[i++] = v1;
    });
    return uvs;
  }

  private createIndicesForQuads(size: number): Uint16Array {
    // the total number of indices in our array, there are 6 points per quad.
    const totalIndices = size * 6;
    const indices = new Uint16Array(totalIndices);

    // fill the indices with the quads to draw
    for (let i = 0, j = 0; i < totalIndices; i += 6, j += 4) {
      indices[i + 0] = j + 0;
      indices[i + 1] = j + 1;
      indices[i + 2] = j + 2;
      indices[i + 3] = j + 0;
      indices[i + 4] = j + 2;
      indices[i + 5] = j + 3;
    }
    return indices;
  }

  private drawGizmoRect(
    rect: Rectangle,
    lineThickness: number = 1,
    lineColor: number = 0xffffff,
    lineAlpha: number = 1
  ): void {
    const gizmo = new Graphics();
    gizmo
      .lineStyle(lineThickness, lineColor, lineAlpha, 0.5, true)
      .drawRect(rect.x, rect.y, rect.width, rect.height);
    this.addChild(gizmo);
  }

  private unescape(input: string): string {
    return input.replace(/(\\n|\\r)/g, '\n');
  }
}
