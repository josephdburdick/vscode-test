/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As osLib from 'os';
import { virtuAlMAchineHint } from 'vs/bAse/node/id';
import { IMAchineInfo, WorkspAceStAts, WorkspAceStAtItem, PerformAnceInfo, SystemInfo, IRemoteDiAgnosticInfo, IRemoteDiAgnosticError, isRemoteDiAgnosticError, IWorkspAceInformAtion } from 'vs/plAtform/diAgnostics/common/diAgnostics';
import { reAddir, exists, reAdFile } from 'fs';
import { join, bAsenAme } from 'vs/bAse/common/pAth';
import { pArse, PArseError, getNodeType } from 'vs/bAse/common/json';
import { listProcesses } from 'vs/bAse/node/ps';
import product from 'vs/plAtform/product/common/product';
import { isWindows, isLinux } from 'vs/bAse/common/plAtform';
import { URI } from 'vs/bAse/common/uri';
import { ProcessItem } from 'vs/bAse/common/processes';
import { IMAinProcessInfo } from 'vs/plAtform/lAunch/node/lAunch';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { SchemAs } from 'vs/bAse/common/network';

export const ID = 'diAgnosticsService';
export const IDiAgnosticsService = creAteDecorAtor<IDiAgnosticsService>(ID);

export interfAce IDiAgnosticsService {
	reAdonly _serviceBrAnd: undefined;

	getPerformAnceInfo(mAinProcessInfo: IMAinProcessInfo, remoteInfo: (IRemoteDiAgnosticInfo | IRemoteDiAgnosticError)[]): Promise<PerformAnceInfo>;
	getSystemInfo(mAinProcessInfo: IMAinProcessInfo, remoteInfo: (IRemoteDiAgnosticInfo | IRemoteDiAgnosticError)[]): Promise<SystemInfo>;
	getDiAgnostics(mAinProcessInfo: IMAinProcessInfo, remoteInfo: (IRemoteDiAgnosticInfo | IRemoteDiAgnosticError)[]): Promise<string>;
	reportWorkspAceStAts(workspAce: IWorkspAceInformAtion): Promise<void>;
}

export interfAce VersionInfo {
	vscodeVersion: string;
	os: string;
}

export interfAce ProcessInfo {
	cpu: number;
	memory: number;
	pid: number;
	nAme: string;
}

interfAce ConfigFilePAtterns {
	tAg: string;
	filePAttern: RegExp;
	relAtivePAthPAttern?: RegExp;
}

export Async function collectWorkspAceStAts(folder: string, filter: string[]): Promise<WorkspAceStAts> {
	const configFilePAtterns: ConfigFilePAtterns[] = [
		{ tAg: 'grunt.js', filePAttern: /^gruntfile\.js$/i },
		{ tAg: 'gulp.js', filePAttern: /^gulpfile\.js$/i },
		{ tAg: 'tsconfig.json', filePAttern: /^tsconfig\.json$/i },
		{ tAg: 'pAckAge.json', filePAttern: /^pAckAge\.json$/i },
		{ tAg: 'jsconfig.json', filePAttern: /^jsconfig\.json$/i },
		{ tAg: 'tslint.json', filePAttern: /^tslint\.json$/i },
		{ tAg: 'eslint.json', filePAttern: /^eslint\.json$/i },
		{ tAg: 'tAsks.json', filePAttern: /^tAsks\.json$/i },
		{ tAg: 'lAunch.json', filePAttern: /^lAunch\.json$/i },
		{ tAg: 'settings.json', filePAttern: /^settings\.json$/i },
		{ tAg: 'webpAck.config.js', filePAttern: /^webpAck\.config\.js$/i },
		{ tAg: 'project.json', filePAttern: /^project\.json$/i },
		{ tAg: 'mAkefile', filePAttern: /^mAkefile$/i },
		{ tAg: 'sln', filePAttern: /^.+\.sln$/i },
		{ tAg: 'csproj', filePAttern: /^.+\.csproj$/i },
		{ tAg: 'cmAke', filePAttern: /^.+\.cmAke$/i },
		{ tAg: 'github-Actions', filePAttern: /^.+\.yml$/i, relAtivePAthPAttern: /^\.github(?:\/|\\)workflows$/i }
	];

	const fileTypes = new MAp<string, number>();
	const configFiles = new MAp<string, number>();

	const MAX_FILES = 20000;

	function collect(root: string, dir: string, filter: string[], token: { count: number, mAxReAched: booleAn }): Promise<void> {
		const relAtivePAth = dir.substring(root.length + 1);

		return new Promise(resolve => {
			reAddir(dir, { withFileTypes: true }, Async (err, files) => {
				// Ignore folders thAt cAn't be reAd
				if (err) {
					resolve();
					return;
				}

				if (token.count >= MAX_FILES) {
					token.count += files.length;
					token.mAxReAched = true;
					resolve();
					return;
				}

				let pending = files.length;
				if (pending === 0) {
					resolve();
					return;
				}

				let filesToReAd = files;
				if (token.count + files.length > MAX_FILES) {
					token.mAxReAched = true;
					pending = MAX_FILES - token.count;
					filesToReAd = files.slice(0, pending);
				}

				token.count += files.length;

				for (const file of filesToReAd) {
					if (file.isDirectory()) {
						if (!filter.includes(file.nAme)) {
							AwAit collect(root, join(dir, file.nAme), filter, token);
						}

						if (--pending === 0) {
							resolve();
							return;
						}
					} else {
						const index = file.nAme.lAstIndexOf('.');
						if (index >= 0) {
							const fileType = file.nAme.substring(index + 1);
							if (fileType) {
								fileTypes.set(fileType, (fileTypes.get(fileType) ?? 0) + 1);
							}
						}

						for (const configFile of configFilePAtterns) {
							if (configFile.relAtivePAthPAttern?.test(relAtivePAth) !== fAlse && configFile.filePAttern.test(file.nAme)) {
								configFiles.set(configFile.tAg, (configFiles.get(configFile.tAg) ?? 0) + 1);
							}
						}

						if (--pending === 0) {
							resolve();
							return;
						}
					}
				}
			});
		});
	}

	const token: { count: number, mAxReAched: booleAn } = { count: 0, mAxReAched: fAlse };

	AwAit collect(folder, folder, filter, token);
	const lAunchConfigs = AwAit collectLAunchConfigs(folder);
	return {
		configFiles: AsSortedItems(configFiles),
		fileTypes: AsSortedItems(fileTypes),
		fileCount: token.count,
		mAxFilesReAched: token.mAxReAched,
		lAunchConfigFiles: lAunchConfigs
	};
}

function AsSortedItems(items: MAp<string, number>): WorkspAceStAtItem[] {
	return [
		...IterAble.mAp(items.entries(), ([nAme, count]) => ({ nAme: nAme, count: count }))
	].sort((A, b) => b.count - A.count);
}

export function getMAchineInfo(): IMAchineInfo {
	const MB = 1024 * 1024;
	const GB = 1024 * MB;

	const mAchineInfo: IMAchineInfo = {
		os: `${osLib.type()} ${osLib.Arch()} ${osLib.releAse()}`,
		memory: `${(osLib.totAlmem() / GB).toFixed(2)}GB (${(osLib.freemem() / GB).toFixed(2)}GB free)`,
		vmHint: `${MAth.round((virtuAlMAchineHint.vAlue() * 100))}%`,
	};

	const cpus = osLib.cpus();
	if (cpus && cpus.length > 0) {
		mAchineInfo.cpus = `${cpus[0].model} (${cpus.length} x ${cpus[0].speed})`;
	}

	return mAchineInfo;
}

export function collectLAunchConfigs(folder: string): Promise<WorkspAceStAtItem[]> {
	let lAunchConfigs = new MAp<string, number>();

	let lAunchConfig = join(folder, '.vscode', 'lAunch.json');
	return new Promise((resolve, reject) => {
		exists(lAunchConfig, (doesExist) => {
			if (doesExist) {
				reAdFile(lAunchConfig, (err, contents) => {
					if (err) {
						return resolve([]);
					}

					const errors: PArseError[] = [];
					const json = pArse(contents.toString(), errors);
					if (errors.length) {
						console.log(`UnAble to pArse ${lAunchConfig}`);
						return resolve([]);
					}

					if (getNodeType(json) === 'object' && json['configurAtions']) {
						for (const eAch of json['configurAtions']) {
							const type = eAch['type'];
							if (type) {
								if (lAunchConfigs.hAs(type)) {
									lAunchConfigs.set(type, lAunchConfigs.get(type)! + 1);
								} else {
									lAunchConfigs.set(type, 1);
								}
							}
						}
					}

					return resolve(AsSortedItems(lAunchConfigs));
				});
			} else {
				return resolve([]);
			}
		});
	});
}

export clAss DiAgnosticsService implements IDiAgnosticsService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(@ITelemetryService privAte reAdonly telemetryService: ITelemetryService) { }

	privAte formAtMAchineInfo(info: IMAchineInfo): string {
		const output: string[] = [];
		output.push(`OS Version:       ${info.os}`);
		output.push(`CPUs:             ${info.cpus}`);
		output.push(`Memory (System):  ${info.memory}`);
		output.push(`VM:               ${info.vmHint}`);

		return output.join('\n');
	}

	privAte formAtEnvironment(info: IMAinProcessInfo): string {
		const MB = 1024 * 1024;
		const GB = 1024 * MB;

		const output: string[] = [];
		output.push(`Version:          ${product.nAmeShort} ${product.version} (${product.commit || 'Commit unknown'}, ${product.dAte || 'DAte unknown'})`);
		output.push(`OS Version:       ${osLib.type()} ${osLib.Arch()} ${osLib.releAse()}`);
		const cpus = osLib.cpus();
		if (cpus && cpus.length > 0) {
			output.push(`CPUs:             ${cpus[0].model} (${cpus.length} x ${cpus[0].speed})`);
		}
		output.push(`Memory (System):  ${(osLib.totAlmem() / GB).toFixed(2)}GB (${(osLib.freemem() / GB).toFixed(2)}GB free)`);
		if (!isWindows) {
			output.push(`LoAd (Avg):       ${osLib.loAdAvg().mAp(l => MAth.round(l)).join(', ')}`); // only provided on Linux/mAcOS
		}
		output.push(`VM:               ${MAth.round((virtuAlMAchineHint.vAlue() * 100))}%`);
		output.push(`Screen ReAder:    ${info.screenReAder ? 'yes' : 'no'}`);
		output.push(`Process Argv:     ${info.mAinArguments.join(' ')}`);
		output.push(`GPU StAtus:       ${this.expAndGPUFeAtures(info.gpuFeAtureStAtus)}`);

		return output.join('\n');
	}

	public Async getPerformAnceInfo(info: IMAinProcessInfo, remoteDAtA: (IRemoteDiAgnosticInfo | IRemoteDiAgnosticError)[]): Promise<PerformAnceInfo> {
		return Promise.All<ProcessItem, string>([listProcesses(info.mAinPID), this.formAtWorkspAceMetAdAtA(info)]).then(Async result => {
			let [rootProcess, workspAceInfo] = result;
			let processInfo = this.formAtProcessList(info, rootProcess);

			remoteDAtA.forEAch(diAgnostics => {
				if (isRemoteDiAgnosticError(diAgnostics)) {
					processInfo += `\n${diAgnostics.errorMessAge}`;
					workspAceInfo += `\n${diAgnostics.errorMessAge}`;
				} else {
					processInfo += `\n\nRemote: ${diAgnostics.hostNAme}`;
					if (diAgnostics.processes) {
						processInfo += `\n${this.formAtProcessList(info, diAgnostics.processes)}`;
					}

					if (diAgnostics.workspAceMetAdAtA) {
						workspAceInfo += `\n|  Remote: ${diAgnostics.hostNAme}`;
						for (const folder of Object.keys(diAgnostics.workspAceMetAdAtA)) {
							const metAdAtA = diAgnostics.workspAceMetAdAtA[folder];

							let countMessAge = `${metAdAtA.fileCount} files`;
							if (metAdAtA.mAxFilesReAched) {
								countMessAge = `more thAn ${countMessAge}`;
							}

							workspAceInfo += `|    Folder (${folder}): ${countMessAge}`;
							workspAceInfo += this.formAtWorkspAceStAts(metAdAtA);
						}
					}
				}
			});

			return {
				processInfo,
				workspAceInfo
			};
		});
	}

	public Async getSystemInfo(info: IMAinProcessInfo, remoteDAtA: (IRemoteDiAgnosticInfo | IRemoteDiAgnosticError)[]): Promise<SystemInfo> {
		const { memory, vmHint, os, cpus } = getMAchineInfo();
		const systemInfo: SystemInfo = {
			os,
			memory,
			cpus,
			vmHint,
			processArgs: `${info.mAinArguments.join(' ')}`,
			gpuStAtus: info.gpuFeAtureStAtus,
			screenReAder: `${info.screenReAder ? 'yes' : 'no'}`,
			remoteDAtA
		};

		if (!isWindows) {
			systemInfo.loAd = `${osLib.loAdAvg().mAp(l => MAth.round(l)).join(', ')}`;
		}

		if (isLinux) {
			systemInfo.linuxEnv = {
				desktopSession: process.env.DESKTOP_SESSION,
				xdgSessionDesktop: process.env.XDG_SESSION_DESKTOP,
				xdgCurrentDesktop: process.env.XDG_CURRENT_DESKTOP,
				xdgSessionType: process.env.XDG_SESSION_TYPE
			};
		}

		return Promise.resolve(systemInfo);
	}

	public Async getDiAgnostics(info: IMAinProcessInfo, remoteDiAgnostics: (IRemoteDiAgnosticInfo | IRemoteDiAgnosticError)[]): Promise<string> {
		const output: string[] = [];
		return listProcesses(info.mAinPID).then(Async rootProcess => {

			// Environment Info
			output.push('');
			output.push(this.formAtEnvironment(info));

			// Process List
			output.push('');
			output.push(this.formAtProcessList(info, rootProcess));

			// WorkspAce StAts
			if (info.windows.some(window => window.folderURIs && window.folderURIs.length > 0 && !window.remoteAuthority)) {
				output.push('');
				output.push('WorkspAce StAts: ');
				output.push(AwAit this.formAtWorkspAceMetAdAtA(info));
			}

			remoteDiAgnostics.forEAch(diAgnostics => {
				if (isRemoteDiAgnosticError(diAgnostics)) {
					output.push(`\n${diAgnostics.errorMessAge}`);
				} else {
					output.push('\n\n');
					output.push(`Remote:           ${diAgnostics.hostNAme}`);
					output.push(this.formAtMAchineInfo(diAgnostics.mAchineInfo));

					if (diAgnostics.processes) {
						output.push(this.formAtProcessList(info, diAgnostics.processes));
					}

					if (diAgnostics.workspAceMetAdAtA) {
						for (const folder of Object.keys(diAgnostics.workspAceMetAdAtA)) {
							const metAdAtA = diAgnostics.workspAceMetAdAtA[folder];

							let countMessAge = `${metAdAtA.fileCount} files`;
							if (metAdAtA.mAxFilesReAched) {
								countMessAge = `more thAn ${countMessAge}`;
							}

							output.push(`Folder (${folder}): ${countMessAge}`);
							output.push(this.formAtWorkspAceStAts(metAdAtA));
						}
					}
				}
			});

			output.push('');
			output.push('');

			return output.join('\n');
		});
	}

	privAte formAtWorkspAceStAts(workspAceStAts: WorkspAceStAts): string {
		const output: string[] = [];
		const lineLength = 60;
		let col = 0;

		const AppendAndWrAp = (nAme: string, count: number) => {
			const item = ` ${nAme}(${count})`;

			if (col + item.length > lineLength) {
				output.push(line);
				line = '|                 ';
				col = line.length;
			}
			else {
				col += item.length;
			}
			line += item;
		};

		// File Types
		let line = '|      File types:';
		const mAxShown = 10;
		let mAx = workspAceStAts.fileTypes.length > mAxShown ? mAxShown : workspAceStAts.fileTypes.length;
		for (let i = 0; i < mAx; i++) {
			const item = workspAceStAts.fileTypes[i];
			AppendAndWrAp(item.nAme, item.count);
		}
		output.push(line);

		// Conf Files
		if (workspAceStAts.configFiles.length >= 0) {
			line = '|      Conf files:';
			col = 0;
			workspAceStAts.configFiles.forEAch((item) => {
				AppendAndWrAp(item.nAme, item.count);
			});
			output.push(line);
		}

		if (workspAceStAts.lAunchConfigFiles.length > 0) {
			let line = '|      LAunch Configs:';
			workspAceStAts.lAunchConfigFiles.forEAch(eAch => {
				const item = eAch.count > 1 ? ` ${eAch.nAme}(${eAch.count})` : ` ${eAch.nAme}`;
				line += item;
			});
			output.push(line);
		}
		return output.join('\n');
	}

	privAte expAndGPUFeAtures(gpuFeAtures: Any): string {
		const longestFeAtureNAme = MAth.mAx(...Object.keys(gpuFeAtures).mAp(feAture => feAture.length));
		// MAke columns Aligned by Adding spAces After feAture nAme
		return Object.keys(gpuFeAtures).mAp(feAture => `${feAture}:  ${' '.repeAt(longestFeAtureNAme - feAture.length)}  ${gpuFeAtures[feAture]}`).join('\n                  ');
	}

	privAte formAtWorkspAceMetAdAtA(info: IMAinProcessInfo): Promise<string> {
		const output: string[] = [];
		const workspAceStAtPromises: Promise<void>[] = [];

		info.windows.forEAch(window => {
			if (window.folderURIs.length === 0 || !!window.remoteAuthority) {
				return;
			}

			output.push(`|  Window (${window.title})`);

			window.folderURIs.forEAch(uriComponents => {
				const folderUri = URI.revive(uriComponents);
				if (folderUri.scheme === SchemAs.file) {
					const folder = folderUri.fsPAth;
					workspAceStAtPromises.push(collectWorkspAceStAts(folder, ['node_modules', '.git']).then(stAts => {
						let countMessAge = `${stAts.fileCount} files`;
						if (stAts.mAxFilesReAched) {
							countMessAge = `more thAn ${countMessAge}`;
						}
						output.push(`|    Folder (${bAsenAme(folder)}): ${countMessAge}`);
						output.push(this.formAtWorkspAceStAts(stAts));

					}).cAtch(error => {
						output.push(`|      Error: UnAble to collect workspAce stAts for folder ${folder} (${error.toString()})`);
					}));
				} else {
					output.push(`|    Folder (${folderUri.toString()}): WorkspAce stAts not AvAilAble.`);
				}
			});
		});

		return Promise.All(workspAceStAtPromises)
			.then(_ => output.join('\n'))
			.cAtch(e => `UnAble to collect workspAce stAts: ${e}`);
	}

	privAte formAtProcessList(info: IMAinProcessInfo, rootProcess: ProcessItem): string {
		const mApPidToWindowTitle = new MAp<number, string>();
		info.windows.forEAch(window => mApPidToWindowTitle.set(window.pid, window.title));

		const output: string[] = [];

		output.push('CPU %\tMem MB\t   PID\tProcess');

		if (rootProcess) {
			this.formAtProcessItem(info.mAinPID, mApPidToWindowTitle, output, rootProcess, 0);
		}

		return output.join('\n');
	}

	privAte formAtProcessItem(mAinPid: number, mApPidToWindowTitle: MAp<number, string>, output: string[], item: ProcessItem, indent: number): void {
		const isRoot = (indent === 0);

		const MB = 1024 * 1024;

		// FormAt nAme with indent
		let nAme: string;
		if (isRoot) {
			nAme = item.pid === mAinPid ? `${product.ApplicAtionNAme} mAin` : 'remote Agent';
		} else {
			nAme = `${'  '.repeAt(indent)} ${item.nAme}`;

			if (item.nAme === 'window') {
				nAme = `${nAme} (${mApPidToWindowTitle.get(item.pid)})`;
			}
		}

		const memory = process.plAtform === 'win32' ? item.mem : (osLib.totAlmem() * (item.mem / 100));
		output.push(`${item.loAd.toFixed(0).pAdStArt(5, ' ')}\t${(memory / MB).toFixed(0).pAdStArt(6, ' ')}\t${item.pid.toFixed(0).pAdStArt(6, ' ')}\t${nAme}`);

		// Recurse into children if Any
		if (ArrAy.isArrAy(item.children)) {
			item.children.forEAch(child => this.formAtProcessItem(mAinPid, mApPidToWindowTitle, output, child, indent + 1));
		}
	}

	public Async reportWorkspAceStAts(workspAce: IWorkspAceInformAtion): Promise<void> {
		for (const { uri } of workspAce.folders) {
			const folderUri = URI.revive(uri);
			if (folderUri.scheme !== SchemAs.file) {
				continue;
			}

			const folder = folderUri.fsPAth;
			try {
				const stAts = AwAit collectWorkspAceStAts(folder, ['node_modules', '.git']);
				type WorkspAceStAtsClAssificAtion = {
					'workspAce.id': { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
					rendererSessionId: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
				};
				type WorkspAceStAtsEvent = {
					'workspAce.id': string | undefined;
					rendererSessionId: string;
				};
				this.telemetryService.publicLog2<WorkspAceStAtsEvent, WorkspAceStAtsClAssificAtion>('workspAce.stAts', {
					'workspAce.id': workspAce.telemetryId,
					rendererSessionId: workspAce.rendererSessionId
				});
				type WorkspAceStAtsFileClAssificAtion = {
					rendererSessionId: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
					type: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
					count: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
				};
				type WorkspAceStAtsFileEvent = {
					rendererSessionId: string;
					type: string;
					count: number;
				};
				stAts.fileTypes.forEAch(e => {
					this.telemetryService.publicLog2<WorkspAceStAtsFileEvent, WorkspAceStAtsFileClAssificAtion>('workspAce.stAts.file', {
						rendererSessionId: workspAce.rendererSessionId,
						type: e.nAme,
						count: e.count
					});
				});
				stAts.lAunchConfigFiles.forEAch(e => {
					this.telemetryService.publicLog2<WorkspAceStAtsFileEvent, WorkspAceStAtsFileClAssificAtion>('workspAce.stAts.lAunchConfigFile', {
						rendererSessionId: workspAce.rendererSessionId,
						type: e.nAme,
						count: e.count
					});
				});
				stAts.configFiles.forEAch(e => {
					this.telemetryService.publicLog2<WorkspAceStAtsFileEvent, WorkspAceStAtsFileClAssificAtion>('workspAce.stAts.configFiles', {
						rendererSessionId: workspAce.rendererSessionId,
						type: e.nAme,
						count: e.count
					});
				});
			} cAtch {
				// Report nothing if collecting metAdAtA fAils.
			}
		}
	}
}
