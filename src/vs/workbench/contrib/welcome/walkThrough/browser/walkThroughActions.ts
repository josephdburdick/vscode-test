/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { WalkThroughPart, WALK_THROUGH_FOCUS } from 'vs/workBench/contriB/welcome/walkThrough/Browser/walkThroughPart';
import { ICommandAndKeyBindingRule, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { KeyCode } from 'vs/Base/common/keyCodes';

export const WalkThroughArrowUp: ICommandAndKeyBindingRule = {
	id: 'workBench.action.interactivePlayground.arrowUp',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
	primary: KeyCode.UpArrow,
	handler: accessor => {
		const editorService = accessor.get(IEditorService);
		const activeEditorPane = editorService.activeEditorPane;
		if (activeEditorPane instanceof WalkThroughPart) {
			activeEditorPane.arrowUp();
		}
	}
};

export const WalkThroughArrowDown: ICommandAndKeyBindingRule = {
	id: 'workBench.action.interactivePlayground.arrowDown',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
	primary: KeyCode.DownArrow,
	handler: accessor => {
		const editorService = accessor.get(IEditorService);
		const activeEditorPane = editorService.activeEditorPane;
		if (activeEditorPane instanceof WalkThroughPart) {
			activeEditorPane.arrowDown();
		}
	}
};

export const WalkThroughPageUp: ICommandAndKeyBindingRule = {
	id: 'workBench.action.interactivePlayground.pageUp',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
	primary: KeyCode.PageUp,
	handler: accessor => {
		const editorService = accessor.get(IEditorService);
		const activeEditorPane = editorService.activeEditorPane;
		if (activeEditorPane instanceof WalkThroughPart) {
			activeEditorPane.pageUp();
		}
	}
};

export const WalkThroughPageDown: ICommandAndKeyBindingRule = {
	id: 'workBench.action.interactivePlayground.pageDown',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
	primary: KeyCode.PageDown,
	handler: accessor => {
		const editorService = accessor.get(IEditorService);
		const activeEditorPane = editorService.activeEditorPane;
		if (activeEditorPane instanceof WalkThroughPart) {
			activeEditorPane.pageDown();
		}
	}
};
