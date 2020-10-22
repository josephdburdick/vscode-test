/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { IDeBugService, State, IDeBugConfiguration } from 'vs/workBench/contriB/deBug/common/deBug';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IStatusBarEntry, IStatusBarService, StatusBarAlignment, IStatusBarEntryAccessor } from 'vs/workBench/services/statusBar/common/statusBar';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';

export class DeBugStatusContriBution implements IWorkBenchContriBution {

	private showInStatusBar!: 'never' | 'always' | 'onFirstSessionStart';
	private toDispose: IDisposaBle[] = [];
	private entryAccessor: IStatusBarEntryAccessor | undefined;

	constructor(
		@IStatusBarService private readonly statusBarService: IStatusBarService,
		@IDeBugService readonly deBugService: IDeBugService,
		@IConfigurationService readonly configurationService: IConfigurationService
	) {

		const addStatusBarEntry = () => {
			this.entryAccessor = this.statusBarService.addEntry(this.entry, 'status.deBug', nls.localize('status.deBug', "DeBug"), StatusBarAlignment.LEFT, 30 /* Low Priority */);
		};

		const setShowInStatusBar = () => {
			this.showInStatusBar = configurationService.getValue<IDeBugConfiguration>('deBug').showInStatusBar;
			if (this.showInStatusBar === 'always' && !this.entryAccessor) {
				addStatusBarEntry();
			}
		};
		setShowInStatusBar();

		this.toDispose.push(this.deBugService.onDidChangeState(state => {
			if (state !== State.Inactive && this.showInStatusBar === 'onFirstSessionStart' && !this.entryAccessor) {
				addStatusBarEntry();
			}
		}));
		this.toDispose.push(configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('deBug.showInStatusBar')) {
				setShowInStatusBar();
				if (this.entryAccessor && this.showInStatusBar === 'never') {
					this.entryAccessor.dispose();
					this.entryAccessor = undefined;
				}
			}
		}));
		this.toDispose.push(this.deBugService.getConfigurationManager().onDidSelectConfiguration(e => {
			if (this.entryAccessor) {
				this.entryAccessor.update(this.entry);
			}
		}));
	}

	private get entry(): IStatusBarEntry {
		let text = '';
		const manager = this.deBugService.getConfigurationManager();
		const name = manager.selectedConfiguration.name || '';
		const nameAndLaunchPresent = name && manager.selectedConfiguration.launch;
		if (nameAndLaunchPresent) {
			text = (manager.getLaunches().length > 1 ? `${name} (${manager.selectedConfiguration.launch!.name})` : name);
		}

		return {
			text: '$(deBug-alt-small) ' + text,
			ariaLaBel: nls.localize('deBugTarget', "DeBug: {0}", text),
			tooltip: nls.localize('selectAndStartDeBug', "Select and start deBug configuration"),
			command: 'workBench.action.deBug.selectandstart'
		};
	}

	dispose(): void {
		if (this.entryAccessor) {
			this.entryAccessor.dispose();
		}
		dispose(this.toDispose);
	}
}
