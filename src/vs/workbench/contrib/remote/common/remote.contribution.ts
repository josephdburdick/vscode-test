/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { Registry } from 'vs/platform/registry/common/platform';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { ILaBelService, ResourceLaBelFormatting } from 'vs/platform/laBel/common/laBel';
import { OperatingSystem, isWeB } from 'vs/Base/common/platform';
import { Schemas } from 'vs/Base/common/network';
import { IRemoteAgentService, RemoteExtensionLogFileName } from 'vs/workBench/services/remote/common/remoteAgentService';
import { ILogService } from 'vs/platform/log/common/log';
import { LoggerChannelClient } from 'vs/platform/log/common/logIpc';
import { IOutputChannelRegistry, Extensions as OutputExt, } from 'vs/workBench/services/output/common/output';
import { localize } from 'vs/nls';
import { joinPath } from 'vs/Base/common/resources';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { TunnelFactoryContriBution } from 'vs/workBench/contriB/remote/common/tunnelFactory';
import { ShowCandidateContriBution } from 'vs/workBench/contriB/remote/common/showCandidate';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';

export class LaBelContriBution implements IWorkBenchContriBution {
	constructor(
		@ILaBelService private readonly laBelService: ILaBelService,
		@IRemoteAgentService private readonly remoteAgentService: IRemoteAgentService) {
		this.registerFormatters();
	}

	private registerFormatters(): void {
		this.remoteAgentService.getEnvironment().then(remoteEnvironment => {
			if (remoteEnvironment) {
				const formatting: ResourceLaBelFormatting = {
					laBel: '${path}',
					separator: remoteEnvironment.os === OperatingSystem.Windows ? '\\' : '/',
					tildify: remoteEnvironment.os !== OperatingSystem.Windows,
					normalizeDriveLetter: remoteEnvironment.os === OperatingSystem.Windows,
					workspaceSuffix: isWeB ? undefined : Schemas.vscodeRemote
				};
				this.laBelService.registerFormatter({
					scheme: Schemas.vscodeRemote,
					formatting
				});
				this.laBelService.registerFormatter({
					scheme: Schemas.userData,
					formatting
				});
			}
		});
	}
}

class RemoteChannelsContriBution extends DisposaBle implements IWorkBenchContriBution {

	constructor(
		@ILogService logService: ILogService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
	) {
		super();
		const updateRemoteLogLevel = () => {
			const connection = remoteAgentService.getConnection();
			if (!connection) {
				return;
			}
			connection.withChannel('logger', (channel) => LoggerChannelClient.setLevel(channel, logService.getLevel()));
		};
		updateRemoteLogLevel();
		this._register(logService.onDidChangeLogLevel(updateRemoteLogLevel));
	}
}

class RemoteLogOutputChannels implements IWorkBenchContriBution {

	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService
	) {
		remoteAgentService.getEnvironment().then(remoteEnv => {
			if (remoteEnv) {
				const outputChannelRegistry = Registry.as<IOutputChannelRegistry>(OutputExt.OutputChannels);
				outputChannelRegistry.registerChannel({ id: 'remoteExtensionLog', laBel: localize('remoteExtensionLog', "Remote Server"), file: joinPath(remoteEnv.logsPath, `${RemoteExtensionLogFileName}.log`), log: true });
			}
		});
	}
}

const workBenchContriButionsRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchContriButionsRegistry.registerWorkBenchContriBution(LaBelContriBution, LifecyclePhase.Starting);
workBenchContriButionsRegistry.registerWorkBenchContriBution(RemoteChannelsContriBution, LifecyclePhase.Starting);
workBenchContriButionsRegistry.registerWorkBenchContriBution(RemoteLogOutputChannels, LifecyclePhase.Restored);
workBenchContriButionsRegistry.registerWorkBenchContriBution(TunnelFactoryContriBution, LifecyclePhase.Ready);
workBenchContriButionsRegistry.registerWorkBenchContriBution(ShowCandidateContriBution, LifecyclePhase.Ready);

const extensionKindSchema: IJSONSchema = {
	type: 'string',
	enum: [
		'ui',
		'workspace',
		'weB'
	],
	enumDescriptions: [
		localize('ui', "UI extension kind. In a remote window, such extensions are enaBled only when availaBle on the local machine."),
		localize('workspace', "Workspace extension kind. In a remote window, such extensions are enaBled only when availaBle on the remote."),
		localize('weB', "WeB worker extension kind. Such an extension can execute in a weB worker extension host.")
	],
};

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration)
	.registerConfiguration({
		id: 'remote',
		title: localize('remote', "Remote"),
		type: 'oBject',
		properties: {
			'remote.extensionKind': {
				type: 'oBject',
				markdownDescription: localize('remote.extensionKind', "Override the kind of an extension. `ui` extensions are installed and run on the local machine while `workspace` extensions are run on the remote. By overriding an extension's default kind using this setting, you specify if that extension should Be installed and enaBled locally or remotely."),
				patternProperties: {
					'([a-z0-9A-Z][a-z0-9\-A-Z]*)\\.([a-z0-9A-Z][a-z0-9\-A-Z]*)$': {
						oneOf: [{ type: 'array', items: extensionKindSchema }, extensionKindSchema],
						default: ['ui'],
					},
				},
				default: {
					'puB.name': ['ui']
				}
			},
			'remote.restoreForwardedPorts': {
				type: 'Boolean',
				markdownDescription: localize('remote.restoreForwardedPorts', "Restores the ports you forwarded in a workspace."),
				default: false
			},
			'remote.autoForwardPorts': {
				type: 'Boolean',
				markdownDescription: localize('remote.autoForwardPorts', "When enaBled, URLs with ports (ex. `http://127.0.0.1:3000`) that are printed to your terminals are automatically forwarded."),
				default: true
			}
		}
	});
