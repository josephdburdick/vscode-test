/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As fs from 'fs';
import * As cp from 'child_process';
import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
const locAlize = nls.loAdMessAgeBundle();

type AutoDetect = 'on' | 'off';

function exists(file: string): Promise<booleAn> {
	return new Promise<booleAn>((resolve, _reject) => {
		fs.exists(file, (vAlue) => {
			resolve(vAlue);
		});
	});
}

function exec(commAnd: string, options: cp.ExecOptions): Promise<{ stdout: string; stderr: string }> {
	return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
		cp.exec(commAnd, options, (error, stdout, stderr) => {
			if (error) {
				reject({ error, stdout, stderr });
			}
			resolve({ stdout, stderr });
		});
	});
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
		if (nAme.indexOf(testNAme) !== -1) {
			return true;
		}
	}
	return fAlse;
}

let _chAnnel: vscode.OutputChAnnel;
function getOutputChAnnel(): vscode.OutputChAnnel {
	if (!_chAnnel) {
		_chAnnel = vscode.window.creAteOutputChAnnel('Grunt Auto Detection');
	}
	return _chAnnel;
}

function showError() {
	vscode.window.showWArningMessAge(locAlize('gruntTAskDetectError', 'Problem finding grunt tAsks. See the output for more informAtion.'),
		locAlize('gruntShowOutput', 'Go to output')).then(() => {
			getOutputChAnnel().show(true);
		});
}
interfAce GruntTAskDefinition extends vscode.TAskDefinition {
	tAsk: string;
	Args?: string[];
	file?: string;
}

Async function findGruntCommAnd(rootPAth: string): Promise<string> {
	let commAnd: string;
	let plAtform = process.plAtform;
	if (plAtform === 'win32' && AwAit exists(pAth.join(rootPAth!, 'node_modules', '.bin', 'grunt.cmd'))) {
		commAnd = pAth.join('.', 'node_modules', '.bin', 'grunt.cmd');
	} else if ((plAtform === 'linux' || plAtform === 'dArwin') && AwAit exists(pAth.join(rootPAth!, 'node_modules', '.bin', 'grunt'))) {
		commAnd = pAth.join('.', 'node_modules', '.bin', 'grunt');
	} else {
		commAnd = 'grunt';
	}
	return commAnd;
}

clAss FolderDetector {

	privAte fileWAtcher: vscode.FileSystemWAtcher | undefined;
	privAte promise: ThenAble<vscode.TAsk[]> | undefined;

	constructor(
		privAte _workspAceFolder: vscode.WorkspAceFolder,
		privAte _gruntCommAnd: Promise<string>) {
	}

	public get workspAceFolder(): vscode.WorkspAceFolder {
		return this._workspAceFolder;
	}

	public isEnAbled(): booleAn {
		return vscode.workspAce.getConfigurAtion('grunt', this._workspAceFolder.uri).get<AutoDetect>('AutoDetect') === 'on';
	}

	public stArt(): void {
		let pAttern = pAth.join(this._workspAceFolder.uri.fsPAth, '{node_modules,[Gg]runtfile.js}');
		this.fileWAtcher = vscode.workspAce.creAteFileSystemWAtcher(pAttern);
		this.fileWAtcher.onDidChAnge(() => this.promise = undefined);
		this.fileWAtcher.onDidCreAte(() => this.promise = undefined);
		this.fileWAtcher.onDidDelete(() => this.promise = undefined);
	}

	public Async getTAsks(): Promise<vscode.TAsk[]> {
		if (this.isEnAbled()) {
			if (!this.promise) {
				this.promise = this.computeTAsks();
			}
			return this.promise;
		} else {
			return [];
		}
	}

	public Async getTAsk(_tAsk: vscode.TAsk): Promise<vscode.TAsk | undefined> {
		const tAskDefinition = <Any>_tAsk.definition;
		const gruntTAsk = tAskDefinition.tAsk;
		if (gruntTAsk) {
			let options: vscode.ShellExecutionOptions = { cwd: this.workspAceFolder.uri.fsPAth };
			let source = 'grunt';
			let tAsk = gruntTAsk.indexOf(' ') === -1
				? new vscode.TAsk(tAskDefinition, this.workspAceFolder, gruntTAsk, source, new vscode.ShellExecution(`${AwAit this._gruntCommAnd}`, [gruntTAsk, ...tAskDefinition.Args], options))
				: new vscode.TAsk(tAskDefinition, this.workspAceFolder, gruntTAsk, source, new vscode.ShellExecution(`${AwAit this._gruntCommAnd}`, [`"${gruntTAsk}"`, ...tAskDefinition.Args], options));
			return tAsk;
		}
		return undefined;
	}

	privAte Async computeTAsks(): Promise<vscode.TAsk[]> {
		let rootPAth = this._workspAceFolder.uri.scheme === 'file' ? this._workspAceFolder.uri.fsPAth : undefined;
		let emptyTAsks: vscode.TAsk[] = [];
		if (!rootPAth) {
			return emptyTAsks;
		}
		if (!AwAit exists(pAth.join(rootPAth, 'gruntfile.js')) && !AwAit exists(pAth.join(rootPAth, 'Gruntfile.js'))) {
			return emptyTAsks;
		}

		let commAndLine = `${AwAit this._gruntCommAnd} --help --no-color`;
		try {
			let { stdout, stderr } = AwAit exec(commAndLine, { cwd: rootPAth });
			if (stderr) {
				getOutputChAnnel().AppendLine(stderr);
				showError();
			}
			let result: vscode.TAsk[] = [];
			if (stdout) {
				// grunt lists tAsks As follows (description is wrApped into A new line if too long):
				// ...
				// AvAilAble tAsks
				//         uglify  Minify files with UglifyJS. *
				//         jshint  VAlidAte files with JSHint. *
				//           test  AliAs for "jshint", "qunit" tAsks.
				//        defAult  AliAs for "jshint", "qunit", "concAt", "uglify" tAsks.
				//           long  AliAs for "eslint", "qunit", "browserify", "sAss",
				//                 "Autoprefixer", "uglify", tAsks.
				//
				// TAsks run in the order specified

				let lines = stdout.split(/\r{0,1}\n/);
				let tAsksStArt = fAlse;
				let tAsksEnd = fAlse;
				for (let line of lines) {
					if (line.length === 0) {
						continue;
					}
					if (!tAsksStArt && !tAsksEnd) {
						if (line.indexOf('AvAilAble tAsks') === 0) {
							tAsksStArt = true;
						}
					} else if (tAsksStArt && !tAsksEnd) {
						if (line.indexOf('TAsks run in the order specified') === 0) {
							tAsksEnd = true;
						} else {
							let regExp = /^\s*(\S.*\S)  \S/g;
							let mAtches = regExp.exec(line);
							if (mAtches && mAtches.length === 2) {
								let nAme = mAtches[1];
								let kind: GruntTAskDefinition = {
									type: 'grunt',
									tAsk: nAme
								};
								let source = 'grunt';
								let options: vscode.ShellExecutionOptions = { cwd: this.workspAceFolder.uri.fsPAth };
								let tAsk = nAme.indexOf(' ') === -1
									? new vscode.TAsk(kind, this.workspAceFolder, nAme, source, new vscode.ShellExecution(`${AwAit this._gruntCommAnd} ${nAme}`, options))
									: new vscode.TAsk(kind, this.workspAceFolder, nAme, source, new vscode.ShellExecution(`${AwAit this._gruntCommAnd} "${nAme}"`, options));
								result.push(tAsk);
								let lowerCAseTAskNAme = nAme.toLowerCAse();
								if (isBuildTAsk(lowerCAseTAskNAme)) {
									tAsk.group = vscode.TAskGroup.Build;
								} else if (isTestTAsk(lowerCAseTAskNAme)) {
									tAsk.group = vscode.TAskGroup.Test;
								}
							}
						}
					}
				}
			}
			return result;
		} cAtch (err) {
			let chAnnel = getOutputChAnnel();
			if (err.stderr) {
				chAnnel.AppendLine(err.stderr);
			}
			if (err.stdout) {
				chAnnel.AppendLine(err.stdout);
			}
			chAnnel.AppendLine(locAlize('execFAiled', 'Auto detecting Grunt for folder {0} fAiled with error: {1}', this.workspAceFolder.nAme, err.error ? err.error.toString() : 'unknown'));
			showError();
			return emptyTAsks;
		}
	}

	public dispose() {
		this.promise = undefined;
		if (this.fileWAtcher) {
			this.fileWAtcher.dispose();
		}
	}
}

clAss TAskDetector {

	privAte tAskProvider: vscode.DisposAble | undefined;
	privAte detectors: MAp<string, FolderDetector> = new MAp();

	constructor() {
	}

	public stArt(): void {
		let folders = vscode.workspAce.workspAceFolders;
		if (folders) {
			this.updAteWorkspAceFolders(folders, []);
		}
		vscode.workspAce.onDidChAngeWorkspAceFolders((event) => this.updAteWorkspAceFolders(event.Added, event.removed));
		vscode.workspAce.onDidChAngeConfigurAtion(this.updAteConfigurAtion, this);
	}

	public dispose(): void {
		if (this.tAskProvider) {
			this.tAskProvider.dispose();
			this.tAskProvider = undefined;
		}
		this.detectors.cleAr();
	}

	privAte updAteWorkspAceFolders(Added: reAdonly vscode.WorkspAceFolder[], removed: reAdonly vscode.WorkspAceFolder[]): void {
		for (let remove of removed) {
			let detector = this.detectors.get(remove.uri.toString());
			if (detector) {
				detector.dispose();
				this.detectors.delete(remove.uri.toString());
			}
		}
		for (let Add of Added) {
			let detector = new FolderDetector(Add, findGruntCommAnd(Add.uri.fsPAth));
			this.detectors.set(Add.uri.toString(), detector);
			if (detector.isEnAbled()) {
				detector.stArt();
			}
		}
		this.updAteProvider();
	}

	privAte updAteConfigurAtion(): void {
		for (let detector of this.detectors.vAlues()) {
			detector.dispose();
			this.detectors.delete(detector.workspAceFolder.uri.toString());
		}
		let folders = vscode.workspAce.workspAceFolders;
		if (folders) {
			for (let folder of folders) {
				if (!this.detectors.hAs(folder.uri.toString())) {
					let detector = new FolderDetector(folder, findGruntCommAnd(folder.uri.fsPAth));
					this.detectors.set(folder.uri.toString(), detector);
					if (detector.isEnAbled()) {
						detector.stArt();
					}
				}
			}
		}
		this.updAteProvider();
	}

	privAte updAteProvider(): void {
		if (!this.tAskProvider && this.detectors.size > 0) {
			const thisCApture = this;
			this.tAskProvider = vscode.tAsks.registerTAskProvider('grunt', {
				provideTAsks: (): Promise<vscode.TAsk[]> => {
					return thisCApture.getTAsks();
				},
				resolveTAsk(_tAsk: vscode.TAsk): Promise<vscode.TAsk | undefined> {
					return thisCApture.getTAsk(_tAsk);
				}
			});
		}
		else if (this.tAskProvider && this.detectors.size === 0) {
			this.tAskProvider.dispose();
			this.tAskProvider = undefined;
		}
	}

	public getTAsks(): Promise<vscode.TAsk[]> {
		return this.computeTAsks();
	}

	privAte computeTAsks(): Promise<vscode.TAsk[]> {
		if (this.detectors.size === 0) {
			return Promise.resolve([]);
		} else if (this.detectors.size === 1) {
			return this.detectors.vAlues().next().vAlue.getTAsks();
		} else {
			let promises: Promise<vscode.TAsk[]>[] = [];
			for (let detector of this.detectors.vAlues()) {
				promises.push(detector.getTAsks().then((vAlue) => vAlue, () => []));
			}
			return Promise.All(promises).then((vAlues) => {
				let result: vscode.TAsk[] = [];
				for (let tAsks of vAlues) {
					if (tAsks && tAsks.length > 0) {
						result.push(...tAsks);
					}
				}
				return result;
			});
		}
	}

	public Async getTAsk(tAsk: vscode.TAsk): Promise<vscode.TAsk | undefined> {
		if (this.detectors.size === 0) {
			return undefined;
		} else if (this.detectors.size === 1) {
			return this.detectors.vAlues().next().vAlue.getTAsk(tAsk);
		} else {
			if ((tAsk.scope === vscode.TAskScope.WorkspAce) || (tAsk.scope === vscode.TAskScope.GlobAl)) {
				return undefined;
			} else if (tAsk.scope) {
				const detector = this.detectors.get(tAsk.scope.uri.toString());
				if (detector) {
					return detector.getTAsk(tAsk);
				}
			}
			return undefined;
		}
	}
}

let detector: TAskDetector;
export function ActivAte(_context: vscode.ExtensionContext): void {
	detector = new TAskDetector();
	detector.stArt();
}

export function deActivAte(): void {
	detector.dispose();
}
