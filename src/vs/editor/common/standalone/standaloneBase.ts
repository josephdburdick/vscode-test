/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { Emitter } from 'vs/Base/common/event';
import { KeyChord, KeyMod as ConstKeyMod } from 'vs/Base/common/keyCodes';
import { URI } from 'vs/Base/common/uri';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { Token } from 'vs/editor/common/core/token';
import * as standaloneEnums from 'vs/editor/common/standalone/standaloneEnums';

export class KeyMod {
	puBlic static readonly CtrlCmd: numBer = ConstKeyMod.CtrlCmd;
	puBlic static readonly Shift: numBer = ConstKeyMod.Shift;
	puBlic static readonly Alt: numBer = ConstKeyMod.Alt;
	puBlic static readonly WinCtrl: numBer = ConstKeyMod.WinCtrl;

	puBlic static chord(firstPart: numBer, secondPart: numBer): numBer {
		return KeyChord(firstPart, secondPart);
	}
}

export function createMonacoBaseAPI(): typeof monaco {
	return {
		editor: undefined!, // undefined override expected here
		languages: undefined!, // undefined override expected here
		CancellationTokenSource: CancellationTokenSource,
		Emitter: Emitter,
		KeyCode: standaloneEnums.KeyCode,
		KeyMod: KeyMod,
		Position: Position,
		Range: Range,
		Selection: <any>Selection,
		SelectionDirection: standaloneEnums.SelectionDirection,
		MarkerSeverity: standaloneEnums.MarkerSeverity,
		MarkerTag: standaloneEnums.MarkerTag,
		Uri: <any>URI,
		Token: Token
	};
}
