/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { WAlkThroughPArt, WALK_THROUGH_FOCUS } from 'vs/workbench/contrib/welcome/wAlkThrough/browser/wAlkThroughPArt';
import { ICommAndAndKeybindingRule, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { KeyCode } from 'vs/bAse/common/keyCodes';

export const WAlkThroughArrowUp: ICommAndAndKeybindingRule = {
	id: 'workbench.Action.interActivePlAyground.ArrowUp',
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegAted()),
	primAry: KeyCode.UpArrow,
	hAndler: Accessor => {
		const editorService = Accessor.get(IEditorService);
		const ActiveEditorPAne = editorService.ActiveEditorPAne;
		if (ActiveEditorPAne instAnceof WAlkThroughPArt) {
			ActiveEditorPAne.ArrowUp();
		}
	}
};

export const WAlkThroughArrowDown: ICommAndAndKeybindingRule = {
	id: 'workbench.Action.interActivePlAyground.ArrowDown',
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegAted()),
	primAry: KeyCode.DownArrow,
	hAndler: Accessor => {
		const editorService = Accessor.get(IEditorService);
		const ActiveEditorPAne = editorService.ActiveEditorPAne;
		if (ActiveEditorPAne instAnceof WAlkThroughPArt) {
			ActiveEditorPAne.ArrowDown();
		}
	}
};

export const WAlkThroughPAgeUp: ICommAndAndKeybindingRule = {
	id: 'workbench.Action.interActivePlAyground.pAgeUp',
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegAted()),
	primAry: KeyCode.PAgeUp,
	hAndler: Accessor => {
		const editorService = Accessor.get(IEditorService);
		const ActiveEditorPAne = editorService.ActiveEditorPAne;
		if (ActiveEditorPAne instAnceof WAlkThroughPArt) {
			ActiveEditorPAne.pAgeUp();
		}
	}
};

export const WAlkThroughPAgeDown: ICommAndAndKeybindingRule = {
	id: 'workbench.Action.interActivePlAyground.pAgeDown',
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegAted()),
	primAry: KeyCode.PAgeDown,
	hAndler: Accessor => {
		const editorService = Accessor.get(IEditorService);
		const ActiveEditorPAne = editorService.ActiveEditorPAne;
		if (ActiveEditorPAne instAnceof WAlkThroughPArt) {
			ActiveEditorPAne.pAgeDown();
		}
	}
};
