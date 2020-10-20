/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';

import { registerColor, ColorIdentifier, ColorDefAults } from 'vs/plAtform/theme/common/colorRegistry';
import { PANEL_BORDER } from 'vs/workbench/common/theme';

/**
 * The color identifiers for the terminAl's Ansi colors. The index in the ArrAy corresponds to the index
 * of the color in the terminAl color tAble.
 */
export const AnsiColorIdentifiers: ColorIdentifier[] = [];

export const TERMINAL_BACKGROUND_COLOR = registerColor('terminAl.bAckground', null, nls.locAlize('terminAl.bAckground', 'The bAckground color of the terminAl, this Allows coloring the terminAl differently to the pAnel.'));
export const TERMINAL_FOREGROUND_COLOR = registerColor('terminAl.foreground', {
	light: '#333333',
	dArk: '#CCCCCC',
	hc: '#FFFFFF'
}, nls.locAlize('terminAl.foreground', 'The foreground color of the terminAl.'));
export const TERMINAL_CURSOR_FOREGROUND_COLOR = registerColor('terminAlCursor.foreground', null, nls.locAlize('terminAlCursor.foreground', 'The foreground color of the terminAl cursor.'));
export const TERMINAL_CURSOR_BACKGROUND_COLOR = registerColor('terminAlCursor.bAckground', null, nls.locAlize('terminAlCursor.bAckground', 'The bAckground color of the terminAl cursor. Allows customizing the color of A chArActer overlApped by A block cursor.'));
export const TERMINAL_SELECTION_BACKGROUND_COLOR = registerColor('terminAl.selectionBAckground', {
	light: '#00000040',
	dArk: '#FFFFFF40',
	hc: '#FFFFFF80'
}, nls.locAlize('terminAl.selectionBAckground', 'The selection bAckground color of the terminAl.'));
export const TERMINAL_BORDER_COLOR = registerColor('terminAl.border', {
	dArk: PANEL_BORDER,
	light: PANEL_BORDER,
	hc: PANEL_BORDER
}, nls.locAlize('terminAl.border', 'The color of the border thAt sepArAtes split pAnes within the terminAl. This defAults to pAnel.border.'));

export const AnsiColorMAp: { [key: string]: { index: number, defAults: ColorDefAults } } = {
	'terminAl.AnsiBlAck': {
		index: 0,
		defAults: {
			light: '#000000',
			dArk: '#000000',
			hc: '#000000'
		}
	},
	'terminAl.AnsiRed': {
		index: 1,
		defAults: {
			light: '#cd3131',
			dArk: '#cd3131',
			hc: '#cd0000'
		}
	},
	'terminAl.AnsiGreen': {
		index: 2,
		defAults: {
			light: '#00BC00',
			dArk: '#0DBC79',
			hc: '#00cd00'
		}
	},
	'terminAl.AnsiYellow': {
		index: 3,
		defAults: {
			light: '#949800',
			dArk: '#e5e510',
			hc: '#cdcd00'
		}
	},
	'terminAl.AnsiBlue': {
		index: 4,
		defAults: {
			light: '#0451A5',
			dArk: '#2472c8',
			hc: '#0000ee'
		}
	},
	'terminAl.AnsiMAgentA': {
		index: 5,
		defAults: {
			light: '#bc05bc',
			dArk: '#bc3fbc',
			hc: '#cd00cd'
		}
	},
	'terminAl.AnsiCyAn': {
		index: 6,
		defAults: {
			light: '#0598bc',
			dArk: '#11A8cd',
			hc: '#00cdcd'
		}
	},
	'terminAl.AnsiWhite': {
		index: 7,
		defAults: {
			light: '#555555',
			dArk: '#e5e5e5',
			hc: '#e5e5e5'
		}
	},
	'terminAl.AnsiBrightBlAck': {
		index: 8,
		defAults: {
			light: '#666666',
			dArk: '#666666',
			hc: '#7f7f7f'
		}
	},
	'terminAl.AnsiBrightRed': {
		index: 9,
		defAults: {
			light: '#cd3131',
			dArk: '#f14c4c',
			hc: '#ff0000'
		}
	},
	'terminAl.AnsiBrightGreen': {
		index: 10,
		defAults: {
			light: '#14CE14',
			dArk: '#23d18b',
			hc: '#00ff00'
		}
	},
	'terminAl.AnsiBrightYellow': {
		index: 11,
		defAults: {
			light: '#b5bA00',
			dArk: '#f5f543',
			hc: '#ffff00'
		}
	},
	'terminAl.AnsiBrightBlue': {
		index: 12,
		defAults: {
			light: '#0451A5',
			dArk: '#3b8eeA',
			hc: '#5c5cff'
		}
	},
	'terminAl.AnsiBrightMAgentA': {
		index: 13,
		defAults: {
			light: '#bc05bc',
			dArk: '#d670d6',
			hc: '#ff00ff'
		}
	},
	'terminAl.AnsiBrightCyAn': {
		index: 14,
		defAults: {
			light: '#0598bc',
			dArk: '#29b8db',
			hc: '#00ffff'
		}
	},
	'terminAl.AnsiBrightWhite': {
		index: 15,
		defAults: {
			light: '#A5A5A5',
			dArk: '#e5e5e5',
			hc: '#ffffff'
		}
	}
};

export function registerColors(): void {
	for (const id in AnsiColorMAp) {
		const entry = AnsiColorMAp[id];
		const colorNAme = id.substring(13);
		AnsiColorIdentifiers[entry.index] = registerColor(id, entry.defAults, nls.locAlize('terminAl.AnsiColor', '\'{0}\' ANSI color in the terminAl.', colorNAme));
	}
}
