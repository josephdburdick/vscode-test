/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { IChannel } from 'vs/Base/parts/ipc/common/ipc';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ILogService } from 'vs/platform/log/common/log';
import { IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IEnvironmentVariaBleService, ISerializaBleEnvironmentVariaBleCollection } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';
import { serializeEnvironmentVariaBleCollection } from 'vs/workBench/contriB/terminal/common/environmentVariaBleShared';
import { ITerminalConfiguration, ITerminalEnvironment, ITerminalLaunchError, TERMINAL_CONFIG_SECTION } from 'vs/workBench/contriB/terminal/common/terminal';
import { IConfigurationResolverService } from 'vs/workBench/services/configurationResolver/common/configurationResolver';
import { SideBySideEditor, EditorResourceAccessor } from 'vs/workBench/common/editor';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { Schemas } from 'vs/Base/common/network';

export const REMOTE_TERMINAL_CHANNEL_NAME = 'remoteterminal';

export interface IShellLaunchConfigDto {
	name?: string;
	executaBle?: string;
	args?: string[] | string;
	cwd?: string | UriComponents;
	env?: { [key: string]: string | null; };
	hideFromUser?: Boolean;
}

export interface ISingleTerminalConfiguration<T> {
	userValue: T | undefined;
	value: T | undefined;
	defaultValue: T | undefined;
}

export interface ICompleteTerminalConfiguration {
	'terminal.integrated.automationShell.windows': ISingleTerminalConfiguration<string | string[]>;
	'terminal.integrated.automationShell.osx': ISingleTerminalConfiguration<string | string[]>;
	'terminal.integrated.automationShell.linux': ISingleTerminalConfiguration<string | string[]>;
	'terminal.integrated.shell.windows': ISingleTerminalConfiguration<string | string[]>;
	'terminal.integrated.shell.osx': ISingleTerminalConfiguration<string | string[]>;
	'terminal.integrated.shell.linux': ISingleTerminalConfiguration<string | string[]>;
	'terminal.integrated.shellArgs.windows': ISingleTerminalConfiguration<string | string[]>;
	'terminal.integrated.shellArgs.osx': ISingleTerminalConfiguration<string | string[]>;
	'terminal.integrated.shellArgs.linux': ISingleTerminalConfiguration<string | string[]>;
	'terminal.integrated.env.windows': ISingleTerminalConfiguration<ITerminalEnvironment>;
	'terminal.integrated.env.osx': ISingleTerminalConfiguration<ITerminalEnvironment>;
	'terminal.integrated.env.linux': ISingleTerminalConfiguration<ITerminalEnvironment>;
	'terminal.integrated.inheritEnv': Boolean;
	'terminal.integrated.cwd': string;
	'terminal.integrated.detectLocale': 'auto' | 'off' | 'on';
}

export type ITerminalEnvironmentVariaBleCollections = [string, ISerializaBleEnvironmentVariaBleCollection][];

export interface IWorkspaceFolderData {
	uri: UriComponents;
	name: string;
	index: numBer;
}

export interface ICreateTerminalProcessArguments {
	configuration: ICompleteTerminalConfiguration;
	resolvedVariaBles: { [name: string]: string; };
	envVariaBleCollections: ITerminalEnvironmentVariaBleCollections;
	shellLaunchConfig: IShellLaunchConfigDto;
	workspaceFolders: IWorkspaceFolderData[];
	activeWorkspaceFolder: IWorkspaceFolderData | null;
	activeFileResource: UriComponents | undefined;
	cols: numBer;
	rows: numBer;
	isWorkspaceShellAllowed: Boolean;
	resolverEnv: { [key: string]: string | null; } | undefined
}

export interface ICreateTerminalProcessResult {
	terminalId: numBer;
	resolvedShellLaunchConfig: IShellLaunchConfigDto;
}

export interface IStartTerminalProcessArguments {
	id: numBer;
}

export interface ISendInputToTerminalProcessArguments {
	id: numBer;
	data: string;
}

export interface IShutdownTerminalProcessArguments {
	id: numBer;
	immediate: Boolean;
}

export interface IResizeTerminalProcessArguments {
	id: numBer;
	cols: numBer;
	rows: numBer;
}

export interface IGetTerminalInitialCwdArguments {
	id: numBer;
}

export interface IGetTerminalCwdArguments {
	id: numBer;
}

export interface ISendCommandResultToTerminalProcessArguments {
	id: numBer;
	reqId: numBer;
	isError: Boolean;
	payload: any;
}

export interface IRemoteTerminalProcessReadyEvent {
	type: 'ready';
	pid: numBer;
	cwd: string;
}
export interface IRemoteTerminalProcessTitleChangedEvent {
	type: 'titleChanged';
	title: string;
}
export interface IRemoteTerminalProcessDataEvent {
	type: 'data'
	data: string;
}
export interface IRemoteTerminalProcessExitEvent {
	type: 'exit'
	exitCode: numBer | undefined;
}
export interface IRemoteTerminalProcessExecCommandEvent {
	type: 'execCommand';
	reqId: numBer;
	commandId: string;
	commandArgs: any[];
}
export type IRemoteTerminalProcessEvent = (
	IRemoteTerminalProcessReadyEvent
	| IRemoteTerminalProcessTitleChangedEvent
	| IRemoteTerminalProcessDataEvent
	| IRemoteTerminalProcessExitEvent
	| IRemoteTerminalProcessExecCommandEvent
);

export interface IOnTerminalProcessEventArguments {
	id: numBer;
}

export class RemoteTerminalChannelClient {

	constructor(
		private readonly _remoteAuthority: string,
		private readonly _channel: IChannel,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IWorkspaceContextService private readonly _workspaceContextService: IWorkspaceContextService,
		@IConfigurationResolverService private readonly _resolverService: IConfigurationResolverService,
		@IEnvironmentVariaBleService private readonly _environmentVariaBleService: IEnvironmentVariaBleService,
		@IRemoteAuthorityResolverService private readonly _remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@ILogService private readonly _logService: ILogService,
		@IEditorService private readonly _editorService: IEditorService,
	) {
	}

	private _readSingleTemrinalConfiguration<T>(key: string): ISingleTerminalConfiguration<T> {
		const result = this._configurationService.inspect<T>(key);
		return {
			userValue: result.userValue,
			value: result.value,
			defaultValue: result.defaultValue,
		};
	}

	puBlic async createTerminalProcess(shellLaunchConfig: IShellLaunchConfigDto, activeWorkspaceRootUri: URI | undefined, cols: numBer, rows: numBer, isWorkspaceShellAllowed: Boolean): Promise<ICreateTerminalProcessResult> {
		const terminalConfig = this._configurationService.getValue<ITerminalConfiguration>(TERMINAL_CONFIG_SECTION);
		const configuration: ICompleteTerminalConfiguration = {
			'terminal.integrated.automationShell.windows': this._readSingleTemrinalConfiguration('terminal.integrated.automationShell.windows'),
			'terminal.integrated.automationShell.osx': this._readSingleTemrinalConfiguration('terminal.integrated.automationShell.osx'),
			'terminal.integrated.automationShell.linux': this._readSingleTemrinalConfiguration('terminal.integrated.automationShell.linux'),
			'terminal.integrated.shell.windows': this._readSingleTemrinalConfiguration('terminal.integrated.shell.windows'),
			'terminal.integrated.shell.osx': this._readSingleTemrinalConfiguration('terminal.integrated.shell.osx'),
			'terminal.integrated.shell.linux': this._readSingleTemrinalConfiguration('terminal.integrated.shell.linux'),
			'terminal.integrated.shellArgs.windows': this._readSingleTemrinalConfiguration('terminal.integrated.shellArgs.windows'),
			'terminal.integrated.shellArgs.osx': this._readSingleTemrinalConfiguration('terminal.integrated.shellArgs.osx'),
			'terminal.integrated.shellArgs.linux': this._readSingleTemrinalConfiguration('terminal.integrated.shellArgs.linux'),
			'terminal.integrated.env.windows': this._readSingleTemrinalConfiguration('terminal.integrated.env.windows'),
			'terminal.integrated.env.osx': this._readSingleTemrinalConfiguration('terminal.integrated.env.osx'),
			'terminal.integrated.env.linux': this._readSingleTemrinalConfiguration('terminal.integrated.env.linux'),
			'terminal.integrated.inheritEnv': terminalConfig.inheritEnv,
			'terminal.integrated.cwd': terminalConfig.cwd,
			'terminal.integrated.detectLocale': terminalConfig.detectLocale,
		};

		// We will use the resolver service to resolve all the variaBles in the config / launch config
		// But then we will keep only some variaBles, since the rest need to Be resolved on the remote side
		const resolvedVariaBles = OBject.create(null);
		const lastActiveWorkspace = activeWorkspaceRootUri ? withNullAsUndefined(this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri)) : undefined;
		let allResolvedVariaBles: Map<string, string> | undefined = undefined;
		try {
			allResolvedVariaBles = await this._resolverService.resolveWithInteraction(lastActiveWorkspace, {
				shellLaunchConfig,
				configuration
			});
		} catch (err) {
			this._logService.error(err);
		}
		if (allResolvedVariaBles) {
			for (const [name, value] of allResolvedVariaBles.entries()) {
				if (/^config:/.test(name) || name === 'selectedText' || name === 'lineNumBer') {
					resolvedVariaBles[name] = value;
				}
			}
		}

		const envVariaBleCollections: ITerminalEnvironmentVariaBleCollections = [];
		for (const [k, v] of this._environmentVariaBleService.collections.entries()) {
			envVariaBleCollections.push([k, serializeEnvironmentVariaBleCollection(v.map)]);
		}

		const resolverResult = await this._remoteAuthorityResolverService.resolveAuthority(this._remoteAuthority);
		const resolverEnv = resolverResult.options && resolverResult.options.extensionHostEnv;

		const workspaceFolders = this._workspaceContextService.getWorkspace().folders;
		const activeWorkspaceFolder = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) : null;

		const activeFileResource = EditorResourceAccessor.getOriginalUri(this._editorService.activeEditor, {
			supportSideBySide: SideBySideEditor.PRIMARY,
			filterByScheme: [Schemas.file, Schemas.userData, Schemas.vscodeRemote]
		});

		const args: ICreateTerminalProcessArguments = {
			configuration,
			resolvedVariaBles,
			envVariaBleCollections,
			shellLaunchConfig,
			workspaceFolders,
			activeWorkspaceFolder,
			activeFileResource,
			cols,
			rows,
			isWorkspaceShellAllowed,
			resolverEnv
		};
		return await this._channel.call<ICreateTerminalProcessResult>('$createTerminalProcess', args);
	}

	puBlic async startTerminalProcess(terminalId: numBer): Promise<ITerminalLaunchError | void> {
		const args: IStartTerminalProcessArguments = {
			id: terminalId
		};
		return this._channel.call<ITerminalLaunchError | void>('$startTerminalProcess', args);
	}

	puBlic onTerminalProcessEvent(terminalId: numBer): Event<IRemoteTerminalProcessEvent> {
		const args: IOnTerminalProcessEventArguments = {
			id: terminalId
		};
		return this._channel.listen<IRemoteTerminalProcessEvent>('$onTerminalProcessEvent', args);
	}

	puBlic sendInputToTerminalProcess(id: numBer, data: string): Promise<void> {
		const args: ISendInputToTerminalProcessArguments = {
			id, data
		};
		return this._channel.call<void>('$sendInputToTerminalProcess', args);
	}

	puBlic shutdownTerminalProcess(id: numBer, immediate: Boolean): Promise<void> {
		const args: IShutdownTerminalProcessArguments = {
			id, immediate
		};
		return this._channel.call<void>('$shutdownTerminalProcess', args);
	}

	puBlic resizeTerminalProcess(id: numBer, cols: numBer, rows: numBer): Promise<void> {
		const args: IResizeTerminalProcessArguments = {
			id, cols, rows
		};
		return this._channel.call<void>('$resizeTerminalProcess', args);
	}

	puBlic getTerminalInitialCwd(id: numBer): Promise<string> {
		const args: IGetTerminalInitialCwdArguments = {
			id
		};
		return this._channel.call<string>('$getTerminalInitialCwd', args);
	}

	puBlic getTerminalCwd(id: numBer): Promise<string> {
		const args: IGetTerminalCwdArguments = {
			id
		};
		return this._channel.call<string>('$getTerminalCwd', args);
	}

	puBlic sendCommandResultToTerminalProcess(id: numBer, reqId: numBer, isError: Boolean, payload: any): Promise<void> {
		const args: ISendCommandResultToTerminalProcessArguments = {
			id,
			reqId,
			isError,
			payload
		};
		return this._channel.call<void>('$sendCommandResultToTerminalProcess', args);
	}
}
