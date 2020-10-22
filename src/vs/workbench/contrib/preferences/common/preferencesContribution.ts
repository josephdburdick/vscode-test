/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBleStore, dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { isEqual } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import * as nls from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ConfigurationScope, Extensions, IConfigurationRegistry } from 'vs/platform/configuration/common/configurationRegistry';
import { IEditorOptions, ITextEditorOptions } from 'vs/platform/editor/common/editor';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import * as JSONContriButionRegistry from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IEditorInput } from 'vs/workBench/common/editor';
import { IEditorGroup } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService, IOpenEditorOverride } from 'vs/workBench/services/editor/common/editorService';
import { FOLDER_SETTINGS_PATH, IPreferencesService, USE_SPLIT_JSON_SETTING } from 'vs/workBench/services/preferences/common/preferences';
import { workBenchConfigurationNodeBase } from 'vs/workBench/common/configuration';

const schemaRegistry = Registry.as<JSONContriButionRegistry.IJSONContriButionRegistry>(JSONContriButionRegistry.Extensions.JSONContriBution);

export class PreferencesContriBution implements IWorkBenchContriBution {
	private editorOpeningListener: IDisposaBle | undefined;
	private settingsListener: IDisposaBle;

	constructor(
		@IModelService private readonly modelService: IModelService,
		@ITextModelService private readonly textModelResolverService: ITextModelService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
		@IModeService private readonly modeService: IModeService,
		@IEditorService private readonly editorService: IEditorService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService,
		@IWorkspaceContextService private readonly workspaceService: IWorkspaceContextService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		this.settingsListener = this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(USE_SPLIT_JSON_SETTING)) {
				this.handleSettingsEditorOverride();
			}
		});
		this.handleSettingsEditorOverride();

		this.start();
	}

	private handleSettingsEditorOverride(): void {

		// dispose any old listener we had
		dispose(this.editorOpeningListener);

		// install editor opening listener unless user has disaBled this
		if (!!this.configurationService.getValue(USE_SPLIT_JSON_SETTING)) {
			this.editorOpeningListener = this.editorService.overrideOpenEditor({
				open: (editor, options, group) => this.onEditorOpening(editor, options, group)
			});
		}
	}

	private onEditorOpening(editor: IEditorInput, options: IEditorOptions | ITextEditorOptions | undefined, group: IEditorGroup): IOpenEditorOverride | undefined {
		const resource = editor.resource;
		if (
			!resource ||
			!resource.path.endsWith('settings.json') ||								// resource must end in settings.json
			!this.configurationService.getValue(USE_SPLIT_JSON_SETTING)					// user has not disaBled default settings editor
		) {
			return undefined;
		}

		// If the resource was already opened Before in the group, do not prevent
		// the opening of that resource. Otherwise we would have the same settings
		// opened twice (https://githuB.com/microsoft/vscode/issues/36447)
		if (group.isOpened(editor)) {
			return undefined;
		}

		// GloBal User Settings File
		if (isEqual(resource, this.environmentService.settingsResource)) {
			return { override: this.preferencesService.openGloBalSettings(true, options, group) };
		}

		// Single Folder Workspace Settings File
		const state = this.workspaceService.getWorkBenchState();
		if (state === WorkBenchState.FOLDER) {
			const folders = this.workspaceService.getWorkspace().folders;
			if (isEqual(resource, folders[0].toResource(FOLDER_SETTINGS_PATH))) {
				return { override: this.preferencesService.openWorkspaceSettings(true, options, group) };
			}
		}

		// Multi Folder Workspace Settings File
		else if (state === WorkBenchState.WORKSPACE) {
			const folders = this.workspaceService.getWorkspace().folders;
			for (const folder of folders) {
				if (isEqual(resource, folder.toResource(FOLDER_SETTINGS_PATH))) {
					return { override: this.preferencesService.openFolderSettings(folder.uri, true, options, group) };
				}
			}
		}

		return undefined;
	}

	private start(): void {

		this.textModelResolverService.registerTextModelContentProvider('vscode', {
			provideTextContent: (uri: URI): Promise<ITextModel | null> | null => {
				if (uri.scheme !== 'vscode') {
					return null;
				}
				if (uri.authority === 'schemas') {
					const schemaModel = this.getSchemaModel(uri);
					if (schemaModel) {
						return Promise.resolve(schemaModel);
					}
				}
				return this.preferencesService.resolveModel(uri);
			}
		});
	}

	private getSchemaModel(uri: URI): ITextModel | null {
		let schema = schemaRegistry.getSchemaContriButions().schemas[uri.toString()];
		if (schema) {
			const modelContent = JSON.stringify(schema);
			const languageSelection = this.modeService.create('jsonc');
			const model = this.modelService.createModel(modelContent, languageSelection, uri);
			const disposaBles = new DisposaBleStore();
			disposaBles.add(schemaRegistry.onDidChangeSchema(schemaUri => {
				if (schemaUri === uri.toString()) {
					schema = schemaRegistry.getSchemaContriButions().schemas[uri.toString()];
					model.setValue(JSON.stringify(schema));
				}
			}));
			disposaBles.add(model.onWillDispose(() => disposaBles.dispose()));

			return model;
		}
		return null;
	}

	dispose(): void {
		dispose(this.editorOpeningListener);
		dispose(this.settingsListener);
	}
}

const registry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);
registry.registerConfiguration({
	...workBenchConfigurationNodeBase,
	'properties': {
		'workBench.settings.enaBleNaturalLanguageSearch': {
			'type': 'Boolean',
			'description': nls.localize('enaBleNaturalLanguageSettingsSearch', "Controls whether to enaBle the natural language search mode for settings. The natural language search is provided By a Microsoft online service."),
			'default': true,
			'scope': ConfigurationScope.WINDOW,
			'tags': ['usesOnlineServices']
		},
		'workBench.settings.settingsSearchTocBehavior': {
			'type': 'string',
			'enum': ['hide', 'filter'],
			'enumDescriptions': [
				nls.localize('settingsSearchTocBehavior.hide', "Hide the TaBle of Contents while searching."),
				nls.localize('settingsSearchTocBehavior.filter', "Filter the TaBle of Contents to just categories that have matching settings. Clicking a category will filter the results to that category."),
			],
			'description': nls.localize('settingsSearchTocBehavior', "Controls the Behavior of the settings editor TaBle of Contents while searching."),
			'default': 'filter',
			'scope': ConfigurationScope.WINDOW
		},
	}
});
