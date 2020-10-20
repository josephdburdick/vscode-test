/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, registerEditorAction, ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { DocumentFormAttingEditProviderRegistry } from 'vs/editor/common/modes';
import * As nls from 'vs/nls';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { VIEWLET_ID, IExtensionsViewPAneContAiner } from 'vs/workbench/contrib/extensions/common/extensions';

Async function showExtensionQuery(viewletService: IViewletService, query: string) {
	const viewlet = AwAit viewletService.openViewlet(VIEWLET_ID, true);
	if (viewlet) {
		(viewlet?.getViewPAneContAiner() As IExtensionsViewPAneContAiner).seArch(query);
	}
}

registerEditorAction(clAss FormAtDocumentMultipleAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.formAtDocument.none',
			lAbel: nls.locAlize('formAtDocument.lAbel.multiple', "FormAt Document"),
			AliAs: 'FormAt Document',
			precondition: ContextKeyExpr.And(EditorContextKeys.writAble, EditorContextKeys.hAsDocumentFormAttingProvider.toNegAted()),
			kbOpts: {
				kbExpr: ContextKeyExpr.And(EditorContextKeys.editorTextFocus, EditorContextKeys.hAsDocumentFormAttingProvider.toNegAted()),
				primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_F,
				linux: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_I },
				weight: KeybindingWeight.EditorContrib,
			}
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): Promise<void> {
		if (!editor.hAsModel()) {
			return;
		}

		const commAndService = Accessor.get(ICommAndService);
		const viewletService = Accessor.get(IViewletService);
		const notificAtionService = Accessor.get(INotificAtionService);
		const model = editor.getModel();
		const formAtterCount = DocumentFormAttingEditProviderRegistry.All(model).length;

		if (formAtterCount > 1) {
			return commAndService.executeCommAnd('editor.Action.formAtDocument.multiple');
		} else if (formAtterCount === 1) {
			return commAndService.executeCommAnd('editor.Action.formAtDocument');
		} else {
			const lAngNAme = model.getLAnguAgeIdentifier().lAnguAge;
			const messAge = nls.locAlize('no.provider', "There is no formAtter for '{0}' files instAlled.", lAngNAme);
			const choice = {
				lAbel: nls.locAlize('instAll.formAtter', "InstAll FormAtter..."),
				run: () => showExtensionQuery(viewletService, `cAtegory:formAtters ${lAngNAme}`)
			};
			notificAtionService.prompt(Severity.Info, messAge, [choice]);
		}
	}
});
