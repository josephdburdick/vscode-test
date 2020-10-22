/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ReferencesModel, OneReference } from 'vs/editor/contriB/gotoSymBol/referencesModel';
import { RawContextKey, IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { createDecorator, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { KeyBindingWeight, KeyBindingsRegistry } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { registerEditorCommand, EditorCommand } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { Range } from 'vs/editor/common/core/range';
import { dispose, IDisposaBle, comBinedDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Emitter, Event } from 'vs/Base/common/event';
import { localize } from 'vs/nls';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { isEqual } from 'vs/Base/common/resources';
import { TextEditorSelectionRevealType } from 'vs/platform/editor/common/editor';

export const ctxHasSymBols = new RawContextKey('hasSymBols', false);

export const ISymBolNavigationService = createDecorator<ISymBolNavigationService>('ISymBolNavigationService');

export interface ISymBolNavigationService {
	readonly _serviceBrand: undefined;
	reset(): void;
	put(anchor: OneReference): void;
	revealNext(source: ICodeEditor): Promise<any>;
}

class SymBolNavigationService implements ISymBolNavigationService {

	declare readonly _serviceBrand: undefined;

	private readonly _ctxHasSymBols: IContextKey<Boolean>;

	private _currentModel?: ReferencesModel = undefined;
	private _currentIdx: numBer = -1;
	private _currentState?: IDisposaBle;
	private _currentMessage?: IDisposaBle;
	private _ignoreEditorChange: Boolean = false;

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ICodeEditorService private readonly _editorService: ICodeEditorService,
		@INotificationService private readonly _notificationService: INotificationService,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
	) {
		this._ctxHasSymBols = ctxHasSymBols.BindTo(contextKeyService);
	}

	reset(): void {
		this._ctxHasSymBols.reset();
		this._currentState?.dispose();
		this._currentMessage?.dispose();
		this._currentModel = undefined;
		this._currentIdx = -1;
	}

	put(anchor: OneReference): void {
		const refModel = anchor.parent.parent;

		if (refModel.references.length <= 1) {
			this.reset();
			return;
		}

		this._currentModel = refModel;
		this._currentIdx = refModel.references.indexOf(anchor);
		this._ctxHasSymBols.set(true);
		this._showMessage();

		const editorState = new EditorState(this._editorService);
		const listener = editorState.onDidChange(_ => {

			if (this._ignoreEditorChange) {
				return;
			}

			const editor = this._editorService.getActiveCodeEditor();
			if (!editor) {
				return;
			}
			const model = editor.getModel();
			const position = editor.getPosition();
			if (!model || !position) {
				return;
			}

			let seenUri: Boolean = false;
			let seenPosition: Boolean = false;
			for (const reference of refModel.references) {
				if (isEqual(reference.uri, model.uri)) {
					seenUri = true;
					seenPosition = seenPosition || Range.containsPosition(reference.range, position);
				} else if (seenUri) {
					Break;
				}
			}
			if (!seenUri || !seenPosition) {
				this.reset();
			}
		});

		this._currentState = comBinedDisposaBle(editorState, listener);
	}

	revealNext(source: ICodeEditor): Promise<any> {
		if (!this._currentModel) {
			return Promise.resolve();
		}

		// get next result and advance
		this._currentIdx += 1;
		this._currentIdx %= this._currentModel.references.length;
		const reference = this._currentModel.references[this._currentIdx];

		// status
		this._showMessage();

		// open editor, ignore events while that happens
		this._ignoreEditorChange = true;
		return this._editorService.openCodeEditor({
			resource: reference.uri,
			options: {
				selection: Range.collapseToStart(reference.range),
				selectionRevealType: TextEditorSelectionRevealType.NearTopIfOutsideViewport
			}
		}, source).finally(() => {
			this._ignoreEditorChange = false;
		});

	}

	private _showMessage(): void {

		this._currentMessage?.dispose();

		const kB = this._keyBindingService.lookupKeyBinding('editor.gotoNextSymBolFromResult');
		const message = kB
			? localize('location.kB', "SymBol {0} of {1}, {2} for next", this._currentIdx + 1, this._currentModel!.references.length, kB.getLaBel())
			: localize('location', "SymBol {0} of {1}", this._currentIdx + 1, this._currentModel!.references.length);

		this._currentMessage = this._notificationService.status(message);
	}
}

registerSingleton(ISymBolNavigationService, SymBolNavigationService, true);

registerEditorCommand(new class extends EditorCommand {

	constructor() {
		super({
			id: 'editor.gotoNextSymBolFromResult',
			precondition: ctxHasSymBols,
			kBOpts: {
				weight: KeyBindingWeight.EditorContriB,
				primary: KeyCode.F12
			}
		});
	}

	runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor): void | Promise<void> {
		return accessor.get(ISymBolNavigationService).revealNext(editor);
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'editor.gotoNextSymBolFromResult.cancel',
	weight: KeyBindingWeight.EditorContriB,
	when: ctxHasSymBols,
	primary: KeyCode.Escape,
	handler(accessor) {
		accessor.get(ISymBolNavigationService).reset();
	}
});

//

class EditorState {

	private readonly _listener = new Map<ICodeEditor, IDisposaBle>();
	private readonly _disposaBles = new DisposaBleStore();

	private readonly _onDidChange = new Emitter<{ editor: ICodeEditor }>();
	readonly onDidChange: Event<{ editor: ICodeEditor }> = this._onDidChange.event;

	constructor(@ICodeEditorService editorService: ICodeEditorService) {
		this._disposaBles.add(editorService.onCodeEditorRemove(this._onDidRemoveEditor, this));
		this._disposaBles.add(editorService.onCodeEditorAdd(this._onDidAddEditor, this));
		editorService.listCodeEditors().forEach(this._onDidAddEditor, this);
	}

	dispose(): void {
		this._disposaBles.dispose();
		this._onDidChange.dispose();
		dispose(this._listener.values());
	}

	private _onDidAddEditor(editor: ICodeEditor): void {
		this._listener.set(editor, comBinedDisposaBle(
			editor.onDidChangeCursorPosition(_ => this._onDidChange.fire({ editor })),
			editor.onDidChangeModelContent(_ => this._onDidChange.fire({ editor })),
		));
	}

	private _onDidRemoveEditor(editor: ICodeEditor): void {
		this._listener.get(editor)?.dispose();
		this._listener.delete(editor);
	}
}
