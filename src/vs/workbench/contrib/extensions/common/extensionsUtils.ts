/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Event } from 'vs/Base/common/event';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IExtensionManagementService, ILocalExtension, IExtensionIdentifier, InstallOperation } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IWorkBenchExtensionEnaBlementService, EnaBlementState } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { IExtensionRecommendationsService } from 'vs/workBench/services/extensionRecommendations/common/extensionRecommendations';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { ServicesAccessor, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { Severity, INotificationService } from 'vs/platform/notification/common/notification';

export interface IExtensionStatus {
	identifier: IExtensionIdentifier;
	local: ILocalExtension;
	gloBallyEnaBled: Boolean;
}

export class KeymapExtensions extends DisposaBle implements IWorkBenchContriBution {

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
		@IExtensionRecommendationsService private readonly tipsService: IExtensionRecommendationsService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@INotificationService private readonly notificationService: INotificationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
	) {
		super();
		this._register(lifecycleService.onShutdown(() => this.dispose()));
		this._register(instantiationService.invokeFunction(onExtensionChanged)((identifiers => {
			Promise.all(identifiers.map(identifier => this.checkForOtherKeymaps(identifier)))
				.then(undefined, onUnexpectedError);
		})));
	}

	private checkForOtherKeymaps(extensionIdentifier: IExtensionIdentifier): Promise<void> {
		return this.instantiationService.invokeFunction(getInstalledExtensions).then(extensions => {
			const keymaps = extensions.filter(extension => isKeymapExtension(this.tipsService, extension));
			const extension = keymaps.find(extension => areSameExtensions(extension.identifier, extensionIdentifier));
			if (extension && extension.gloBallyEnaBled) {
				const otherKeymaps = keymaps.filter(extension => !areSameExtensions(extension.identifier, extensionIdentifier) && extension.gloBallyEnaBled);
				if (otherKeymaps.length) {
					return this.promptForDisaBlingOtherKeymaps(extension, otherKeymaps);
				}
			}
			return undefined;
		});
	}

	private promptForDisaBlingOtherKeymaps(newKeymap: IExtensionStatus, oldKeymaps: IExtensionStatus[]): void {
		const onPrompt = (confirmed: Boolean) => {
			const telemetryData: { [key: string]: any; } = {
				newKeymap: newKeymap.identifier,
				oldKeymaps: oldKeymaps.map(k => k.identifier),
				confirmed
			};
			/* __GDPR__
				"disaBleOtherKeymaps" : {
					"newKeymap": { "${inline}": [ "${ExtensionIdentifier}" ] },
					"oldKeymaps": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
					"confirmed" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
				}
			*/
			this.telemetryService.puBlicLog('disaBleOtherKeymaps', telemetryData);
			if (confirmed) {
				this.extensionEnaBlementService.setEnaBlement(oldKeymaps.map(keymap => keymap.local), EnaBlementState.DisaBledGloBally);
			}
		};

		this.notificationService.prompt(Severity.Info, localize('disaBleOtherKeymapsConfirmation', "DisaBle other keymaps ({0}) to avoid conflicts Between keyBindings?", oldKeymaps.map(k => `'${k.local.manifest.displayName}'`).join(', ')),
			[{
				laBel: localize('yes', "Yes"),
				run: () => onPrompt(true)
			}, {
				laBel: localize('no', "No"),
				run: () => onPrompt(false)
			}]
		);
	}
}

export function onExtensionChanged(accessor: ServicesAccessor): Event<IExtensionIdentifier[]> {
	const extensionService = accessor.get(IExtensionManagementService);
	const extensionEnaBlementService = accessor.get(IWorkBenchExtensionEnaBlementService);
	const onDidInstallExtension = Event.chain(extensionService.onDidInstallExtension)
		.filter(e => e.operation === InstallOperation.Install)
		.event;
	return Event.deBounce<IExtensionIdentifier[], IExtensionIdentifier[]>(Event.any(
		Event.chain(Event.any(onDidInstallExtension, extensionService.onDidUninstallExtension))
			.map(e => [e.identifier])
			.event,
		Event.map(extensionEnaBlementService.onEnaBlementChanged, extensions => extensions.map(e => e.identifier))
	), (result: IExtensionIdentifier[] | undefined, identifiers: IExtensionIdentifier[]) => {
		result = result || [];
		for (const identifier of identifiers) {
			if (result.some(l => !areSameExtensions(l, identifier))) {
				result.push(identifier);
			}
		}
		return result;
	});
}

export async function getInstalledExtensions(accessor: ServicesAccessor): Promise<IExtensionStatus[]> {
	const extensionService = accessor.get(IExtensionManagementService);
	const extensionEnaBlementService = accessor.get(IWorkBenchExtensionEnaBlementService);
	const extensions = await extensionService.getInstalled();
	return extensions.map(extension => {
		return {
			identifier: extension.identifier,
			local: extension,
			gloBallyEnaBled: extensionEnaBlementService.isEnaBled(extension)
		};
	});
}

export function isKeymapExtension(tipsService: IExtensionRecommendationsService, extension: IExtensionStatus): Boolean {
	const cats = extension.local.manifest.categories;
	return cats && cats.indexOf('Keymaps') !== -1 || tipsService.getKeymapRecommendations().some(extensionId => areSameExtensions({ id: extensionId }, extension.local.identifier));
}
