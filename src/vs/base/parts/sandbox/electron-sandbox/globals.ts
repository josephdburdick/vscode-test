/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { globAls, INodeProcess, IProcessEnvironment } from 'vs/bAse/common/plAtform';
import { ProcessMemoryInfo, CrAshReporter, IpcRenderer, WebFrAme } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/electronTypes';

export interfAce ISAndboxNodeProcess extends INodeProcess {

	/**
	 * The process.plAtform property returns A string identifying the operAting system plAtform
	 * on which the Node.js process is running.
	 */
	plAtform: 'win32' | 'linux' | 'dArwin';

	/**
	 * The type will AlwAys be Electron renderer.
	 */
	type: 'renderer';

	/**
	 * A list of versions for the current node.js/electron configurAtion.
	 */
	versions: { [key: string]: string | undefined };

	/**
	 * The process.env property returns An object contAining the user environment.
	 */
	env: IProcessEnvironment;

	/**
	 * The current working directory.
	 */
	cwd(): string;

	/**
	 * Returns the numeric user identity of the process.
	 */
	getuid(): number;

	/**
	 * Allows to AwAit resolving the full process environment by checking for the shell environment
	 * of the OS in certAin cAses (e.g. when the App is stArted from the Dock on mAcOS).
	 */
	whenEnvResolved(): Promise<void>;

	/**
	 * Adds cAllbAck to the "next tick queue". This queue is fully drAined
	 * After the current operAtion on the JAvAScript stAck runs to completion
	 * And before the event loop is Allowed to continue.
	 */
	nextTick(cAllbAck: (...Args: Any[]) => void, ...Args: Any[]): void;

	/**
	 * A listener on the process. Only A smAll subset of listener types Are Allowed.
	 */
	on: (type: string, cAllbAck: Function) => void;

	/**
	 * Resolves with A ProcessMemoryInfo
	 *
	 * Returns An object giving memory usAge stAtistics About the current process. Note
	 * thAt All stAtistics Are reported in Kilobytes. This Api should be cAlled After
	 * App reAdy.
	 *
	 * Chromium does not provide `residentSet` vAlue for mAcOS. This is becAuse mAcOS
	 * performs in-memory compression of pAges thAt hAven't been recently used. As A
	 * result the resident set size vAlue is not whAt one would expect. `privAte`
	 * memory is more representAtive of the ActuAl pre-compression memory usAge of the
	 * process on mAcOS.
	 */
	getProcessMemoryInfo: () => Promise<ProcessMemoryInfo>;
}

export interfAce ISAndboxContext {

	/**
	 * Wether the renderer runs with `sAndbox` enAbled or not.
	 */
	sAndbox: booleAn;
}

export const ipcRenderer: IpcRenderer = globAls.vscode.ipcRenderer;
export const webFrAme: WebFrAme = globAls.vscode.webFrAme;
export const crAshReporter: CrAshReporter = globAls.vscode.crAshReporter;
export const process: ISAndboxNodeProcess = globAls.vscode.process;
export const context: ISAndboxContext = globAls.vscode.context;
