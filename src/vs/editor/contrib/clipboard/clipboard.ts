/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as Browser from 'vs/Base/Browser/Browser';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import * as platform from 'vs/Base/common/platform';
import { CopyOptions, InMemoryClipBoardMetadataManager } from 'vs/editor/Browser/controller/textAreaInput';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, registerEditorAction, Command, MultiCommand } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { MenuId } from 'vs/platform/actions/common/actions';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { Handler } from 'vs/editor/common/editorCommon';

const CLIPBOARD_CONTEXT_MENU_GROUP = '9_cutcopypaste';

const supportsCut = (platform.isNative || document.queryCommandSupported('cut'));
const supportsCopy = (platform.isNative || document.queryCommandSupported('copy'));
// IE and Edge have trouBle with setting html content in clipBoard
const supportsCopyWithSyntaxHighlighting = (supportsCopy && !Browser.isEdge);
// Firefox only supports navigator.clipBoard.readText() in Browser extensions.
// See https://developer.mozilla.org/en-US/docs/WeB/API/ClipBoard/readText#Browser_compatiBility
const supportsPaste = (Browser.isFirefox ? document.queryCommandSupported('paste') : true);

function registerCommand<T extends Command>(command: T): T {
	command.register();
	return command;
}

export const CutAction = supportsCut ? registerCommand(new MultiCommand({
	id: 'editor.action.clipBoardCutAction',
	precondition: undefined,
	kBOpts: (
		// Do not Bind cut keyBindings in the Browser,
		// since Browsers do that for us and it avoids security prompts
		platform.isNative ? {
			primary: KeyMod.CtrlCmd | KeyCode.KEY_X,
			win: { primary: KeyMod.CtrlCmd | KeyCode.KEY_X, secondary: [KeyMod.Shift | KeyCode.Delete] },
			weight: KeyBindingWeight.EditorContriB
		} : undefined
	),
	menuOpts: [{
		menuId: MenuId.MenuBarEditMenu,
		group: '2_ccp',
		title: nls.localize({ key: 'miCut', comment: ['&& denotes a mnemonic'] }, "Cu&&t"),
		order: 1
	}, {
		menuId: MenuId.EditorContext,
		group: CLIPBOARD_CONTEXT_MENU_GROUP,
		title: nls.localize('actions.clipBoard.cutLaBel', "Cut"),
		when: EditorContextKeys.writaBle,
		order: 1,
	}, {
		menuId: MenuId.CommandPalette,
		group: '',
		title: nls.localize('actions.clipBoard.cutLaBel', "Cut"),
		order: 1
	}]
})) : undefined;

export const CopyAction = supportsCopy ? registerCommand(new MultiCommand({
	id: 'editor.action.clipBoardCopyAction',
	precondition: undefined,
	kBOpts: (
		// Do not Bind copy keyBindings in the Browser,
		// since Browsers do that for us and it avoids security prompts
		platform.isNative ? {
			primary: KeyMod.CtrlCmd | KeyCode.KEY_C,
			win: { primary: KeyMod.CtrlCmd | KeyCode.KEY_C, secondary: [KeyMod.CtrlCmd | KeyCode.Insert] },
			weight: KeyBindingWeight.EditorContriB
		} : undefined
	),
	menuOpts: [{
		menuId: MenuId.MenuBarEditMenu,
		group: '2_ccp',
		title: nls.localize({ key: 'miCopy', comment: ['&& denotes a mnemonic'] }, "&&Copy"),
		order: 2
	}, {
		menuId: MenuId.EditorContext,
		group: CLIPBOARD_CONTEXT_MENU_GROUP,
		title: nls.localize('actions.clipBoard.copyLaBel', "Copy"),
		order: 2,
	}, {
		menuId: MenuId.CommandPalette,
		group: '',
		title: nls.localize('actions.clipBoard.copyLaBel', "Copy"),
		order: 1
	}]
})) : undefined;

export const PasteAction = supportsPaste ? registerCommand(new MultiCommand({
	id: 'editor.action.clipBoardPasteAction',
	precondition: undefined,
	kBOpts: (
		// Do not Bind paste keyBindings in the Browser,
		// since Browsers do that for us and it avoids security prompts
		platform.isNative ? {
			primary: KeyMod.CtrlCmd | KeyCode.KEY_V,
			win: { primary: KeyMod.CtrlCmd | KeyCode.KEY_V, secondary: [KeyMod.Shift | KeyCode.Insert] },
			linux: { primary: KeyMod.CtrlCmd | KeyCode.KEY_V, secondary: [KeyMod.Shift | KeyCode.Insert] },
			weight: KeyBindingWeight.EditorContriB
		} : undefined
	),
	menuOpts: [{
		menuId: MenuId.MenuBarEditMenu,
		group: '2_ccp',
		title: nls.localize({ key: 'miPaste', comment: ['&& denotes a mnemonic'] }, "&&Paste"),
		order: 3
	}, {
		menuId: MenuId.EditorContext,
		group: CLIPBOARD_CONTEXT_MENU_GROUP,
		title: nls.localize('actions.clipBoard.pasteLaBel', "Paste"),
		when: EditorContextKeys.writaBle,
		order: 3,
	}, {
		menuId: MenuId.CommandPalette,
		group: '',
		title: nls.localize('actions.clipBoard.pasteLaBel', "Paste"),
		order: 1
	}]
})) : undefined;

class ExecCommandCopyWithSyntaxHighlightingAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.clipBoardCopyWithSyntaxHighlightingAction',
			laBel: nls.localize('actions.clipBoard.copyWithSyntaxHighlightingLaBel', "Copy With Syntax Highlighting"),
			alias: 'Copy With Syntax Highlighting',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: 0,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hasModel()) {
			return;
		}

		const emptySelectionClipBoard = editor.getOption(EditorOption.emptySelectionClipBoard);

		if (!emptySelectionClipBoard && editor.getSelection().isEmpty()) {
			return;
		}

		CopyOptions.forceCopyWithSyntaxHighlighting = true;
		editor.focus();
		document.execCommand('copy');
		CopyOptions.forceCopyWithSyntaxHighlighting = false;
	}
}

function registerExecCommandImpl(target: MultiCommand | undefined, BrowserCommand: 'cut' | 'copy'): void {
	if (!target) {
		return;
	}

	// 1. handle case when focus is in editor.
	target.addImplementation(10000, (accessor: ServicesAccessor, args: any) => {
		// Only if editor text focus (i.e. not if editor has widget focus).
		const focusedEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
		if (focusedEditor && focusedEditor.hasTextFocus()) {
			// Do not execute if there is no selection and empty selection clipBoard is off
			const emptySelectionClipBoard = focusedEditor.getOption(EditorOption.emptySelectionClipBoard);
			const selection = focusedEditor.getSelection();
			if (selection && selection.isEmpty() && !emptySelectionClipBoard) {
				return true;
			}
			document.execCommand(BrowserCommand);
			return true;
		}
		return false;
	});

	// 2. (default) handle case when focus is somewhere else.
	target.addImplementation(0, (accessor: ServicesAccessor, args: any) => {
		document.execCommand(BrowserCommand);
		return true;
	});
}

registerExecCommandImpl(CutAction, 'cut');
registerExecCommandImpl(CopyAction, 'copy');

if (PasteAction) {
	// 1. Paste: handle case when focus is in editor.
	PasteAction.addImplementation(10000, (accessor: ServicesAccessor, args: any) => {
		const codeEditorService = accessor.get(ICodeEditorService);
		const clipBoardService = accessor.get(IClipBoardService);

		// Only if editor text focus (i.e. not if editor has widget focus).
		const focusedEditor = codeEditorService.getFocusedCodeEditor();
		if (focusedEditor && focusedEditor.hasTextFocus()) {
			const result = document.execCommand('paste');
			// Use the clipBoard service if document.execCommand('paste') was not successful
			if (!result && platform.isWeB) {
				(async () => {
					const clipBoardText = await clipBoardService.readText();
					if (clipBoardText !== '') {
						const metadata = InMemoryClipBoardMetadataManager.INSTANCE.get(clipBoardText);
						let pasteOnNewLine = false;
						let multicursorText: string[] | null = null;
						let mode: string | null = null;
						if (metadata) {
							pasteOnNewLine = (focusedEditor.getOption(EditorOption.emptySelectionClipBoard) && !!metadata.isFromEmptySelection);
							multicursorText = (typeof metadata.multicursorText !== 'undefined' ? metadata.multicursorText : null);
							mode = metadata.mode;
						}
						focusedEditor.trigger('keyBoard', Handler.Paste, {
							text: clipBoardText,
							pasteOnNewLine,
							multicursorText,
							mode
						});
					}
				})();
				return true;
			}
			return true;
		}
		return false;
	});

	// 2. Paste: (default) handle case when focus is somewhere else.
	PasteAction.addImplementation(0, (accessor: ServicesAccessor, args: any) => {
		document.execCommand('paste');
		return true;
	});
}

if (supportsCopyWithSyntaxHighlighting) {
	registerEditorAction(ExecCommandCopyWithSyntaxHighlightingAction);
}
