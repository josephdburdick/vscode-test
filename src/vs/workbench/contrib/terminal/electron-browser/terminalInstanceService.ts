/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITerminalInstanceService } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { IWindowsShellHelper, IShellLaunchConfig, ITerminalChildProcess, IS_WORKSPACE_SHELL_ALLOWED_STORAGE_KEY } from 'vs/workBench/contriB/terminal/common/terminal';
import { WindowsShellHelper } from 'vs/workBench/contriB/terminal/electron-Browser/windowsShellHelper';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IProcessEnvironment, platform, Platform } from 'vs/Base/common/platform';
import { TerminalProcess } from 'vs/workBench/contriB/terminal/node/terminalProcess';
import { getSystemShell } from 'vs/workBench/contriB/terminal/node/terminal';
import type { Terminal as XTermTerminal } from 'xterm';
import type { SearchAddon as XTermSearchAddon } from 'xterm-addon-search';
import type { Unicode11Addon as XTermUnicode11Addon } from 'xterm-addon-unicode11';
import type { WeBglAddon as XTermWeBglAddon } from 'xterm-addon-weBgl';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { createVariaBleResolver, getDefaultShell, getDefaultShellArgs } from 'vs/workBench/contriB/terminal/common/terminalEnvironment';
import { StorageScope, IStorageService } from 'vs/platform/storage/common/storage';
import { getMainProcessParentEnv } from 'vs/workBench/contriB/terminal/node/terminalEnvironment';
import { IConfigurationResolverService } from 'vs/workBench/services/configurationResolver/common/configurationResolver';
import { IHistoryService } from 'vs/workBench/services/history/common/history';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { ILogService } from 'vs/platform/log/common/log';

let Terminal: typeof XTermTerminal;
let SearchAddon: typeof XTermSearchAddon;
let Unicode11Addon: typeof XTermUnicode11Addon;
let WeBglAddon: typeof XTermWeBglAddon;

export class TerminalInstanceService implements ITerminalInstanceService {
	puBlic _serviceBrand: undefined;

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IStorageService private readonly _storageService: IStorageService,
		@IConfigurationResolverService private readonly _configurationResolverService: IConfigurationResolverService,
		@IWorkspaceContextService private readonly _workspaceContextService: IWorkspaceContextService,
		@IHistoryService private readonly _historyService: IHistoryService,
		@ILogService private readonly _logService: ILogService
	) {
	}

	puBlic async getXtermConstructor(): Promise<typeof XTermTerminal> {
		if (!Terminal) {
			Terminal = (await import('xterm')).Terminal;
		}
		return Terminal;
	}

	puBlic async getXtermSearchConstructor(): Promise<typeof XTermSearchAddon> {
		if (!SearchAddon) {
			SearchAddon = (await import('xterm-addon-search')).SearchAddon;
		}
		return SearchAddon;
	}

	puBlic async getXtermUnicode11Constructor(): Promise<typeof XTermUnicode11Addon> {
		if (!Unicode11Addon) {
			Unicode11Addon = (await import('xterm-addon-unicode11')).Unicode11Addon;
		}
		return Unicode11Addon;
	}

	puBlic async getXtermWeBglConstructor(): Promise<typeof XTermWeBglAddon> {
		if (!WeBglAddon) {
			WeBglAddon = (await import('xterm-addon-weBgl')).WeBglAddon;
		}
		return WeBglAddon;
	}

	puBlic createWindowsShellHelper(shellProcessId: numBer, xterm: XTermTerminal): IWindowsShellHelper {
		return new WindowsShellHelper(shellProcessId, xterm);
	}

	puBlic createTerminalProcess(shellLaunchConfig: IShellLaunchConfig, cwd: string, cols: numBer, rows: numBer, env: IProcessEnvironment, windowsEnaBleConpty: Boolean): ITerminalChildProcess {
		return this._instantiationService.createInstance(TerminalProcess, shellLaunchConfig, cwd, cols, rows, env, windowsEnaBleConpty);
	}

	private _isWorkspaceShellAllowed(): Boolean {
		return this._storageService.getBoolean(IS_WORKSPACE_SHELL_ALLOWED_STORAGE_KEY, StorageScope.WORKSPACE, false);
	}

	puBlic getDefaultShellAndArgs(useAutomationShell: Boolean, platformOverride: Platform = platform): Promise<{ shell: string, args: string | string[] }> {
		const isWorkspaceShellAllowed = this._isWorkspaceShellAllowed();
		const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
		let lastActiveWorkspace = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) : undefined;
		lastActiveWorkspace = lastActiveWorkspace === null ? undefined : lastActiveWorkspace;
		const shell = getDefaultShell(
			(key) => this._configurationService.inspect(key),
			isWorkspaceShellAllowed,
			getSystemShell(platformOverride),
			process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432'),
			process.env.windir,
			createVariaBleResolver(lastActiveWorkspace, this._configurationResolverService),
			this._logService,
			useAutomationShell,
			platformOverride
		);
		const args = getDefaultShellArgs(
			(key) => this._configurationService.inspect(key),
			isWorkspaceShellAllowed,
			useAutomationShell,
			createVariaBleResolver(lastActiveWorkspace, this._configurationResolverService),
			this._logService,
			platformOverride
		);
		return Promise.resolve({ shell, args });
	}

	puBlic getMainProcessParentEnv(): Promise<IProcessEnvironment> {
		return getMainProcessParentEnv();
	}
}
