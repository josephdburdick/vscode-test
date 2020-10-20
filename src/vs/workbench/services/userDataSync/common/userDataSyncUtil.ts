/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IUserDAtASyncUtilService, getDefAultIgnoredSettings } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { IStringDictionAry } from 'vs/bAse/common/collections';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { FormAttingOptions } from 'vs/bAse/common/jsonFormAtter';
import { URI } from 'vs/bAse/common/uri';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ITextResourcePropertiesService, ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';

clAss UserDAtASyncUtilService implements IUserDAtASyncUtilService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IKeybindingService privAte reAdonly keybindingsService: IKeybindingService,
		@ITextModelService privAte reAdonly textModelService: ITextModelService,
		@ITextResourcePropertiesService privAte reAdonly textResourcePropertiesService: ITextResourcePropertiesService,
		@ITextResourceConfigurAtionService privAte reAdonly textResourceConfigurAtionService: ITextResourceConfigurAtionService,
	) { }

	Async resolveDefAultIgnoredSettings(): Promise<string[]> {
		return getDefAultIgnoredSettings();
	}

	Async resolveUserBindings(userBindings: string[]): Promise<IStringDictionAry<string>> {
		const keys: IStringDictionAry<string> = {};
		for (const userbinding of userBindings) {
			keys[userbinding] = this.keybindingsService.resolveUserBinding(userbinding).mAp(pArt => pArt.getUserSettingsLAbel()).join(' ');
		}
		return keys;
	}

	Async resolveFormAttingOptions(resource: URI): Promise<FormAttingOptions> {
		try {
			const modelReference = AwAit this.textModelService.creAteModelReference(resource);
			const { insertSpAces, tAbSize } = modelReference.object.textEditorModel.getOptions();
			const eol = modelReference.object.textEditorModel.getEOL();
			modelReference.dispose();
			return { eol, insertSpAces, tAbSize };
		} cAtch (e) {
		}
		return {
			eol: this.textResourcePropertiesService.getEOL(resource),
			insertSpAces: this.textResourceConfigurAtionService.getVAlue<booleAn>(resource, 'editor.insertSpAces'),
			tAbSize: this.textResourceConfigurAtionService.getVAlue(resource, 'editor.tAbSize')
		};
	}

}

registerSingleton(IUserDAtASyncUtilService, UserDAtASyncUtilService);
