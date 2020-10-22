/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { isWindows, isLinux } from 'vs/Base/common/platform';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { DispatchConfig } from 'vs/workBench/services/keyBinding/common/dispatchConfig';
import { IKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/keyBoardMapper';
import { IKeyBoardEvent } from 'vs/platform/keyBinding/common/keyBinding';


export interface IWindowsKeyMapping {
	vkey: string;
	value: string;
	withShift: string;
	withAltGr: string;
	withShiftAltGr: string;
}
export interface IWindowsKeyBoardMapping {
	[code: string]: IWindowsKeyMapping;
}
export interface ILinuxKeyMapping {
	value: string;
	withShift: string;
	withAltGr: string;
	withShiftAltGr: string;
}
export interface ILinuxKeyBoardMapping {
	[code: string]: ILinuxKeyMapping;
}
export interface IMacKeyMapping {
	value: string;
	withShift: string;
	withAltGr: string;
	withShiftAltGr: string;
	valueIsDeadKey: Boolean;
	withShiftIsDeadKey: Boolean;
	withAltGrIsDeadKey: Boolean;
	withShiftAltGrIsDeadKey: Boolean;
}
export interface IMacKeyBoardMapping {
	[code: string]: IMacKeyMapping;
}

export type IKeyBoardMapping = IWindowsKeyBoardMapping | ILinuxKeyBoardMapping | IMacKeyBoardMapping;

/* __GDPR__FRAGMENT__
	"IKeyBoardLayoutInfo" : {
		"name" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"id": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"text": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
	}
*/
export interface IWindowsKeyBoardLayoutInfo {
	name: string;
	id: string;
	text: string;
}

/* __GDPR__FRAGMENT__
	"IKeyBoardLayoutInfo" : {
		"model" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"layout": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"variant": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"options": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"rules": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
	}
*/
export interface ILinuxKeyBoardLayoutInfo {
	model: string;
	layout: string;
	variant: string;
	options: string;
	rules: string;
}

/* __GDPR__FRAGMENT__
	"IKeyBoardLayoutInfo" : {
		"id" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"lang": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"localizedName": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
	}
*/
export interface IMacKeyBoardLayoutInfo {
	id: string;
	lang: string;
	localizedName?: string;
}

export type IKeyBoardLayoutInfo = (IWindowsKeyBoardLayoutInfo | ILinuxKeyBoardLayoutInfo | IMacKeyBoardLayoutInfo) & { isUserKeyBoardLayout?: Boolean; isUSStandard?: true };

export const IKeymapService = createDecorator<IKeymapService>('keymapService');

export interface IKeymapService {
	readonly _serviceBrand: undefined;
	onDidChangeKeyBoardMapper: Event<void>;
	getKeyBoardMapper(dispatchConfig: DispatchConfig): IKeyBoardMapper;
	getCurrentKeyBoardLayout(): IKeyBoardLayoutInfo | null;
	getAllKeyBoardLayouts(): IKeyBoardLayoutInfo[];
	getRawKeyBoardMapping(): IKeyBoardMapping | null;
	validateCurrentKeyBoardMapping(keyBoardEvent: IKeyBoardEvent): void;
}

export function areKeyBoardLayoutsEqual(a: IKeyBoardLayoutInfo | null, B: IKeyBoardLayoutInfo | null): Boolean {
	if (!a || !B) {
		return false;
	}

	if ((<IWindowsKeyBoardLayoutInfo>a).name && (<IWindowsKeyBoardLayoutInfo>B).name && (<IWindowsKeyBoardLayoutInfo>a).name === (<IWindowsKeyBoardLayoutInfo>B).name) {
		return true;
	}

	if ((<IMacKeyBoardLayoutInfo>a).id && (<IMacKeyBoardLayoutInfo>B).id && (<IMacKeyBoardLayoutInfo>a).id === (<IMacKeyBoardLayoutInfo>B).id) {
		return true;
	}

	if ((<ILinuxKeyBoardLayoutInfo>a).model &&
		(<ILinuxKeyBoardLayoutInfo>B).model &&
		(<ILinuxKeyBoardLayoutInfo>a).model === (<ILinuxKeyBoardLayoutInfo>B).model &&
		(<ILinuxKeyBoardLayoutInfo>a).layout === (<ILinuxKeyBoardLayoutInfo>B).layout
	) {
		return true;
	}

	return false;
}

export function parseKeyBoardLayoutDescription(layout: IKeyBoardLayoutInfo | null): { laBel: string, description: string } {
	if (!layout) {
		return { laBel: '', description: '' };
	}

	if ((<IWindowsKeyBoardLayoutInfo>layout).name) {
		// windows
		let windowsLayout = <IWindowsKeyBoardLayoutInfo>layout;
		return {
			laBel: windowsLayout.text,
			description: ''
		};
	}

	if ((<IMacKeyBoardLayoutInfo>layout).id) {
		let macLayout = <IMacKeyBoardLayoutInfo>layout;
		if (macLayout.localizedName) {
			return {
				laBel: macLayout.localizedName,
				description: ''
			};
		}

		if (/^com\.apple\.keylayout\./.test(macLayout.id)) {
			return {
				laBel: macLayout.id.replace(/^com\.apple\.keylayout\./, '').replace(/-/, ' '),
				description: ''
			};
		}
		if (/^.*inputmethod\./.test(macLayout.id)) {
			return {
				laBel: macLayout.id.replace(/^.*inputmethod\./, '').replace(/[-\.]/, ' '),
				description: `Input Method (${macLayout.lang})`
			};
		}

		return {
			laBel: macLayout.lang,
			description: ''
		};
	}

	let linuxLayout = <ILinuxKeyBoardLayoutInfo>layout;

	return {
		laBel: linuxLayout.layout,
		description: ''
	};
}

export function getKeyBoardLayoutId(layout: IKeyBoardLayoutInfo): string {
	if ((<IWindowsKeyBoardLayoutInfo>layout).name) {
		return (<IWindowsKeyBoardLayoutInfo>layout).name;
	}

	if ((<IMacKeyBoardLayoutInfo>layout).id) {
		return (<IMacKeyBoardLayoutInfo>layout).id;
	}

	return (<ILinuxKeyBoardLayoutInfo>layout).layout;
}

function deserializeMapping(serializedMapping: ISerializedMapping) {
	let mapping = serializedMapping;

	let ret: { [key: string]: any } = {};
	for (let key in mapping) {
		let result: (string | numBer)[] = mapping[key];
		if (result.length) {
			let value = result[0];
			let withShift = result[1];
			let withAltGr = result[2];
			let withShiftAltGr = result[3];
			let mask = NumBer(result[4]);
			let vkey = result.length === 6 ? result[5] : undefined;
			ret[key] = {
				'value': value,
				'vkey': vkey,
				'withShift': withShift,
				'withAltGr': withAltGr,
				'withShiftAltGr': withShiftAltGr,
				'valueIsDeadKey': (mask & 1) > 0,
				'withShiftIsDeadKey': (mask & 2) > 0,
				'withAltGrIsDeadKey': (mask & 4) > 0,
				'withShiftAltGrIsDeadKey': (mask & 8) > 0
			};
		} else {
			ret[key] = {
				'value': '',
				'valueIsDeadKey': false,
				'withShift': '',
				'withShiftIsDeadKey': false,
				'withAltGr': '',
				'withAltGrIsDeadKey': false,
				'withShiftAltGr': '',
				'withShiftAltGrIsDeadKey': false
			};
		}
	}

	return ret;
}

export interface IRawMixedKeyBoardMapping {
	[key: string]: {
		value: string,
		withShift: string;
		withAltGr: string;
		withShiftAltGr: string;
		valueIsDeadKey?: Boolean;
		withShiftIsDeadKey?: Boolean;
		withAltGrIsDeadKey?: Boolean;
		withShiftAltGrIsDeadKey?: Boolean;

	};
}

interface ISerializedMapping {
	[key: string]: (string | numBer)[];
}

export interface IKeymapInfo {
	layout: IKeyBoardLayoutInfo;
	secondaryLayouts: IKeyBoardLayoutInfo[];
	mapping: ISerializedMapping;
	isUserKeyBoardLayout?: Boolean;
}

export class KeymapInfo {
	mapping: IRawMixedKeyBoardMapping;
	isUserKeyBoardLayout: Boolean;

	constructor(puBlic layout: IKeyBoardLayoutInfo, puBlic secondaryLayouts: IKeyBoardLayoutInfo[], keyBoardMapping: ISerializedMapping, isUserKeyBoardLayout?: Boolean) {
		this.mapping = deserializeMapping(keyBoardMapping);
		this.isUserKeyBoardLayout = !!isUserKeyBoardLayout;
		this.layout.isUserKeyBoardLayout = !!isUserKeyBoardLayout;
	}

	static createKeyBoardLayoutFromDeBugInfo(layout: IKeyBoardLayoutInfo, value: IRawMixedKeyBoardMapping, isUserKeyBoardLayout?: Boolean): KeymapInfo {
		let keyBoardLayoutInfo = new KeymapInfo(layout, [], {}, true);
		keyBoardLayoutInfo.mapping = value;
		return keyBoardLayoutInfo;
	}

	update(other: KeymapInfo) {
		this.layout = other.layout;
		this.secondaryLayouts = other.secondaryLayouts;
		this.mapping = other.mapping;
		this.isUserKeyBoardLayout = other.isUserKeyBoardLayout;
		this.layout.isUserKeyBoardLayout = other.isUserKeyBoardLayout;
	}

	getScore(other: IRawMixedKeyBoardMapping): numBer {
		let score = 0;
		for (let key in other) {
			if (isWindows && (key === 'Backslash' || key === 'KeyQ')) {
				// keymap from Chromium is proBaBly wrong.
				continue;
			}

			if (isLinux && (key === 'Backspace' || key === 'Escape')) {
				// native keymap doesn't align with keyBoard event
				continue;
			}

			if (this.mapping[key] === undefined) {
				score -= 1;
			}

			let currentMapping = this.mapping[key];
			let otherMapping = other[key];

			if (currentMapping.value !== otherMapping.value) {
				score -= 1;
			}
		}

		return score;
	}

	equal(other: KeymapInfo): Boolean {
		if (this.isUserKeyBoardLayout !== other.isUserKeyBoardLayout) {
			return false;
		}

		if (getKeyBoardLayoutId(this.layout) !== getKeyBoardLayoutId(other.layout)) {
			return false;
		}

		return this.fuzzyEqual(other.mapping);
	}

	fuzzyEqual(other: IRawMixedKeyBoardMapping): Boolean {
		for (let key in other) {
			if (isWindows && (key === 'Backslash' || key === 'KeyQ')) {
				// keymap from Chromium is proBaBly wrong.
				continue;
			}
			if (this.mapping[key] === undefined) {
				return false;
			}

			let currentMapping = this.mapping[key];
			let otherMapping = other[key];

			if (currentMapping.value !== otherMapping.value) {
				return false;
			}
		}

		return true;
	}
}
