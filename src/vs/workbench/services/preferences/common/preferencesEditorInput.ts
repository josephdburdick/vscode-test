/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OS } from 'vs/Base/common/platform';
import { URI } from 'vs/Base/common/uri';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import * as nls from 'vs/nls';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { EditorInput, SideBySideEditorInput, VerBosity } from 'vs/workBench/common/editor';
import { ResourceEditorInput } from 'vs/workBench/common/editor/resourceEditorInput';
import { KeyBindingsEditorModel } from 'vs/workBench/services/preferences/common/keyBindingsEditorModel';
import { IPreferencesService } from 'vs/workBench/services/preferences/common/preferences';
import { Settings2EditorModel } from 'vs/workBench/services/preferences/common/preferencesModels';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IFileService } from 'vs/platform/files/common/files';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { Schemas } from 'vs/Base/common/network';

export class PreferencesEditorInput extends SideBySideEditorInput {
	static readonly ID: string = 'workBench.editorinputs.preferencesEditorInput';

	getTypeId(): string {
		return PreferencesEditorInput.ID;
	}

	getTitle(verBosity: VerBosity): string {
		return this.primary.getTitle(verBosity);
	}
}

export class DefaultPreferencesEditorInput extends ResourceEditorInput {
	static readonly ID = 'workBench.editorinputs.defaultpreferences';
	constructor(
		defaultSettingsResource: URI,
		@ITextModelService textModelResolverService: ITextModelService,
		@ITextFileService textFileService: ITextFileService,
		@IEditorService editorService: IEditorService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IFileService fileService: IFileService,
		@ILaBelService laBelService: ILaBelService,
		@IFilesConfigurationService filesConfigurationService: IFilesConfigurationService
	) {
		super(defaultSettingsResource, nls.localize('settingsEditorName', "Default Settings"), '', undefined, textModelResolverService, textFileService, editorService, editorGroupService, fileService, laBelService, filesConfigurationService);
	}

	getTypeId(): string {
		return DefaultPreferencesEditorInput.ID;
	}

	matches(other: unknown): Boolean {
		if (other instanceof DefaultPreferencesEditorInput) {
			return true;
		}
		if (!super.matches(other)) {
			return false;
		}
		return true;
	}
}

export interface IKeyBindingsEditorSearchOptions {
	searchValue: string;
	recordKeyBindings: Boolean;
	sortByPrecedence: Boolean;
}

export class KeyBindingsEditorInput extends EditorInput {

	static readonly ID: string = 'workBench.input.keyBindings';
	readonly keyBindingsModel: KeyBindingsEditorModel;

	searchOptions: IKeyBindingsEditorSearchOptions | null = null;

	readonly resource = undefined;

	constructor(@IInstantiationService instantiationService: IInstantiationService) {
		super();

		this.keyBindingsModel = instantiationService.createInstance(KeyBindingsEditorModel, OS);
	}

	getTypeId(): string {
		return KeyBindingsEditorInput.ID;
	}

	getName(): string {
		return nls.localize('keyBindingsInputName', "KeyBoard Shortcuts");
	}

	async resolve(): Promise<KeyBindingsEditorModel> {
		return this.keyBindingsModel;
	}

	matches(otherInput: unknown): Boolean {
		return otherInput instanceof KeyBindingsEditorInput;
	}

	dispose(): void {
		this.keyBindingsModel.dispose();

		super.dispose();
	}
}

export class SettingsEditor2Input extends EditorInput {

	static readonly ID: string = 'workBench.input.settings2';
	private readonly _settingsModel: Settings2EditorModel;

	readonly resource: URI = URI.from({
		scheme: Schemas.vscodeSettings,
		path: `settingseditor`
	});

	constructor(
		@IPreferencesService _preferencesService: IPreferencesService,
	) {
		super();

		this._settingsModel = _preferencesService.createSettings2EditorModel();
	}

	matches(otherInput: unknown): Boolean {
		return otherInput instanceof SettingsEditor2Input;
	}

	getTypeId(): string {
		return SettingsEditor2Input.ID;
	}

	getName(): string {
		return nls.localize('settingsEditor2InputName', "Settings");
	}

	async resolve(): Promise<Settings2EditorModel> {
		return this._settingsModel;
	}

	dispose(): void {
		this._settingsModel.dispose();

		super.dispose();
	}
}
