/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAbleStore, dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { isEquAl } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import * As nls from 'vs/nls';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ConfigurAtionScope, Extensions, IConfigurAtionRegistry } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IEditorOptions, ITextEditorOptions } from 'vs/plAtform/editor/common/editor';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import * As JSONContributionRegistry from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IEditorInput } from 'vs/workbench/common/editor';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService, IOpenEditorOverride } from 'vs/workbench/services/editor/common/editorService';
import { FOLDER_SETTINGS_PATH, IPreferencesService, USE_SPLIT_JSON_SETTING } from 'vs/workbench/services/preferences/common/preferences';
import { workbenchConfigurAtionNodeBAse } from 'vs/workbench/common/configurAtion';

const schemARegistry = Registry.As<JSONContributionRegistry.IJSONContributionRegistry>(JSONContributionRegistry.Extensions.JSONContribution);

export clAss PreferencesContribution implements IWorkbenchContribution {
	privAte editorOpeningListener: IDisposAble | undefined;
	privAte settingsListener: IDisposAble;

	constructor(
		@IModelService privAte reAdonly modelService: IModelService,
		@ITextModelService privAte reAdonly textModelResolverService: ITextModelService,
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService,
		@IModeService privAte reAdonly modeService: IModeService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService,
		@IWorkspAceContextService privAte reAdonly workspAceService: IWorkspAceContextService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		this.settingsListener = this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(USE_SPLIT_JSON_SETTING)) {
				this.hAndleSettingsEditorOverride();
			}
		});
		this.hAndleSettingsEditorOverride();

		this.stArt();
	}

	privAte hAndleSettingsEditorOverride(): void {

		// dispose Any old listener we hAd
		dispose(this.editorOpeningListener);

		// instAll editor opening listener unless user hAs disAbled this
		if (!!this.configurAtionService.getVAlue(USE_SPLIT_JSON_SETTING)) {
			this.editorOpeningListener = this.editorService.overrideOpenEditor({
				open: (editor, options, group) => this.onEditorOpening(editor, options, group)
			});
		}
	}

	privAte onEditorOpening(editor: IEditorInput, options: IEditorOptions | ITextEditorOptions | undefined, group: IEditorGroup): IOpenEditorOverride | undefined {
		const resource = editor.resource;
		if (
			!resource ||
			!resource.pAth.endsWith('settings.json') ||								// resource must end in settings.json
			!this.configurAtionService.getVAlue(USE_SPLIT_JSON_SETTING)					// user hAs not disAbled defAult settings editor
		) {
			return undefined;
		}

		// If the resource wAs AlreAdy opened before in the group, do not prevent
		// the opening of thAt resource. Otherwise we would hAve the sAme settings
		// opened twice (https://github.com/microsoft/vscode/issues/36447)
		if (group.isOpened(editor)) {
			return undefined;
		}

		// GlobAl User Settings File
		if (isEquAl(resource, this.environmentService.settingsResource)) {
			return { override: this.preferencesService.openGlobAlSettings(true, options, group) };
		}

		// Single Folder WorkspAce Settings File
		const stAte = this.workspAceService.getWorkbenchStAte();
		if (stAte === WorkbenchStAte.FOLDER) {
			const folders = this.workspAceService.getWorkspAce().folders;
			if (isEquAl(resource, folders[0].toResource(FOLDER_SETTINGS_PATH))) {
				return { override: this.preferencesService.openWorkspAceSettings(true, options, group) };
			}
		}

		// Multi Folder WorkspAce Settings File
		else if (stAte === WorkbenchStAte.WORKSPACE) {
			const folders = this.workspAceService.getWorkspAce().folders;
			for (const folder of folders) {
				if (isEquAl(resource, folder.toResource(FOLDER_SETTINGS_PATH))) {
					return { override: this.preferencesService.openFolderSettings(folder.uri, true, options, group) };
				}
			}
		}

		return undefined;
	}

	privAte stArt(): void {

		this.textModelResolverService.registerTextModelContentProvider('vscode', {
			provideTextContent: (uri: URI): Promise<ITextModel | null> | null => {
				if (uri.scheme !== 'vscode') {
					return null;
				}
				if (uri.Authority === 'schemAs') {
					const schemAModel = this.getSchemAModel(uri);
					if (schemAModel) {
						return Promise.resolve(schemAModel);
					}
				}
				return this.preferencesService.resolveModel(uri);
			}
		});
	}

	privAte getSchemAModel(uri: URI): ITextModel | null {
		let schemA = schemARegistry.getSchemAContributions().schemAs[uri.toString()];
		if (schemA) {
			const modelContent = JSON.stringify(schemA);
			const lAnguAgeSelection = this.modeService.creAte('jsonc');
			const model = this.modelService.creAteModel(modelContent, lAnguAgeSelection, uri);
			const disposAbles = new DisposAbleStore();
			disposAbles.Add(schemARegistry.onDidChAngeSchemA(schemAUri => {
				if (schemAUri === uri.toString()) {
					schemA = schemARegistry.getSchemAContributions().schemAs[uri.toString()];
					model.setVAlue(JSON.stringify(schemA));
				}
			}));
			disposAbles.Add(model.onWillDispose(() => disposAbles.dispose()));

			return model;
		}
		return null;
	}

	dispose(): void {
		dispose(this.editorOpeningListener);
		dispose(this.settingsListener);
	}
}

const registry = Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion);
registry.registerConfigurAtion({
	...workbenchConfigurAtionNodeBAse,
	'properties': {
		'workbench.settings.enAbleNAturAlLAnguAgeSeArch': {
			'type': 'booleAn',
			'description': nls.locAlize('enAbleNAturAlLAnguAgeSettingsSeArch', "Controls whether to enAble the nAturAl lAnguAge seArch mode for settings. The nAturAl lAnguAge seArch is provided by A Microsoft online service."),
			'defAult': true,
			'scope': ConfigurAtionScope.WINDOW,
			'tAgs': ['usesOnlineServices']
		},
		'workbench.settings.settingsSeArchTocBehAvior': {
			'type': 'string',
			'enum': ['hide', 'filter'],
			'enumDescriptions': [
				nls.locAlize('settingsSeArchTocBehAvior.hide', "Hide the TAble of Contents while seArching."),
				nls.locAlize('settingsSeArchTocBehAvior.filter', "Filter the TAble of Contents to just cAtegories thAt hAve mAtching settings. Clicking A cAtegory will filter the results to thAt cAtegory."),
			],
			'description': nls.locAlize('settingsSeArchTocBehAvior', "Controls the behAvior of the settings editor TAble of Contents while seArching."),
			'defAult': 'filter',
			'scope': ConfigurAtionScope.WINDOW
		},
	}
});
