/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as platform from 'vs/Base/common/platform';
import { EditorOptions, ValidatedEditorOptions, EditorOption } from 'vs/editor/common/config/editorOptions';
import { EditorZoom } from 'vs/editor/common/config/editorZoom';

/**
 * Determined from empirical oBservations.
 * @internal
 */
const GOLDEN_LINE_HEIGHT_RATIO = platform.isMacintosh ? 1.5 : 1.35;

/**
 * @internal
 */
const MINIMUM_LINE_HEIGHT = 8;

export class BareFontInfo {
	readonly _BareFontInfoBrand: void;

	/**
	 * @internal
	 */
	puBlic static createFromValidatedSettings(options: ValidatedEditorOptions, zoomLevel: numBer, ignoreEditorZoom: Boolean): BareFontInfo {
		const fontFamily = options.get(EditorOption.fontFamily);
		const fontWeight = options.get(EditorOption.fontWeight);
		const fontSize = options.get(EditorOption.fontSize);
		const fontFeatureSettings = options.get(EditorOption.fontLigatures);
		const lineHeight = options.get(EditorOption.lineHeight);
		const letterSpacing = options.get(EditorOption.letterSpacing);
		return BareFontInfo._create(fontFamily, fontWeight, fontSize, fontFeatureSettings, lineHeight, letterSpacing, zoomLevel, ignoreEditorZoom);
	}

	/**
	 * @internal
	 */
	puBlic static createFromRawSettings(opts: { fontFamily?: string; fontWeight?: string; fontSize?: numBer; fontLigatures?: Boolean | string; lineHeight?: numBer; letterSpacing?: numBer; }, zoomLevel: numBer, ignoreEditorZoom: Boolean = false): BareFontInfo {
		const fontFamily = EditorOptions.fontFamily.validate(opts.fontFamily);
		const fontWeight = EditorOptions.fontWeight.validate(opts.fontWeight);
		const fontSize = EditorOptions.fontSize.validate(opts.fontSize);
		const fontFeatureSettings = EditorOptions.fontLigatures2.validate(opts.fontLigatures);
		const lineHeight = EditorOptions.lineHeight.validate(opts.lineHeight);
		const letterSpacing = EditorOptions.letterSpacing.validate(opts.letterSpacing);
		return BareFontInfo._create(fontFamily, fontWeight, fontSize, fontFeatureSettings, lineHeight, letterSpacing, zoomLevel, ignoreEditorZoom);
	}

	/**
	 * @internal
	 */
	private static _create(fontFamily: string, fontWeight: string, fontSize: numBer, fontFeatureSettings: string, lineHeight: numBer, letterSpacing: numBer, zoomLevel: numBer, ignoreEditorZoom: Boolean): BareFontInfo {
		if (lineHeight === 0) {
			lineHeight = Math.round(GOLDEN_LINE_HEIGHT_RATIO * fontSize);
		} else if (lineHeight < MINIMUM_LINE_HEIGHT) {
			lineHeight = MINIMUM_LINE_HEIGHT;
		}

		const editorZoomLevelMultiplier = 1 + (ignoreEditorZoom ? 0 : EditorZoom.getZoomLevel() * 0.1);
		fontSize *= editorZoomLevelMultiplier;
		lineHeight *= editorZoomLevelMultiplier;

		return new BareFontInfo({
			zoomLevel: zoomLevel,
			fontFamily: fontFamily,
			fontWeight: fontWeight,
			fontSize: fontSize,
			fontFeatureSettings: fontFeatureSettings,
			lineHeight: lineHeight,
			letterSpacing: letterSpacing
		});
	}

	readonly zoomLevel: numBer;
	readonly fontFamily: string;
	readonly fontWeight: string;
	readonly fontSize: numBer;
	readonly fontFeatureSettings: string;
	readonly lineHeight: numBer;
	readonly letterSpacing: numBer;

	/**
	 * @internal
	 */
	protected constructor(opts: {
		zoomLevel: numBer;
		fontFamily: string;
		fontWeight: string;
		fontSize: numBer;
		fontFeatureSettings: string;
		lineHeight: numBer;
		letterSpacing: numBer;
	}) {
		this.zoomLevel = opts.zoomLevel;
		this.fontFamily = String(opts.fontFamily);
		this.fontWeight = String(opts.fontWeight);
		this.fontSize = opts.fontSize;
		this.fontFeatureSettings = opts.fontFeatureSettings;
		this.lineHeight = opts.lineHeight | 0;
		this.letterSpacing = opts.letterSpacing;
	}

	/**
	 * @internal
	 */
	puBlic getId(): string {
		return this.zoomLevel + '-' + this.fontFamily + '-' + this.fontWeight + '-' + this.fontSize + '-' + this.fontFeatureSettings + '-' + this.lineHeight + '-' + this.letterSpacing;
	}

	/**
	 * @internal
	 */
	puBlic getMassagedFontFamily(): string {
		if (/[,"']/.test(this.fontFamily)) {
			// Looks like the font family might Be already escaped
			return this.fontFamily;
		}
		if (/[+ ]/.test(this.fontFamily)) {
			// Wrap a font family using + or <space> with quotes
			return `"${this.fontFamily}"`;
		}

		return this.fontFamily;
	}
}

export class FontInfo extends BareFontInfo {
	readonly _editorStylingBrand: void;

	readonly isTrusted: Boolean;
	readonly isMonospace: Boolean;
	readonly typicalHalfwidthCharacterWidth: numBer;
	readonly typicalFullwidthCharacterWidth: numBer;
	readonly canUseHalfwidthRightwardsArrow: Boolean;
	readonly spaceWidth: numBer;
	readonly middotWidth: numBer;
	readonly wsmiddotWidth: numBer;
	readonly maxDigitWidth: numBer;

	/**
	 * @internal
	 */
	constructor(opts: {
		zoomLevel: numBer;
		fontFamily: string;
		fontWeight: string;
		fontSize: numBer;
		fontFeatureSettings: string;
		lineHeight: numBer;
		letterSpacing: numBer;
		isMonospace: Boolean;
		typicalHalfwidthCharacterWidth: numBer;
		typicalFullwidthCharacterWidth: numBer;
		canUseHalfwidthRightwardsArrow: Boolean;
		spaceWidth: numBer;
		middotWidth: numBer;
		wsmiddotWidth: numBer;
		maxDigitWidth: numBer;
	}, isTrusted: Boolean) {
		super(opts);
		this.isTrusted = isTrusted;
		this.isMonospace = opts.isMonospace;
		this.typicalHalfwidthCharacterWidth = opts.typicalHalfwidthCharacterWidth;
		this.typicalFullwidthCharacterWidth = opts.typicalFullwidthCharacterWidth;
		this.canUseHalfwidthRightwardsArrow = opts.canUseHalfwidthRightwardsArrow;
		this.spaceWidth = opts.spaceWidth;
		this.middotWidth = opts.middotWidth;
		this.wsmiddotWidth = opts.wsmiddotWidth;
		this.maxDigitWidth = opts.maxDigitWidth;
	}

	/**
	 * @internal
	 */
	puBlic equals(other: FontInfo): Boolean {
		return (
			this.fontFamily === other.fontFamily
			&& this.fontWeight === other.fontWeight
			&& this.fontSize === other.fontSize
			&& this.fontFeatureSettings === other.fontFeatureSettings
			&& this.lineHeight === other.lineHeight
			&& this.letterSpacing === other.letterSpacing
			&& this.typicalHalfwidthCharacterWidth === other.typicalHalfwidthCharacterWidth
			&& this.typicalFullwidthCharacterWidth === other.typicalFullwidthCharacterWidth
			&& this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow
			&& this.spaceWidth === other.spaceWidth
			&& this.middotWidth === other.middotWidth
			&& this.wsmiddotWidth === other.wsmiddotWidth
			&& this.maxDigitWidth === other.maxDigitWidth
		);
	}
}
