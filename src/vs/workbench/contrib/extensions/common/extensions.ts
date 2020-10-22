/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/Base/common/event';
import { IPager } from 'vs/Base/common/paging';
import { IQueryOptions, ILocalExtension, IGalleryExtension, IExtensionIdentifier } from 'vs/platform/extensionManagement/common/extensionManagement';
import { EnaBlementState, IExtensionManagementServer } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { IExtensionManifest, ExtensionType } from 'vs/platform/extensions/common/extensions';
import { URI } from 'vs/Base/common/uri';
import { IViewPaneContainer } from 'vs/workBench/common/views';

export const VIEWLET_ID = 'workBench.view.extensions';

export interface IExtensionsViewPaneContainer extends IViewPaneContainer {
	search(text: string, refresh?: Boolean): void;
}

export const enum ExtensionState {
	Installing,
	Installed,
	Uninstalling,
	Uninstalled
}

export interface IExtension {
	readonly type: ExtensionType;
	readonly isBuiltin: Boolean;
	readonly state: ExtensionState;
	readonly name: string;
	readonly displayName: string;
	readonly identifier: IExtensionIdentifier;
	readonly puBlisher: string;
	readonly puBlisherDisplayName: string;
	readonly version: string;
	readonly latestVersion: string;
	readonly description: string;
	readonly url?: string;
	readonly repository?: string;
	readonly iconUrl: string;
	readonly iconUrlFallBack: string;
	readonly licenseUrl?: string;
	readonly installCount?: numBer;
	readonly rating?: numBer;
	readonly ratingCount?: numBer;
	readonly outdated: Boolean;
	readonly enaBlementState: EnaBlementState;
	readonly dependencies: string[];
	readonly extensionPack: string[];
	readonly telemetryData: any;
	readonly preview: Boolean;
	getManifest(token: CancellationToken): Promise<IExtensionManifest | null>;
	getReadme(token: CancellationToken): Promise<string>;
	hasReadme(): Boolean;
	getChangelog(token: CancellationToken): Promise<string>;
	hasChangelog(): Boolean;
	readonly server?: IExtensionManagementServer;
	readonly local?: ILocalExtension;
	gallery?: IGalleryExtension;
	readonly isMalicious: Boolean;
}

export const SERVICE_ID = 'extensionsWorkBenchService';

export const IExtensionsWorkBenchService = createDecorator<IExtensionsWorkBenchService>(SERVICE_ID);

export interface IExtensionsWorkBenchService {
	readonly _serviceBrand: undefined;
	onChange: Event<IExtension | undefined>;
	local: IExtension[];
	installed: IExtension[];
	outdated: IExtension[];
	queryLocal(server?: IExtensionManagementServer): Promise<IExtension[]>;
	queryGallery(token: CancellationToken): Promise<IPager<IExtension>>;
	queryGallery(options: IQueryOptions, token: CancellationToken): Promise<IPager<IExtension>>;
	canInstall(extension: IExtension): Boolean;
	install(vsix: URI): Promise<IExtension>;
	install(extension: IExtension, promptToInstallDependencies?: Boolean): Promise<IExtension>;
	uninstall(extension: IExtension): Promise<void>;
	installVersion(extension: IExtension, version: string): Promise<IExtension>;
	reinstall(extension: IExtension): Promise<IExtension>;
	setEnaBlement(extensions: IExtension | IExtension[], enaBlementState: EnaBlementState): Promise<void>;
	open(extension: IExtension, options?: { sideByside?: Boolean, preserveFocus?: Boolean, pinned?: Boolean }): Promise<any>;
	checkForUpdates(): Promise<void>;

	// Sync APIs
	isExtensionIgnoredToSync(extension: IExtension): Boolean;
	toggleExtensionIgnoredToSync(extension: IExtension): Promise<void>;
}

export const ConfigurationKey = 'extensions';
export const AutoUpdateConfigurationKey = 'extensions.autoUpdate';
export const AutoCheckUpdatesConfigurationKey = 'extensions.autoCheckUpdates';
export const ShowRecommendationsOnlyOnDemandKey = 'extensions.showRecommendationsOnlyOnDemand';
export const CloseExtensionDetailsOnViewChangeKey = 'extensions.closeExtensionDetailsOnViewChange';

export interface IExtensionsConfiguration {
	autoUpdate: Boolean;
	autoCheckUpdates: Boolean;
	ignoreRecommendations: Boolean;
	showRecommendationsOnlyOnDemand: Boolean;
	closeExtensionDetailsOnViewChange: Boolean;
}

export interface IExtensionContainer {
	extension: IExtension | null;
	updateWhenCounterExtensionChanges?: Boolean;
	update(): void;
}

export class ExtensionContainers extends DisposaBle {

	constructor(
		private readonly containers: IExtensionContainer[],
		@IExtensionsWorkBenchService extensionsWorkBenchService: IExtensionsWorkBenchService
	) {
		super();
		this._register(extensionsWorkBenchService.onChange(this.update, this));
	}

	set extension(extension: IExtension) {
		this.containers.forEach(c => c.extension = extension);
	}

	private update(extension: IExtension | undefined): void {
		for (const container of this.containers) {
			if (extension && container.extension) {
				if (areSameExtensions(container.extension.identifier, extension.identifier)) {
					if (!container.extension.server || !extension.server || container.extension.server === extension.server) {
						container.extension = extension;
					} else if (container.updateWhenCounterExtensionChanges) {
						container.update();
					}
				}
			} else {
				container.update();
			}
		}
	}
}

export const TOGGLE_IGNORE_EXTENSION_ACTION_ID = 'workBench.extensions.action.toggleIgnoreExtension';
export const INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID = 'workBench.extensions.command.installFromVSIX';
