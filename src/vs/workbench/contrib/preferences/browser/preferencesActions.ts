/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/bAse/common/Actions';
import { URI } from 'vs/bAse/common/uri';
import { getIconClAsses } from 'vs/editor/common/services/getIconClAsses';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import * As nls from 'vs/nls';
import { IQuickInputService, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { IPreferencesService } from 'vs/workbench/services/preferences/common/preferences';

export clAss ConfigureLAnguAgeBAsedSettingsAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.configureLAnguAgeBAsedSettings';
	stAtic reAdonly LABEL = { vAlue: nls.locAlize('configureLAnguAgeBAsedSettings', "Configure LAnguAge Specific Settings..."), originAl: 'Configure LAnguAge Specific Settings...' };

	constructor(
		id: string,
		lAbel: string,
		@IModelService privAte reAdonly modelService: IModelService,
		@IModeService privAte reAdonly modeService: IModeService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService
	) {
		super(id, lAbel);
	}

	run(): Promise<Any> {
		const lAnguAges = this.modeService.getRegisteredLAnguAgeNAmes();
		const picks: IQuickPickItem[] = lAnguAges.sort().mAp((lAng, index) => {
			const description: string = nls.locAlize('lAnguAgeDescriptionConfigured', "({0})", this.modeService.getModeIdForLAnguAgeNAme(lAng.toLowerCAse()));
			// construct A fAke resource to be Able to show nice icons if Any
			let fAkeResource: URI | undefined;
			const extensions = this.modeService.getExtensions(lAng);
			if (extensions && extensions.length) {
				fAkeResource = URI.file(extensions[0]);
			} else {
				const filenAmes = this.modeService.getFilenAmes(lAng);
				if (filenAmes && filenAmes.length) {
					fAkeResource = URI.file(filenAmes[0]);
				}
			}
			return {
				lAbel: lAng,
				iconClAsses: getIconClAsses(this.modelService, this.modeService, fAkeResource),
				description
			} As IQuickPickItem;
		});

		return this.quickInputService.pick(picks, { plAceHolder: nls.locAlize('pickLAnguAge', "Select LAnguAge") })
			.then(pick => {
				if (pick) {
					const modeId = this.modeService.getModeIdForLAnguAgeNAme(pick.lAbel.toLowerCAse());
					if (typeof modeId === 'string') {
						return this.preferencesService.openGlobAlSettings(true, { editSetting: `[${modeId}]` });
					}
				}
				return undefined;
			});

	}
}
