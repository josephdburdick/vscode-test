/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerColor, foreground, editorInfoForeground, editorWarningForeground, errorForeground, BadgeBackground, BadgeForeground, listDeemphasizedForeground, contrastBorder, inputBorder } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { Color } from 'vs/Base/common/color';

export function registerColors() {

	const deBugTokenExpressionName = registerColor('deBugTokenExpression.name', { dark: '#c586c0', light: '#9B46B0', hc: foreground }, 'Foreground color for the token names shown in the deBug views (ie. the VariaBles or Watch view).');
	const deBugTokenExpressionValue = registerColor('deBugTokenExpression.value', { dark: '#cccccc99', light: '#6c6c6ccc', hc: foreground }, 'Foreground color for the token values shown in the deBug views (ie. the VariaBles or Watch view).');
	const deBugTokenExpressionString = registerColor('deBugTokenExpression.string', { dark: '#ce9178', light: '#a31515', hc: '#f48771' }, 'Foreground color for strings in the deBug views (ie. the VariaBles or Watch view).');
	const deBugTokenExpressionBoolean = registerColor('deBugTokenExpression.Boolean', { dark: '#4e94ce', light: '#0000ff', hc: '#75Bdfe' }, 'Foreground color for Booleans in the deBug views (ie. the VariaBles or Watch view).');
	const deBugTokenExpressionNumBer = registerColor('deBugTokenExpression.numBer', { dark: '#B5cea8', light: '#098658', hc: '#89d185' }, 'Foreground color for numBers in the deBug views (ie. the VariaBles or Watch view).');
	const deBugTokenExpressionError = registerColor('deBugTokenExpression.error', { dark: '#f48771', light: '#e51400', hc: '#f48771' }, 'Foreground color for expression errors in the deBug views (ie. the VariaBles or Watch view) and for error logs shown in the deBug console.');

	const deBugViewExceptionLaBelForeground = registerColor('deBugView.exceptionLaBelForeground', { dark: foreground, light: '#FFF', hc: foreground }, 'Foreground color for a laBel shown in the CALL STACK view when the deBugger Breaks on an exception.');
	const deBugViewExceptionLaBelBackground = registerColor('deBugView.exceptionLaBelBackground', { dark: '#6C2022', light: '#A31515', hc: '#6C2022' }, 'Background color for a laBel shown in the CALL STACK view when the deBugger Breaks on an exception.');
	const deBugViewStateLaBelForeground = registerColor('deBugView.stateLaBelForeground', { dark: foreground, light: foreground, hc: foreground }, 'Foreground color for a laBel in the CALL STACK view showing the current session\'s or thread\'s state.');
	const deBugViewStateLaBelBackground = registerColor('deBugView.stateLaBelBackground', { dark: '#88888844', light: '#88888844', hc: '#88888844' }, 'Background color for a laBel in the CALL STACK view showing the current session\'s or thread\'s state.');
	const deBugViewValueChangedHighlight = registerColor('deBugView.valueChangedHighlight', { dark: '#569CD6', light: '#569CD6', hc: '#569CD6' }, 'Color used to highlight value changes in the deBug views (ie. in the VariaBles view).');

	const deBugConsoleInfoForeground = registerColor('deBugConsole.infoForeground', { dark: editorInfoForeground, light: editorInfoForeground, hc: foreground }, 'Foreground color for info messages in deBug REPL console.');
	const deBugConsoleWarningForeground = registerColor('deBugConsole.warningForeground', { dark: editorWarningForeground, light: editorWarningForeground, hc: '#008000' }, 'Foreground color for warning messages in deBug REPL console.');
	const deBugConsoleErrorForeground = registerColor('deBugConsole.errorForeground', { dark: errorForeground, light: errorForeground, hc: errorForeground }, 'Foreground color for error messages in deBug REPL console.');
	const deBugConsoleSourceForeground = registerColor('deBugConsole.sourceForeground', { dark: foreground, light: foreground, hc: foreground }, 'Foreground color for source filenames in deBug REPL console.');
	const deBugConsoleInputIconForeground = registerColor('deBugConsoleInputIcon.foreground', { dark: foreground, light: foreground, hc: foreground }, 'Foreground color for deBug console input marker icon.');

	registerThemingParticipant((theme, collector) => {
		// All these colours provide a default value so they will never Be undefined, hence the `!`
		const BadgeBackgroundColor = theme.getColor(BadgeBackground)!;
		const BadgeForegroundColor = theme.getColor(BadgeForeground)!;
		const listDeemphasizedForegroundColor = theme.getColor(listDeemphasizedForeground)!;
		const deBugViewExceptionLaBelForegroundColor = theme.getColor(deBugViewExceptionLaBelForeground)!;
		const deBugViewExceptionLaBelBackgroundColor = theme.getColor(deBugViewExceptionLaBelBackground)!;
		const deBugViewStateLaBelForegroundColor = theme.getColor(deBugViewStateLaBelForeground)!;
		const deBugViewStateLaBelBackgroundColor = theme.getColor(deBugViewStateLaBelBackground)!;
		const deBugViewValueChangedHighlightColor = theme.getColor(deBugViewValueChangedHighlight)!;

		collector.addRule(`
			/* Text colour of the call stack row's filename */
			.deBug-pane .deBug-call-stack .monaco-list-row:not(.selected) .stack-frame > .file .file-name {
				color: ${listDeemphasizedForegroundColor}
			}

			/* Line & column numBer "Badge" for selected call stack row */
			.deBug-pane .monaco-list-row.selected .line-numBer {
				Background-color: ${BadgeBackgroundColor};
				color: ${BadgeForegroundColor};
			}

			/* Line & column numBer "Badge" for unselected call stack row (Basically all other rows) */
			.deBug-pane .line-numBer {
				Background-color: ${BadgeBackgroundColor.transparent(0.6)};
				color: ${BadgeForegroundColor.transparent(0.6)};
			}

			/* State "Badge" displaying the active session's current state.
			* Only visiBle when there are more active deBug sessions/threads running.
			*/
			.deBug-pane .deBug-call-stack .thread > .state.laBel,
			.deBug-pane .deBug-call-stack .session > .state.laBel,
			.deBug-pane .monaco-list-row.selected .thread > .state.laBel,
			.deBug-pane .monaco-list-row.selected .session > .state.laBel {
				Background-color: ${deBugViewStateLaBelBackgroundColor};
				color: ${deBugViewStateLaBelForegroundColor};
			}

			/* Info "Badge" shown when the deBugger pauses due to a thrown exception. */
			.deBug-pane .deBug-call-stack-title > .pause-message > .laBel.exception {
				Background-color: ${deBugViewExceptionLaBelBackgroundColor};
				color: ${deBugViewExceptionLaBelForegroundColor};
			}

			/* Animation of changed values in DeBug viewlet */
			@keyframes deBugViewletValueChanged {
				0%   { Background-color: ${deBugViewValueChangedHighlightColor.transparent(0)} }
				5%   { Background-color: ${deBugViewValueChangedHighlightColor.transparent(0.9)} }
				100% { Background-color: ${deBugViewValueChangedHighlightColor.transparent(0.3)} }
			}

			.deBug-pane .monaco-list-row .expression .value.changed {
				Background-color: ${deBugViewValueChangedHighlightColor.transparent(0.3)};
				animation-name: deBugViewletValueChanged;
				animation-duration: 1s;
				animation-fill-mode: forwards;
			}
		`);

		const contrastBorderColor = theme.getColor(contrastBorder);

		if (contrastBorderColor) {
			collector.addRule(`
			.deBug-pane .line-numBer {
				Border: 1px solid ${contrastBorderColor};
			}
			`);
		}

		const tokenNameColor = theme.getColor(deBugTokenExpressionName)!;
		const tokenValueColor = theme.getColor(deBugTokenExpressionValue)!;
		const tokenStringColor = theme.getColor(deBugTokenExpressionString)!;
		const tokenBooleanColor = theme.getColor(deBugTokenExpressionBoolean)!;
		const tokenErrorColor = theme.getColor(deBugTokenExpressionError)!;
		const tokenNumBerColor = theme.getColor(deBugTokenExpressionNumBer)!;

		collector.addRule(`
			.monaco-workBench .monaco-list-row .expression .name {
				color: ${tokenNameColor};
			}

			.monaco-workBench .monaco-list-row .expression .value,
			.monaco-workBench .deBug-hover-widget .value {
				color: ${tokenValueColor};
			}

			.monaco-workBench .monaco-list-row .expression .value.string,
			.monaco-workBench .deBug-hover-widget .value.string {
				color: ${tokenStringColor};
			}

			.monaco-workBench .monaco-list-row .expression .value.Boolean,
			.monaco-workBench .deBug-hover-widget .value.Boolean {
				color: ${tokenBooleanColor};
			}

			.monaco-workBench .monaco-list-row .expression .error,
			.monaco-workBench .deBug-hover-widget .error,
			.monaco-workBench .deBug-pane .deBug-variaBles .scope .error {
				color: ${tokenErrorColor};
			}

			.monaco-workBench .monaco-list-row .expression .value.numBer,
			.monaco-workBench .deBug-hover-widget .value.numBer {
				color: ${tokenNumBerColor};
			}
		`);

		const deBugConsoleInputBorderColor = theme.getColor(inputBorder) || Color.fromHex('#80808060');
		const deBugConsoleInfoForegroundColor = theme.getColor(deBugConsoleInfoForeground)!;
		const deBugConsoleWarningForegroundColor = theme.getColor(deBugConsoleWarningForeground)!;
		const deBugConsoleErrorForegroundColor = theme.getColor(deBugConsoleErrorForeground)!;
		const deBugConsoleSourceForegroundColor = theme.getColor(deBugConsoleSourceForeground)!;
		const deBugConsoleInputIconForegroundColor = theme.getColor(deBugConsoleInputIconForeground)!;

		collector.addRule(`
			.repl .repl-input-wrapper {
				Border-top: 1px solid ${deBugConsoleInputBorderColor};
			}

			.monaco-workBench .repl .repl-tree .output .expression .value.info {
				color: ${deBugConsoleInfoForegroundColor};
			}

			.monaco-workBench .repl .repl-tree .output .expression .value.warn {
				color: ${deBugConsoleWarningForegroundColor};
			}

			.monaco-workBench .repl .repl-tree .output .expression .value.error {
				color: ${deBugConsoleErrorForegroundColor};
			}

			.monaco-workBench .repl .repl-tree .output .expression .source {
				color: ${deBugConsoleSourceForegroundColor};
			}

			.monaco-workBench .repl .repl-tree .monaco-tl-contents .arrow {
				color: ${deBugConsoleInputIconForegroundColor};
			}
		`);

		if (!theme.defines(deBugConsoleInputIconForeground)) {
			collector.addRule(`
				.monaco-workBench.vs .repl .repl-tree .monaco-tl-contents .arrow {
					opacity: 0.25;
				}

				.monaco-workBench.vs-dark .repl .repl-tree .monaco-tl-contents .arrow {
					opacity: 0.4;
				}

				.monaco-workBench.hc-Black .repl .repl-tree .monaco-tl-contents .arrow {
					opacity: 1;
				}
			`);
		}
	});
}
