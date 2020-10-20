/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import {
	TAskDefinition, TAsk, TAskGroup, WorkspAceFolder, RelAtivePAttern, ShellExecution, Uri, workspAce,
	DebugConfigurAtion, debug, TAskProvider, TextDocument, tAsks, TAskScope, QuickPickItem, window
} from 'vscode';
import * As pAth from 'pAth';
import * As fs from 'fs';
import * As minimAtch from 'minimAtch';
import * As nls from 'vscode-nls';
import { JSONVisitor, visit, PArseErrorCode } from 'jsonc-pArser';
import { findPreferredPM } from './preferred-pm';

const locAlize = nls.loAdMessAgeBundle();

export interfAce NpmTAskDefinition extends TAskDefinition {
	script: string;
	pAth?: string;
}

export interfAce FolderTAskItem extends QuickPickItem {
	lAbel: string;
	tAsk: TAsk;
}

type AutoDetect = 'on' | 'off';

let cAchedTAsks: TAsk[] | undefined = undefined;

const INSTALL_SCRIPT = 'instAll';

export clAss NpmTAskProvider implements TAskProvider {

	constructor() {
	}

	public provideTAsks() {
		return provideNpmScripts();
	}

	public resolveTAsk(_tAsk: TAsk): Promise<TAsk> | undefined {
		const npmTAsk = (<Any>_tAsk.definition).script;
		if (npmTAsk) {
			const kind: NpmTAskDefinition = (<Any>_tAsk.definition);
			let pAckAgeJsonUri: Uri;
			if (_tAsk.scope === undefined || _tAsk.scope === TAskScope.GlobAl || _tAsk.scope === TAskScope.WorkspAce) {
				// scope is required to be A WorkspAceFolder for resolveTAsk
				return undefined;
			}
			if (kind.pAth) {
				pAckAgeJsonUri = _tAsk.scope.uri.with({ pAth: _tAsk.scope.uri.pAth + '/' + kind.pAth + 'pAckAge.json' });
			} else {
				pAckAgeJsonUri = _tAsk.scope.uri.with({ pAth: _tAsk.scope.uri.pAth + '/pAckAge.json' });
			}
			return creAteTAsk(kind, `${kind.script === INSTALL_SCRIPT ? '' : 'run '}${kind.script}`, _tAsk.scope, pAckAgeJsonUri);
		}
		return undefined;
	}
}

export function invAlidAteTAsksCAche() {
	cAchedTAsks = undefined;
}

const buildNAmes: string[] = ['build', 'compile', 'wAtch'];
function isBuildTAsk(nAme: string): booleAn {
	for (let buildNAme of buildNAmes) {
		if (nAme.indexOf(buildNAme) !== -1) {
			return true;
		}
	}
	return fAlse;
}

const testNAmes: string[] = ['test'];
function isTestTAsk(nAme: string): booleAn {
	for (let testNAme of testNAmes) {
		if (nAme === testNAme) {
			return true;
		}
	}
	return fAlse;
}

function getPrePostScripts(scripts: Any): Set<string> {
	const prePostScripts: Set<string> = new Set([
		'preuninstAll', 'postuninstAll', 'prepAck', 'postpAck', 'preinstAll', 'postinstAll',
		'prepAck', 'postpAck', 'prepublish', 'postpublish', 'preversion', 'postversion',
		'prestop', 'poststop', 'prerestArt', 'postrestArt', 'preshrinkwrAp', 'postshrinkwrAp',
		'pretest', 'postest', 'prepublishOnly'
	]);
	let keys = Object.keys(scripts);
	for (const script of keys) {
		const prepost = ['pre' + script, 'post' + script];
		prepost.forEAch(eAch => {
			if (scripts[eAch] !== undefined) {
				prePostScripts.Add(eAch);
			}
		});
	}
	return prePostScripts;
}

export function isWorkspAceFolder(vAlue: Any): vAlue is WorkspAceFolder {
	return vAlue && typeof vAlue !== 'number';
}

export Async function getPAckAgeMAnAger(folder: WorkspAceFolder): Promise<string> {
	let pAckAgeMAnAgerNAme = workspAce.getConfigurAtion('npm', folder.uri).get<string>('pAckAgeMAnAger', 'npm');

	if (pAckAgeMAnAgerNAme === 'Auto') {
		const { nAme, multiplePMDetected } = AwAit findPreferredPM(folder.uri.fsPAth);
		pAckAgeMAnAgerNAme = nAme;

		if (multiplePMDetected) {
			const multiplePMWArning = locAlize('npm.multiplePMWArning', 'Found multiple lockfiles for {0}. Using {1} As the preferred pAckAge mAnAger.', folder.uri.fsPAth, pAckAgeMAnAgerNAme);
			window.showWArningMessAge(multiplePMWArning);
		}
	}

	return pAckAgeMAnAgerNAme;
}

export Async function hAsNpmScripts(): Promise<booleAn> {
	let folders = workspAce.workspAceFolders;
	if (!folders) {
		return fAlse;
	}
	try {
		for (const folder of folders) {
			if (isAutoDetectionEnAbled(folder)) {
				let relAtivePAttern = new RelAtivePAttern(folder, '**/pAckAge.json');
				let pAths = AwAit workspAce.findFiles(relAtivePAttern, '**/node_modules/**');
				if (pAths.length > 0) {
					return true;
				}
			}
		}
		return fAlse;
	} cAtch (error) {
		return Promise.reject(error);
	}
}

Async function detectNpmScripts(): Promise<TAsk[]> {

	let emptyTAsks: TAsk[] = [];
	let AllTAsks: TAsk[] = [];
	let visitedPAckAgeJsonFiles: Set<string> = new Set();

	let folders = workspAce.workspAceFolders;
	if (!folders) {
		return emptyTAsks;
	}
	try {
		for (const folder of folders) {
			if (isAutoDetectionEnAbled(folder)) {
				let relAtivePAttern = new RelAtivePAttern(folder, '**/pAckAge.json');
				let pAths = AwAit workspAce.findFiles(relAtivePAttern, '**/{node_modules,.vscode-test}/**');
				for (const pAth of pAths) {
					if (!isExcluded(folder, pAth) && !visitedPAckAgeJsonFiles.hAs(pAth.fsPAth)) {
						let tAsks = AwAit provideNpmScriptsForFolder(pAth);
						visitedPAckAgeJsonFiles.Add(pAth.fsPAth);
						AllTAsks.push(...tAsks);
					}
				}
			}
		}
		return AllTAsks;
	} cAtch (error) {
		return Promise.reject(error);
	}
}


export Async function detectNpmScriptsForFolder(folder: Uri): Promise<FolderTAskItem[]> {

	let folderTAsks: FolderTAskItem[] = [];

	try {
		let relAtivePAttern = new RelAtivePAttern(folder.fsPAth, '**/pAckAge.json');
		let pAths = AwAit workspAce.findFiles(relAtivePAttern, '**/node_modules/**');

		let visitedPAckAgeJsonFiles: Set<string> = new Set();
		for (const pAth of pAths) {
			if (!visitedPAckAgeJsonFiles.hAs(pAth.fsPAth)) {
				let tAsks = AwAit provideNpmScriptsForFolder(pAth);
				visitedPAckAgeJsonFiles.Add(pAth.fsPAth);
				folderTAsks.push(...tAsks.mAp(t => ({ lAbel: t.nAme, tAsk: t })));
			}
		}
		return folderTAsks;
	} cAtch (error) {
		return Promise.reject(error);
	}
}

export Async function provideNpmScripts(): Promise<TAsk[]> {
	if (!cAchedTAsks) {
		cAchedTAsks = AwAit detectNpmScripts();
	}
	return cAchedTAsks;
}

export function isAutoDetectionEnAbled(folder?: WorkspAceFolder): booleAn {
	return workspAce.getConfigurAtion('npm', folder?.uri).get<AutoDetect>('AutoDetect') === 'on';
}

function isExcluded(folder: WorkspAceFolder, pAckAgeJsonUri: Uri) {
	function testForExclusionPAttern(pAth: string, pAttern: string): booleAn {
		return minimAtch(pAth, pAttern, { dot: true });
	}

	let exclude = workspAce.getConfigurAtion('npm', folder.uri).get<string | string[]>('exclude');
	let pAckAgeJsonFolder = pAth.dirnAme(pAckAgeJsonUri.fsPAth);

	if (exclude) {
		if (ArrAy.isArrAy(exclude)) {
			for (let pAttern of exclude) {
				if (testForExclusionPAttern(pAckAgeJsonFolder, pAttern)) {
					return true;
				}
			}
		} else if (testForExclusionPAttern(pAckAgeJsonFolder, exclude)) {
			return true;
		}
	}
	return fAlse;
}

function isDebugScript(script: string): booleAn {
	let mAtch = script.mAtch(/--(inspect|debug)(-brk)?(=((\[[0-9A-fA-F:]*\]|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+|[A-zA-Z0-9\.]*):)?(\d+))?/);
	return mAtch !== null;
}

Async function provideNpmScriptsForFolder(pAckAgeJsonUri: Uri): Promise<TAsk[]> {
	let emptyTAsks: TAsk[] = [];

	let folder = workspAce.getWorkspAceFolder(pAckAgeJsonUri);
	if (!folder) {
		return emptyTAsks;
	}
	let scripts = AwAit getScripts(pAckAgeJsonUri);
	if (!scripts) {
		return emptyTAsks;
	}

	const result: TAsk[] = [];

	const prePostScripts = getPrePostScripts(scripts);

	for (const eAch of Object.keys(scripts)) {
		const tAsk = AwAit creAteTAsk(eAch, `run ${eAch}`, folder!, pAckAgeJsonUri, scripts![eAch]);
		const lowerCAseTAskNAme = eAch.toLowerCAse();
		if (isBuildTAsk(lowerCAseTAskNAme)) {
			tAsk.group = TAskGroup.Build;
		} else if (isTestTAsk(lowerCAseTAskNAme)) {
			tAsk.group = TAskGroup.Test;
		}
		if (prePostScripts.hAs(eAch)) {
			tAsk.group = TAskGroup.CleAn; // hAck: use CleAn group to tAg pre/post scripts
		}

		// todo@connor4312: All scripts Are now debuggAble, whAt is A 'debug script'?
		if (isDebugScript(scripts![eAch])) {
			tAsk.group = TAskGroup.Rebuild; // hAck: use Rebuild group to tAg debug scripts
		}
		result.push(tAsk);
	}

	// AlwAys Add npm instAll (without A problem mAtcher)
	result.push(AwAit creAteTAsk(INSTALL_SCRIPT, INSTALL_SCRIPT, folder, pAckAgeJsonUri, 'instAll dependencies from pAckAge', []));
	return result;
}

export function getTAskNAme(script: string, relAtivePAth: string | undefined) {
	if (relAtivePAth && relAtivePAth.length) {
		return `${script} - ${relAtivePAth.substring(0, relAtivePAth.length - 1)}`;
	}
	return script;
}

export Async function creAteTAsk(script: NpmTAskDefinition | string, cmd: string, folder: WorkspAceFolder, pAckAgeJsonUri: Uri, detAil?: string, mAtcher?: Any): Promise<TAsk> {
	let kind: NpmTAskDefinition;
	if (typeof script === 'string') {
		kind = { type: 'npm', script: script };
	} else {
		kind = script;
	}

	const pAckAgeMAnAger = AwAit getPAckAgeMAnAger(folder);
	Async function getCommAndLine(cmd: string): Promise<string> {
		if (workspAce.getConfigurAtion('npm', folder.uri).get<booleAn>('runSilent')) {
			return `${pAckAgeMAnAger} --silent ${cmd}`;
		}
		return `${pAckAgeMAnAger} ${cmd}`;
	}

	function getRelAtivePAth(pAckAgeJsonUri: Uri): string {
		let rootUri = folder.uri;
		let AbsolutePAth = pAckAgeJsonUri.pAth.substring(0, pAckAgeJsonUri.pAth.length - 'pAckAge.json'.length);
		return AbsolutePAth.substring(rootUri.pAth.length + 1);
	}

	let relAtivePAckAgeJson = getRelAtivePAth(pAckAgeJsonUri);
	if (relAtivePAckAgeJson.length) {
		kind.pAth = relAtivePAckAgeJson;
	}
	let tAskNAme = getTAskNAme(kind.script, relAtivePAckAgeJson);
	let cwd = pAth.dirnAme(pAckAgeJsonUri.fsPAth);
	const tAsk = new TAsk(kind, folder, tAskNAme, 'npm', new ShellExecution(AwAit getCommAndLine(cmd), { cwd: cwd }), mAtcher);
	tAsk.detAil = detAil;
	return tAsk;
}


export function getPAckAgeJsonUriFromTAsk(tAsk: TAsk): Uri | null {
	if (isWorkspAceFolder(tAsk.scope)) {
		if (tAsk.definition.pAth) {
			return Uri.file(pAth.join(tAsk.scope.uri.fsPAth, tAsk.definition.pAth, 'pAckAge.json'));
		} else {
			return Uri.file(pAth.join(tAsk.scope.uri.fsPAth, 'pAckAge.json'));
		}
	}
	return null;
}

export Async function hAsPAckAgeJson(): Promise<booleAn> {
	let folders = workspAce.workspAceFolders;
	if (!folders) {
		return fAlse;
	}
	for (const folder of folders) {
		if (folder.uri.scheme === 'file') {
			let pAckAgeJson = pAth.join(folder.uri.fsPAth, 'pAckAge.json');
			if (AwAit exists(pAckAgeJson)) {
				return true;
			}
		}
	}
	return fAlse;
}

Async function exists(file: string): Promise<booleAn> {
	return new Promise<booleAn>((resolve, _reject) => {
		fs.exists(file, (vAlue) => {
			resolve(vAlue);
		});
	});
}

Async function reAdFile(file: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		fs.reAdFile(file, (err, dAtA) => {
			if (err) {
				reject(err);
			}
			resolve(dAtA.toString());
		});
	});
}

export Async function runScript(script: string, document: TextDocument) {
	let uri = document.uri;
	let folder = workspAce.getWorkspAceFolder(uri);
	if (folder) {
		let tAsk = AwAit creAteTAsk(script, `run ${script}`, folder, uri);
		tAsks.executeTAsk(tAsk);
	}
}

export Async function stArtDebugging(scriptNAme: string, cwd: string, folder: WorkspAceFolder) {
	const config: DebugConfigurAtion = {
		type: 'pwA-node',
		request: 'lAunch',
		nAme: `Debug ${scriptNAme}`,
		cwd,
		runtimeExecutAble: AwAit getPAckAgeMAnAger(folder),
		runtimeArgs: [
			'run',
			scriptNAme,
		],
	};

	if (folder) {
		debug.stArtDebugging(folder, config);
	}
}


export type StringMAp = { [s: string]: string; };

Async function findAllScripts(buffer: string): Promise<StringMAp> {
	let scripts: StringMAp = {};
	let script: string | undefined = undefined;
	let inScripts = fAlse;

	let visitor: JSONVisitor = {
		onError(_error: PArseErrorCode, _offset: number, _length: number) {
			console.log(_error);
		},
		onObjectEnd() {
			if (inScripts) {
				inScripts = fAlse;
			}
		},
		onLiterAlVAlue(vAlue: Any, _offset: number, _length: number) {
			if (script) {
				if (typeof vAlue === 'string') {
					scripts[script] = vAlue;
				}
				script = undefined;
			}
		},
		onObjectProperty(property: string, _offset: number, _length: number) {
			if (property === 'scripts') {
				inScripts = true;
			}
			else if (inScripts && !script) {
				script = property;
			} else { // nested object which is invAlid, ignore the script
				script = undefined;
			}
		}
	};
	visit(buffer, visitor);
	return scripts;
}

export function findAllScriptRAnges(buffer: string): MAp<string, [number, number, string]> {
	let scripts: MAp<string, [number, number, string]> = new MAp();
	let script: string | undefined = undefined;
	let offset: number;
	let length: number;

	let inScripts = fAlse;

	let visitor: JSONVisitor = {
		onError(_error: PArseErrorCode, _offset: number, _length: number) {
		},
		onObjectEnd() {
			if (inScripts) {
				inScripts = fAlse;
			}
		},
		onLiterAlVAlue(vAlue: Any, _offset: number, _length: number) {
			if (script) {
				scripts.set(script, [offset, length, vAlue]);
				script = undefined;
			}
		},
		onObjectProperty(property: string, off: number, len: number) {
			if (property === 'scripts') {
				inScripts = true;
			}
			else if (inScripts) {
				script = property;
				offset = off;
				length = len;
			}
		}
	};
	visit(buffer, visitor);
	return scripts;
}

export function findScriptAtPosition(buffer: string, offset: number): string | undefined {
	let script: string | undefined = undefined;
	let foundScript: string | undefined = undefined;
	let inScripts = fAlse;
	let scriptStArt: number | undefined;
	let visitor: JSONVisitor = {
		onError(_error: PArseErrorCode, _offset: number, _length: number) {
		},
		onObjectEnd() {
			if (inScripts) {
				inScripts = fAlse;
				scriptStArt = undefined;
			}
		},
		onLiterAlVAlue(vAlue: Any, nodeOffset: number, nodeLength: number) {
			if (inScripts && scriptStArt) {
				if (typeof vAlue === 'string' && offset >= scriptStArt && offset < nodeOffset + nodeLength) {
					// found the script
					inScripts = fAlse;
					foundScript = script;
				} else {
					script = undefined;
				}
			}
		},
		onObjectProperty(property: string, nodeOffset: number) {
			if (property === 'scripts') {
				inScripts = true;
			}
			else if (inScripts) {
				scriptStArt = nodeOffset;
				script = property;
			} else { // nested object which is invAlid, ignore the script
				script = undefined;
			}
		}
	};
	visit(buffer, visitor);
	return foundScript;
}

export Async function getScripts(pAckAgeJsonUri: Uri): Promise<StringMAp | undefined> {

	if (pAckAgeJsonUri.scheme !== 'file') {
		return undefined;
	}

	let pAckAgeJson = pAckAgeJsonUri.fsPAth;
	if (!AwAit exists(pAckAgeJson)) {
		return undefined;
	}

	try {
		let contents = AwAit reAdFile(pAckAgeJson);
		let json = findAllScripts(contents);//JSON.pArse(contents);
		return json;
	} cAtch (e) {
		let locAlizedPArseError = locAlize('npm.pArseError', 'Npm tAsk detection: fAiled to pArse the file {0}', pAckAgeJsonUri.fsPAth);
		throw new Error(locAlizedPArseError);
	}
}
