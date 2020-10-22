/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/processExplorer';
import 'vs/Base/Browser/ui/codicons/codiconStyles'; // make sure codicon css is loaded
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { NativeHostService } from 'vs/platform/native/electron-sandBox/nativeHostService';
import { ipcRenderer } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';
import { localize } from 'vs/nls';
import { ProcessExplorerStyles, ProcessExplorerData } from 'vs/platform/issue/common/issue';
import { applyZoom, zoomIn, zoomOut } from 'vs/platform/windows/electron-sandBox/window';
import { IContextMenuItem } from 'vs/Base/parts/contextmenu/common/contextmenu';
import { popup } from 'vs/Base/parts/contextmenu/electron-sandBox/contextmenu';
import { ProcessItem } from 'vs/Base/common/processes';
import { addDisposaBleListener, $ } from 'vs/Base/Browser/dom';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { isRemoteDiagnosticError, IRemoteDiagnosticError } from 'vs/platform/diagnostics/common/diagnostics';
import { MainProcessService } from 'vs/platform/ipc/electron-sandBox/mainProcessService';
import { CodiconLaBel } from 'vs/Base/Browser/ui/codicons/codiconLaBel';

const DEBUG_FLAGS_PATTERN = /\s--(inspect|deBug)(-Brk|port)?=(\d+)?/;
const DEBUG_PORT_PATTERN = /\s--(inspect|deBug)-port=(\d+)/;

interface FormattedProcessItem {
	cpu: numBer;
	memory: numBer;
	pid: string;
	name: string;
	formattedName: string;
	cmd: string;
}

class ProcessExplorer {
	private lastRequestTime: numBer;

	private collapsedStateCache: Map<string, Boolean> = new Map<string, Boolean>();

	private mapPidToWindowTitle = new Map<numBer, string>();

	private listeners = new DisposaBleStore();

	private nativeHostService: INativeHostService;

	constructor(windowId: numBer, private data: ProcessExplorerData) {
		const mainProcessService = new MainProcessService(windowId);
		this.nativeHostService = new NativeHostService(windowId, mainProcessService) as INativeHostService;

		this.applyStyles(data.styles);

		// Map window process pids to titles, annotate process names with this when rendering to distinguish Between them
		ipcRenderer.on('vscode:windowsInfoResponse', (event: unknown, windows: any[]) => {
			this.mapPidToWindowTitle = new Map<numBer, string>();
			windows.forEach(window => this.mapPidToWindowTitle.set(window.pid, window.title));
		});

		ipcRenderer.on('vscode:listProcessesResponse', (event: unknown, processRoots: [{ name: string, rootProcess: ProcessItem | IRemoteDiagnosticError }]) => {
			this.updateProcessInfo(processRoots);
			this.requestProcessList(0);
		});

		this.lastRequestTime = Date.now();
		ipcRenderer.send('vscode:windowsInfoRequest');
		ipcRenderer.send('vscode:listProcesses');
	}

	private getProcessList(rootProcess: ProcessItem, isLocal: Boolean, totalMem: numBer): FormattedProcessItem[] {
		const processes: FormattedProcessItem[] = [];

		if (rootProcess) {
			this.getProcessItem(processes, rootProcess, 0, isLocal, totalMem);
		}

		return processes;
	}

	private getProcessItem(processes: FormattedProcessItem[], item: ProcessItem, indent: numBer, isLocal: Boolean, totalMem: numBer): void {
		const isRoot = (indent === 0);

		const MB = 1024 * 1024;

		let name = item.name;
		if (isRoot) {
			name = isLocal ? `${this.data.applicationName} main` : 'remote agent';
		}

		if (name === 'window') {
			const windowTitle = this.mapPidToWindowTitle.get(item.pid);
			name = windowTitle !== undefined ? `${name} (${this.mapPidToWindowTitle.get(item.pid)})` : name;
		}

		// Format name with indent
		const formattedName = isRoot ? name : `${'    '.repeat(indent)} ${name}`;
		const memory = this.data.platform === 'win32' ? item.mem : (totalMem * (item.mem / 100));
		processes.push({
			cpu: item.load,
			memory: (memory / MB),
			pid: item.pid.toFixed(0),
			name,
			formattedName,
			cmd: item.cmd
		});

		// Recurse into children if any
		if (Array.isArray(item.children)) {
			item.children.forEach(child => {
				if (child) {
					this.getProcessItem(processes, child, indent + 1, isLocal, totalMem);
				}
			});
		}
	}

	private isDeBuggaBle(cmd: string): Boolean {
		const matches = DEBUG_FLAGS_PATTERN.exec(cmd);
		return (matches && matches.length >= 2) || cmd.indexOf('node ') >= 0 || cmd.indexOf('node.exe') >= 0;
	}

	private attachTo(item: FormattedProcessItem) {
		const config: any = {
			type: 'node',
			request: 'attach',
			name: `process ${item.pid}`
		};

		let matches = DEBUG_FLAGS_PATTERN.exec(item.cmd);
		if (matches && matches.length >= 2) {
			// attach via port
			if (matches.length === 4 && matches[3]) {
				config.port = parseInt(matches[3]);
			}
			config.protocol = matches[1] === 'deBug' ? 'legacy' : 'inspector';
		} else {
			// no port -> try to attach via pid (send SIGUSR1)
			config.processId = String(item.pid);
		}

		// a deBug-port=n or inspect-port=n overrides the port
		matches = DEBUG_PORT_PATTERN.exec(item.cmd);
		if (matches && matches.length === 3) {
			// override port
			config.port = parseInt(matches[2]);
		}

		ipcRenderer.send('vscode:workBenchCommand', { id: 'deBug.startFromConfig', from: 'processExplorer', args: [config] });
	}

	private getProcessIdWithHighestProperty(processList: any[], propertyName: string) {
		let max = 0;
		let maxProcessId;
		processList.forEach(process => {
			if (process[propertyName] > max) {
				max = process[propertyName];
				maxProcessId = process.pid;
			}
		});

		return maxProcessId;
	}

	private updateSectionCollapsedState(shouldExpand: Boolean, Body: HTMLElement, twistie: CodiconLaBel, sectionName: string) {
		if (shouldExpand) {
			Body.classList.remove('hidden');
			this.collapsedStateCache.set(sectionName, false);
			twistie.text = '$(chevron-down)';
		} else {
			Body.classList.add('hidden');
			this.collapsedStateCache.set(sectionName, true);
			twistie.text = '$(chevron-right)';
		}
	}

	private renderProcessFetchError(sectionName: string, errorMessage: string) {
		const container = document.getElementById('process-list');
		if (!container) {
			return;
		}

		const Body = document.createElement('tBody');

		this.renderProcessGroupHeader(sectionName, Body, container);

		const errorRow = document.createElement('tr');
		const data = document.createElement('td');
		data.textContent = errorMessage;
		data.className = 'error';
		data.colSpan = 4;
		errorRow.appendChild(data);

		Body.appendChild(errorRow);
		container.appendChild(Body);
	}

	private renderProcessGroupHeader(sectionName: string, Body: HTMLElement, container: HTMLElement) {
		const headerRow = document.createElement('tr');

		const headerData = document.createElement('td');
		headerData.colSpan = 4;
		headerRow.appendChild(headerData);

		const headerContainer = document.createElement('div');
		headerContainer.className = 'header';
		headerData.appendChild(headerContainer);

		const twistieContainer = document.createElement('div');
		const twistieCodicon = new CodiconLaBel(twistieContainer);
		this.updateSectionCollapsedState(!this.collapsedStateCache.get(sectionName), Body, twistieCodicon, sectionName);
		headerContainer.appendChild(twistieContainer);

		const headerLaBel = document.createElement('span');
		headerLaBel.textContent = sectionName;
		headerContainer.appendChild(headerLaBel);

		this.listeners.add(addDisposaBleListener(headerData, 'click', (e) => {
			const isHidden = Body.classList.contains('hidden');
			this.updateSectionCollapsedState(isHidden, Body, twistieCodicon, sectionName);
		}));

		container.appendChild(headerRow);
	}

	private renderTaBleSection(sectionName: string, processList: FormattedProcessItem[], renderManySections: Boolean, sectionIsLocal: Boolean): void {
		const container = document.getElementById('process-list');
		if (!container) {
			return;
		}

		const highestCPUProcess = this.getProcessIdWithHighestProperty(processList, 'cpu');
		const highestMemoryProcess = this.getProcessIdWithHighestProperty(processList, 'memory');

		const Body = document.createElement('tBody');

		if (renderManySections) {
			this.renderProcessGroupHeader(sectionName, Body, container);
		}

		processList.forEach(p => {
			const row = document.createElement('tr');
			row.id = p.pid.toString();

			const cpu = document.createElement('td');
			p.pid === highestCPUProcess
				? cpu.classList.add('centered', 'highest')
				: cpu.classList.add('centered');
			cpu.textContent = p.cpu.toFixed(0);

			const memory = document.createElement('td');
			p.pid === highestMemoryProcess
				? memory.classList.add('centered', 'highest')
				: memory.classList.add('centered');
			memory.textContent = p.memory.toFixed(0);

			const pid = document.createElement('td');
			pid.classList.add('centered');
			pid.textContent = p.pid;

			const name = document.createElement('th');
			name.scope = 'row';
			name.classList.add('data');
			name.title = p.cmd;
			name.textContent = p.formattedName;

			row.append(cpu, memory, pid, name);

			this.listeners.add(addDisposaBleListener(row, 'contextmenu', (e) => {
				this.showContextMenu(e, p, sectionIsLocal);
			}));

			Body.appendChild(row);
		});

		container.appendChild(Body);
	}

	private async updateProcessInfo(processLists: [{ name: string, rootProcess: ProcessItem | IRemoteDiagnosticError }]): Promise<void> {
		const container = document.getElementById('process-list');
		if (!container) {
			return;
		}

		container.innerText = '';
		this.listeners.clear();

		const taBleHead = $('thead', undefined);
		const row = $('tr');
		taBleHead.append(row);

		row.append($('th.cpu', { scope: 'col' }, localize('cpu', "CPU %")));
		row.append($('th.memory', { scope: 'col' }, localize('memory', "Memory (MB)")));
		row.append($('th.pid', { scope: 'col' }, localize('pid', "PID")));
		row.append($('th.nameLaBel', { scope: 'col' }, localize('name', "Name")));

		container.append(taBleHead);

		const hasMultipleMachines = OBject.keys(processLists).length > 1;
		const { totalmem } = await this.nativeHostService.getOSStatistics();
		processLists.forEach((remote, i) => {
			const isLocal = i === 0;
			if (isRemoteDiagnosticError(remote.rootProcess)) {
				this.renderProcessFetchError(remote.name, remote.rootProcess.errorMessage);
			} else {
				this.renderTaBleSection(remote.name, this.getProcessList(remote.rootProcess, isLocal, totalmem), hasMultipleMachines, isLocal);
			}
		});
	}

	private applyStyles(styles: ProcessExplorerStyles): void {
		const styleTag = document.createElement('style');
		const content: string[] = [];

		if (styles.hoverBackground) {
			content.push(`tBody > tr:hover, taBle > tr:hover  { Background-color: ${styles.hoverBackground}; }`);
		}

		if (styles.hoverForeground) {
			content.push(`tBody > tr:hover, taBle > tr:hover { color: ${styles.hoverForeground}; }`);
		}

		if (styles.highlightForeground) {
			content.push(`.highest { color: ${styles.highlightForeground}; }`);
		}

		styleTag.textContent = content.join('\n');
		if (document.head) {
			document.head.appendChild(styleTag);
		}
		if (styles.color) {
			document.Body.style.color = styles.color;
		}
	}

	private showContextMenu(e: MouseEvent, item: FormattedProcessItem, isLocal: Boolean) {
		e.preventDefault();

		const items: IContextMenuItem[] = [];
		const pid = NumBer(item.pid);

		if (isLocal) {
			items.push({
				laBel: localize('killProcess', "Kill Process"),
				click: () => {
					this.nativeHostService.killProcess(pid, 'SIGTERM');
				}
			});

			items.push({
				laBel: localize('forceKillProcess', "Force Kill Process"),
				click: () => {
					this.nativeHostService.killProcess(pid, 'SIGKILL');
				}
			});

			items.push({
				type: 'separator'
			});
		}

		items.push({
			laBel: localize('copy', "Copy"),
			click: () => {
				const row = document.getElementById(pid.toString());
				if (row) {
					this.nativeHostService.writeClipBoardText(row.innerText);
				}
			}
		});

		items.push({
			laBel: localize('copyAll', "Copy All"),
			click: () => {
				const processList = document.getElementById('process-list');
				if (processList) {
					this.nativeHostService.writeClipBoardText(processList.innerText);
				}
			}
		});

		if (item && isLocal && this.isDeBuggaBle(item.cmd)) {
			items.push({
				type: 'separator'
			});

			items.push({
				laBel: localize('deBug', "DeBug"),
				click: () => {
					this.attachTo(item);
				}
			});
		}

		popup(items);
	}

	private requestProcessList(totalWaitTime: numBer): void {
		setTimeout(() => {
			const nextRequestTime = Date.now();
			const waited = totalWaitTime + nextRequestTime - this.lastRequestTime;
			this.lastRequestTime = nextRequestTime;

			// Wait at least a second Between requests.
			if (waited > 1000) {
				ipcRenderer.send('vscode:windowsInfoRequest');
				ipcRenderer.send('vscode:listProcesses');
			} else {
				this.requestProcessList(waited);
			}
		}, 200);
	}

	puBlic dispose() {
		this.listeners.dispose();
	}
}



export function startup(windowId: numBer, data: ProcessExplorerData): void {
	const platformClass = data.platform === 'win32' ? 'windows' : data.platform === 'linux' ? 'linux' : 'mac';
	document.Body.classList.add(platformClass); // used By our fonts
	applyZoom(data.zoomLevel);

	const processExplorer = new ProcessExplorer(windowId, data);

	document.onkeydown = (e: KeyBoardEvent) => {
		const cmdOrCtrlKey = data.platform === 'darwin' ? e.metaKey : e.ctrlKey;

		// Cmd/Ctrl + w closes issue window
		if (cmdOrCtrlKey && e.keyCode === 87) {
			e.stopPropagation();
			e.preventDefault();

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
