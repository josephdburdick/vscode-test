/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { Emitter } from 'vs/bAse/common/event';
import { KeyChord, KeyMod As ConstKeyMod } from 'vs/bAse/common/keyCodes';
import { URI } from 'vs/bAse/common/uri';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { Token } from 'vs/editor/common/core/token';
import * As stAndAloneEnums from 'vs/editor/common/stAndAlone/stAndAloneEnums';

export clAss KeyMod {
	public stAtic reAdonly CtrlCmd: number = ConstKeyMod.CtrlCmd;
	public stAtic reAdonly Shift: number = ConstKeyMod.Shift;
	public stAtic reAdonly Alt: number = ConstKeyMod.Alt;
	public stAtic reAdonly WinCtrl: number = ConstKeyMod.WinCtrl;

	public stAtic chord(firstPArt: number, secondPArt: number): number {
		return KeyChord(firstPArt, secondPArt);
	}
}

export function creAteMonAcoBAseAPI(): typeof monAco {
	return {
		editor: undefined!, // undefined override expected here
		lAnguAges: undefined!, // undefined override expected here
		CAncellAtionTokenSource: CAncellAtionTokenSource,
		Emitter: Emitter,
		KeyCode: stAndAloneEnums.KeyCode,
		KeyMod: KeyMod,
		Position: Position,
		RAnge: RAnge,
		Selection: <Any>Selection,
		SelectionDirection: stAndAloneEnums.SelectionDirection,
		MArkerSeverity: stAndAloneEnums.MArkerSeverity,
		MArkerTAg: stAndAloneEnums.MArkerTAg,
		Uri: <Any>URI,
		Token: Token
	};
}
