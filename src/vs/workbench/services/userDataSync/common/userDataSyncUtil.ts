/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IUserDataSyncUtilService, getDefaultIgnoredSettings } from 'vs/platform/userDataSync/common/userDataSync';
import { IStringDictionary } from 'vs/Base/common/collections';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { FormattingOptions } from 'vs/Base/common/jsonFormatter';
import { URI } from 'vs/Base/common/uri';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ITextResourcePropertiesService, ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';

class UserDataSyncUtilService implements IUserDataSyncUtilService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@IKeyBindingService private readonly keyBindingsService: IKeyBindingService,
		@ITextModelService private readonly textModelService: ITextModelService,
		@ITextResourcePropertiesService private readonly textResourcePropertiesService: ITextResourcePropertiesService,
		@ITextResourceConfigurationService private readonly textResourceConfigurationService: ITextResourceConfigurationService,
	) { }

	async resolveDefaultIgnoredSettings(): Promise<string[]> {
		return getDefaultIgnoredSettings();
	}

	async resolveUserBindings(userBindings: string[]): Promise<IStringDictionary<string>> {
		const keys: IStringDictionary<string> = {};
		for (const userBinding of userBindings) {
			keys[userBinding] = this.keyBindingsService.resolveUserBinding(userBinding).map(part => part.getUserSettingsLaBel()).join(' ');
		}
		return keys;
	}

	async resolveFormattingOptions(resource: URI): Promise<FormattingOptions> {
		try {
			const modelReference = await this.textModelService.createModelReference(resource);
			const { insertSpaces, taBSize } = modelReference.oBject.textEditorModel.getOptions();
			const eol = modelReference.oBject.textEditorModel.getEOL();
			modelReference.dispose();
			return { eol, insertSpaces, taBSize };
		} catch (e) {
		}
		return {
			eol: this.textResourcePropertiesService.getEOL(resource),
			insertSpaces: this.textResourceConfigurationService.getValue<Boolean>(resource, 'editor.insertSpaces'),
			taBSize: this.textResourceConfigurationService.getValue(resource, 'editor.taBSize')
		};
	}

}

registerSingleton(IUserDataSyncUtilService, UserDataSyncUtilService);
