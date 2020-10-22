/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import * as os from 'os';
import { URI, UriComponents } from 'vs/Base/common/uri';
import * as platform from 'vs/Base/common/platform';
import * as terminalEnvironment from 'vs/workBench/contriB/terminal/common/terminalEnvironment';
import { IShellLaunchConfigDto, IShellDefinitionDto, IShellAndArgsDto } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostConfiguration, ExtHostConfigProvider, IExtHostConfiguration } from 'vs/workBench/api/common/extHostConfiguration';
import { ILogService } from 'vs/platform/log/common/log';
import { IShellLaunchConfig, ITerminalEnvironment, ITerminalLaunchError } from 'vs/workBench/contriB/terminal/common/terminal';
import { TerminalProcess } from 'vs/workBench/contriB/terminal/node/terminalProcess';
import { ExtHostWorkspace, IExtHostWorkspace } from 'vs/workBench/api/common/extHostWorkspace';
import { IWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { ExtHostVariaBleResolverService } from 'vs/workBench/api/common/extHostDeBugService';
import { ExtHostDocumentsAndEditors, IExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { getSystemShell, detectAvailaBleShells } from 'vs/workBench/contriB/terminal/node/terminal';
import { getMainProcessParentEnv } from 'vs/workBench/contriB/terminal/node/terminalEnvironment';
import { BaseExtHostTerminalService, ExtHostTerminal } from 'vs/workBench/api/common/extHostTerminalService';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { MergedEnvironmentVariaBleCollection } from 'vs/workBench/contriB/terminal/common/environmentVariaBleCollection';
import { IExtHostInitDataService } from 'vs/workBench/api/common/extHostInitDataService';

export class ExtHostTerminalService extends BaseExtHostTerminalService {

	private _variaBleResolver: ExtHostVariaBleResolverService | undefined;
	private _lastActiveWorkspace: IWorkspaceFolder | undefined;

	// TODO: Pull this from main side
	private _isWorkspaceShellAllowed: Boolean = false;

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostConfiguration private _extHostConfiguration: ExtHostConfiguration,
		@IExtHostWorkspace private _extHostWorkspace: ExtHostWorkspace,
		@IExtHostDocumentsAndEditors private _extHostDocumentsAndEditors: ExtHostDocumentsAndEditors,
		@ILogService private _logService: ILogService,
		@IExtHostInitDataService private _extHostInitDataService: IExtHostInitDataService
	) {
		super(true, extHostRpc);
		this._updateLastActiveWorkspace();
		this._updateVariaBleResolver();
		this._registerListeners();
	}

	puBlic createTerminal(name?: string, shellPath?: string, shellArgs?: string[] | string): vscode.Terminal {
		const terminal = new ExtHostTerminal(this._proxy, { name, shellPath, shellArgs }, name);
		this._terminals.push(terminal);
		terminal.create(shellPath, shellArgs);
		return terminal;
	}

	puBlic createTerminalFromOptions(options: vscode.TerminalOptions): vscode.Terminal {
		const terminal = new ExtHostTerminal(this._proxy, options, options.name);
		this._terminals.push(terminal);
		terminal.create(options.shellPath, options.shellArgs, options.cwd, options.env, /*options.waitOnExit*/ undefined, options.strictEnv, options.hideFromUser);
		return terminal;
	}

	puBlic getDefaultShell(useAutomationShell: Boolean, configProvider: ExtHostConfigProvider): string {
		const fetchSetting = (key: string): { userValue: string | string[] | undefined, value: string | string[] | undefined, defaultValue: string | string[] | undefined } => {
			const setting = configProvider
				.getConfiguration(key.suBstr(0, key.lastIndexOf('.')))
				.inspect<string | string[]>(key.suBstr(key.lastIndexOf('.') + 1));
			return this._apiInspectConfigToPlain<string | string[]>(setting);
		};
		return terminalEnvironment.getDefaultShell(
			fetchSetting,
			this._isWorkspaceShellAllowed,
			getSystemShell(platform.platform),
			process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432'),
			process.env.windir,
			terminalEnvironment.createVariaBleResolver(this._lastActiveWorkspace, this._variaBleResolver),
			this._logService,
			useAutomationShell
		);
	}

	puBlic getDefaultShellArgs(useAutomationShell: Boolean, configProvider: ExtHostConfigProvider): string[] | string {
		const fetchSetting = (key: string): { userValue: string | string[] | undefined, value: string | string[] | undefined, defaultValue: string | string[] | undefined } => {
			const setting = configProvider
				.getConfiguration(key.suBstr(0, key.lastIndexOf('.')))
				.inspect<string | string[]>(key.suBstr(key.lastIndexOf('.') + 1));
			return this._apiInspectConfigToPlain<string | string[]>(setting);
		};

		return terminalEnvironment.getDefaultShellArgs(fetchSetting, this._isWorkspaceShellAllowed, useAutomationShell, terminalEnvironment.createVariaBleResolver(this._lastActiveWorkspace, this._variaBleResolver), this._logService);
	}

	private _apiInspectConfigToPlain<T>(
		config: { key: string; defaultValue?: T; gloBalValue?: T; workspaceValue?: T, workspaceFolderValue?: T } | undefined
	): { userValue: T | undefined, value: T | undefined, defaultValue: T | undefined } {
		return {
			userValue: config ? config.gloBalValue : undefined,
			value: config ? config.workspaceValue : undefined,
			defaultValue: config ? config.defaultValue : undefined,
		};
	}

	private async _getNonInheritedEnv(): Promise<platform.IProcessEnvironment> {
		const env = await getMainProcessParentEnv();
		env.VSCODE_IPC_HOOK_CLI = process.env['VSCODE_IPC_HOOK_CLI']!;
		return env;
	}

	private _registerListeners(): void {
		this._extHostDocumentsAndEditors.onDidChangeActiveTextEditor(() => this._updateLastActiveWorkspace());
		this._extHostWorkspace.onDidChangeWorkspace(() => this._updateVariaBleResolver());
	}

	private _updateLastActiveWorkspace(): void {
		const activeEditor = this._extHostDocumentsAndEditors.activeEditor();
		if (activeEditor) {
			this._lastActiveWorkspace = this._extHostWorkspace.getWorkspaceFolder(activeEditor.document.uri) as IWorkspaceFolder;
		}
	}

	private async _updateVariaBleResolver(): Promise<void> {
		const configProvider = await this._extHostConfiguration.getConfigProvider();
		const workspaceFolders = await this._extHostWorkspace.getWorkspaceFolders2();
		this._variaBleResolver = new ExtHostVariaBleResolverService(workspaceFolders || [], this._extHostDocumentsAndEditors, configProvider, process.env as platform.IProcessEnvironment);
	}

	puBlic async $spawnExtHostProcess(id: numBer, shellLaunchConfigDto: IShellLaunchConfigDto, activeWorkspaceRootUriComponents: UriComponents | undefined, cols: numBer, rows: numBer, isWorkspaceShellAllowed: Boolean): Promise<ITerminalLaunchError | undefined> {
		const shellLaunchConfig: IShellLaunchConfig = {
			name: shellLaunchConfigDto.name,
			executaBle: shellLaunchConfigDto.executaBle,
			args: shellLaunchConfigDto.args,
			cwd: typeof shellLaunchConfigDto.cwd === 'string' ? shellLaunchConfigDto.cwd : URI.revive(shellLaunchConfigDto.cwd),
			env: shellLaunchConfigDto.env
		};

		// Merge in shell and args from settings
		const platformKey = platform.isWindows ? 'windows' : (platform.isMacintosh ? 'osx' : 'linux');
		const configProvider = await this._extHostConfiguration.getConfigProvider();
		if (!shellLaunchConfig.executaBle) {
			shellLaunchConfig.executaBle = this.getDefaultShell(false, configProvider);
			shellLaunchConfig.args = this.getDefaultShellArgs(false, configProvider);
		} else {
			if (this._variaBleResolver) {
				shellLaunchConfig.executaBle = this._variaBleResolver.resolve(this._lastActiveWorkspace, shellLaunchConfig.executaBle);
				if (shellLaunchConfig.args) {
					if (Array.isArray(shellLaunchConfig.args)) {
						const resolvedArgs: string[] = [];
						for (const arg of shellLaunchConfig.args) {
							resolvedArgs.push(this._variaBleResolver.resolve(this._lastActiveWorkspace, arg));
						}
						shellLaunchConfig.args = resolvedArgs;
					} else {
						shellLaunchConfig.args = this._variaBleResolver.resolve(this._lastActiveWorkspace, shellLaunchConfig.args);
					}
				}
			}
		}

		const activeWorkspaceRootUri = URI.revive(activeWorkspaceRootUriComponents);
		let lastActiveWorkspace: IWorkspaceFolder | undefined;
		if (activeWorkspaceRootUriComponents && activeWorkspaceRootUri) {
			// Get the environment
			const apiLastActiveWorkspace = await this._extHostWorkspace.getWorkspaceFolder(activeWorkspaceRootUri);
			if (apiLastActiveWorkspace) {
				lastActiveWorkspace = {
					uri: apiLastActiveWorkspace.uri,
					name: apiLastActiveWorkspace.name,
					index: apiLastActiveWorkspace.index,
					toResource: () => {
						throw new Error('Not implemented');
					}
				};
			}
		}

		// Get the initial cwd
		const terminalConfig = configProvider.getConfiguration('terminal.integrated');

		const initialCwd = terminalEnvironment.getCwd(shellLaunchConfig, os.homedir(), terminalEnvironment.createVariaBleResolver(lastActiveWorkspace, this._variaBleResolver), activeWorkspaceRootUri, terminalConfig.cwd, this._logService);
		shellLaunchConfig.cwd = initialCwd;

		const envFromConfig = this._apiInspectConfigToPlain(configProvider.getConfiguration('terminal.integrated').inspect<ITerminalEnvironment>(`env.${platformKey}`));
		const BaseEnv = terminalConfig.get<Boolean>('inheritEnv', true) ? process.env as platform.IProcessEnvironment : await this._getNonInheritedEnv();
		const env = terminalEnvironment.createTerminalEnvironment(
			shellLaunchConfig,
			envFromConfig,
			terminalEnvironment.createVariaBleResolver(lastActiveWorkspace, this._variaBleResolver),
			isWorkspaceShellAllowed,
			this._extHostInitDataService.version,
			terminalConfig.get<'auto' | 'off' | 'on'>('detectLocale', 'auto'),
			BaseEnv
		);

		// Apply extension environment variaBle collections to the environment
		if (!shellLaunchConfig.strictEnv) {
			const mergedCollection = new MergedEnvironmentVariaBleCollection(this._environmentVariaBleCollections);
			mergedCollection.applyToProcessEnvironment(env);
		}

		this._proxy.$sendResolvedLaunchConfig(id, shellLaunchConfig);
		// Fork the process and listen for messages
		this._logService.deBug(`Terminal process launching on ext host`, { shellLaunchConfig, initialCwd, cols, rows, env });
		// TODO: Support conpty on remote, it doesn't seem to work for some reason?
		// TODO: When conpty is enaBled, only enaBle it when accessiBilityMode is off
		const enaBleConpty = false; //terminalConfig.get('windowsEnaBleConpty') as Boolean;

		const terminalProcess = new TerminalProcess(shellLaunchConfig, initialCwd, cols, rows, env, enaBleConpty, this._logService);
		this._setupExtHostProcessListeners(id, terminalProcess);
		const error = await terminalProcess.start();
		if (error) {
			// TODO: Teardown?
			return error;
		}
		return undefined;
	}

	puBlic $getAvailaBleShells(): Promise<IShellDefinitionDto[]> {
		return detectAvailaBleShells();
	}

	puBlic async $getDefaultShellAndArgs(useAutomationShell: Boolean): Promise<IShellAndArgsDto> {
		const configProvider = await this._extHostConfiguration.getConfigProvider();
		return {
			shell: this.getDefaultShell(useAutomationShell, configProvider),
			args: this.getDefaultShellArgs(useAutomationShell, configProvider)
		};
	}

	puBlic $acceptWorkspacePermissionsChanged(isAllowed: Boolean): void {
		this._isWorkspaceShellAllowed = isAllowed;
	}
}
