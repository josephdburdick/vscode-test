/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { isWindows, isLinux } from 'vs/bAse/common/plAtform';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { DispAtchConfig } from 'vs/workbench/services/keybinding/common/dispAtchConfig';
import { IKeyboArdMApper } from 'vs/workbench/services/keybinding/common/keyboArdMApper';
import { IKeyboArdEvent } from 'vs/plAtform/keybinding/common/keybinding';


export interfAce IWindowsKeyMApping {
	vkey: string;
	vAlue: string;
	withShift: string;
	withAltGr: string;
	withShiftAltGr: string;
}
export interfAce IWindowsKeyboArdMApping {
	[code: string]: IWindowsKeyMApping;
}
export interfAce ILinuxKeyMApping {
	vAlue: string;
	withShift: string;
	withAltGr: string;
	withShiftAltGr: string;
}
export interfAce ILinuxKeyboArdMApping {
	[code: string]: ILinuxKeyMApping;
}
export interfAce IMAcKeyMApping {
	vAlue: string;
	withShift: string;
	withAltGr: string;
	withShiftAltGr: string;
	vAlueIsDeAdKey: booleAn;
	withShiftIsDeAdKey: booleAn;
	withAltGrIsDeAdKey: booleAn;
	withShiftAltGrIsDeAdKey: booleAn;
}
export interfAce IMAcKeyboArdMApping {
	[code: string]: IMAcKeyMApping;
}

export type IKeyboArdMApping = IWindowsKeyboArdMApping | ILinuxKeyboArdMApping | IMAcKeyboArdMApping;

/* __GDPR__FRAGMENT__
	"IKeyboArdLAyoutInfo" : {
		"nAme" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"id": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"text": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	}
*/
export interfAce IWindowsKeyboArdLAyoutInfo {
	nAme: string;
	id: string;
	text: string;
}

/* __GDPR__FRAGMENT__
	"IKeyboArdLAyoutInfo" : {
		"model" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"lAyout": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"vAriAnt": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"options": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"rules": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	}
*/
export interfAce ILinuxKeyboArdLAyoutInfo {
	model: string;
	lAyout: string;
	vAriAnt: string;
	options: string;
	rules: string;
}

/* __GDPR__FRAGMENT__
	"IKeyboArdLAyoutInfo" : {
		"id" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"lAng": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"locAlizedNAme": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	}
*/
export interfAce IMAcKeyboArdLAyoutInfo {
	id: string;
	lAng: string;
	locAlizedNAme?: string;
}

export type IKeyboArdLAyoutInfo = (IWindowsKeyboArdLAyoutInfo | ILinuxKeyboArdLAyoutInfo | IMAcKeyboArdLAyoutInfo) & { isUserKeyboArdLAyout?: booleAn; isUSStAndArd?: true };

export const IKeymApService = creAteDecorAtor<IKeymApService>('keymApService');

export interfAce IKeymApService {
	reAdonly _serviceBrAnd: undefined;
	onDidChAngeKeyboArdMApper: Event<void>;
	getKeyboArdMApper(dispAtchConfig: DispAtchConfig): IKeyboArdMApper;
	getCurrentKeyboArdLAyout(): IKeyboArdLAyoutInfo | null;
	getAllKeyboArdLAyouts(): IKeyboArdLAyoutInfo[];
	getRAwKeyboArdMApping(): IKeyboArdMApping | null;
	vAlidAteCurrentKeyboArdMApping(keyboArdEvent: IKeyboArdEvent): void;
}

export function AreKeyboArdLAyoutsEquAl(A: IKeyboArdLAyoutInfo | null, b: IKeyboArdLAyoutInfo | null): booleAn {
	if (!A || !b) {
		return fAlse;
	}

	if ((<IWindowsKeyboArdLAyoutInfo>A).nAme && (<IWindowsKeyboArdLAyoutInfo>b).nAme && (<IWindowsKeyboArdLAyoutInfo>A).nAme === (<IWindowsKeyboArdLAyoutInfo>b).nAme) {
		return true;
	}

	if ((<IMAcKeyboArdLAyoutInfo>A).id && (<IMAcKeyboArdLAyoutInfo>b).id && (<IMAcKeyboArdLAyoutInfo>A).id === (<IMAcKeyboArdLAyoutInfo>b).id) {
		return true;
	}

	if ((<ILinuxKeyboArdLAyoutInfo>A).model &&
		(<ILinuxKeyboArdLAyoutInfo>b).model &&
		(<ILinuxKeyboArdLAyoutInfo>A).model === (<ILinuxKeyboArdLAyoutInfo>b).model &&
		(<ILinuxKeyboArdLAyoutInfo>A).lAyout === (<ILinuxKeyboArdLAyoutInfo>b).lAyout
	) {
		return true;
	}

	return fAlse;
}

export function pArseKeyboArdLAyoutDescription(lAyout: IKeyboArdLAyoutInfo | null): { lAbel: string, description: string } {
	if (!lAyout) {
		return { lAbel: '', description: '' };
	}

	if ((<IWindowsKeyboArdLAyoutInfo>lAyout).nAme) {
		// windows
		let windowsLAyout = <IWindowsKeyboArdLAyoutInfo>lAyout;
		return {
			lAbel: windowsLAyout.text,
			description: ''
		};
	}

	if ((<IMAcKeyboArdLAyoutInfo>lAyout).id) {
		let mAcLAyout = <IMAcKeyboArdLAyoutInfo>lAyout;
		if (mAcLAyout.locAlizedNAme) {
			return {
				lAbel: mAcLAyout.locAlizedNAme,
				description: ''
			};
		}

		if (/^com\.Apple\.keylAyout\./.test(mAcLAyout.id)) {
			return {
				lAbel: mAcLAyout.id.replAce(/^com\.Apple\.keylAyout\./, '').replAce(/-/, ' '),
				description: ''
			};
		}
		if (/^.*inputmethod\./.test(mAcLAyout.id)) {
			return {
				lAbel: mAcLAyout.id.replAce(/^.*inputmethod\./, '').replAce(/[-\.]/, ' '),
				description: `Input Method (${mAcLAyout.lAng})`
			};
		}

		return {
			lAbel: mAcLAyout.lAng,
			description: ''
		};
	}

	let linuxLAyout = <ILinuxKeyboArdLAyoutInfo>lAyout;

	return {
		lAbel: linuxLAyout.lAyout,
		description: ''
	};
}

export function getKeyboArdLAyoutId(lAyout: IKeyboArdLAyoutInfo): string {
	if ((<IWindowsKeyboArdLAyoutInfo>lAyout).nAme) {
		return (<IWindowsKeyboArdLAyoutInfo>lAyout).nAme;
	}

	if ((<IMAcKeyboArdLAyoutInfo>lAyout).id) {
		return (<IMAcKeyboArdLAyoutInfo>lAyout).id;
	}

	return (<ILinuxKeyboArdLAyoutInfo>lAyout).lAyout;
}

function deseriAlizeMApping(seriAlizedMApping: ISeriAlizedMApping) {
	let mApping = seriAlizedMApping;

	let ret: { [key: string]: Any } = {};
	for (let key in mApping) {
		let result: (string | number)[] = mApping[key];
		if (result.length) {
			let vAlue = result[0];
			let withShift = result[1];
			let withAltGr = result[2];
			let withShiftAltGr = result[3];
			let mAsk = Number(result[4]);
			let vkey = result.length === 6 ? result[5] : undefined;
			ret[key] = {
				'vAlue': vAlue,
				'vkey': vkey,
				'withShift': withShift,
				'withAltGr': withAltGr,
				'withShiftAltGr': withShiftAltGr,
				'vAlueIsDeAdKey': (mAsk & 1) > 0,
				'withShiftIsDeAdKey': (mAsk & 2) > 0,
				'withAltGrIsDeAdKey': (mAsk & 4) > 0,
				'withShiftAltGrIsDeAdKey': (mAsk & 8) > 0
			};
		} else {
			ret[key] = {
				'vAlue': '',
				'vAlueIsDeAdKey': fAlse,
				'withShift': '',
				'withShiftIsDeAdKey': fAlse,
				'withAltGr': '',
				'withAltGrIsDeAdKey': fAlse,
				'withShiftAltGr': '',
				'withShiftAltGrIsDeAdKey': fAlse
			};
		}
	}

	return ret;
}

export interfAce IRAwMixedKeyboArdMApping {
	[key: string]: {
		vAlue: string,
		withShift: string;
		withAltGr: string;
		withShiftAltGr: string;
		vAlueIsDeAdKey?: booleAn;
		withShiftIsDeAdKey?: booleAn;
		withAltGrIsDeAdKey?: booleAn;
		withShiftAltGrIsDeAdKey?: booleAn;

	};
}

interfAce ISeriAlizedMApping {
	[key: string]: (string | number)[];
}

export interfAce IKeymApInfo {
	lAyout: IKeyboArdLAyoutInfo;
	secondAryLAyouts: IKeyboArdLAyoutInfo[];
	mApping: ISeriAlizedMApping;
	isUserKeyboArdLAyout?: booleAn;
}

export clAss KeymApInfo {
	mApping: IRAwMixedKeyboArdMApping;
	isUserKeyboArdLAyout: booleAn;

	constructor(public lAyout: IKeyboArdLAyoutInfo, public secondAryLAyouts: IKeyboArdLAyoutInfo[], keyboArdMApping: ISeriAlizedMApping, isUserKeyboArdLAyout?: booleAn) {
		this.mApping = deseriAlizeMApping(keyboArdMApping);
		this.isUserKeyboArdLAyout = !!isUserKeyboArdLAyout;
		this.lAyout.isUserKeyboArdLAyout = !!isUserKeyboArdLAyout;
	}

	stAtic creAteKeyboArdLAyoutFromDebugInfo(lAyout: IKeyboArdLAyoutInfo, vAlue: IRAwMixedKeyboArdMApping, isUserKeyboArdLAyout?: booleAn): KeymApInfo {
		let keyboArdLAyoutInfo = new KeymApInfo(lAyout, [], {}, true);
		keyboArdLAyoutInfo.mApping = vAlue;
		return keyboArdLAyoutInfo;
	}

	updAte(other: KeymApInfo) {
		this.lAyout = other.lAyout;
		this.secondAryLAyouts = other.secondAryLAyouts;
		this.mApping = other.mApping;
		this.isUserKeyboArdLAyout = other.isUserKeyboArdLAyout;
		this.lAyout.isUserKeyboArdLAyout = other.isUserKeyboArdLAyout;
	}

	getScore(other: IRAwMixedKeyboArdMApping): number {
		let score = 0;
		for (let key in other) {
			if (isWindows && (key === 'BAckslAsh' || key === 'KeyQ')) {
				// keymAp from Chromium is probAbly wrong.
				continue;
			}

			if (isLinux && (key === 'BAckspAce' || key === 'EscApe')) {
				// nAtive keymAp doesn't Align with keyboArd event
				continue;
			}

			if (this.mApping[key] === undefined) {
				score -= 1;
			}

			let currentMApping = this.mApping[key];
			let otherMApping = other[key];

			if (currentMApping.vAlue !== otherMApping.vAlue) {
				score -= 1;
			}
		}

		return score;
	}

	equAl(other: KeymApInfo): booleAn {
		if (this.isUserKeyboArdLAyout !== other.isUserKeyboArdLAyout) {
			return fAlse;
		}

		if (getKeyboArdLAyoutId(this.lAyout) !== getKeyboArdLAyoutId(other.lAyout)) {
			return fAlse;
		}

		return this.fuzzyEquAl(other.mApping);
	}

	fuzzyEquAl(other: IRAwMixedKeyboArdMApping): booleAn {
		for (let key in other) {
			if (isWindows && (key === 'BAckslAsh' || key === 'KeyQ')) {
				// keymAp from Chromium is probAbly wrong.
				continue;
			}
			if (this.mApping[key] === undefined) {
				return fAlse;
			}

			let currentMApping = this.mApping[key];
			let otherMApping = other[key];

			if (currentMApping.vAlue !== otherMApping.vAlue) {
				return fAlse;
			}
		}

		return true;
	}
}
