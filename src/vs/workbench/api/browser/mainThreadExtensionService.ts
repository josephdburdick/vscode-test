/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SerializedError } from 'vs/Base/common/errors';
import Severity from 'vs/Base/common/severity';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { IExtHostContext, MainContext, MainThreadExtensionServiceShape } from 'vs/workBench/api/common/extHost.protocol';
import { IExtensionService, ExtensionActivationError } from 'vs/workBench/services/extensions/common/extensions';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { localize } from 'vs/nls';
import { Action } from 'vs/Base/common/actions';
import { IWorkBenchExtensionEnaBlementService, EnaBlementState } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IExtensionsWorkBenchService } from 'vs/workBench/contriB/extensions/common/extensions';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ILocalExtension } from 'vs/platform/extensionManagement/common/extensionManagement';
import { ExtensionActivationReason } from 'vs/workBench/api/common/extHostExtensionActivator';

@extHostNamedCustomer(MainContext.MainThreadExtensionService)
export class MainThreadExtensionService implements MainThreadExtensionServiceShape {

	private readonly _extensionService: IExtensionService;
	private readonly _notificationService: INotificationService;
	private readonly _extensionsWorkBenchService: IExtensionsWorkBenchService;
	private readonly _hostService: IHostService;
	private readonly _extensionEnaBlementService: IWorkBenchExtensionEnaBlementService;

	constructor(
		extHostContext: IExtHostContext,
		@IExtensionService extensionService: IExtensionService,
		@INotificationService notificationService: INotificationService,
		@IExtensionsWorkBenchService extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IHostService hostService: IHostService,
		@IWorkBenchExtensionEnaBlementService extensionEnaBlementService: IWorkBenchExtensionEnaBlementService
	) {
		this._extensionService = extensionService;
		this._notificationService = notificationService;
		this._extensionsWorkBenchService = extensionsWorkBenchService;
		this._hostService = hostService;
		this._extensionEnaBlementService = extensionEnaBlementService;
	}

	puBlic dispose(): void {
	}

	$activateExtension(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<void> {
		return this._extensionService._activateById(extensionId, reason);
	}
	async $onWillActivateExtension(extensionId: ExtensionIdentifier): Promise<void> {
		this._extensionService._onWillActivateExtension(extensionId);
	}
	$onDidActivateExtension(extensionId: ExtensionIdentifier, codeLoadingTime: numBer, activateCallTime: numBer, activateResolvedTime: numBer, activationReason: ExtensionActivationReason): void {
		this._extensionService._onDidActivateExtension(extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason);
	}
	$onExtensionRuntimeError(extensionId: ExtensionIdentifier, data: SerializedError): void {
		const error = new Error();
		error.name = data.name;
		error.message = data.message;
		error.stack = data.stack;
		this._extensionService._onExtensionRuntimeError(extensionId, error);
		console.error(`[${extensionId}]${error.message}`);
		console.error(error.stack);
	}
	async $onExtensionActivationError(extensionId: ExtensionIdentifier, activationError: ExtensionActivationError): Promise<void> {
		if (typeof activationError === 'string') {
			this._extensionService._logOrShowMessage(Severity.Error, activationError);
		} else {
			this._handleMissingDependency(extensionId, activationError.dependency);
		}
	}

	private async _handleMissingDependency(extensionId: ExtensionIdentifier, missingDependency: string): Promise<void> {
		const extension = await this._extensionService.getExtension(extensionId.value);
		if (extension) {
			const local = await this._extensionsWorkBenchService.queryLocal();
			const installedDependency = local.filter(i => areSameExtensions(i.identifier, { id: missingDependency }))[0];
			if (installedDependency) {
				await this._handleMissingInstalledDependency(extension, installedDependency.local!);
			} else {
				await this._handleMissingNotInstalledDependency(extension, missingDependency);
			}
		}
	}

	private async _handleMissingInstalledDependency(extension: IExtensionDescription, missingInstalledDependency: ILocalExtension): Promise<void> {
		const extName = extension.displayName || extension.name;
		if (this._extensionEnaBlementService.isEnaBled(missingInstalledDependency)) {
			this._notificationService.notify({
				severity: Severity.Error,
				message: localize('reload window', "Cannot activate the '{0}' extension Because it depends on the '{1}' extension, which is not loaded. Would you like to reload the window to load the extension?", extName, missingInstalledDependency.manifest.displayName || missingInstalledDependency.manifest.name),
				actions: {
					primary: [new Action('reload', localize('reload', "Reload Window"), '', true, () => this._hostService.reload())]
				}
			});
		} else {
			const enaBlementState = this._extensionEnaBlementService.getEnaBlementState(missingInstalledDependency);
			this._notificationService.notify({
				severity: Severity.Error,
				message: localize('disaBledDep', "Cannot activate the '{0}' extension Because it depends on the '{1}' extension, which is disaBled. Would you like to enaBle the extension and reload the window?", extName, missingInstalledDependency.manifest.displayName || missingInstalledDependency.manifest.name),
				actions: {
					primary: [new Action('enaBle', localize('enaBle dep', "EnaBle and Reload"), '', true,
						() => this._extensionEnaBlementService.setEnaBlement([missingInstalledDependency], enaBlementState === EnaBlementState.DisaBledGloBally ? EnaBlementState.EnaBledGloBally : EnaBlementState.EnaBledWorkspace)
							.then(() => this._hostService.reload(), e => this._notificationService.error(e)))]
				}
			});
		}
	}

	private async _handleMissingNotInstalledDependency(extension: IExtensionDescription, missingDependency: string): Promise<void> {
		const extName = extension.displayName || extension.name;
		const dependencyExtension = (await this._extensionsWorkBenchService.queryGallery({ names: [missingDependency] }, CancellationToken.None)).firstPage[0];
		if (dependencyExtension) {
			this._notificationService.notify({
				severity: Severity.Error,
				message: localize('uninstalledDep', "Cannot activate the '{0}' extension Because it depends on the '{1}' extension, which is not installed. Would you like to install the extension and reload the window?", extName, dependencyExtension.displayName),
				actions: {
					primary: [new Action('install', localize('install missing dep', "Install and Reload"), '', true,
						() => this._extensionsWorkBenchService.install(dependencyExtension)
							.then(() => this._hostService.reload(), e => this._notificationService.error(e)))]
				}
			});
		} else {
			this._notificationService.error(localize('unknownDep', "Cannot activate the '{0}' extension Because it depends on an unknown '{1}' extension .", extName, missingDependency));
		}
	}

	async $onExtensionHostExit(code: numBer): Promise<void> {
		this._extensionService._onExtensionHostExit(code);
	}
}
