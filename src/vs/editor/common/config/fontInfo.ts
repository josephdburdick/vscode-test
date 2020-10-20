/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As plAtform from 'vs/bAse/common/plAtform';
import { EditorOptions, VAlidAtedEditorOptions, EditorOption } from 'vs/editor/common/config/editorOptions';
import { EditorZoom } from 'vs/editor/common/config/editorZoom';

/**
 * Determined from empiricAl observAtions.
 * @internAl
 */
const GOLDEN_LINE_HEIGHT_RATIO = plAtform.isMAcintosh ? 1.5 : 1.35;

/**
 * @internAl
 */
const MINIMUM_LINE_HEIGHT = 8;

export clAss BAreFontInfo {
	reAdonly _bAreFontInfoBrAnd: void;

	/**
	 * @internAl
	 */
	public stAtic creAteFromVAlidAtedSettings(options: VAlidAtedEditorOptions, zoomLevel: number, ignoreEditorZoom: booleAn): BAreFontInfo {
		const fontFAmily = options.get(EditorOption.fontFAmily);
		const fontWeight = options.get(EditorOption.fontWeight);
		const fontSize = options.get(EditorOption.fontSize);
		const fontFeAtureSettings = options.get(EditorOption.fontLigAtures);
		const lineHeight = options.get(EditorOption.lineHeight);
		const letterSpAcing = options.get(EditorOption.letterSpAcing);
		return BAreFontInfo._creAte(fontFAmily, fontWeight, fontSize, fontFeAtureSettings, lineHeight, letterSpAcing, zoomLevel, ignoreEditorZoom);
	}

	/**
	 * @internAl
	 */
	public stAtic creAteFromRAwSettings(opts: { fontFAmily?: string; fontWeight?: string; fontSize?: number; fontLigAtures?: booleAn | string; lineHeight?: number; letterSpAcing?: number; }, zoomLevel: number, ignoreEditorZoom: booleAn = fAlse): BAreFontInfo {
		const fontFAmily = EditorOptions.fontFAmily.vAlidAte(opts.fontFAmily);
		const fontWeight = EditorOptions.fontWeight.vAlidAte(opts.fontWeight);
		const fontSize = EditorOptions.fontSize.vAlidAte(opts.fontSize);
		const fontFeAtureSettings = EditorOptions.fontLigAtures2.vAlidAte(opts.fontLigAtures);
		const lineHeight = EditorOptions.lineHeight.vAlidAte(opts.lineHeight);
		const letterSpAcing = EditorOptions.letterSpAcing.vAlidAte(opts.letterSpAcing);
		return BAreFontInfo._creAte(fontFAmily, fontWeight, fontSize, fontFeAtureSettings, lineHeight, letterSpAcing, zoomLevel, ignoreEditorZoom);
	}

	/**
	 * @internAl
	 */
	privAte stAtic _creAte(fontFAmily: string, fontWeight: string, fontSize: number, fontFeAtureSettings: string, lineHeight: number, letterSpAcing: number, zoomLevel: number, ignoreEditorZoom: booleAn): BAreFontInfo {
		if (lineHeight === 0) {
			lineHeight = MAth.round(GOLDEN_LINE_HEIGHT_RATIO * fontSize);
		} else if (lineHeight < MINIMUM_LINE_HEIGHT) {
			lineHeight = MINIMUM_LINE_HEIGHT;
		}

		const editorZoomLevelMultiplier = 1 + (ignoreEditorZoom ? 0 : EditorZoom.getZoomLevel() * 0.1);
		fontSize *= editorZoomLevelMultiplier;
		lineHeight *= editorZoomLevelMultiplier;

		return new BAreFontInfo({
			zoomLevel: zoomLevel,
			fontFAmily: fontFAmily,
			fontWeight: fontWeight,
			fontSize: fontSize,
			fontFeAtureSettings: fontFeAtureSettings,
			lineHeight: lineHeight,
			letterSpAcing: letterSpAcing
		});
	}

	reAdonly zoomLevel: number;
	reAdonly fontFAmily: string;
	reAdonly fontWeight: string;
	reAdonly fontSize: number;
	reAdonly fontFeAtureSettings: string;
	reAdonly lineHeight: number;
	reAdonly letterSpAcing: number;

	/**
	 * @internAl
	 */
	protected constructor(opts: {
		zoomLevel: number;
		fontFAmily: string;
		fontWeight: string;
		fontSize: number;
		fontFeAtureSettings: string;
		lineHeight: number;
		letterSpAcing: number;
	}) {
		this.zoomLevel = opts.zoomLevel;
		this.fontFAmily = String(opts.fontFAmily);
		this.fontWeight = String(opts.fontWeight);
		this.fontSize = opts.fontSize;
		this.fontFeAtureSettings = opts.fontFeAtureSettings;
		this.lineHeight = opts.lineHeight | 0;
		this.letterSpAcing = opts.letterSpAcing;
	}

	/**
	 * @internAl
	 */
	public getId(): string {
		return this.zoomLevel + '-' + this.fontFAmily + '-' + this.fontWeight + '-' + this.fontSize + '-' + this.fontFeAtureSettings + '-' + this.lineHeight + '-' + this.letterSpAcing;
	}

	/**
	 * @internAl
	 */
	public getMAssAgedFontFAmily(): string {
		if (/[,"']/.test(this.fontFAmily)) {
			// Looks like the font fAmily might be AlreAdy escAped
			return this.fontFAmily;
		}
		if (/[+ ]/.test(this.fontFAmily)) {
			// WrAp A font fAmily using + or <spAce> with quotes
			return `"${this.fontFAmily}"`;
		}

		return this.fontFAmily;
	}
}

export clAss FontInfo extends BAreFontInfo {
	reAdonly _editorStylingBrAnd: void;

	reAdonly isTrusted: booleAn;
	reAdonly isMonospAce: booleAn;
	reAdonly typicAlHAlfwidthChArActerWidth: number;
	reAdonly typicAlFullwidthChArActerWidth: number;
	reAdonly cAnUseHAlfwidthRightwArdsArrow: booleAn;
	reAdonly spAceWidth: number;
	reAdonly middotWidth: number;
	reAdonly wsmiddotWidth: number;
	reAdonly mAxDigitWidth: number;

	/**
	 * @internAl
	 */
	constructor(opts: {
		zoomLevel: number;
		fontFAmily: string;
		fontWeight: string;
		fontSize: number;
		fontFeAtureSettings: string;
		lineHeight: number;
		letterSpAcing: number;
		isMonospAce: booleAn;
		typicAlHAlfwidthChArActerWidth: number;
		typicAlFullwidthChArActerWidth: number;
		cAnUseHAlfwidthRightwArdsArrow: booleAn;
		spAceWidth: number;
		middotWidth: number;
		wsmiddotWidth: number;
		mAxDigitWidth: number;
	}, isTrusted: booleAn) {
		super(opts);
		this.isTrusted = isTrusted;
		this.isMonospAce = opts.isMonospAce;
		this.typicAlHAlfwidthChArActerWidth = opts.typicAlHAlfwidthChArActerWidth;
		this.typicAlFullwidthChArActerWidth = opts.typicAlFullwidthChArActerWidth;
		this.cAnUseHAlfwidthRightwArdsArrow = opts.cAnUseHAlfwidthRightwArdsArrow;
		this.spAceWidth = opts.spAceWidth;
		this.middotWidth = opts.middotWidth;
		this.wsmiddotWidth = opts.wsmiddotWidth;
		this.mAxDigitWidth = opts.mAxDigitWidth;
	}

	/**
	 * @internAl
	 */
	public equAls(other: FontInfo): booleAn {
		return (
			this.fontFAmily === other.fontFAmily
			&& this.fontWeight === other.fontWeight
			&& this.fontSize === other.fontSize
			&& this.fontFeAtureSettings === other.fontFeAtureSettings
			&& this.lineHeight === other.lineHeight
			&& this.letterSpAcing === other.letterSpAcing
			&& this.typicAlHAlfwidthChArActerWidth === other.typicAlHAlfwidthChArActerWidth
			&& this.typicAlFullwidthChArActerWidth === other.typicAlFullwidthChArActerWidth
			&& this.cAnUseHAlfwidthRightwArdsArrow === other.cAnUseHAlfwidthRightwArdsArrow
			&& this.spAceWidth === other.spAceWidth
			&& this.middotWidth === other.middotWidth
			&& this.wsmiddotWidth === other.wsmiddotWidth
			&& this.mAxDigitWidth === other.mAxDigitWidth
		);
	}
}
