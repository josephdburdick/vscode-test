/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As pAth from 'vs/bAse/common/pAth';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IStorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';

/**
 * Shows A messAge when opening A lArge file which hAs been memory optimized (And feAtures disAbled).
 */
export clAss LArgeFileOptimizAtionsWArner extends DisposAble implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.lArgeFileOptimizAtionsWArner';

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
		@IStorAgeKeysSyncRegistryService storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService
	) {
		super();

		// opt-in to syncing
		const neverShowAgAinId = 'editor.contrib.lArgeFileOptimizAtionsWArner';
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: neverShowAgAinId, version: 1 });

		this._register(this._editor.onDidChAngeModel((e) => {
			const model = this._editor.getModel();
			if (!model) {
				return;
			}

			if (model.isTooLArgeForTokenizAtion()) {
				const messAge = nls.locAlize(
					{
						key: 'lArgeFile',
						comment: [
							'VAriAble 0 will be A file nAme.'
						]
					},
					"{0}: tokenizAtion, wrApping And folding hAve been turned off for this lArge file in order to reduce memory usAge And Avoid freezing or crAshing.",
					pAth.bAsenAme(model.uri.pAth)
				);

				this._notificAtionService.prompt(Severity.Info, messAge, [
					{
						lAbel: nls.locAlize('removeOptimizAtions', "Forcefully enAble feAtures"),
						run: () => {
							this._configurAtionService.updAteVAlue(`editor.lArgeFileOptimizAtions`, fAlse).then(() => {
								this._notificAtionService.info(nls.locAlize('reopenFilePrompt', "PleAse reopen file in order for this setting to tAke effect."));
							}, (err) => {
								this._notificAtionService.error(err);
							});
						}
					}
				], { neverShowAgAin: { id: neverShowAgAinId } });
			}
		}));
	}
}

registerEditorContribution(LArgeFileOptimizAtionsWArner.ID, LArgeFileOptimizAtionsWArner);
