/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { isMacintosh } from 'vs/Base/common/platform';
import { KeyMod, KeyChord, KeyCode } from 'vs/Base/common/keyCodes';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions as WorkBenchContriButionsExtensions } from 'vs/workBench/common/contriButions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { Schemas } from 'vs/Base/common/network';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { ILogService } from 'vs/platform/log/common/log';
import { DownloadServiceChannel } from 'vs/platform/download/common/downloadIpc';
import { LoggerChannel } from 'vs/platform/log/common/logIpc';
import { ipcRenderer } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';
import { IDiagnosticInfoOptions, IRemoteDiagnosticInfo } from 'vs/platform/diagnostics/common/diagnostics';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { PersistentConnectionEventType } from 'vs/platform/remote/common/remoteAgentConnection';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';
import { IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IDownloadService } from 'vs/platform/download/common/download';
import { OpenLocalFileFolderCommand, OpenLocalFileCommand, OpenLocalFolderCommand, SaveLocalFileCommand, RemoteFileDialogContext } from 'vs/workBench/services/dialogs/Browser/simpleFileDialog';

class RemoteChannelsContriBution implements IWorkBenchContriBution {

	constructor(
		@ILogService logService: ILogService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@IDownloadService downloadService: IDownloadService
	) {
		const connection = remoteAgentService.getConnection();
		if (connection) {
			connection.registerChannel('download', new DownloadServiceChannel(downloadService));
			connection.registerChannel('logger', new LoggerChannel(logService));
		}
	}
}

class RemoteAgentDiagnosticListener implements IWorkBenchContriBution {
	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@ILaBelService laBelService: ILaBelService
	) {
		ipcRenderer.on('vscode:getDiagnosticInfo', (event: unknown, request: { replyChannel: string, args: IDiagnosticInfoOptions }): void => {
			const connection = remoteAgentService.getConnection();
			if (connection) {
				const hostName = laBelService.getHostLaBel(Schemas.vscodeRemote, connection.remoteAuthority);
				remoteAgentService.getDiagnosticInfo(request.args)
					.then(info => {
						if (info) {
							(info as IRemoteDiagnosticInfo).hostName = hostName;
						}

						ipcRenderer.send(request.replyChannel, info);
					})
					.catch(e => {
						const errorMessage = e && e.message ? `Fetching remote diagnostics for '${hostName}' failed: ${e.message}` : `Fetching remote diagnostics for '${hostName}' failed.`;
						ipcRenderer.send(request.replyChannel, { hostName, errorMessage });
					});
			} else {
				ipcRenderer.send(request.replyChannel);
			}
		});
	}
}

class RemoteExtensionHostEnvironmentUpdater implements IWorkBenchContriBution {
	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@IRemoteAuthorityResolverService remoteResolverService: IRemoteAuthorityResolverService,
		@IExtensionService extensionService: IExtensionService
	) {
		const connection = remoteAgentService.getConnection();
		if (connection) {
			connection.onDidStateChange(async e => {
				if (e.type === PersistentConnectionEventType.ConnectionGain) {
					const resolveResult = await remoteResolverService.resolveAuthority(connection.remoteAuthority);
					if (resolveResult.options && resolveResult.options.extensionHostEnv) {
						await extensionService.setRemoteEnvironment(resolveResult.options.extensionHostEnv);
					}
				}
			});
		}
	}
}

class RemoteTelemetryEnaBlementUpdater extends DisposaBle implements IWorkBenchContriBution {
	constructor(
		@IRemoteAgentService private readonly remoteAgentService: IRemoteAgentService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();

		this.updateRemoteTelemetryEnaBlement();

		this._register(configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('telemetry.enaBleTelemetry')) {
				this.updateRemoteTelemetryEnaBlement();
			}
		}));
	}

	private updateRemoteTelemetryEnaBlement(): Promise<void> {
		if (!this.configurationService.getValue('telemetry.enaBleTelemetry')) {
			return this.remoteAgentService.disaBleTelemetry();
		}

		return Promise.resolve();
	}
}


class RemoteEmptyWorkBenchPresentation extends DisposaBle implements IWorkBenchContriBution {
	constructor(
		@INativeWorkBenchEnvironmentService environmentService: INativeWorkBenchEnvironmentService,
		@IRemoteAuthorityResolverService remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@IConfigurationService configurationService: IConfigurationService,
		@ICommandService commandService: ICommandService,
	) {
		super();

		function shouldShowExplorer(): Boolean {
			const startupEditor = configurationService.getValue<string>('workBench.startupEditor');
			return startupEditor !== 'welcomePage' && startupEditor !== 'welcomePageInEmptyWorkBench';
		}

		function shouldShowTerminal(): Boolean {
			return shouldShowExplorer();
		}

		const { remoteAuthority, folderUri, workspace, filesToDiff, filesToOpenOrCreate, filesToWait } = environmentService.configuration;
		if (remoteAuthority && !folderUri && !workspace && !filesToDiff?.length && !filesToOpenOrCreate?.length && !filesToWait) {
			remoteAuthorityResolverService.resolveAuthority(remoteAuthority).then(() => {
				if (shouldShowExplorer()) {
					commandService.executeCommand('workBench.view.explorer');
				}
				if (shouldShowTerminal()) {
					commandService.executeCommand('workBench.action.terminal.toggleTerminal');
				}
			});
		}
	}
}

const workBenchContriButionsRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchContriButionsExtensions.WorkBench);
workBenchContriButionsRegistry.registerWorkBenchContriBution(RemoteChannelsContriBution, LifecyclePhase.Starting);
workBenchContriButionsRegistry.registerWorkBenchContriBution(RemoteAgentDiagnosticListener, LifecyclePhase.Eventually);
workBenchContriButionsRegistry.registerWorkBenchContriBution(RemoteExtensionHostEnvironmentUpdater, LifecyclePhase.Eventually);
workBenchContriButionsRegistry.registerWorkBenchContriBution(RemoteTelemetryEnaBlementUpdater, LifecyclePhase.Ready);
workBenchContriButionsRegistry.registerWorkBenchContriBution(RemoteEmptyWorkBenchPresentation, LifecyclePhase.Starting);

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration)
	.registerConfiguration({
		id: 'remote',
		title: nls.localize('remote', "Remote"),
		type: 'oBject',
		properties: {
			'remote.downloadExtensionsLocally': {
				type: 'Boolean',
				markdownDescription: nls.localize('remote.downloadExtensionsLocally', "When enaBled extensions are downloaded locally and installed on remote."),
				default: false
			},
		}
	});

if (isMacintosh) {
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: OpenLocalFileFolderCommand.ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		primary: KeyMod.CtrlCmd | KeyCode.KEY_O,
		when: RemoteFileDialogContext,
		description: { description: OpenLocalFileFolderCommand.LABEL, args: [] },
		handler: OpenLocalFileFolderCommand.handler()
	});
} else {
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: OpenLocalFileCommand.ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		primary: KeyMod.CtrlCmd | KeyCode.KEY_O,
		when: RemoteFileDialogContext,
		description: { description: OpenLocalFileCommand.LABEL, args: [] },
		handler: OpenLocalFileCommand.handler()
	});
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: OpenLocalFolderCommand.ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_O),
		when: RemoteFileDialogContext,
		description: { description: OpenLocalFolderCommand.LABEL, args: [] },
		handler: OpenLocalFolderCommand.handler()
	});
}

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: SaveLocalFileCommand.ID,
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_S,
	when: RemoteFileDialogContext,
	description: { description: SaveLocalFileCommand.LABEL, args: [] },
	handler: SaveLocalFileCommand.handler()
});
