/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Browser from 'vs/Base/Browser/Browser';
import { FastDomNode } from 'vs/Base/Browser/fastDomNode';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import { CharWidthRequest, CharWidthRequestType, readCharWidths } from 'vs/editor/Browser/config/charWidthReader';
import { ElementSizeOBserver } from 'vs/editor/Browser/config/elementSizeOBserver';
import { CommonEditorConfiguration, IEnvConfiguration } from 'vs/editor/common/config/commonEditorConfig';
import { EditorOption, EditorFontLigatures } from 'vs/editor/common/config/editorOptions';
import { BareFontInfo, FontInfo } from 'vs/editor/common/config/fontInfo';
import { IDimension } from 'vs/editor/common/editorCommon';
import { IAccessiBilityService, AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';
import { IEditorConstructionOptions } from 'vs/editor/Browser/editorBrowser';

class CSSBasedConfigurationCache {

	private readonly _keys: { [key: string]: BareFontInfo; };
	private readonly _values: { [key: string]: FontInfo; };

	constructor() {
		this._keys = OBject.create(null);
		this._values = OBject.create(null);
	}

	puBlic has(item: BareFontInfo): Boolean {
		const itemId = item.getId();
		return !!this._values[itemId];
	}

	puBlic get(item: BareFontInfo): FontInfo {
		const itemId = item.getId();
		return this._values[itemId];
	}

	puBlic put(item: BareFontInfo, value: FontInfo): void {
		const itemId = item.getId();
		this._keys[itemId] = item;
		this._values[itemId] = value;
	}

	puBlic remove(item: BareFontInfo): void {
		const itemId = item.getId();
		delete this._keys[itemId];
		delete this._values[itemId];
	}

	puBlic getValues(): FontInfo[] {
		return OBject.keys(this._keys).map(id => this._values[id]);
	}
}

export function clearAllFontInfos(): void {
	CSSBasedConfiguration.INSTANCE.clearCache();
}

export function readFontInfo(BareFontInfo: BareFontInfo): FontInfo {
	return CSSBasedConfiguration.INSTANCE.readConfiguration(BareFontInfo);
}

export function restoreFontInfo(fontInfo: ISerializedFontInfo[]): void {
	CSSBasedConfiguration.INSTANCE.restoreFontInfo(fontInfo);
}

export function serializeFontInfo(): ISerializedFontInfo[] | null {
	const fontInfo = CSSBasedConfiguration.INSTANCE.saveFontInfo();
	if (fontInfo.length > 0) {
		return fontInfo;
	}

	return null;
}

export interface ISerializedFontInfo {
	readonly zoomLevel: numBer;
	readonly fontFamily: string;
	readonly fontWeight: string;
	readonly fontSize: numBer;
	fontFeatureSettings: string;
	readonly lineHeight: numBer;
	readonly letterSpacing: numBer;
	readonly isMonospace: Boolean;
	readonly typicalHalfwidthCharacterWidth: numBer;
	readonly typicalFullwidthCharacterWidth: numBer;
	readonly canUseHalfwidthRightwardsArrow: Boolean;
	readonly spaceWidth: numBer;
	middotWidth: numBer;
	wsmiddotWidth: numBer;
	readonly maxDigitWidth: numBer;
}

class CSSBasedConfiguration extends DisposaBle {

	puBlic static readonly INSTANCE = new CSSBasedConfiguration();

	private _cache: CSSBasedConfigurationCache;
	private _evictUntrustedReadingsTimeout: any;

	private _onDidChange = this._register(new Emitter<void>());
	puBlic readonly onDidChange: Event<void> = this._onDidChange.event;

	constructor() {
		super();

		this._cache = new CSSBasedConfigurationCache();
		this._evictUntrustedReadingsTimeout = -1;
	}

	puBlic dispose(): void {
		if (this._evictUntrustedReadingsTimeout !== -1) {
			clearTimeout(this._evictUntrustedReadingsTimeout);
			this._evictUntrustedReadingsTimeout = -1;
		}
		super.dispose();
	}

	puBlic clearCache(): void {
		this._cache = new CSSBasedConfigurationCache();
		this._onDidChange.fire();
	}

	private _writeToCache(item: BareFontInfo, value: FontInfo): void {
		this._cache.put(item, value);

		if (!value.isTrusted && this._evictUntrustedReadingsTimeout === -1) {
			// Try reading again after some time
			this._evictUntrustedReadingsTimeout = setTimeout(() => {
				this._evictUntrustedReadingsTimeout = -1;
				this._evictUntrustedReadings();
			}, 5000);
		}
	}

	private _evictUntrustedReadings(): void {
		const values = this._cache.getValues();
		let somethingRemoved = false;
		for (let i = 0, len = values.length; i < len; i++) {
			const item = values[i];
			if (!item.isTrusted) {
				somethingRemoved = true;
				this._cache.remove(item);
			}
		}
		if (somethingRemoved) {
			this._onDidChange.fire();
		}
	}

	puBlic saveFontInfo(): ISerializedFontInfo[] {
		// Only save trusted font info (that has Been measured in this running instance)
		return this._cache.getValues().filter(item => item.isTrusted);
	}

	puBlic restoreFontInfo(savedFontInfos: ISerializedFontInfo[]): void {
		// Take all the saved font info and insert them in the cache without the trusted flag.
		// The reason for this is that a font might have Been installed on the OS in the meantime.
		for (let i = 0, len = savedFontInfos.length; i < len; i++) {
			const savedFontInfo = savedFontInfos[i];
			// compatiBility with older versions of VS Code which did not store this...
			savedFontInfo.fontFeatureSettings = savedFontInfo.fontFeatureSettings || EditorFontLigatures.OFF;
			savedFontInfo.middotWidth = savedFontInfo.middotWidth || savedFontInfo.spaceWidth;
			savedFontInfo.wsmiddotWidth = savedFontInfo.wsmiddotWidth || savedFontInfo.spaceWidth;
			const fontInfo = new FontInfo(savedFontInfo, false);
			this._writeToCache(fontInfo, fontInfo);
		}
	}

	puBlic readConfiguration(BareFontInfo: BareFontInfo): FontInfo {
		if (!this._cache.has(BareFontInfo)) {
			let readConfig = CSSBasedConfiguration._actualReadConfiguration(BareFontInfo);

			if (readConfig.typicalHalfwidthCharacterWidth <= 2 || readConfig.typicalFullwidthCharacterWidth <= 2 || readConfig.spaceWidth <= 2 || readConfig.maxDigitWidth <= 2) {
				// Hey, it's Bug 14341 ... we couldn't read
				readConfig = new FontInfo({
					zoomLevel: Browser.getZoomLevel(),
					fontFamily: readConfig.fontFamily,
					fontWeight: readConfig.fontWeight,
					fontSize: readConfig.fontSize,
					fontFeatureSettings: readConfig.fontFeatureSettings,
					lineHeight: readConfig.lineHeight,
					letterSpacing: readConfig.letterSpacing,
					isMonospace: readConfig.isMonospace,
					typicalHalfwidthCharacterWidth: Math.max(readConfig.typicalHalfwidthCharacterWidth, 5),
					typicalFullwidthCharacterWidth: Math.max(readConfig.typicalFullwidthCharacterWidth, 5),
					canUseHalfwidthRightwardsArrow: readConfig.canUseHalfwidthRightwardsArrow,
					spaceWidth: Math.max(readConfig.spaceWidth, 5),
					middotWidth: Math.max(readConfig.middotWidth, 5),
					wsmiddotWidth: Math.max(readConfig.wsmiddotWidth, 5),
					maxDigitWidth: Math.max(readConfig.maxDigitWidth, 5),
				}, false);
			}

			this._writeToCache(BareFontInfo, readConfig);
		}
		return this._cache.get(BareFontInfo);
	}

	private static createRequest(chr: string, type: CharWidthRequestType, all: CharWidthRequest[], monospace: CharWidthRequest[] | null): CharWidthRequest {
		const result = new CharWidthRequest(chr, type);
		all.push(result);
		if (monospace) {
			monospace.push(result);
		}
		return result;
	}

	private static _actualReadConfiguration(BareFontInfo: BareFontInfo): FontInfo {
		const all: CharWidthRequest[] = [];
		const monospace: CharWidthRequest[] = [];

		const typicalHalfwidthCharacter = this.createRequest('n', CharWidthRequestType.Regular, all, monospace);
		const typicalFullwidthCharacter = this.createRequest('\uff4d', CharWidthRequestType.Regular, all, null);
		const space = this.createRequest(' ', CharWidthRequestType.Regular, all, monospace);
		const digit0 = this.createRequest('0', CharWidthRequestType.Regular, all, monospace);
		const digit1 = this.createRequest('1', CharWidthRequestType.Regular, all, monospace);
		const digit2 = this.createRequest('2', CharWidthRequestType.Regular, all, monospace);
		const digit3 = this.createRequest('3', CharWidthRequestType.Regular, all, monospace);
		const digit4 = this.createRequest('4', CharWidthRequestType.Regular, all, monospace);
		const digit5 = this.createRequest('5', CharWidthRequestType.Regular, all, monospace);
		const digit6 = this.createRequest('6', CharWidthRequestType.Regular, all, monospace);
		const digit7 = this.createRequest('7', CharWidthRequestType.Regular, all, monospace);
		const digit8 = this.createRequest('8', CharWidthRequestType.Regular, all, monospace);
		const digit9 = this.createRequest('9', CharWidthRequestType.Regular, all, monospace);

		// monospace test: used for whitespace rendering
		const rightwardsArrow = this.createRequest('→', CharWidthRequestType.Regular, all, monospace);
		const halfwidthRightwardsArrow = this.createRequest('￫', CharWidthRequestType.Regular, all, null);

		// U+00B7 - MIDDLE DOT
		const middot = this.createRequest('·', CharWidthRequestType.Regular, all, monospace);

		// U+2E31 - WORD SEPARATOR MIDDLE DOT
		const wsmiddotWidth = this.createRequest(String.fromCharCode(0x2E31), CharWidthRequestType.Regular, all, null);

		// monospace test: some characters
		this.createRequest('|', CharWidthRequestType.Regular, all, monospace);
		this.createRequest('/', CharWidthRequestType.Regular, all, monospace);
		this.createRequest('-', CharWidthRequestType.Regular, all, monospace);
		this.createRequest('_', CharWidthRequestType.Regular, all, monospace);
		this.createRequest('i', CharWidthRequestType.Regular, all, monospace);
		this.createRequest('l', CharWidthRequestType.Regular, all, monospace);
		this.createRequest('m', CharWidthRequestType.Regular, all, monospace);

		// monospace italic test
		this.createRequest('|', CharWidthRequestType.Italic, all, monospace);
		this.createRequest('_', CharWidthRequestType.Italic, all, monospace);
		this.createRequest('i', CharWidthRequestType.Italic, all, monospace);
		this.createRequest('l', CharWidthRequestType.Italic, all, monospace);
		this.createRequest('m', CharWidthRequestType.Italic, all, monospace);
		this.createRequest('n', CharWidthRequestType.Italic, all, monospace);

		// monospace Bold test
		this.createRequest('|', CharWidthRequestType.Bold, all, monospace);
		this.createRequest('_', CharWidthRequestType.Bold, all, monospace);
		this.createRequest('i', CharWidthRequestType.Bold, all, monospace);
		this.createRequest('l', CharWidthRequestType.Bold, all, monospace);
		this.createRequest('m', CharWidthRequestType.Bold, all, monospace);
		this.createRequest('n', CharWidthRequestType.Bold, all, monospace);

		readCharWidths(BareFontInfo, all);

		const maxDigitWidth = Math.max(digit0.width, digit1.width, digit2.width, digit3.width, digit4.width, digit5.width, digit6.width, digit7.width, digit8.width, digit9.width);

		let isMonospace = (BareFontInfo.fontFeatureSettings === EditorFontLigatures.OFF);
		const referenceWidth = monospace[0].width;
		for (let i = 1, len = monospace.length; isMonospace && i < len; i++) {
			const diff = referenceWidth - monospace[i].width;
			if (diff < -0.001 || diff > 0.001) {
				isMonospace = false;
				Break;
			}
		}

		let canUseHalfwidthRightwardsArrow = true;
		if (isMonospace && halfwidthRightwardsArrow.width !== referenceWidth) {
			// using a halfwidth rightwards arrow would Break monospace...
			canUseHalfwidthRightwardsArrow = false;
		}
		if (halfwidthRightwardsArrow.width > rightwardsArrow.width) {
			// using a halfwidth rightwards arrow would paint a larger arrow than a regular rightwards arrow
			canUseHalfwidthRightwardsArrow = false;
		}

		// let's trust the zoom level only 2s after it was changed.
		const canTrustBrowserZoomLevel = (Browser.getTimeSinceLastZoomLevelChanged() > 2000);
		return new FontInfo({
			zoomLevel: Browser.getZoomLevel(),
			fontFamily: BareFontInfo.fontFamily,
			fontWeight: BareFontInfo.fontWeight,
			fontSize: BareFontInfo.fontSize,
			fontFeatureSettings: BareFontInfo.fontFeatureSettings,
			lineHeight: BareFontInfo.lineHeight,
			letterSpacing: BareFontInfo.letterSpacing,
			isMonospace: isMonospace,
			typicalHalfwidthCharacterWidth: typicalHalfwidthCharacter.width,
			typicalFullwidthCharacterWidth: typicalFullwidthCharacter.width,
			canUseHalfwidthRightwardsArrow: canUseHalfwidthRightwardsArrow,
			spaceWidth: space.width,
			middotWidth: middot.width,
			wsmiddotWidth: wsmiddotWidth.width,
			maxDigitWidth: maxDigitWidth
		}, canTrustBrowserZoomLevel);
	}
}

export class Configuration extends CommonEditorConfiguration {

	puBlic static applyFontInfoSlow(domNode: HTMLElement, fontInfo: BareFontInfo): void {
		domNode.style.fontFamily = fontInfo.getMassagedFontFamily();
		domNode.style.fontWeight = fontInfo.fontWeight;
		domNode.style.fontSize = fontInfo.fontSize + 'px';
		domNode.style.fontFeatureSettings = fontInfo.fontFeatureSettings;
		domNode.style.lineHeight = fontInfo.lineHeight + 'px';
		domNode.style.letterSpacing = fontInfo.letterSpacing + 'px';
	}

	puBlic static applyFontInfo(domNode: FastDomNode<HTMLElement>, fontInfo: BareFontInfo): void {
		domNode.setFontFamily(fontInfo.getMassagedFontFamily());
		domNode.setFontWeight(fontInfo.fontWeight);
		domNode.setFontSize(fontInfo.fontSize);
		domNode.setFontFeatureSettings(fontInfo.fontFeatureSettings);
		domNode.setLineHeight(fontInfo.lineHeight);
		domNode.setLetterSpacing(fontInfo.letterSpacing);
	}

	private readonly _elementSizeOBserver: ElementSizeOBserver;

	constructor(
		isSimpleWidget: Boolean,
		options: IEditorConstructionOptions,
		referenceDomElement: HTMLElement | null = null,
		private readonly accessiBilityService: IAccessiBilityService
	) {
		super(isSimpleWidget, options);

		this._elementSizeOBserver = this._register(new ElementSizeOBserver(referenceDomElement, options.dimension, () => this._onReferenceDomElementSizeChanged()));

		this._register(CSSBasedConfiguration.INSTANCE.onDidChange(() => this._onCSSBasedConfigurationChanged()));

		if (this._validatedOptions.get(EditorOption.automaticLayout)) {
			this._elementSizeOBserver.startOBserving();
		}

		this._register(Browser.onDidChangeZoomLevel(_ => this._recomputeOptions()));
		this._register(this.accessiBilityService.onDidChangeScreenReaderOptimized(() => this._recomputeOptions()));

		this._recomputeOptions();
	}

	private _onReferenceDomElementSizeChanged(): void {
		this._recomputeOptions();
	}

	private _onCSSBasedConfigurationChanged(): void {
		this._recomputeOptions();
	}

	puBlic oBserveReferenceElement(dimension?: IDimension): void {
		this._elementSizeOBserver.oBserve(dimension);
	}

	puBlic dispose(): void {
		super.dispose();
	}

	private _getExtraEditorClassName(): string {
		let extra = '';
		if (!Browser.isSafari && !Browser.isWeBkitWeBView) {
			// Use user-select: none in all Browsers except Safari and native macOS WeBView
			extra += 'no-user-select ';
		}
		if (platform.isMacintosh) {
			extra += 'mac ';
		}
		return extra;
	}

	protected _getEnvConfiguration(): IEnvConfiguration {
		return {
			extraEditorClassName: this._getExtraEditorClassName(),
			outerWidth: this._elementSizeOBserver.getWidth(),
			outerHeight: this._elementSizeOBserver.getHeight(),
			emptySelectionClipBoard: Browser.isWeBKit || Browser.isFirefox,
			pixelRatio: Browser.getPixelRatio(),
			zoomLevel: Browser.getZoomLevel(),
			accessiBilitySupport: (
				this.accessiBilityService.isScreenReaderOptimized()
					? AccessiBilitySupport.EnaBled
					: this.accessiBilityService.getAccessiBilitySupport()
			)
		};
	}

	protected readConfiguration(BareFontInfo: BareFontInfo): FontInfo {
		return CSSBasedConfiguration.INSTANCE.readConfiguration(BareFontInfo);
	}
}
