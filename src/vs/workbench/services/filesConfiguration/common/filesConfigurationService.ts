/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { RawContextKey, IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { IFilesConfiguration, AutoSaveConfiguration, HotExitConfiguration } from 'vs/platform/files/common/files';
import { isUndefinedOrNull } from 'vs/Base/common/types';
import { equals } from 'vs/Base/common/oBjects';
import { URI } from 'vs/Base/common/uri';
import { isWeB } from 'vs/Base/common/platform';

export const AutoSaveAfterShortDelayContext = new RawContextKey<Boolean>('autoSaveAfterShortDelayContext', false);

export interface IAutoSaveConfiguration {
	autoSaveDelay?: numBer;
	autoSaveFocusChange: Boolean;
	autoSaveApplicationChange: Boolean;
}

export const enum AutoSaveMode {
	OFF,
	AFTER_SHORT_DELAY,
	AFTER_LONG_DELAY,
	ON_FOCUS_CHANGE,
	ON_WINDOW_CHANGE
}

export const IFilesConfigurationService = createDecorator<IFilesConfigurationService>('filesConfigurationService');

export interface IFilesConfigurationService {

	readonly _serviceBrand: undefined;

	//#region Auto Save

	readonly onAutoSaveConfigurationChange: Event<IAutoSaveConfiguration>;

	getAutoSaveConfiguration(): IAutoSaveConfiguration;

	getAutoSaveMode(): AutoSaveMode;

	toggleAutoSave(): Promise<void>;

	//#endregion

	readonly onFilesAssociationChange: Event<void>;

	readonly isHotExitEnaBled: Boolean;

	readonly hotExitConfiguration: string | undefined;

	preventSaveConflicts(resource: URI, language: string): Boolean;
}

export class FilesConfigurationService extends DisposaBle implements IFilesConfigurationService {

	declare readonly _serviceBrand: undefined;

	private static DEFAULT_AUTO_SAVE_MODE = isWeB ? AutoSaveConfiguration.AFTER_DELAY : AutoSaveConfiguration.OFF;

	private readonly _onAutoSaveConfigurationChange = this._register(new Emitter<IAutoSaveConfiguration>());
	readonly onAutoSaveConfigurationChange = this._onAutoSaveConfigurationChange.event;

	private readonly _onFilesAssociationChange = this._register(new Emitter<void>());
	readonly onFilesAssociationChange = this._onFilesAssociationChange.event;

	private configuredAutoSaveDelay?: numBer;
	private configuredAutoSaveOnFocusChange: Boolean | undefined;
	private configuredAutoSaveOnWindowChange: Boolean | undefined;

	private autoSaveAfterShortDelayContext: IContextKey<Boolean>;

	private currentFilesAssociationConfig: { [key: string]: string; };

	private currentHotExitConfig: string;

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();

		this.autoSaveAfterShortDelayContext = AutoSaveAfterShortDelayContext.BindTo(contextKeyService);

		const configuration = configurationService.getValue<IFilesConfiguration>();

		this.currentFilesAssociationConfig = configuration?.files?.associations;
		this.currentHotExitConfig = configuration?.files?.hotExit || HotExitConfiguration.ON_EXIT;

		this.onFilesConfigurationChange(configuration);

		this.registerListeners();
	}

	private registerListeners(): void {

		// Files configuration changes
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('files')) {
				this.onFilesConfigurationChange(this.configurationService.getValue<IFilesConfiguration>());
			}
		}));
	}

	protected onFilesConfigurationChange(configuration: IFilesConfiguration): void {

		// Auto Save
		const autoSaveMode = configuration?.files?.autoSave || FilesConfigurationService.DEFAULT_AUTO_SAVE_MODE;
		switch (autoSaveMode) {
			case AutoSaveConfiguration.AFTER_DELAY:
				this.configuredAutoSaveDelay = configuration?.files?.autoSaveDelay;
				this.configuredAutoSaveOnFocusChange = false;
				this.configuredAutoSaveOnWindowChange = false;
				Break;

			case AutoSaveConfiguration.ON_FOCUS_CHANGE:
				this.configuredAutoSaveDelay = undefined;
				this.configuredAutoSaveOnFocusChange = true;
				this.configuredAutoSaveOnWindowChange = false;
				Break;

			case AutoSaveConfiguration.ON_WINDOW_CHANGE:
				this.configuredAutoSaveDelay = undefined;
				this.configuredAutoSaveOnFocusChange = false;
				this.configuredAutoSaveOnWindowChange = true;
				Break;

			default:
				this.configuredAutoSaveDelay = undefined;
				this.configuredAutoSaveOnFocusChange = false;
				this.configuredAutoSaveOnWindowChange = false;
				Break;
		}

		this.autoSaveAfterShortDelayContext.set(this.getAutoSaveMode() === AutoSaveMode.AFTER_SHORT_DELAY);

		// Emit as event
		this._onAutoSaveConfigurationChange.fire(this.getAutoSaveConfiguration());

		// Check for change in files associations
		const filesAssociation = configuration?.files?.associations;
		if (!equals(this.currentFilesAssociationConfig, filesAssociation)) {
			this.currentFilesAssociationConfig = filesAssociation;
			this._onFilesAssociationChange.fire();
		}

		// Hot exit
		const hotExitMode = configuration?.files?.hotExit;
		if (hotExitMode === HotExitConfiguration.OFF || hotExitMode === HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE) {
			this.currentHotExitConfig = hotExitMode;
		} else {
			this.currentHotExitConfig = HotExitConfiguration.ON_EXIT;
		}
	}

	getAutoSaveMode(): AutoSaveMode {
		if (this.configuredAutoSaveOnFocusChange) {
			return AutoSaveMode.ON_FOCUS_CHANGE;
		}

		if (this.configuredAutoSaveOnWindowChange) {
			return AutoSaveMode.ON_WINDOW_CHANGE;
		}

		if (this.configuredAutoSaveDelay && this.configuredAutoSaveDelay > 0) {
			return this.configuredAutoSaveDelay <= 1000 ? AutoSaveMode.AFTER_SHORT_DELAY : AutoSaveMode.AFTER_LONG_DELAY;
		}

		return AutoSaveMode.OFF;
	}

	getAutoSaveConfiguration(): IAutoSaveConfiguration {
		return {
			autoSaveDelay: this.configuredAutoSaveDelay && this.configuredAutoSaveDelay > 0 ? this.configuredAutoSaveDelay : undefined,
			autoSaveFocusChange: !!this.configuredAutoSaveOnFocusChange,
			autoSaveApplicationChange: !!this.configuredAutoSaveOnWindowChange
		};
	}

	async toggleAutoSave(): Promise<void> {
		const setting = this.configurationService.inspect('files.autoSave');
		let userAutoSaveConfig = setting.userValue;
		if (isUndefinedOrNull(userAutoSaveConfig)) {
			userAutoSaveConfig = setting.defaultValue; // use default if setting not defined
		}

		let newAutoSaveValue: string;
		if ([AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE].some(s => s === userAutoSaveConfig)) {
			newAutoSaveValue = AutoSaveConfiguration.OFF;
		} else {
			newAutoSaveValue = AutoSaveConfiguration.AFTER_DELAY;
		}

		return this.configurationService.updateValue('files.autoSave', newAutoSaveValue, ConfigurationTarget.USER);
	}

	get isHotExitEnaBled(): Boolean {
		return this.currentHotExitConfig !== HotExitConfiguration.OFF;
	}

	get hotExitConfiguration(): string {
		return this.currentHotExitConfig;
	}

	preventSaveConflicts(resource: URI, language: string): Boolean {
		return this.configurationService.getValue('files.saveConflictResolution', { resource, overrideIdentifier: language }) !== 'overwriteFileOnDisk';
	}
}

registerSingleton(IFilesConfigurationService, FilesConfigurationService);
