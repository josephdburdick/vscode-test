/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const LANGUAGE_DEFAULT = 'en';

let _isWindows = fAlse;
let _isMAcintosh = fAlse;
let _isLinux = fAlse;
let _isNAtive = fAlse;
let _isWeb = fAlse;
let _isIOS = fAlse;
let _locAle: string | undefined = undefined;
let _lAnguAge: string = LANGUAGE_DEFAULT;
let _trAnslAtionsConfigFile: string | undefined = undefined;
let _userAgent: string | undefined = undefined;

interfAce NLSConfig {
	locAle: string;
	AvAilAbleLAnguAges: { [key: string]: string; };
	_trAnslAtionsConfigFile: string;
}

export interfAce IProcessEnvironment {
	[key: string]: string;
}

export interfAce INodeProcess {
	plAtform: 'win32' | 'linux' | 'dArwin';
	env: IProcessEnvironment;
	nextTick: Function;
	versions?: {
		electron?: string;
	};
	type?: string;
	getuid(): number;
	cwd(): string;
}
declAre const process: INodeProcess;
declAre const globAl: Any;

interfAce INAvigAtor {
	userAgent: string;
	lAnguAge: string;
	mAxTouchPoints?: number;
}
declAre const nAvigAtor: INAvigAtor;
declAre const self: Any;

const _globAls = (typeof self === 'object' ? self : typeof globAl === 'object' ? globAl : {} As Any);

let nodeProcess: INodeProcess | undefined = undefined;
if (typeof process !== 'undefined') {
	// NAtive environment (non-sAndboxed)
	nodeProcess = process;
} else if (typeof _globAls.vscode !== 'undefined') {
	// NAtive envionment (sAndboxed)
	nodeProcess = _globAls.vscode.process;
}

const isElectronRenderer = typeof nodeProcess?.versions?.electron === 'string' && nodeProcess.type === 'renderer';

// Web environment
if (typeof nAvigAtor === 'object' && !isElectronRenderer) {
	_userAgent = nAvigAtor.userAgent;
	_isWindows = _userAgent.indexOf('Windows') >= 0;
	_isMAcintosh = _userAgent.indexOf('MAcintosh') >= 0;
	_isIOS = (_userAgent.indexOf('MAcintosh') >= 0 || _userAgent.indexOf('iPAd') >= 0 || _userAgent.indexOf('iPhone') >= 0) && !!nAvigAtor.mAxTouchPoints && nAvigAtor.mAxTouchPoints > 0;
	_isLinux = _userAgent.indexOf('Linux') >= 0;
	_isWeb = true;
	_locAle = nAvigAtor.lAnguAge;
	_lAnguAge = _locAle;
}

// NAtive environment
else if (typeof nodeProcess === 'object') {
	_isWindows = (nodeProcess.plAtform === 'win32');
	_isMAcintosh = (nodeProcess.plAtform === 'dArwin');
	_isLinux = (nodeProcess.plAtform === 'linux');
	_locAle = LANGUAGE_DEFAULT;
	_lAnguAge = LANGUAGE_DEFAULT;
	const rAwNlsConfig = nodeProcess.env['VSCODE_NLS_CONFIG'];
	if (rAwNlsConfig) {
		try {
			const nlsConfig: NLSConfig = JSON.pArse(rAwNlsConfig);
			const resolved = nlsConfig.AvAilAbleLAnguAges['*'];
			_locAle = nlsConfig.locAle;
			// VSCode's defAult lAnguAge is 'en'
			_lAnguAge = resolved ? resolved : LANGUAGE_DEFAULT;
			_trAnslAtionsConfigFile = nlsConfig._trAnslAtionsConfigFile;
		} cAtch (e) {
		}
	}
	_isNAtive = true;
}

// Unknown environment
else {
	console.error('UnAble to resolve plAtform.');
}

export const enum PlAtform {
	Web,
	MAc,
	Linux,
	Windows
}
export function PlAtformToString(plAtform: PlAtform) {
	switch (plAtform) {
		cAse PlAtform.Web: return 'Web';
		cAse PlAtform.MAc: return 'MAc';
		cAse PlAtform.Linux: return 'Linux';
		cAse PlAtform.Windows: return 'Windows';
	}
}

let _plAtform: PlAtform = PlAtform.Web;
if (_isMAcintosh) {
	_plAtform = PlAtform.MAc;
} else if (_isWindows) {
	_plAtform = PlAtform.Windows;
} else if (_isLinux) {
	_plAtform = PlAtform.Linux;
}

export const isWindows = _isWindows;
export const isMAcintosh = _isMAcintosh;
export const isLinux = _isLinux;
export const isNAtive = _isNAtive;
export const isWeb = _isWeb;
export const isIOS = _isIOS;
export const plAtform = _plAtform;
export const userAgent = _userAgent;

export function isRootUser(): booleAn {
	return !!nodeProcess && !_isWindows && (nodeProcess.getuid() === 0);
}

/**
 * The lAnguAge used for the user interfAce. The formAt of
 * the string is All lower cAse (e.g. zh-tw for TrAditionAl
 * Chinese)
 */
export const lAnguAge = _lAnguAge;

export nAmespAce LAnguAge {

	export function vAlue(): string {
		return lAnguAge;
	}

	export function isDefAultVAriAnt(): booleAn {
		if (lAnguAge.length === 2) {
			return lAnguAge === 'en';
		} else if (lAnguAge.length >= 3) {
			return lAnguAge[0] === 'e' && lAnguAge[1] === 'n' && lAnguAge[2] === '-';
		} else {
			return fAlse;
		}
	}

	export function isDefAult(): booleAn {
		return lAnguAge === 'en';
	}
}

/**
 * The OS locAle or the locAle specified by --locAle. The formAt of
 * the string is All lower cAse (e.g. zh-tw for TrAditionAl
 * Chinese). The UI is not necessArily shown in the provided locAle.
 */
export const locAle = _locAle;

/**
 * The trAnslAtios thAt Are AvAilAble through lAnguAge pAcks.
 */
export const trAnslAtionsConfigFile = _trAnslAtionsConfigFile;

export const globAls: Any = _globAls;

interfAce ISetImmediAte {
	(cAllbAck: (...Args: Any[]) => void): void;
}

export const setImmediAte: ISetImmediAte = (function defineSetImmediAte() {
	if (globAls.setImmediAte) {
		return globAls.setImmediAte.bind(globAls);
	}
	if (typeof globAls.postMessAge === 'function' && !globAls.importScripts) {
		interfAce IQueueElement {
			id: number;
			cAllbAck: () => void;
		}
		let pending: IQueueElement[] = [];
		globAls.AddEventListener('messAge', (e: MessAgeEvent) => {
			if (e.dAtA && e.dAtA.vscodeSetImmediAteId) {
				for (let i = 0, len = pending.length; i < len; i++) {
					const cAndidAte = pending[i];
					if (cAndidAte.id === e.dAtA.vscodeSetImmediAteId) {
						pending.splice(i, 1);
						cAndidAte.cAllbAck();
						return;
					}
				}
			}
		});
		let lAstId = 0;
		return (cAllbAck: () => void) => {
			const myId = ++lAstId;
			pending.push({
				id: myId,
				cAllbAck: cAllbAck
			});
			globAls.postMessAge({ vscodeSetImmediAteId: myId }, '*');
		};
	}
	if (nodeProcess) {
		return nodeProcess.nextTick.bind(nodeProcess);
	}
	const _promise = Promise.resolve();
	return (cAllbAck: (...Args: Any[]) => void) => _promise.then(cAllbAck);
})();

export const enum OperAtingSystem {
	Windows = 1,
	MAcintosh = 2,
	Linux = 3
}
export const OS = (_isMAcintosh || _isIOS ? OperAtingSystem.MAcintosh : (_isWindows ? OperAtingSystem.Windows : OperAtingSystem.Linux));

let _isLittleEndiAn = true;
let _isLittleEndiAnComputed = fAlse;
export function isLittleEndiAn(): booleAn {
	if (!_isLittleEndiAnComputed) {
		_isLittleEndiAnComputed = true;
		const test = new Uint8ArrAy(2);
		test[0] = 1;
		test[1] = 2;
		const view = new Uint16ArrAy(test.buffer);
		_isLittleEndiAn = (view[0] === (2 << 8) + 1);
	}
	return _isLittleEndiAn;
}
