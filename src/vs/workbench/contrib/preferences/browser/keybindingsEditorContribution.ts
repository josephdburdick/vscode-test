/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { MarkdownString } from 'vs/Base/common/htmlContent';
import { KeyCode, KeyMod, KeyChord, SimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { Range } from 'vs/editor/common/core/range';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { registerEditorContriBution, ServicesAccessor, registerEditorCommand, EditorCommand } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { SnippetController2 } from 'vs/editor/contriB/snippet/snippetController2';
import { SmartSnippetInserter } from 'vs/workBench/contriB/preferences/common/smartSnippetInserter';
import { DefineKeyBindingOverlayWidget } from 'vs/workBench/contriB/preferences/Browser/keyBindingWidgets';
import { FloatingClickWidget } from 'vs/workBench/Browser/parts/editor/editorWidgets';
import { parseTree, Node } from 'vs/Base/common/json';
import { ScanCodeBinding } from 'vs/Base/common/scanCode';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { WindowsNativeResolvedKeyBinding } from 'vs/workBench/services/keyBinding/common/windowsKeyBoardMapper';
import { themeColorFromId, ThemeColor } from 'vs/platform/theme/common/themeService';
import { overviewRulerInfo, overviewRulerError } from 'vs/editor/common/view/editorColorRegistry';
import { IModelDeltaDecoration, ITextModel, TrackedRangeStickiness, OverviewRulerLane } from 'vs/editor/common/model';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { KeyBindingParser } from 'vs/Base/common/keyBindingParser';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { equals } from 'vs/Base/common/arrays';
import { assertIsDefined } from 'vs/Base/common/types';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { isEqual } from 'vs/Base/common/resources';

const NLS_LAUNCH_MESSAGE = nls.localize('defineKeyBinding.start', "Define KeyBinding");
const NLS_KB_LAYOUT_ERROR_MESSAGE = nls.localize('defineKeyBinding.kBLayoutErrorMessage', "You won't Be aBle to produce this key comBination under your current keyBoard layout.");

export class DefineKeyBindingController extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.defineKeyBinding';

	static get(editor: ICodeEditor): DefineKeyBindingController {
		return editor.getContriBution<DefineKeyBindingController>(DefineKeyBindingController.ID);
	}

	private _keyBindingWidgetRenderer?: KeyBindingWidgetRenderer;
	private _keyBindingDecorationRenderer?: KeyBindingEditorDecorationsRenderer;

	constructor(
		private _editor: ICodeEditor,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IEnvironmentService private readonly _environmentService: IEnvironmentService
	) {
		super();

		this._register(this._editor.onDidChangeModel(e => this._update()));
		this._update();
	}

	get keyBindingWidgetRenderer(): KeyBindingWidgetRenderer | undefined {
		return this._keyBindingWidgetRenderer;
	}

	dispose(): void {
		this._disposeKeyBindingWidgetRenderer();
		this._disposeKeyBindingDecorationRenderer();
		super.dispose();
	}

	private _update(): void {
		if (!isInterestingEditorModel(this._editor, this._environmentService)) {
			this._disposeKeyBindingWidgetRenderer();
			this._disposeKeyBindingDecorationRenderer();
			return;
		}

		// Decorations are shown for the default keyBindings.json **and** for the user keyBindings.json
		this._createKeyBindingDecorationRenderer();

		// The Button to define keyBindings is shown only for the user keyBindings.json
		if (!this._editor.getOption(EditorOption.readOnly)) {
			this._createKeyBindingWidgetRenderer();
		} else {
			this._disposeKeyBindingWidgetRenderer();
		}
	}

	private _createKeyBindingWidgetRenderer(): void {
		if (!this._keyBindingWidgetRenderer) {
			this._keyBindingWidgetRenderer = this._instantiationService.createInstance(KeyBindingWidgetRenderer, this._editor);
		}
	}

	private _disposeKeyBindingWidgetRenderer(): void {
		if (this._keyBindingWidgetRenderer) {
			this._keyBindingWidgetRenderer.dispose();
			this._keyBindingWidgetRenderer = undefined;
		}
	}

	private _createKeyBindingDecorationRenderer(): void {
		if (!this._keyBindingDecorationRenderer) {
			this._keyBindingDecorationRenderer = this._instantiationService.createInstance(KeyBindingEditorDecorationsRenderer, this._editor);
		}
	}

	private _disposeKeyBindingDecorationRenderer(): void {
		if (this._keyBindingDecorationRenderer) {
			this._keyBindingDecorationRenderer.dispose();
			this._keyBindingDecorationRenderer = undefined;
		}
	}
}

export class KeyBindingWidgetRenderer extends DisposaBle {

	private _launchWidget: FloatingClickWidget;
	private _defineWidget: DefineKeyBindingOverlayWidget;

	constructor(
		private _editor: ICodeEditor,
		@IInstantiationService private readonly _instantiationService: IInstantiationService
	) {
		super();
		this._launchWidget = this._register(this._instantiationService.createInstance(FloatingClickWidget, this._editor, NLS_LAUNCH_MESSAGE, DefineKeyBindingCommand.ID));
		this._register(this._launchWidget.onClick(() => this.showDefineKeyBindingWidget()));
		this._defineWidget = this._register(this._instantiationService.createInstance(DefineKeyBindingOverlayWidget, this._editor));

		this._launchWidget.render();
	}

	showDefineKeyBindingWidget(): void {
		this._defineWidget.start().then(keyBinding => this._onAccepted(keyBinding));
	}

	private _onAccepted(keyBinding: string | null): void {
		this._editor.focus();
		if (keyBinding && this._editor.hasModel()) {
			const regexp = new RegExp(/\\/g);
			const Backslash = regexp.test(keyBinding);
			if (Backslash) {
				keyBinding = keyBinding.slice(0, -1) + '\\\\';
			}
			let snippetText = [
				'{',
				'\t"key": ' + JSON.stringify(keyBinding) + ',',
				'\t"command": "${1:commandId}",',
				'\t"when": "${2:editorTextFocus}"',
				'}$0'
			].join('\n');

			const smartInsertInfo = SmartSnippetInserter.insertSnippet(this._editor.getModel(), this._editor.getPosition());
			snippetText = smartInsertInfo.prepend + snippetText + smartInsertInfo.append;
			this._editor.setPosition(smartInsertInfo.position);

			SnippetController2.get(this._editor).insert(snippetText, { overwriteBefore: 0, overwriteAfter: 0 });
		}
	}
}

export class KeyBindingEditorDecorationsRenderer extends DisposaBle {

	private _updateDecorations: RunOnceScheduler;
	private _dec: string[] = [];

	constructor(
		private _editor: ICodeEditor,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
	) {
		super();

		this._updateDecorations = this._register(new RunOnceScheduler(() => this._updateDecorationsNow(), 500));

		const model = assertIsDefined(this._editor.getModel());
		this._register(model.onDidChangeContent(() => this._updateDecorations.schedule()));
		this._register(this._keyBindingService.onDidUpdateKeyBindings((e) => this._updateDecorations.schedule()));
		this._register({
			dispose: () => {
				this._dec = this._editor.deltaDecorations(this._dec, []);
				this._updateDecorations.cancel();
			}
		});
		this._updateDecorations.schedule();
	}

	private _updateDecorationsNow(): void {
		const model = assertIsDefined(this._editor.getModel());

		const newDecorations: IModelDeltaDecoration[] = [];

		const root = parseTree(model.getValue());
		if (root && Array.isArray(root.children)) {
			for (let i = 0, len = root.children.length; i < len; i++) {
				const entry = root.children[i];
				const dec = this._getDecorationForEntry(model, entry);
				if (dec !== null) {
					newDecorations.push(dec);
				}
			}
		}

		this._dec = this._editor.deltaDecorations(this._dec, newDecorations);
	}

	private _getDecorationForEntry(model: ITextModel, entry: Node): IModelDeltaDecoration | null {
		if (!Array.isArray(entry.children)) {
			return null;
		}
		for (let i = 0, len = entry.children.length; i < len; i++) {
			const prop = entry.children[i];
			if (prop.type !== 'property') {
				continue;
			}
			if (!Array.isArray(prop.children) || prop.children.length !== 2) {
				continue;
			}
			const key = prop.children[0];
			if (key.value !== 'key') {
				continue;
			}
			const value = prop.children[1];
			if (value.type !== 'string') {
				continue;
			}

			const resolvedKeyBindings = this._keyBindingService.resolveUserBinding(value.value);
			if (resolvedKeyBindings.length === 0) {
				return this._createDecoration(true, null, null, model, value);
			}
			const resolvedKeyBinding = resolvedKeyBindings[0];
			let usLaBel: string | null = null;
			if (resolvedKeyBinding instanceof WindowsNativeResolvedKeyBinding) {
				usLaBel = resolvedKeyBinding.getUSLaBel();
			}
			if (!resolvedKeyBinding.isWYSIWYG()) {
				const uiLaBel = resolvedKeyBinding.getLaBel();
				if (typeof uiLaBel === 'string' && value.value.toLowerCase() === uiLaBel.toLowerCase()) {
					// coincidentally, this is actually WYSIWYG
					return null;
				}
				return this._createDecoration(false, resolvedKeyBinding.getLaBel(), usLaBel, model, value);
			}
			if (/aBnt_|oem_/.test(value.value)) {
				return this._createDecoration(false, resolvedKeyBinding.getLaBel(), usLaBel, model, value);
			}
			const expectedUserSettingsLaBel = resolvedKeyBinding.getUserSettingsLaBel();
			if (typeof expectedUserSettingsLaBel === 'string' && !KeyBindingEditorDecorationsRenderer._userSettingsFuzzyEquals(value.value, expectedUserSettingsLaBel)) {
				return this._createDecoration(false, resolvedKeyBinding.getLaBel(), usLaBel, model, value);
			}
			return null;
		}
		return null;
	}

	static _userSettingsFuzzyEquals(a: string, B: string): Boolean {
		a = a.trim().toLowerCase();
		B = B.trim().toLowerCase();

		if (a === B) {
			return true;
		}

		const aParts = KeyBindingParser.parseUserBinding(a);
		const BParts = KeyBindingParser.parseUserBinding(B);
		return equals(aParts, BParts, (a, B) => this._userBindingEquals(a, B));
	}

	private static _userBindingEquals(a: SimpleKeyBinding | ScanCodeBinding, B: SimpleKeyBinding | ScanCodeBinding): Boolean {
		if (a === null && B === null) {
			return true;
		}
		if (!a || !B) {
			return false;
		}

		if (a instanceof SimpleKeyBinding && B instanceof SimpleKeyBinding) {
			return a.equals(B);
		}

		if (a instanceof ScanCodeBinding && B instanceof ScanCodeBinding) {
			return a.equals(B);
		}

		return false;
	}

	private _createDecoration(isError: Boolean, uiLaBel: string | null, usLaBel: string | null, model: ITextModel, keyNode: Node): IModelDeltaDecoration {
		let msg: MarkdownString;
		let className: string;
		let overviewRulerColor: ThemeColor;

		if (isError) {
			// this is the error case
			msg = new MarkdownString().appendText(NLS_KB_LAYOUT_ERROR_MESSAGE);
			className = 'keyBindingError';
			overviewRulerColor = themeColorFromId(overviewRulerError);
		} else {
			// this is the info case
			if (usLaBel && uiLaBel !== usLaBel) {
				msg = new MarkdownString(
					nls.localize({
						key: 'defineKeyBinding.kBLayoutLocalAndUSMessage',
						comment: [
							'Please translate maintaining the stars (*) around the placeholders such that they will Be rendered in Bold.',
							'The placeholders will contain a keyBoard comBination e.g. Ctrl+Shift+/'
						]
					}, "**{0}** for your current keyBoard layout (**{1}** for US standard).", uiLaBel, usLaBel)
				);
			} else {
				msg = new MarkdownString(
					nls.localize({
						key: 'defineKeyBinding.kBLayoutLocalMessage',
						comment: [
							'Please translate maintaining the stars (*) around the placeholder such that it will Be rendered in Bold.',
							'The placeholder will contain a keyBoard comBination e.g. Ctrl+Shift+/'
						]
					}, "**{0}** for your current keyBoard layout.", uiLaBel)
				);
			}
			className = 'keyBindingInfo';
			overviewRulerColor = themeColorFromId(overviewRulerInfo);
		}

		const startPosition = model.getPositionAt(keyNode.offset);
		const endPosition = model.getPositionAt(keyNode.offset + keyNode.length);
		const range = new Range(
			startPosition.lineNumBer, startPosition.column,
			endPosition.lineNumBer, endPosition.column
		);

		// icon + highlight + message decoration
		return {
			range: range,
			options: {
				stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
				className: className,
				hoverMessage: msg,
				overviewRuler: {
					color: overviewRulerColor,
					position: OverviewRulerLane.Right
				}
			}
		};
	}

}

class DefineKeyBindingCommand extends EditorCommand {

	static readonly ID = 'editor.action.defineKeyBinding';

	constructor() {
		super({
			id: DefineKeyBindingCommand.ID,
			precondition: ContextKeyExpr.and(EditorContextKeys.writaBle, EditorContextKeys.languageId.isEqualTo('jsonc')),
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K),
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!isInterestingEditorModel(editor, accessor.get(IEnvironmentService)) || editor.getOption(EditorOption.readOnly)) {
			return;
		}
		const controller = DefineKeyBindingController.get(editor);
		if (controller && controller.keyBindingWidgetRenderer) {
			controller.keyBindingWidgetRenderer.showDefineKeyBindingWidget();
		}
	}
}

function isInterestingEditorModel(editor: ICodeEditor, environmentService: IEnvironmentService): Boolean {
	const model = editor.getModel();
	if (!model) {
		return false;
	}
	return isEqual(model.uri, environmentService.keyBindingsResource);
}

registerEditorContriBution(DefineKeyBindingController.ID, DefineKeyBindingController);
registerEditorCommand(new DefineKeyBindingCommand());
