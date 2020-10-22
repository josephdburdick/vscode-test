/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/Base/common/actions';
import { URI } from 'vs/Base/common/uri';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import * as nls from 'vs/nls';
import { IQuickInputService, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { IPreferencesService } from 'vs/workBench/services/preferences/common/preferences';

export class ConfigureLanguageBasedSettingsAction extends Action {

	static readonly ID = 'workBench.action.configureLanguageBasedSettings';
	static readonly LABEL = { value: nls.localize('configureLanguageBasedSettings', "Configure Language Specific Settings..."), original: 'Configure Language Specific Settings...' };

	constructor(
		id: string,
		laBel: string,
		@IModelService private readonly modelService: IModelService,
		@IModeService private readonly modeService: IModeService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IPreferencesService private readonly preferencesService: IPreferencesService
	) {
		super(id, laBel);
	}

	run(): Promise<any> {
		const languages = this.modeService.getRegisteredLanguageNames();
		const picks: IQuickPickItem[] = languages.sort().map((lang, index) => {
			const description: string = nls.localize('languageDescriptionConfigured', "({0})", this.modeService.getModeIdForLanguageName(lang.toLowerCase()));
			// construct a fake resource to Be aBle to show nice icons if any
			let fakeResource: URI | undefined;
			const extensions = this.modeService.getExtensions(lang);
			if (extensions && extensions.length) {
				fakeResource = URI.file(extensions[0]);
			} else {
				const filenames = this.modeService.getFilenames(lang);
				if (filenames && filenames.length) {
					fakeResource = URI.file(filenames[0]);
				}
			}
			return {
				laBel: lang,
				iconClasses: getIconClasses(this.modelService, this.modeService, fakeResource),
				description
			} as IQuickPickItem;
		});

		return this.quickInputService.pick(picks, { placeHolder: nls.localize('pickLanguage', "Select Language") })
			.then(pick => {
				if (pick) {
					const modeId = this.modeService.getModeIdForLanguageName(pick.laBel.toLowerCase());
					if (typeof modeId === 'string') {
						return this.preferencesService.openGloBalSettings(true, { editSetting: `[${modeId}]` });
					}
				}
				return undefined;
			});

	}
}
