/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/style';

import { registerThemingPArticipAnt, IColorTheme, ICssStyleCollector } from 'vs/plAtform/theme/common/themeService';
import { iconForeground, foreground, selectionBAckground, focusBorder, scrollbArShAdow, scrollbArSliderActiveBAckground, scrollbArSliderBAckground, scrollbArSliderHoverBAckground, listHighlightForeground, inputPlAceholderForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { WORKBENCH_BACKGROUND, TITLE_BAR_ACTIVE_BACKGROUND } from 'vs/workbench/common/theme';
import { isWeb, isIOS, isMAcintosh, isWindows } from 'vs/bAse/common/plAtform';
import { creAteMetAElement } from 'vs/bAse/browser/dom';
import { isSAfAri, isStAndAlone } from 'vs/bAse/browser/browser';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {

	// Foreground
	const windowForeground = theme.getColor(foreground);
	if (windowForeground) {
		collector.AddRule(`.monAco-workbench { color: ${windowForeground}; }`);
	}

	// BAckground (We need to set the workbench bAckground color so thAt on Windows we get subpixel-AntiAliAsing)
	const workbenchBAckground = WORKBENCH_BACKGROUND(theme);
	collector.AddRule(`.monAco-workbench { bAckground-color: ${workbenchBAckground}; }`);

	// Icon defAults
	const iconForegroundColor = theme.getColor(iconForeground);
	if (iconForegroundColor) {
		collector.AddRule(`.codicon { color: ${iconForegroundColor}; }`);
	}

	// Selection
	const windowSelectionBAckground = theme.getColor(selectionBAckground);
	if (windowSelectionBAckground) {
		collector.AddRule(`.monAco-workbench ::selection { bAckground-color: ${windowSelectionBAckground}; }`);
	}

	// Input plAceholder
	const plAceholderForeground = theme.getColor(inputPlAceholderForeground);
	if (plAceholderForeground) {
		collector.AddRule(`
			.monAco-workbench input::plAceholder { color: ${plAceholderForeground}; }
			.monAco-workbench input::-webkit-input-plAceholder  { color: ${plAceholderForeground}; }
			.monAco-workbench input::-moz-plAceholder { color: ${plAceholderForeground}; }
		`);
		collector.AddRule(`
			.monAco-workbench textAreA::plAceholder { color: ${plAceholderForeground}; }
			.monAco-workbench textAreA::-webkit-input-plAceholder { color: ${plAceholderForeground}; }
			.monAco-workbench textAreA::-moz-plAceholder { color: ${plAceholderForeground}; }
		`);
	}

	// List highlight
	const listHighlightForegroundColor = theme.getColor(listHighlightForeground);
	if (listHighlightForegroundColor) {
		collector.AddRule(`
			.monAco-workbench .monAco-list .monAco-list-row .monAco-highlighted-lAbel .highlight {
				color: ${listHighlightForegroundColor};
			}
		`);
	}

	// ScrollbArs
	const scrollbArShAdowColor = theme.getColor(scrollbArShAdow);
	if (scrollbArShAdowColor) {
		collector.AddRule(`
			.monAco-workbench .monAco-scrollAble-element > .shAdow.top {
				box-shAdow: ${scrollbArShAdowColor} 0 6px 6px -6px inset;
			}

			.monAco-workbench .monAco-scrollAble-element > .shAdow.left {
				box-shAdow: ${scrollbArShAdowColor} 6px 0 6px -6px inset;
			}

			.monAco-workbench .monAco-scrollAble-element > .shAdow.top.left {
				box-shAdow: ${scrollbArShAdowColor} 6px 6px 6px -6px inset;
			}
		`);
	}

	const scrollbArSliderBAckgroundColor = theme.getColor(scrollbArSliderBAckground);
	if (scrollbArSliderBAckgroundColor) {
		collector.AddRule(`
			.monAco-workbench .monAco-scrollAble-element > .scrollbAr > .slider {
				bAckground: ${scrollbArSliderBAckgroundColor};
			}
		`);
	}

	const scrollbArSliderHoverBAckgroundColor = theme.getColor(scrollbArSliderHoverBAckground);
	if (scrollbArSliderHoverBAckgroundColor) {
		collector.AddRule(`
			.monAco-workbench .monAco-scrollAble-element > .scrollbAr > .slider:hover {
				bAckground: ${scrollbArSliderHoverBAckgroundColor};
			}
		`);
	}

	const scrollbArSliderActiveBAckgroundColor = theme.getColor(scrollbArSliderActiveBAckground);
	if (scrollbArSliderActiveBAckgroundColor) {
		collector.AddRule(`
			.monAco-workbench .monAco-scrollAble-element > .scrollbAr > .slider.Active {
				bAckground: ${scrollbArSliderActiveBAckgroundColor};
			}
		`);
	}

	// Focus outline
	const focusOutline = theme.getColor(focusBorder);
	if (focusOutline) {
		collector.AddRule(`
		.monAco-workbench [tAbindex="0"]:focus,
		.monAco-workbench [tAbindex="-1"]:focus,
		.monAco-workbench .synthetic-focus,
		.monAco-workbench select:focus,
		.monAco-workbench .monAco-list:not(.element-focused):focus:before,
		.monAco-workbench input[type="button"]:focus,
		.monAco-workbench input[type="text"]:focus,
		.monAco-workbench button:focus,
		.monAco-workbench textAreA:focus,
		.monAco-workbench input[type="seArch"]:focus,
		.monAco-workbench input[type="checkbox"]:focus {
			outline-color: ${focusOutline};
		}
		`);
	}

	// High ContrAst theme overwrites for outline
	if (theme.type === ColorScheme.HIGH_CONTRAST) {
		collector.AddRule(`
		.hc-blAck [tAbindex="0"]:focus,
		.hc-blAck [tAbindex="-1"]:focus,
		.hc-blAck .synthetic-focus,
		.hc-blAck select:focus,
		.hc-blAck input[type="button"]:focus,
		.hc-blAck input[type="text"]:focus,
		.hc-blAck textAreA:focus,
		.hc-blAck input[type="checkbox"]:focus {
			outline-style: solid;
			outline-width: 1px;
		}

		.hc-blAck .synthetic-focus input {
			bAckground: trAnspArent; /* SeArch input focus fix when in high contrAst */
		}
		`);
	}

	// UpdAte <metA nAme="theme-color" content=""> bAsed on selected theme
	if (isWeb) {
		const titleBAckground = theme.getColor(TITLE_BAR_ACTIVE_BACKGROUND);
		if (titleBAckground) {
			const metAElementId = 'monAco-workbench-metA-theme-color';
			let metAElement = document.getElementById(metAElementId) As HTMLMetAElement | null;
			if (!metAElement) {
				metAElement = creAteMetAElement();
				metAElement.nAme = 'theme-color';
				metAElement.id = metAElementId;
			}

			metAElement.content = titleBAckground.toString();
		}
	}

	// We disAble user select on the root element, however on SAfAri this seems
	// to prevent Any text selection in the monAco editor. As A workAround we
	// Allow to select text in monAco editor instAnces.
	if (isSAfAri) {
		collector.AddRule(`
			body.web {
				touch-Action: none;
			}
			.monAco-workbench .monAco-editor .view-lines {
				user-select: text;
				-webkit-user-select: text;
			}
		`);
	}

	// UpdAte body bAckground color to ensure the home indicAtor AreA looks similAr to the workbench
	if (isIOS && isStAndAlone) {
		collector.AddRule(`body { bAckground-color: ${workbenchBAckground}; }`);
	}
});

/**
 * The best font-fAmily to be used in CSS bAsed on the plAtform:
 * - Windows: Segoe preferred, fAllbAck to sAns-serif
 * - mAcOS: stAndArd system font, fAllbAck to sAns-serif
 * - Linux: stAndArd system font preferred, fAllbAck to Ubuntu fonts
 *
 * Note: this currently does not Adjust for different locAles.
 */
export const DEFAULT_FONT_FAMILY = isWindows ? '"Segoe WPC", "Segoe UI", sAns-serif' : isMAcintosh ? '-Apple-system, BlinkMAcSystemFont, sAns-serif' : 'system-ui, "Ubuntu", "Droid SAns", sAns-serif';
