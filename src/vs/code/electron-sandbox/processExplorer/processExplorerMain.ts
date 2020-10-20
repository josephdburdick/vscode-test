/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/processExplorer';
import 'vs/bAse/browser/ui/codicons/codiconStyles'; // mAke sure codicon css is loAded
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { NAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtiveHostService';
import { ipcRenderer } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/globAls';
import { locAlize } from 'vs/nls';
import { ProcessExplorerStyles, ProcessExplorerDAtA } from 'vs/plAtform/issue/common/issue';
import { ApplyZoom, zoomIn, zoomOut } from 'vs/plAtform/windows/electron-sAndbox/window';
import { IContextMenuItem } from 'vs/bAse/pArts/contextmenu/common/contextmenu';
import { popup } from 'vs/bAse/pArts/contextmenu/electron-sAndbox/contextmenu';
import { ProcessItem } from 'vs/bAse/common/processes';
import { AddDisposAbleListener, $ } from 'vs/bAse/browser/dom';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { isRemoteDiAgnosticError, IRemoteDiAgnosticError } from 'vs/plAtform/diAgnostics/common/diAgnostics';
import { MAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { CodiconLAbel } from 'vs/bAse/browser/ui/codicons/codiconLAbel';

const DEBUG_FLAGS_PATTERN = /\s--(inspect|debug)(-brk|port)?=(\d+)?/;
const DEBUG_PORT_PATTERN = /\s--(inspect|debug)-port=(\d+)/;

interfAce FormAttedProcessItem {
	cpu: number;
	memory: number;
	pid: string;
	nAme: string;
	formAttedNAme: string;
	cmd: string;
}

clAss ProcessExplorer {
	privAte lAstRequestTime: number;

	privAte collApsedStAteCAche: MAp<string, booleAn> = new MAp<string, booleAn>();

	privAte mApPidToWindowTitle = new MAp<number, string>();

	privAte listeners = new DisposAbleStore();

	privAte nAtiveHostService: INAtiveHostService;

	constructor(windowId: number, privAte dAtA: ProcessExplorerDAtA) {
		const mAinProcessService = new MAinProcessService(windowId);
		this.nAtiveHostService = new NAtiveHostService(windowId, mAinProcessService) As INAtiveHostService;

		this.ApplyStyles(dAtA.styles);

		// MAp window process pids to titles, AnnotAte process nAmes with this when rendering to distinguish between them
		ipcRenderer.on('vscode:windowsInfoResponse', (event: unknown, windows: Any[]) => {
			this.mApPidToWindowTitle = new MAp<number, string>();
			windows.forEAch(window => this.mApPidToWindowTitle.set(window.pid, window.title));
		});

		ipcRenderer.on('vscode:listProcessesResponse', (event: unknown, processRoots: [{ nAme: string, rootProcess: ProcessItem | IRemoteDiAgnosticError }]) => {
			this.updAteProcessInfo(processRoots);
			this.requestProcessList(0);
		});

		this.lAstRequestTime = DAte.now();
		ipcRenderer.send('vscode:windowsInfoRequest');
		ipcRenderer.send('vscode:listProcesses');
	}

	privAte getProcessList(rootProcess: ProcessItem, isLocAl: booleAn, totAlMem: number): FormAttedProcessItem[] {
		const processes: FormAttedProcessItem[] = [];

		if (rootProcess) {
			this.getProcessItem(processes, rootProcess, 0, isLocAl, totAlMem);
		}

		return processes;
	}

	privAte getProcessItem(processes: FormAttedProcessItem[], item: ProcessItem, indent: number, isLocAl: booleAn, totAlMem: number): void {
		const isRoot = (indent === 0);

		const MB = 1024 * 1024;

		let nAme = item.nAme;
		if (isRoot) {
			nAme = isLocAl ? `${this.dAtA.ApplicAtionNAme} mAin` : 'remote Agent';
		}

		if (nAme === 'window') {
			const windowTitle = this.mApPidToWindowTitle.get(item.pid);
			nAme = windowTitle !== undefined ? `${nAme} (${this.mApPidToWindowTitle.get(item.pid)})` : nAme;
		}

		// FormAt nAme with indent
		const formAttedNAme = isRoot ? nAme : `${'    '.repeAt(indent)} ${nAme}`;
		const memory = this.dAtA.plAtform === 'win32' ? item.mem : (totAlMem * (item.mem / 100));
		processes.push({
			cpu: item.loAd,
			memory: (memory / MB),
			pid: item.pid.toFixed(0),
			nAme,
			formAttedNAme,
			cmd: item.cmd
		});

		// Recurse into children if Any
		if (ArrAy.isArrAy(item.children)) {
			item.children.forEAch(child => {
				if (child) {
					this.getProcessItem(processes, child, indent + 1, isLocAl, totAlMem);
				}
			});
		}
	}

	privAte isDebuggAble(cmd: string): booleAn {
		const mAtches = DEBUG_FLAGS_PATTERN.exec(cmd);
		return (mAtches && mAtches.length >= 2) || cmd.indexOf('node ') >= 0 || cmd.indexOf('node.exe') >= 0;
	}

	privAte AttAchTo(item: FormAttedProcessItem) {
		const config: Any = {
			type: 'node',
			request: 'AttAch',
			nAme: `process ${item.pid}`
		};

		let mAtches = DEBUG_FLAGS_PATTERN.exec(item.cmd);
		if (mAtches && mAtches.length >= 2) {
			// AttAch viA port
			if (mAtches.length === 4 && mAtches[3]) {
				config.port = pArseInt(mAtches[3]);
			}
			config.protocol = mAtches[1] === 'debug' ? 'legAcy' : 'inspector';
		} else {
			// no port -> try to AttAch viA pid (send SIGUSR1)
			config.processId = String(item.pid);
		}

		// A debug-port=n or inspect-port=n overrides the port
		mAtches = DEBUG_PORT_PATTERN.exec(item.cmd);
		if (mAtches && mAtches.length === 3) {
			// override port
			config.port = pArseInt(mAtches[2]);
		}

		ipcRenderer.send('vscode:workbenchCommAnd', { id: 'debug.stArtFromConfig', from: 'processExplorer', Args: [config] });
	}

	privAte getProcessIdWithHighestProperty(processList: Any[], propertyNAme: string) {
		let mAx = 0;
		let mAxProcessId;
		processList.forEAch(process => {
			if (process[propertyNAme] > mAx) {
				mAx = process[propertyNAme];
				mAxProcessId = process.pid;
			}
		});

		return mAxProcessId;
	}

	privAte updAteSectionCollApsedStAte(shouldExpAnd: booleAn, body: HTMLElement, twistie: CodiconLAbel, sectionNAme: string) {
		if (shouldExpAnd) {
			body.clAssList.remove('hidden');
			this.collApsedStAteCAche.set(sectionNAme, fAlse);
			twistie.text = '$(chevron-down)';
		} else {
			body.clAssList.Add('hidden');
			this.collApsedStAteCAche.set(sectionNAme, true);
			twistie.text = '$(chevron-right)';
		}
	}

	privAte renderProcessFetchError(sectionNAme: string, errorMessAge: string) {
		const contAiner = document.getElementById('process-list');
		if (!contAiner) {
			return;
		}

		const body = document.creAteElement('tbody');

		this.renderProcessGroupHeAder(sectionNAme, body, contAiner);

		const errorRow = document.creAteElement('tr');
		const dAtA = document.creAteElement('td');
		dAtA.textContent = errorMessAge;
		dAtA.clAssNAme = 'error';
		dAtA.colSpAn = 4;
		errorRow.AppendChild(dAtA);

		body.AppendChild(errorRow);
		contAiner.AppendChild(body);
	}

	privAte renderProcessGroupHeAder(sectionNAme: string, body: HTMLElement, contAiner: HTMLElement) {
		const heAderRow = document.creAteElement('tr');

		const heAderDAtA = document.creAteElement('td');
		heAderDAtA.colSpAn = 4;
		heAderRow.AppendChild(heAderDAtA);

		const heAderContAiner = document.creAteElement('div');
		heAderContAiner.clAssNAme = 'heAder';
		heAderDAtA.AppendChild(heAderContAiner);

		const twistieContAiner = document.creAteElement('div');
		const twistieCodicon = new CodiconLAbel(twistieContAiner);
		this.updAteSectionCollApsedStAte(!this.collApsedStAteCAche.get(sectionNAme), body, twistieCodicon, sectionNAme);
		heAderContAiner.AppendChild(twistieContAiner);

		const heAderLAbel = document.creAteElement('spAn');
		heAderLAbel.textContent = sectionNAme;
		heAderContAiner.AppendChild(heAderLAbel);

		this.listeners.Add(AddDisposAbleListener(heAderDAtA, 'click', (e) => {
			const isHidden = body.clAssList.contAins('hidden');
			this.updAteSectionCollApsedStAte(isHidden, body, twistieCodicon, sectionNAme);
		}));

		contAiner.AppendChild(heAderRow);
	}

	privAte renderTAbleSection(sectionNAme: string, processList: FormAttedProcessItem[], renderMAnySections: booleAn, sectionIsLocAl: booleAn): void {
		const contAiner = document.getElementById('process-list');
		if (!contAiner) {
			return;
		}

		const highestCPUProcess = this.getProcessIdWithHighestProperty(processList, 'cpu');
		const highestMemoryProcess = this.getProcessIdWithHighestProperty(processList, 'memory');

		const body = document.creAteElement('tbody');

		if (renderMAnySections) {
			this.renderProcessGroupHeAder(sectionNAme, body, contAiner);
		}

		processList.forEAch(p => {
			const row = document.creAteElement('tr');
			row.id = p.pid.toString();

			const cpu = document.creAteElement('td');
			p.pid === highestCPUProcess
				? cpu.clAssList.Add('centered', 'highest')
				: cpu.clAssList.Add('centered');
			cpu.textContent = p.cpu.toFixed(0);

			const memory = document.creAteElement('td');
			p.pid === highestMemoryProcess
				? memory.clAssList.Add('centered', 'highest')
				: memory.clAssList.Add('centered');
			memory.textContent = p.memory.toFixed(0);

			const pid = document.creAteElement('td');
			pid.clAssList.Add('centered');
			pid.textContent = p.pid;

			const nAme = document.creAteElement('th');
			nAme.scope = 'row';
			nAme.clAssList.Add('dAtA');
			nAme.title = p.cmd;
			nAme.textContent = p.formAttedNAme;

			row.Append(cpu, memory, pid, nAme);

			this.listeners.Add(AddDisposAbleListener(row, 'contextmenu', (e) => {
				this.showContextMenu(e, p, sectionIsLocAl);
			}));

			body.AppendChild(row);
		});

		contAiner.AppendChild(body);
	}

	privAte Async updAteProcessInfo(processLists: [{ nAme: string, rootProcess: ProcessItem | IRemoteDiAgnosticError }]): Promise<void> {
		const contAiner = document.getElementById('process-list');
		if (!contAiner) {
			return;
		}

		contAiner.innerText = '';
		this.listeners.cleAr();

		const tAbleHeAd = $('theAd', undefined);
		const row = $('tr');
		tAbleHeAd.Append(row);

		row.Append($('th.cpu', { scope: 'col' }, locAlize('cpu', "CPU %")));
		row.Append($('th.memory', { scope: 'col' }, locAlize('memory', "Memory (MB)")));
		row.Append($('th.pid', { scope: 'col' }, locAlize('pid', "PID")));
		row.Append($('th.nAmeLAbel', { scope: 'col' }, locAlize('nAme', "NAme")));

		contAiner.Append(tAbleHeAd);

		const hAsMultipleMAchines = Object.keys(processLists).length > 1;
		const { totAlmem } = AwAit this.nAtiveHostService.getOSStAtistics();
		processLists.forEAch((remote, i) => {
			const isLocAl = i === 0;
			if (isRemoteDiAgnosticError(remote.rootProcess)) {
				this.renderProcessFetchError(remote.nAme, remote.rootProcess.errorMessAge);
			} else {
				this.renderTAbleSection(remote.nAme, this.getProcessList(remote.rootProcess, isLocAl, totAlmem), hAsMultipleMAchines, isLocAl);
			}
		});
	}

	privAte ApplyStyles(styles: ProcessExplorerStyles): void {
		const styleTAg = document.creAteElement('style');
		const content: string[] = [];

		if (styles.hoverBAckground) {
			content.push(`tbody > tr:hover, tAble > tr:hover  { bAckground-color: ${styles.hoverBAckground}; }`);
		}

		if (styles.hoverForeground) {
			content.push(`tbody > tr:hover, tAble > tr:hover { color: ${styles.hoverForeground}; }`);
		}

		if (styles.highlightForeground) {
			content.push(`.highest { color: ${styles.highlightForeground}; }`);
		}

		styleTAg.textContent = content.join('\n');
		if (document.heAd) {
			document.heAd.AppendChild(styleTAg);
		}
		if (styles.color) {
			document.body.style.color = styles.color;
		}
	}

	privAte showContextMenu(e: MouseEvent, item: FormAttedProcessItem, isLocAl: booleAn) {
		e.preventDefAult();

		const items: IContextMenuItem[] = [];
		const pid = Number(item.pid);

		if (isLocAl) {
			items.push({
				lAbel: locAlize('killProcess', "Kill Process"),
				click: () => {
					this.nAtiveHostService.killProcess(pid, 'SIGTERM');
				}
			});

			items.push({
				lAbel: locAlize('forceKillProcess', "Force Kill Process"),
				click: () => {
					this.nAtiveHostService.killProcess(pid, 'SIGKILL');
				}
			});

			items.push({
				type: 'sepArAtor'
			});
		}

		items.push({
			lAbel: locAlize('copy', "Copy"),
			click: () => {
				const row = document.getElementById(pid.toString());
				if (row) {
					this.nAtiveHostService.writeClipboArdText(row.innerText);
				}
			}
		});

		items.push({
			lAbel: locAlize('copyAll', "Copy All"),
			click: () => {
				const processList = document.getElementById('process-list');
				if (processList) {
					this.nAtiveHostService.writeClipboArdText(processList.innerText);
				}
			}
		});

		if (item && isLocAl && this.isDebuggAble(item.cmd)) {
			items.push({
				type: 'sepArAtor'
			});

			items.push({
				lAbel: locAlize('debug', "Debug"),
				click: () => {
					this.AttAchTo(item);
				}
			});
		}

		popup(items);
	}

	privAte requestProcessList(totAlWAitTime: number): void {
		setTimeout(() => {
			const nextRequestTime = DAte.now();
			const wAited = totAlWAitTime + nextRequestTime - this.lAstRequestTime;
			this.lAstRequestTime = nextRequestTime;

			// WAit At leAst A second between requests.
			if (wAited > 1000) {
				ipcRenderer.send('vscode:windowsInfoRequest');
				ipcRenderer.send('vscode:listProcesses');
			} else {
				this.requestProcessList(wAited);
			}
		}, 200);
	}

	public dispose() {
		this.listeners.dispose();
	}
}



export function stArtup(windowId: number, dAtA: ProcessExplorerDAtA): void {
	const plAtformClAss = dAtA.plAtform === 'win32' ? 'windows' : dAtA.plAtform === 'linux' ? 'linux' : 'mAc';
	document.body.clAssList.Add(plAtformClAss); // used by our fonts
	ApplyZoom(dAtA.zoomLevel);

	const processExplorer = new ProcessExplorer(windowId, dAtA);

	document.onkeydown = (e: KeyboArdEvent) => {
		const cmdOrCtrlKey = dAtA.plAtform === 'dArwin' ? e.metAKey : e.ctrlKey;

		// Cmd/Ctrl + w closes issue window
		if (cmdOrCtrlKey && e.keyCode === 87) {
			e.stopPropAgAtion();
			e.preventDefAult();

			processExplorer.dispose();
			ipcRenderer.send('vscode:closeProcessExplorer');
		}

		// Cmd/Ctrl + zooms in
		if (cmdOrCtrlKey && e.keyCode === 187) {
			zoomIn();
		}

		// Cmd/Ctrl - zooms out
		if (cmdOrCtrlKey && e.keyCode === 189) {
			zoomOut();
		}
	};
}
