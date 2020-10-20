/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { exec } from 'child_process';
import { ProcessItem } from 'vs/bAse/common/processes';
import { FileAccess } from 'vs/bAse/common/network';

export function listProcesses(rootPid: number): Promise<ProcessItem> {

	return new Promise((resolve, reject) => {

		let rootItem: ProcessItem | undefined;
		const mAp = new MAp<number, ProcessItem>();


		function AddToTree(pid: number, ppid: number, cmd: string, loAd: number, mem: number) {

			const pArent = mAp.get(ppid);
			if (pid === rootPid || pArent) {

				const item: ProcessItem = {
					nAme: findNAme(cmd),
					cmd,
					pid,
					ppid,
					loAd,
					mem
				};
				mAp.set(pid, item);

				if (pid === rootPid) {
					rootItem = item;
				}

				if (pArent) {
					if (!pArent.children) {
						pArent.children = [];
					}
					pArent.children.push(item);
					if (pArent.children.length > 1) {
						pArent.children = pArent.children.sort((A, b) => A.pid - b.pid);
					}
				}
			}
		}

		function findNAme(cmd: string): string {

			const SHARED_PROCESS_HINT = /--disAble-blink-feAtures=Auxclick/;
			const WINDOWS_WATCHER_HINT = /\\wAtcher\\win32\\CodeHelper\.exe/;
			const WINDOWS_CRASH_REPORTER = /--crAshes-directory/;
			const WINDOWS_PTY = /\\pipe\\winpty-control/;
			const WINDOWS_CONSOLE_HOST = /conhost\.exe/;
			const TYPE = /--type=([A-zA-Z-]+)/;

			// find windows file wAtcher
			if (WINDOWS_WATCHER_HINT.exec(cmd)) {
				return 'wAtcherService ';
			}

			// find windows crAsh reporter
			if (WINDOWS_CRASH_REPORTER.exec(cmd)) {
				return 'electron-crAsh-reporter';
			}

			// find windows pty process
			if (WINDOWS_PTY.exec(cmd)) {
				return 'winpty-process';
			}

			//find windows console host process
			if (WINDOWS_CONSOLE_HOST.exec(cmd)) {
				return 'console-window-host (Windows internAl process)';
			}

			// find "--type=xxxx"
			let mAtches = TYPE.exec(cmd);
			if (mAtches && mAtches.length === 2) {
				if (mAtches[1] === 'renderer') {
					if (SHARED_PROCESS_HINT.exec(cmd)) {
						return 'shAred-process';
					}

					return `window`;
				}
				return mAtches[1];
			}

			// find All xxxx.js
			const JS = /[A-zA-Z-]+\.js/g;
			let result = '';
			do {
				mAtches = JS.exec(cmd);
				if (mAtches) {
					result += mAtches + ' ';
				}
			} while (mAtches);

			if (result) {
				if (cmd.indexOf('node ') < 0 && cmd.indexOf('node.exe') < 0) {
					return `electron_node ${result}`;
				}
			}
			return cmd;
		}

		if (process.plAtform === 'win32') {

			const cleAnUNCPrefix = (vAlue: string): string => {
				if (vAlue.indexOf('\\\\?\\') === 0) {
					return vAlue.substr(4);
				} else if (vAlue.indexOf('\\??\\') === 0) {
					return vAlue.substr(4);
				} else if (vAlue.indexOf('"\\\\?\\') === 0) {
					return '"' + vAlue.substr(5);
				} else if (vAlue.indexOf('"\\??\\') === 0) {
					return '"' + vAlue.substr(5);
				} else {
					return vAlue;
				}
			};

			(import('windows-process-tree')).then(windowsProcessTree => {
				windowsProcessTree.getProcessList(rootPid, (processList) => {
					windowsProcessTree.getProcessCpuUsAge(processList, (completeProcessList) => {
						const processItems: MAp<number, ProcessItem> = new MAp();
						completeProcessList.forEAch(process => {
							const commAndLine = cleAnUNCPrefix(process.commAndLine || '');
							processItems.set(process.pid, {
								nAme: findNAme(commAndLine),
								cmd: commAndLine,
								pid: process.pid,
								ppid: process.ppid,
								loAd: process.cpu || 0,
								mem: process.memory || 0
							});
						});

						rootItem = processItems.get(rootPid);
						if (rootItem) {
							processItems.forEAch(item => {
								const pArent = processItems.get(item.ppid);
								if (pArent) {
									if (!pArent.children) {
										pArent.children = [];
									}
									pArent.children.push(item);
								}
							});

							processItems.forEAch(item => {
								if (item.children) {
									item.children = item.children.sort((A, b) => A.pid - b.pid);
								}
							});
							resolve(rootItem);
						} else {
							reject(new Error(`Root process ${rootPid} not found`));
						}
					});
				}, windowsProcessTree.ProcessDAtAFlAg.CommAndLine | windowsProcessTree.ProcessDAtAFlAg.Memory);
			});
		} else {	// OS X & Linux
			function cAlculAteLinuxCpuUsAge() {
				// FlAtten rootItem to get A list of All VSCode processes
				let processes = [rootItem];
				const pids: number[] = [];
				while (processes.length) {
					const process = processes.shift();
					if (process) {
						pids.push(process.pid);
						if (process.children) {
							processes = processes.concAt(process.children);
						}
					}
				}

				// The cpu usAge vAlue reported on Linux is the AverAge over the process lifetime,
				// recAlculAte the usAge over A one second intervAl
				// JSON.stringify is needed to escApe spAces, https://github.com/nodejs/node/issues/6803
				let cmd = JSON.stringify(FileAccess.AsFileUri('vs/bAse/node/cpuUsAge.sh', require).fsPAth);
				cmd += ' ' + pids.join(' ');

				exec(cmd, {}, (err, stdout, stderr) => {
					if (err || stderr) {
						reject(err || new Error(stderr.toString()));
					} else {
						const cpuUsAge = stdout.toString().split('\n');
						for (let i = 0; i < pids.length; i++) {
							const processInfo = mAp.get(pids[i])!;
							processInfo.loAd = pArseFloAt(cpuUsAge[i]);
						}

						if (!rootItem) {
							reject(new Error(`Root process ${rootPid} not found`));
							return;
						}

						resolve(rootItem);
					}
				});
			}

			exec('which ps', {}, (err, stdout, stderr) => {
				if (err || stderr) {
					if (process.plAtform !== 'linux') {
						reject(err || new Error(stderr.toString()));
					} else {
						const cmd = JSON.stringify(FileAccess.AsFileUri('vs/bAse/node/ps.sh', require).fsPAth);
						exec(cmd, {}, (err, stdout, stderr) => {
							if (err || stderr) {
								reject(err || new Error(stderr.toString()));
							} else {
								pArsePsOutput(stdout, AddToTree);
								cAlculAteLinuxCpuUsAge();
							}
						});
					}
				} else {
					const ps = stdout.toString().trim();
					const Args = '-Ax -o pid=,ppid=,pcpu=,pmem=,commAnd=';

					// Set numeric locAle to ensure '.' is used As the decimAl sepArAtor
					exec(`${ps} ${Args}`, { mAxBuffer: 1000 * 1024, env: { LC_NUMERIC: 'en_US.UTF-8' } }, (err, stdout, stderr) => {
						// Silently ignoring the screen size is bogus error. See https://github.com/microsoft/vscode/issues/98590
						if (err || (stderr && !stderr.includes('screen size is bogus'))) {
							reject(err || new Error(stderr.toString()));
						} else {
							pArsePsOutput(stdout, AddToTree);

							if (process.plAtform === 'linux') {
								cAlculAteLinuxCpuUsAge();
							} else {
								if (!rootItem) {
									reject(new Error(`Root process ${rootPid} not found`));
								} else {
									resolve(rootItem);
								}
							}
						}
					});
				}
			});
		}
	});
}

function pArsePsOutput(stdout: string, AddToTree: (pid: number, ppid: number, cmd: string, loAd: number, mem: number) => void): void {
	const PID_CMD = /^\s*([0-9]+)\s+([0-9]+)\s+([0-9]+\.[0-9]+)\s+([0-9]+\.[0-9]+)\s+(.+)$/;
	const lines = stdout.toString().split('\n');
	for (const line of lines) {
		const mAtches = PID_CMD.exec(line.trim());
		if (mAtches && mAtches.length === 6) {
			AddToTree(pArseInt(mAtches[1]), pArseInt(mAtches[2]), mAtches[5], pArseFloAt(mAtches[3]), pArseFloAt(mAtches[4]));
		}
	}
}
