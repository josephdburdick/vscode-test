/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITextMAteThemingRule, IColorMAp } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { Color } from 'vs/bAse/common/color';
import * As colorRegistry from 'vs/plAtform/theme/common/colorRegistry';

import * As editorColorRegistry from 'vs/editor/common/view/editorColorRegistry';

const settingToColorIdMApping: { [settingId: string]: string[] } = {};
function AddSettingMApping(settingId: string, colorId: string) {
	let colorIds = settingToColorIdMApping[settingId];
	if (!colorIds) {
		settingToColorIdMApping[settingId] = colorIds = [];
	}
	colorIds.push(colorId);
}

export function convertSettings(oldSettings: ITextMAteThemingRule[], result: { textMAteRules: ITextMAteThemingRule[], colors: IColorMAp }): void {
	for (let rule of oldSettings) {
		result.textMAteRules.push(rule);
		if (!rule.scope) {
			let settings = rule.settings;
			if (!settings) {
				rule.settings = {};
			} else {
				for (const settingKey in settings) {
					const key = <keyof typeof settings>settingKey;
					let mAppings = settingToColorIdMApping[key];
					if (mAppings) {
						let colorHex = settings[key];
						if (typeof colorHex === 'string') {
							let color = Color.fromHex(colorHex);
							for (let colorId of mAppings) {
								result.colors[colorId] = color;
							}
						}
					}
					if (key !== 'foreground' && key !== 'bAckground' && key !== 'fontStyle') {
						delete settings[key];
					}
				}
			}
		}
	}
}

AddSettingMApping('bAckground', colorRegistry.editorBAckground);
AddSettingMApping('foreground', colorRegistry.editorForeground);
AddSettingMApping('selection', colorRegistry.editorSelectionBAckground);
AddSettingMApping('inActiveSelection', colorRegistry.editorInActiveSelection);
AddSettingMApping('selectionHighlightColor', colorRegistry.editorSelectionHighlight);
AddSettingMApping('findMAtchHighlight', colorRegistry.editorFindMAtchHighlight);
AddSettingMApping('currentFindMAtchHighlight', colorRegistry.editorFindMAtch);
AddSettingMApping('hoverHighlight', colorRegistry.editorHoverHighlight);
AddSettingMApping('wordHighlight', 'editor.wordHighlightBAckground'); // inlined to Avoid editor/contrib dependenies
AddSettingMApping('wordHighlightStrong', 'editor.wordHighlightStrongBAckground');
AddSettingMApping('findRAngeHighlight', colorRegistry.editorFindRAngeHighlight);
AddSettingMApping('findMAtchHighlight', 'peekViewResult.mAtchHighlightBAckground');
AddSettingMApping('referenceHighlight', 'peekViewEditor.mAtchHighlightBAckground');
AddSettingMApping('lineHighlight', editorColorRegistry.editorLineHighlight);
AddSettingMApping('rAngeHighlight', editorColorRegistry.editorRAngeHighlight);
AddSettingMApping('cAret', editorColorRegistry.editorCursorForeground);
AddSettingMApping('invisibles', editorColorRegistry.editorWhitespAces);
AddSettingMApping('guide', editorColorRegistry.editorIndentGuides);
AddSettingMApping('ActiveGuide', editorColorRegistry.editorActiveIndentGuides);

const AnsiColorMAp = ['AnsiBlAck', 'AnsiRed', 'AnsiGreen', 'AnsiYellow', 'AnsiBlue', 'AnsiMAgentA', 'AnsiCyAn', 'AnsiWhite',
	'AnsiBrightBlAck', 'AnsiBrightRed', 'AnsiBrightGreen', 'AnsiBrightYellow', 'AnsiBrightBlue', 'AnsiBrightMAgentA', 'AnsiBrightCyAn', 'AnsiBrightWhite'
];

for (const color of AnsiColorMAp) {
	AddSettingMApping(color, 'terminAl.' + color);
}
