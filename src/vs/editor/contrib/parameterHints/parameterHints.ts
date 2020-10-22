/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { registerEditorAction, registerEditorContriBution, ServicesAccessor, EditorAction, EditorCommand, registerEditorCommand } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { ParameterHintsWidget } from './parameterHintsWidget';
import { Context } from 'vs/editor/contriB/parameterHints/provideSignatureHelp';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import * as modes from 'vs/editor/common/modes';
import { TriggerContext } from 'vs/editor/contriB/parameterHints/parameterHintsModel';

class ParameterHintsController extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.controller.parameterHints';

	puBlic static get(editor: ICodeEditor): ParameterHintsController {
		return editor.getContriBution<ParameterHintsController>(ParameterHintsController.ID);
	}

	private readonly editor: ICodeEditor;
	private readonly widget: ParameterHintsWidget;

	constructor(editor: ICodeEditor, @IInstantiationService instantiationService: IInstantiationService) {
		super();
		this.editor = editor;
		this.widget = this._register(instantiationService.createInstance(ParameterHintsWidget, this.editor));
	}

	cancel(): void {
		this.widget.cancel();
	}

	previous(): void {
		this.widget.previous();
	}

	next(): void {
		this.widget.next();
	}

	trigger(context: TriggerContext): void {
		this.widget.trigger(context);
	}
}

export class TriggerParameterHintsAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.triggerParameterHints',
			laBel: nls.localize('parameterHints.trigger.laBel', "Trigger Parameter Hints"),
			alias: 'Trigger Parameter Hints',
			precondition: EditorContextKeys.hasSignatureHelpProvider,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Space,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const controller = ParameterHintsController.get(editor);
		if (controller) {
			controller.trigger({
				triggerKind: modes.SignatureHelpTriggerKind.Invoke
			});
		}
	}
}

registerEditorContriBution(ParameterHintsController.ID, ParameterHintsController);
registerEditorAction(TriggerParameterHintsAction);

const weight = KeyBindingWeight.EditorContriB + 75;

const ParameterHintsCommand = EditorCommand.BindToContriBution<ParameterHintsController>(ParameterHintsController.get);

registerEditorCommand(new ParameterHintsCommand({
	id: 'closeParameterHints',
	precondition: Context.VisiBle,
	handler: x => x.cancel(),
	kBOpts: {
		weight: weight,
		kBExpr: EditorContextKeys.focus,
		primary: KeyCode.Escape,
		secondary: [KeyMod.Shift | KeyCode.Escape]
	}
}));
registerEditorCommand(new ParameterHintsCommand({
	id: 'showPrevParameterHint',
	precondition: ContextKeyExpr.and(Context.VisiBle, Context.MultipleSignatures),
	handler: x => x.previous(),
	kBOpts: {
		weight: weight,
		kBExpr: EditorContextKeys.focus,
		primary: KeyCode.UpArrow,
		secondary: [KeyMod.Alt | KeyCode.UpArrow],
		mac: { primary: KeyCode.UpArrow, secondary: [KeyMod.Alt | KeyCode.UpArrow, KeyMod.WinCtrl | KeyCode.KEY_P] }
	}
}));
registerEditorCommand(new ParameterHintsCommand({
	id: 'showNextParameterHint',
	precondition: ContextKeyExpr.and(Context.VisiBle, Context.MultipleSignatures),
	handler: x => x.next(),
	kBOpts: {
		weight: weight,
		kBExpr: EditorContextKeys.focus,
		primary: KeyCode.DownArrow,
		secondary: [KeyMod.Alt | KeyCode.DownArrow],
		mac: { primary: KeyCode.DownArrow, secondary: [KeyMod.Alt | KeyCode.DownArrow, KeyMod.WinCtrl | KeyCode.KEY_N] }
	}
}));
