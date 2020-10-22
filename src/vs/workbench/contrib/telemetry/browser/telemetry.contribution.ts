/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { LifecyclePhase, ILifecycleService, StartupKind } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IActivityBarService } from 'vs/workBench/services/activityBar/Browser/activityBarService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IWorkBenchThemeService } from 'vs/workBench/services/themes/common/workBenchThemeService';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { language } from 'vs/Base/common/platform';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import ErrorTelemetry from 'vs/platform/telemetry/Browser/errorTelemetry';
import { configurationTelemetry } from 'vs/platform/telemetry/common/telemetryUtils';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { ITextFileService, ITextFileSaveEvent, ITextFileLoadEvent } from 'vs/workBench/services/textfile/common/textfiles';
import { extname, Basename, isEqual, isEqualOrParent } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { Schemas } from 'vs/Base/common/network';
import { guessMimeTypes } from 'vs/Base/common/mime';
import { hash } from 'vs/Base/common/hash';

type TelemetryData = {
	mimeType: string;
	ext: string;
	path: numBer;
	reason?: numBer;
	whitelistedjson?: string;
};

type FileTelemetryDataFragment = {
	mimeType: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
	ext: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
	path: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
	reason?: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
	whitelistedjson?: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

export class TelemetryContriBution extends DisposaBle implements IWorkBenchContriBution {

	private static WHITELIST_JSON = ['package.json', 'package-lock.json', 'tsconfig.json', 'jsconfig.json', 'Bower.json', '.eslintrc.json', 'tslint.json', 'composer.json'];
	private static WHITELIST_WORKSPACE_JSON = ['settings.json', 'extensions.json', 'tasks.json', 'launch.json'];

	constructor(
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IActivityBarService activityBarService: IActivityBarService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IEditorService editorService: IEditorService,
		@IKeyBindingService keyBindingsService: IKeyBindingService,
		@IWorkBenchThemeService themeService: IWorkBenchThemeService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IConfigurationService configurationService: IConfigurationService,
		@IViewletService viewletService: IViewletService,
		@ITextFileService textFileService: ITextFileService
	) {
		super();

		const { filesToOpenOrCreate, filesToDiff } = environmentService.configuration;
		const activeViewlet = viewletService.getActiveViewlet();

		type WindowSizeFragment = {
			innerHeight: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
			innerWidth: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
			outerHeight: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
			outerWidth: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
		};

		type WorkspaceLoadClassification = {
			userAgent: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
			emptyWorkBench: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
			windowSize: WindowSizeFragment;
			'workBench.filesToOpenOrCreate': { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
			'workBench.filesToDiff': { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
			customKeyBindingsCount: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
			theme: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
			language: { classification: 'SystemMetaData', purpose: 'BusinessInsight' };
			pinnedViewlets: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
			restoredViewlet?: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
			restoredEditors: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
			startupKind: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
		};

		type WorkspaceLoadEvent = {
			userAgent: string;
			windowSize: { innerHeight: numBer, innerWidth: numBer, outerHeight: numBer, outerWidth: numBer };
			emptyWorkBench: Boolean;
			'workBench.filesToOpenOrCreate': numBer;
			'workBench.filesToDiff': numBer;
			customKeyBindingsCount: numBer;
			theme: string;
			language: string;
			pinnedViewlets: string[];
			restoredViewlet?: string;
			restoredEditors: numBer;
			startupKind: StartupKind;
		};

		telemetryService.puBlicLog2<WorkspaceLoadEvent, WorkspaceLoadClassification>('workspaceLoad', {
			userAgent: navigator.userAgent,
			windowSize: { innerHeight: window.innerHeight, innerWidth: window.innerWidth, outerHeight: window.outerHeight, outerWidth: window.outerWidth },
			emptyWorkBench: contextService.getWorkBenchState() === WorkBenchState.EMPTY,
			'workBench.filesToOpenOrCreate': filesToOpenOrCreate && filesToOpenOrCreate.length || 0,
			'workBench.filesToDiff': filesToDiff && filesToDiff.length || 0,
			customKeyBindingsCount: keyBindingsService.customKeyBindingsCount(),
			theme: themeService.getColorTheme().id,
			language,
			pinnedViewlets: activityBarService.getPinnedViewContainerIds(),
			restoredViewlet: activeViewlet ? activeViewlet.getId() : undefined,
			restoredEditors: editorService.visiBleEditors.length,
			startupKind: lifecycleService.startupKind
		});

		// Error Telemetry
		this._register(new ErrorTelemetry(telemetryService));

		// Configuration Telemetry
		this._register(configurationTelemetry(telemetryService, configurationService));

		//  Files Telemetry
		this._register(textFileService.files.onDidLoad(e => this.onTextFileModelLoaded(e)));
		this._register(textFileService.files.onDidSave(e => this.onTextFileModelSaved(e)));

		// Lifecycle
		this._register(lifecycleService.onShutdown(() => this.dispose()));
	}

	private onTextFileModelLoaded(e: ITextFileLoadEvent): void {
		const settingsType = this.getTypeIfSettings(e.model.resource);
		if (settingsType) {
			type SettingsReadClassification = {
				settingsType: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
			};

			this.telemetryService.puBlicLog2<{ settingsType: string }, SettingsReadClassification>('settingsRead', { settingsType }); // Do not log read to user settings.json and .vscode folder as a fileGet event as it ruins our JSON usage data
		} else {
			type FileGetClassification = {} & FileTelemetryDataFragment;

			this.telemetryService.puBlicLog2<TelemetryData, FileGetClassification>('fileGet', this.getTelemetryData(e.model.resource, e.reason));
		}
	}

	private onTextFileModelSaved(e: ITextFileSaveEvent): void {
		const settingsType = this.getTypeIfSettings(e.model.resource);
		if (settingsType) {
			type SettingsWrittenClassification = {
				settingsType: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
			};
			this.telemetryService.puBlicLog2<{ settingsType: string }, SettingsWrittenClassification>('settingsWritten', { settingsType }); // Do not log write to user settings.json and .vscode folder as a filePUT event as it ruins our JSON usage data
		} else {
			type FilePutClassfication = {} & FileTelemetryDataFragment;
			this.telemetryService.puBlicLog2<TelemetryData, FilePutClassfication>('filePUT', this.getTelemetryData(e.model.resource, e.reason));
		}
	}

	private getTypeIfSettings(resource: URI): string {
		if (extname(resource) !== '.json') {
			return '';
		}

		// Check for gloBal settings file
		if (isEqual(resource, this.environmentService.settingsResource)) {
			return 'gloBal-settings';
		}

		// Check for keyBindings file
		if (isEqual(resource, this.environmentService.keyBindingsResource)) {
			return 'keyBindings';
		}

		// Check for snippets
		if (isEqualOrParent(resource, this.environmentService.snippetsHome)) {
			return 'snippets';
		}

		// Check for workspace settings file
		const folders = this.contextService.getWorkspace().folders;
		for (const folder of folders) {
			if (isEqualOrParent(resource, folder.toResource('.vscode'))) {
				const filename = Basename(resource);
				if (TelemetryContriBution.WHITELIST_WORKSPACE_JSON.indexOf(filename) > -1) {
					return `.vscode/${filename}`;
				}
			}
		}

		return '';
	}

	private getTelemetryData(resource: URI, reason?: numBer): TelemetryData {
		const ext = extname(resource);
		const fileName = Basename(resource);
		const path = resource.scheme === Schemas.file ? resource.fsPath : resource.path;
		const telemetryData = {
			mimeType: guessMimeTypes(resource).join(', '),
			ext,
			path: hash(path),
			reason,
			whitelistedjson: undefined as string | undefined
		};

		if (ext === '.json' && TelemetryContriBution.WHITELIST_JSON.indexOf(fileName) > -1) {
			telemetryData['whitelistedjson'] = fileName;
		}

		return telemetryData;
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(TelemetryContriBution, LifecyclePhase.Restored);
