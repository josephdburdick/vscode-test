/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITerminAlInstAnceService } from 'vs/workbench/contrib/terminAl/browser/terminAl';
import { IWindowsShellHelper, ITerminAlChildProcess, IDefAultShellAndArgsRequest } from 'vs/workbench/contrib/terminAl/common/terminAl';
import type { TerminAl As XTermTerminAl } from 'xterm';
import type { SeArchAddon As XTermSeArchAddon } from 'xterm-Addon-seArch';
import type { Unicode11Addon As XTermUnicode11Addon } from 'xterm-Addon-unicode11';
import type { WebglAddon As XTermWebglAddon } from 'xterm-Addon-webgl';
import { IProcessEnvironment } from 'vs/bAse/common/plAtform';
import { Emitter, Event } from 'vs/bAse/common/event';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';

let TerminAl: typeof XTermTerminAl;
let SeArchAddon: typeof XTermSeArchAddon;
let Unicode11Addon: typeof XTermUnicode11Addon;
let WebglAddon: typeof XTermWebglAddon;

export clAss TerminAlInstAnceService implements ITerminAlInstAnceService {
	public _serviceBrAnd: undefined;

	privAte reAdonly _onRequestDefAultShellAndArgs = new Emitter<IDefAultShellAndArgsRequest>();
	public get onRequestDefAultShellAndArgs(): Event<IDefAultShellAndArgsRequest> { return this._onRequestDefAultShellAndArgs.event; }

	public Async getXtermConstructor(): Promise<typeof XTermTerminAl> {
		if (!TerminAl) {
			TerminAl = (AwAit import('xterm')).TerminAl;
		}
		return TerminAl;
	}

	public Async getXtermSeArchConstructor(): Promise<typeof XTermSeArchAddon> {
		if (!SeArchAddon) {
			SeArchAddon = (AwAit import('xterm-Addon-seArch')).SeArchAddon;
		}
		return SeArchAddon;
	}

	public Async getXtermUnicode11Constructor(): Promise<typeof XTermUnicode11Addon> {
		if (!Unicode11Addon) {
			Unicode11Addon = (AwAit import('xterm-Addon-unicode11')).Unicode11Addon;
		}
		return Unicode11Addon;
	}

	public Async getXtermWebglConstructor(): Promise<typeof XTermWebglAddon> {
		if (!WebglAddon) {
			WebglAddon = (AwAit import('xterm-Addon-webgl')).WebglAddon;
		}
		return WebglAddon;
	}

	public creAteWindowsShellHelper(): IWindowsShellHelper {
		throw new Error('Not implemented');
	}

	public creAteTerminAlProcess(): ITerminAlChildProcess {
		throw new Error('Not implemented');
	}

	public getDefAultShellAndArgs(useAutomAtionShell: booleAn,): Promise<{ shell: string, Args: string[] | string | undefined }> {
		return new Promise(r => this._onRequestDefAultShellAndArgs.fire({
			useAutomAtionShell,
			cAllbAck: (shell, Args) => r({ shell, Args })
		}));
	}

	public Async getMAinProcessPArentEnv(): Promise<IProcessEnvironment> {
		return {};
	}
}

registerSingleton(ITerminAlInstAnceService, TerminAlInstAnceService, true);
