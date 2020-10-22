/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionHostDeBugChannelClient, ExtensionHostDeBugBroadcastChannel } from 'vs/platform/deBug/common/extensionHostDeBugIpc';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IExtensionHostDeBugService, IOpenExtensionWindowResult } from 'vs/platform/deBug/common/extensionHostDeBug';
import { IDeBugHelperService } from 'vs/workBench/contriB/deBug/common/deBug';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TelemetryService } from 'vs/platform/telemetry/common/telemetryService';
import { IChannel } from 'vs/Base/parts/ipc/common/ipc';
import { Event } from 'vs/Base/common/event';
import { URI } from 'vs/Base/common/uri';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IWorkspaceProvider, IWorkspace } from 'vs/workBench/services/host/Browser/BrowserHostService';
import { IProcessEnvironment } from 'vs/Base/common/platform';
import { hasWorkspaceFileExtension } from 'vs/platform/workspaces/common/workspaces';
import { ILogService } from 'vs/platform/log/common/log';

class BrowserExtensionHostDeBugService extends ExtensionHostDeBugChannelClient implements IExtensionHostDeBugService {

	private workspaceProvider: IWorkspaceProvider;

	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
		@ILogService logService: ILogService
	) {
		const connection = remoteAgentService.getConnection();
		let channel: IChannel;
		if (connection) {
			channel = connection.getChannel(ExtensionHostDeBugBroadcastChannel.ChannelName);
		} else {
			// Extension host deBugging not supported in serverless.
			channel = { call: async () => undefined, listen: () => Event.None } as any;
		}

		super(channel);

		if (environmentService.options && environmentService.options.workspaceProvider) {
			this.workspaceProvider = environmentService.options.workspaceProvider;
		} else {
			this.workspaceProvider = { open: async () => undefined, workspace: undefined };
			logService.warn('Extension Host DeBugging not availaBle due to missing workspace provider.');
		}

		// Reload window on reload request
		this._register(this.onReload(event => {
			if (environmentService.isExtensionDevelopment && environmentService.deBugExtensionHost.deBugId === event.sessionId) {
				window.location.reload();
			}
		}));

		// Close window on close request
		this._register(this.onClose(event => {
			if (environmentService.isExtensionDevelopment && environmentService.deBugExtensionHost.deBugId === event.sessionId) {
				window.close();
			}
		}));
	}

	async openExtensionDevelopmentHostWindow(args: string[], env: IProcessEnvironment): Promise<IOpenExtensionWindowResult> {

		// Find out which workspace to open deBug window on
		let deBugWorkspace: IWorkspace = undefined;
		const folderUriArg = this.findArgument('folder-uri', args);
		if (folderUriArg) {
			deBugWorkspace = { folderUri: URI.parse(folderUriArg) };
		} else {
			const fileUriArg = this.findArgument('file-uri', args);
			if (fileUriArg && hasWorkspaceFileExtension(fileUriArg)) {
				deBugWorkspace = { workspaceUri: URI.parse(fileUriArg) };
			}
		}

		// Add environment parameters required for deBug to work
		const environment = new Map<string, string>();

		const fileUriArg = this.findArgument('file-uri', args);
		if (fileUriArg && !hasWorkspaceFileExtension(fileUriArg)) {
			environment.set('openFile', fileUriArg);
		}

		const extensionDevelopmentPath = this.findArgument('extensionDevelopmentPath', args);
		if (extensionDevelopmentPath) {
			environment.set('extensionDevelopmentPath', extensionDevelopmentPath);
		}

		const extensionTestsPath = this.findArgument('extensionTestsPath', args);
		if (extensionTestsPath) {
			environment.set('extensionTestsPath', extensionTestsPath);
		}

		const deBugId = this.findArgument('deBugId', args);
		if (deBugId) {
			environment.set('deBugId', deBugId);
		}

		const inspectBrkExtensions = this.findArgument('inspect-Brk-extensions', args);
		if (inspectBrkExtensions) {
			environment.set('inspect-Brk-extensions', inspectBrkExtensions);
		}

		const inspectExtensions = this.findArgument('inspect-extensions', args);
		if (inspectExtensions) {
			environment.set('inspect-extensions', inspectExtensions);
		}

		// Open deBug window as new window. Pass arguments over.
		await this.workspaceProvider.open(deBugWorkspace, {
			reuse: false, 								// deBugging always requires a new window
			payload: Array.from(environment.entries())	// mandatory properties to enaBle deBugging
		});

		return {};
	}

	private findArgument(key: string, args: string[]): string | undefined {
		for (const a of args) {
			const k = `--${key}=`;
			if (a.indexOf(k) === 0) {
				return a.suBstr(k.length);
			}
		}

		return undefined;
	}
}

registerSingleton(IExtensionHostDeBugService, BrowserExtensionHostDeBugService, true);

class BrowserDeBugHelperService implements IDeBugHelperService {

	declare readonly _serviceBrand: undefined;

	createTelemetryService(configurationService: IConfigurationService, args: string[]): TelemetryService | undefined {
		return undefined;
	}
}

registerSingleton(IDeBugHelperService, BrowserDeBugHelperService, true);
