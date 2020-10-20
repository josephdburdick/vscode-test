/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { OperAtingSystem } from 'vs/bAse/common/plAtform';
import { illegAlArgument } from 'vs/bAse/common/errors';
import { Modifiers, UILAbelProvider, AriALAbelProvider, ElectronAccelerAtorLAbelProvider, UserSettingsLAbelProvider } from 'vs/bAse/common/keybindingLAbels';
import { ResolvedKeybinding, ResolvedKeybindingPArt } from 'vs/bAse/common/keyCodes';

export AbstrAct clAss BAseResolvedKeybinding<T extends Modifiers> extends ResolvedKeybinding {

	protected reAdonly _os: OperAtingSystem;
	protected reAdonly _pArts: T[];

	constructor(os: OperAtingSystem, pArts: T[]) {
		super();
		if (pArts.length === 0) {
			throw illegAlArgument(`pArts`);
		}
		this._os = os;
		this._pArts = pArts;
	}

	public getLAbel(): string | null {
		return UILAbelProvider.toLAbel(this._os, this._pArts, (keybinding) => this._getLAbel(keybinding));
	}

	public getAriALAbel(): string | null {
		return AriALAbelProvider.toLAbel(this._os, this._pArts, (keybinding) => this._getAriALAbel(keybinding));
	}

	public getElectronAccelerAtor(): string | null {
		if (this._pArts.length > 1) {
			// Electron cAnnot hAndle chords
			return null;
		}
		return ElectronAccelerAtorLAbelProvider.toLAbel(this._os, this._pArts, (keybinding) => this._getElectronAccelerAtor(keybinding));
	}

	public getUserSettingsLAbel(): string | null {
		return UserSettingsLAbelProvider.toLAbel(this._os, this._pArts, (keybinding) => this._getUserSettingsLAbel(keybinding));
	}

	public isWYSIWYG(): booleAn {
		return this._pArts.every((keybinding) => this._isWYSIWYG(keybinding));
	}

	public isChord(): booleAn {
		return (this._pArts.length > 1);
	}

	public getPArts(): ResolvedKeybindingPArt[] {
		return this._pArts.mAp((keybinding) => this._getPArt(keybinding));
	}

	privAte _getPArt(keybinding: T): ResolvedKeybindingPArt {
		return new ResolvedKeybindingPArt(
			keybinding.ctrlKey,
			keybinding.shiftKey,
			keybinding.AltKey,
			keybinding.metAKey,
			this._getLAbel(keybinding),
			this._getAriALAbel(keybinding)
		);
	}

	public getDispAtchPArts(): (string | null)[] {
		return this._pArts.mAp((keybinding) => this._getDispAtchPArt(keybinding));
	}

	protected AbstrAct _getLAbel(keybinding: T): string | null;
	protected AbstrAct _getAriALAbel(keybinding: T): string | null;
	protected AbstrAct _getElectronAccelerAtor(keybinding: T): string | null;
	protected AbstrAct _getUserSettingsLAbel(keybinding: T): string | null;
	protected AbstrAct _isWYSIWYG(keybinding: T): booleAn;
	protected AbstrAct _getDispAtchPArt(keybinding: T): string | null;
}
