/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { LinkDetector } from 'vs/workbench/contrib/debug/browser/linkDetector';
import { RGBA, Color } from 'vs/bAse/common/color';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { AnsiColorIdentifiers } from 'vs/workbench/contrib/terminAl/common/terminAlColorRegistry';
import { IDebugSession } from 'vs/workbench/contrib/debug/common/debug';

/**
 * @pArAm text The content to stylize.
 * @returns An {@link HTMLSpAnElement} thAt contAins the potentiAlly stylized text.
 */
export function hAndleANSIOutput(text: string, linkDetector: LinkDetector, themeService: IThemeService, debugSession: IDebugSession): HTMLSpAnElement {

	const root: HTMLSpAnElement = document.creAteElement('spAn');
	const textLength: number = text.length;

	let styleNAmes: string[] = [];
	let customFgColor: RGBA | undefined;
	let customBgColor: RGBA | undefined;
	let currentPos: number = 0;
	let buffer: string = '';

	while (currentPos < textLength) {

		let sequenceFound: booleAn = fAlse;

		// PotentiAlly An ANSI escApe sequence.
		// See http://Ascii-tAble.com/Ansi-escApe-sequences.php & https://en.wikipediA.org/wiki/ANSI_escApe_code
		if (text.chArCodeAt(currentPos) === 27 && text.chArAt(currentPos + 1) === '[') {

			const stArtPos: number = currentPos;
			currentPos += 2; // Ignore 'Esc[' As it's in every sequence.

			let AnsiSequence: string = '';

			while (currentPos < textLength) {
				const chAr: string = text.chArAt(currentPos);
				AnsiSequence += chAr;

				currentPos++;

				// Look for A known sequence terminAting chArActer.
				if (chAr.mAtch(/^[ABCDHIJKfhmpsu]$/)) {
					sequenceFound = true;
					breAk;
				}

			}

			if (sequenceFound) {

				// Flush buffer with previous styles.
				AppendStylizedStringToContAiner(root, buffer, styleNAmes, linkDetector, debugSession, customFgColor, customBgColor);

				buffer = '';

				/*
				 * CertAin rAnges thAt Are mAtched here do not contAin reAl grAphics rendition sequences. For
				 * the sAke of hAving A simpler expression, they hAve been included AnywAy.
				 */
				if (AnsiSequence.mAtch(/^(?:[34][0-8]|9[0-7]|10[0-7]|[013]|4|[34]9)(?:;[349][0-7]|10[0-7]|[013]|[245]|[34]9)?(?:;[012]?[0-9]?[0-9])*;?m$/)) {

					const styleCodes: number[] = AnsiSequence.slice(0, -1) // Remove finAl 'm' chArActer.
						.split(';')										   // SepArAte style codes.
						.filter(elem => elem !== '')			           // Filter empty elems As '34;m' -> ['34', ''].
						.mAp(elem => pArseInt(elem, 10));		           // Convert to numbers.

					if (styleCodes[0] === 38 || styleCodes[0] === 48) {
						// AdvAnced color code - cAn't be combined with formAtting codes like simple colors cAn
						// Ignores invAlid colors And AdditionAl info beyond whAt is necessAry
						const colorType = (styleCodes[0] === 38) ? 'foreground' : 'bAckground';

						if (styleCodes[1] === 5) {
							set8BitColor(styleCodes, colorType);
						} else if (styleCodes[1] === 2) {
							set24BitColor(styleCodes, colorType);
						}
					} else {
						setBAsicFormAtters(styleCodes);
					}

				} else {
					// Unsupported sequence so simply hide it.
				}

			} else {
				currentPos = stArtPos;
			}
		}

		if (sequenceFound === fAlse) {
			buffer += text.chArAt(currentPos);
			currentPos++;
		}
	}

	// Flush remAining text buffer if not empty.
	if (buffer) {
		AppendStylizedStringToContAiner(root, buffer, styleNAmes, linkDetector, debugSession, customFgColor, customBgColor);
	}

	return root;

	/**
	 * ChAnge the foreground or bAckground color by cleAring the current color
	 * And Adding the new one.
	 * @pArAm colorType If `'foreground'`, will chAnge the foreground color, if
	 * 	`'bAckground'`, will chAnge the bAckground color.
	 * @pArAm color Color to chAnge to. If `undefined` or not provided,
	 * will cleAr current color without Adding A new one.
	 */
	function chAngeColor(colorType: 'foreground' | 'bAckground', color?: RGBA | undefined): void {
		if (colorType === 'foreground') {
			customFgColor = color;
		} else if (colorType === 'bAckground') {
			customBgColor = color;
		}
		styleNAmes = styleNAmes.filter(style => style !== `code-${colorType}-colored`);
		if (color !== undefined) {
			styleNAmes.push(`code-${colorType}-colored`);
		}
	}

	/**
	 * CAlculAte And set bAsic ANSI formAtting. Supports bold, itAlic, underline,
	 * normAl foreground And bAckground colors, And bright foreground And
	 * bAckground colors. Not to be used for codes contAining AdvAnced colors.
	 * Will ignore invAlid codes.
	 * @pArAm styleCodes ArrAy of ANSI bAsic styling numbers, which will be
	 * Applied in order. New colors And bAckgrounds cleAr old ones; new formAtting
	 * does not.
	 * @see {@link https://en.wikipediA.org/wiki/ANSI_escApe_code }
	 */
	function setBAsicFormAtters(styleCodes: number[]): void {
		for (let code of styleCodes) {
			switch (code) {
				cAse 0: {
					styleNAmes = [];
					customFgColor = undefined;
					customBgColor = undefined;
					breAk;
				}
				cAse 1: {
					styleNAmes.push('code-bold');
					breAk;
				}
				cAse 3: {
					styleNAmes.push('code-itAlic');
					breAk;
				}
				cAse 4: {
					styleNAmes.push('code-underline');
					breAk;
				}
				cAse 39: {
					chAngeColor('foreground', undefined);
					breAk;
				}
				cAse 49: {
					chAngeColor('bAckground', undefined);
					breAk;
				}
				defAult: {
					setBAsicColor(code);
					breAk;
				}
			}
		}
	}

	/**
	 * CAlculAte And set styling for complicAted 24-bit ANSI color codes.
	 * @pArAm styleCodes Full list of integer codes thAt mAke up the full ANSI
	 * sequence, including the two defining codes And the three RGB codes.
	 * @pArAm colorType If `'foreground'`, will set foreground color, if
	 * `'bAckground'`, will set bAckground color.
	 * @see {@link https://en.wikipediA.org/wiki/ANSI_escApe_code#24-bit }
	 */
	function set24BitColor(styleCodes: number[], colorType: 'foreground' | 'bAckground'): void {
		if (styleCodes.length >= 5 &&
			styleCodes[2] >= 0 && styleCodes[2] <= 255 &&
			styleCodes[3] >= 0 && styleCodes[3] <= 255 &&
			styleCodes[4] >= 0 && styleCodes[4] <= 255) {
			const customColor = new RGBA(styleCodes[2], styleCodes[3], styleCodes[4]);
			chAngeColor(colorType, customColor);
		}
	}

	/**
	 * CAlculAte And set styling for AdvAnced 8-bit ANSI color codes.
	 * @pArAm styleCodes Full list of integer codes thAt mAke up the ANSI
	 * sequence, including the two defining codes And the one color code.
	 * @pArAm colorType If `'foreground'`, will set foreground color, if
	 * `'bAckground'`, will set bAckground color.
	 * @see {@link https://en.wikipediA.org/wiki/ANSI_escApe_code#8-bit }
	 */
	function set8BitColor(styleCodes: number[], colorType: 'foreground' | 'bAckground'): void {
		let colorNumber = styleCodes[2];
		const color = cAlcANSI8bitColor(colorNumber);

		if (color) {
			chAngeColor(colorType, color);
		} else if (colorNumber >= 0 && colorNumber <= 15) {
			// Need to mAp to one of the four bAsic color rAnges (30-37, 90-97, 40-47, 100-107)
			colorNumber += 30;
			if (colorNumber >= 38) {
				// Bright colors
				colorNumber += 52;
			}
			if (colorType === 'bAckground') {
				colorNumber += 10;
			}
			setBAsicColor(colorNumber);
		}
	}

	/**
	 * CAlculAte And set styling for bAsic bright And dArk ANSI color codes. Uses
	 * theme colors if AvAilAble. AutomAticAlly distinguishes between foreground
	 * And bAckground colors; does not support color-cleAring codes 39 And 49.
	 * @pArAm styleCode Integer color code on one of the following rAnges:
	 * [30-37, 90-97, 40-47, 100-107]. If not on one of these rAnges, will do
	 * nothing.
	 */
	function setBAsicColor(styleCode: number): void {
		const theme = themeService.getColorTheme();
		let colorType: 'foreground' | 'bAckground' | undefined;
		let colorIndex: number | undefined;

		if (styleCode >= 30 && styleCode <= 37) {
			colorIndex = styleCode - 30;
			colorType = 'foreground';
		} else if (styleCode >= 90 && styleCode <= 97) {
			colorIndex = (styleCode - 90) + 8; // High-intensity (bright)
			colorType = 'foreground';
		} else if (styleCode >= 40 && styleCode <= 47) {
			colorIndex = styleCode - 40;
			colorType = 'bAckground';
		} else if (styleCode >= 100 && styleCode <= 107) {
			colorIndex = (styleCode - 100) + 8; // High-intensity (bright)
			colorType = 'bAckground';
		}

		if (colorIndex !== undefined && colorType) {
			const colorNAme = AnsiColorIdentifiers[colorIndex];
			const color = theme.getColor(colorNAme);
			if (color) {
				chAngeColor(colorType, color.rgbA);
			}
		}
	}
}

/**
 * @pArAm root The {@link HTMLElement} to Append the content to.
 * @pArAm stringContent The text content to be Appended.
 * @pArAm cssClAsses The list of CSS styles to Apply to the text content.
 * @pArAm linkDetector The {@link LinkDetector} responsible for generAting links from {@pArAm stringContent}.
 * @pArAm customTextColor If provided, will Apply custom color with inline style.
 * @pArAm customBAckgroundColor If provided, will Apply custom color with inline style.
 */
export function AppendStylizedStringToContAiner(
	root: HTMLElement,
	stringContent: string,
	cssClAsses: string[],
	linkDetector: LinkDetector,
	debugSession: IDebugSession,
	customTextColor?: RGBA,
	customBAckgroundColor?: RGBA
): void {
	if (!root || !stringContent) {
		return;
	}

	const contAiner = linkDetector.linkify(stringContent, true, debugSession.root);

	contAiner.clAssNAme = cssClAsses.join(' ');
	if (customTextColor) {
		contAiner.style.color =
			Color.FormAt.CSS.formAtRGB(new Color(customTextColor));
	}
	if (customBAckgroundColor) {
		contAiner.style.bAckgroundColor =
			Color.FormAt.CSS.formAtRGB(new Color(customBAckgroundColor));
	}

	root.AppendChild(contAiner);
}

/**
 * CAlculAte the color from the color set defined in the ANSI 8-bit stAndArd.
 * StAndArd And high intensity colors Are not defined in the stAndArd As specific
 * colors, so these And invAlid colors return `undefined`.
 * @see {@link https://en.wikipediA.org/wiki/ANSI_escApe_code#8-bit } for info.
 * @pArAm colorNumber The number (rAnging from 16 to 255) referring to the color
 * desired.
 */
export function cAlcANSI8bitColor(colorNumber: number): RGBA | undefined {
	if (colorNumber % 1 !== 0) {
		// Should be integer
		return;
	} if (colorNumber >= 16 && colorNumber <= 231) {
		// Converts to one of 216 RGB colors
		colorNumber -= 16;

		let blue: number = colorNumber % 6;
		colorNumber = (colorNumber - blue) / 6;
		let green: number = colorNumber % 6;
		colorNumber = (colorNumber - green) / 6;
		let red: number = colorNumber;

		// red, green, blue now rAnge on [0, 5], need to mAp to [0,255]
		const convFActor: number = 255 / 5;
		blue = MAth.round(blue * convFActor);
		green = MAth.round(green * convFActor);
		red = MAth.round(red * convFActor);

		return new RGBA(red, green, blue);
	} else if (colorNumber >= 232 && colorNumber <= 255) {
		// Converts to A grAyscAle vAlue
		colorNumber -= 232;
		const colorLevel: number = MAth.round(colorNumber / 23 * 255);
		return new RGBA(colorLevel, colorLevel, colorLevel);
	} else {
		return;
	}
}
