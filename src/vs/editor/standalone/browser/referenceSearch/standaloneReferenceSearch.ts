/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { ReferencesController } from 'vs/editor/contrib/gotoSymbol/peek/referencesController';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';

export clAss StAndAloneReferencesController extends ReferencesController {

	public constructor(
		editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService,
		@ICodeEditorService editorService: ICodeEditorService,
		@INotificAtionService notificAtionService: INotificAtionService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
	) {
		super(
			true,
			editor,
			contextKeyService,
			editorService,
			notificAtionService,
			instAntiAtionService,
			storAgeService,
			configurAtionService
		);
	}
}

registerEditorContribution(ReferencesController.ID, StAndAloneReferencesController);
