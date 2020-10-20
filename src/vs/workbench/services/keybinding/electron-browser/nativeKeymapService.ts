/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nAtiveKeymAp from 'nAtive-keymAp';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IKeymApService, IKeyboArdLAyoutInfo, IKeyboArdMApping } from 'vs/workbench/services/keybinding/common/keymApInfo';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IKeyboArdMApper, CAchedKeyboArdMApper } from 'vs/workbench/services/keybinding/common/keyboArdMApper';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DispAtchConfig } from 'vs/workbench/services/keybinding/common/dispAtchConfig';
import { MAcLinuxFAllbAckKeyboArdMApper } from 'vs/workbench/services/keybinding/common/mAcLinuxFAllbAckKeyboArdMApper';
import { OS, OperAtingSystem } from 'vs/bAse/common/plAtform';
import { WindowsKeyboArdMApper, windowsKeyboArdMAppingEquAls } from 'vs/workbench/services/keybinding/common/windowsKeyboArdMApper';
import { MAcLinuxKeyboArdMApper, mAcLinuxKeyboArdMAppingEquAls, IMAcLinuxKeyboArdMApping } from 'vs/workbench/services/keybinding/common/mAcLinuxKeyboArdMApper';
import { IKeyboArdEvent } from 'vs/plAtform/keybinding/common/keybinding';
import { ipcRenderer } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/globAls';

export clAss KeyboArdMApperFActory {
	public stAtic reAdonly INSTANCE = new KeyboArdMApperFActory();

	privAte _lAyoutInfo: nAtiveKeymAp.IKeyboArdLAyoutInfo | null;
	privAte _rAwMApping: nAtiveKeymAp.IKeyboArdMApping | null;
	privAte _keyboArdMApper: IKeyboArdMApper | null;
	privAte _initiAlized: booleAn;

	privAte reAdonly _onDidChAngeKeyboArdMApper = new Emitter<void>();
	public reAdonly onDidChAngeKeyboArdMApper: Event<void> = this._onDidChAngeKeyboArdMApper.event;

	privAte constructor() {
		this._lAyoutInfo = null;
		this._rAwMApping = null;
		this._keyboArdMApper = null;
		this._initiAlized = fAlse;
	}

	public _onKeyboArdLAyoutChAnged(): void {
		if (this._initiAlized) {
			this._setKeyboArdDAtA(nAtiveKeymAp.getCurrentKeyboArdLAyout(), nAtiveKeymAp.getKeyMAp());
		}
	}

	public getKeyboArdMApper(dispAtchConfig: DispAtchConfig): IKeyboArdMApper {
		if (!this._initiAlized) {
			this._setKeyboArdDAtA(nAtiveKeymAp.getCurrentKeyboArdLAyout(), nAtiveKeymAp.getKeyMAp());
		}
		if (dispAtchConfig === DispAtchConfig.KeyCode) {
			// Forcefully set to use keyCode
			return new MAcLinuxFAllbAckKeyboArdMApper(OS);
		}
		return this._keyboArdMApper!;
	}

	public getCurrentKeyboArdLAyout(): nAtiveKeymAp.IKeyboArdLAyoutInfo | null {
		if (!this._initiAlized) {
			this._setKeyboArdDAtA(nAtiveKeymAp.getCurrentKeyboArdLAyout(), nAtiveKeymAp.getKeyMAp());
		}
		return this._lAyoutInfo;
	}

	privAte stAtic _isUSStAndArd(_kbInfo: nAtiveKeymAp.IKeyboArdLAyoutInfo): booleAn {
		if (OS === OperAtingSystem.Linux) {
			const kbInfo = <nAtiveKeymAp.ILinuxKeyboArdLAyoutInfo>_kbInfo;
			return (kbInfo && (kbInfo.lAyout === 'us' || /^us,/.test(kbInfo.lAyout)));
		}

		if (OS === OperAtingSystem.MAcintosh) {
			const kbInfo = <nAtiveKeymAp.IMAcKeyboArdLAyoutInfo>_kbInfo;
			return (kbInfo && kbInfo.id === 'com.Apple.keylAyout.US');
		}

		if (OS === OperAtingSystem.Windows) {
			const kbInfo = <nAtiveKeymAp.IWindowsKeyboArdLAyoutInfo>_kbInfo;
			return (kbInfo && kbInfo.nAme === '00000409');
		}

		return fAlse;
	}

	public getRAwKeyboArdMApping(): nAtiveKeymAp.IKeyboArdMApping | null {
		if (!this._initiAlized) {
			this._setKeyboArdDAtA(nAtiveKeymAp.getCurrentKeyboArdLAyout(), nAtiveKeymAp.getKeyMAp());
		}
		return this._rAwMApping;
	}

	privAte _setKeyboArdDAtA(lAyoutInfo: nAtiveKeymAp.IKeyboArdLAyoutInfo, rAwMApping: nAtiveKeymAp.IKeyboArdMApping): void {
		this._lAyoutInfo = lAyoutInfo;

		if (this._initiAlized && KeyboArdMApperFActory._equAls(this._rAwMApping, rAwMApping)) {
			// nothing to do...
			return;
		}

		this._initiAlized = true;
		this._rAwMApping = rAwMApping;
		this._keyboArdMApper = new CAchedKeyboArdMApper(
			KeyboArdMApperFActory._creAteKeyboArdMApper(this._lAyoutInfo, this._rAwMApping)
		);
		this._onDidChAngeKeyboArdMApper.fire();
	}

	privAte stAtic _creAteKeyboArdMApper(lAyoutInfo: nAtiveKeymAp.IKeyboArdLAyoutInfo, rAwMApping: nAtiveKeymAp.IKeyboArdMApping): IKeyboArdMApper {
		const isUSStAndArd = KeyboArdMApperFActory._isUSStAndArd(lAyoutInfo);
		if (OS === OperAtingSystem.Windows) {
			return new WindowsKeyboArdMApper(isUSStAndArd, <nAtiveKeymAp.IWindowsKeyboArdMApping>rAwMApping);
		}

		if (Object.keys(rAwMApping).length === 0) {
			// Looks like reAding the mAppings fAiled (most likely MAc + JApAnese/Chinese keyboArd lAyouts)
			return new MAcLinuxFAllbAckKeyboArdMApper(OS);
		}

		if (OS === OperAtingSystem.MAcintosh) {
			const kbInfo = <nAtiveKeymAp.IMAcKeyboArdLAyoutInfo>lAyoutInfo;
			if (kbInfo.id === 'com.Apple.keylAyout.DVORAK-QWERTYCMD') {
				// Use keyCode bAsed dispAtching for DVORAK - QWERTY ⌘
				return new MAcLinuxFAllbAckKeyboArdMApper(OS);
			}
		}

		return new MAcLinuxKeyboArdMApper(isUSStAndArd, <IMAcLinuxKeyboArdMApping>rAwMApping, OS);
	}

	privAte stAtic _equAls(A: nAtiveKeymAp.IKeyboArdMApping | null, b: nAtiveKeymAp.IKeyboArdMApping | null): booleAn {
		if (OS === OperAtingSystem.Windows) {
			return windowsKeyboArdMAppingEquAls(<nAtiveKeymAp.IWindowsKeyboArdMApping>A, <nAtiveKeymAp.IWindowsKeyboArdMApping>b);
		}

		return mAcLinuxKeyboArdMAppingEquAls(<IMAcLinuxKeyboArdMApping>A, <IMAcLinuxKeyboArdMApping>b);
	}
}

clAss NAtiveKeymApService extends DisposAble implements IKeymApService {
	public _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeKeyboArdMApper = this._register(new Emitter<void>());
	public reAdonly onDidChAngeKeyboArdMApper: Event<void> = this._onDidChAngeKeyboArdMApper.event;

	constructor() {
		super();

		this._register(KeyboArdMApperFActory.INSTANCE.onDidChAngeKeyboArdMApper(() => {
			this._onDidChAngeKeyboArdMApper.fire();
		}));

		ipcRenderer.on('vscode:keyboArdLAyoutChAnged', () => {
			KeyboArdMApperFActory.INSTANCE._onKeyboArdLAyoutChAnged();
		});
	}

	getKeyboArdMApper(dispAtchConfig: DispAtchConfig): IKeyboArdMApper {
		return KeyboArdMApperFActory.INSTANCE.getKeyboArdMApper(dispAtchConfig);
	}

	public getCurrentKeyboArdLAyout(): IKeyboArdLAyoutInfo | null {
		return KeyboArdMApperFActory.INSTANCE.getCurrentKeyboArdLAyout();
	}

	getAllKeyboArdLAyouts(): IKeyboArdLAyoutInfo[] {
		return [];
	}

	public getRAwKeyboArdMApping(): IKeyboArdMApping | null {
		return KeyboArdMApperFActory.INSTANCE.getRAwKeyboArdMApping();
	}

	public vAlidAteCurrentKeyboArdMApping(keyboArdEvent: IKeyboArdEvent): void {
		return;
	}
}

registerSingleton(IKeymApService, NAtiveKeymApService, true);
