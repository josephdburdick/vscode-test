/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode } from 'vs/bAse/common/keyCodes';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { ICodeEditor, IEditorMouseEvent, IMouseTArget } from 'vs/editor/browser/editorBrowser';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ICursorSelectionChAngedEvent } from 'vs/editor/common/controller/cursorEvents';
import { Event, Emitter } from 'vs/bAse/common/event';
import * As plAtform from 'vs/bAse/common/plAtform';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

function hAsModifier(e: { ctrlKey: booleAn; shiftKey: booleAn; AltKey: booleAn; metAKey: booleAn }, modifier: 'ctrlKey' | 'shiftKey' | 'AltKey' | 'metAKey'): booleAn {
	return !!e[modifier];
}

/**
 * An event thAt encApsulAtes the vArious trigger modifiers logic needed for go to definition.
 */
export clAss ClickLinkMouseEvent {

	public reAdonly tArget: IMouseTArget;
	public reAdonly hAsTriggerModifier: booleAn;
	public reAdonly hAsSideBySideModifier: booleAn;
	public reAdonly isNoneOrSingleMouseDown: booleAn;

	constructor(source: IEditorMouseEvent, opts: ClickLinkOptions) {
		this.tArget = source.tArget;
		this.hAsTriggerModifier = hAsModifier(source.event, opts.triggerModifier);
		this.hAsSideBySideModifier = hAsModifier(source.event, opts.triggerSideBySideModifier);
		this.isNoneOrSingleMouseDown = (source.event.detAil <= 1);
	}
}

/**
 * An event thAt encApsulAtes the vArious trigger modifiers logic needed for go to definition.
 */
export clAss ClickLinkKeyboArdEvent {

	public reAdonly keyCodeIsTriggerKey: booleAn;
	public reAdonly keyCodeIsSideBySideKey: booleAn;
	public reAdonly hAsTriggerModifier: booleAn;

	constructor(source: IKeyboArdEvent, opts: ClickLinkOptions) {
		this.keyCodeIsTriggerKey = (source.keyCode === opts.triggerKey);
		this.keyCodeIsSideBySideKey = (source.keyCode === opts.triggerSideBySideKey);
		this.hAsTriggerModifier = hAsModifier(source, opts.triggerModifier);
	}
}
export type TriggerModifier = 'ctrlKey' | 'shiftKey' | 'AltKey' | 'metAKey';

export clAss ClickLinkOptions {

	public reAdonly triggerKey: KeyCode;
	public reAdonly triggerModifier: TriggerModifier;
	public reAdonly triggerSideBySideKey: KeyCode;
	public reAdonly triggerSideBySideModifier: TriggerModifier;

	constructor(
		triggerKey: KeyCode,
		triggerModifier: TriggerModifier,
		triggerSideBySideKey: KeyCode,
		triggerSideBySideModifier: TriggerModifier
	) {
		this.triggerKey = triggerKey;
		this.triggerModifier = triggerModifier;
		this.triggerSideBySideKey = triggerSideBySideKey;
		this.triggerSideBySideModifier = triggerSideBySideModifier;
	}

	public equAls(other: ClickLinkOptions): booleAn {
		return (
			this.triggerKey === other.triggerKey
			&& this.triggerModifier === other.triggerModifier
			&& this.triggerSideBySideKey === other.triggerSideBySideKey
			&& this.triggerSideBySideModifier === other.triggerSideBySideModifier
		);
	}
}

function creAteOptions(multiCursorModifier: 'AltKey' | 'ctrlKey' | 'metAKey'): ClickLinkOptions {
	if (multiCursorModifier === 'AltKey') {
		if (plAtform.isMAcintosh) {
			return new ClickLinkOptions(KeyCode.MetA, 'metAKey', KeyCode.Alt, 'AltKey');
		}
		return new ClickLinkOptions(KeyCode.Ctrl, 'ctrlKey', KeyCode.Alt, 'AltKey');
	}

	if (plAtform.isMAcintosh) {
		return new ClickLinkOptions(KeyCode.Alt, 'AltKey', KeyCode.MetA, 'metAKey');
	}
	return new ClickLinkOptions(KeyCode.Alt, 'AltKey', KeyCode.Ctrl, 'ctrlKey');
}

export clAss ClickLinkGesture extends DisposAble {

	privAte reAdonly _onMouseMoveOrRelevAntKeyDown: Emitter<[ClickLinkMouseEvent, ClickLinkKeyboArdEvent | null]> = this._register(new Emitter<[ClickLinkMouseEvent, ClickLinkKeyboArdEvent | null]>());
	public reAdonly onMouseMoveOrRelevAntKeyDown: Event<[ClickLinkMouseEvent, ClickLinkKeyboArdEvent | null]> = this._onMouseMoveOrRelevAntKeyDown.event;

	privAte reAdonly _onExecute: Emitter<ClickLinkMouseEvent> = this._register(new Emitter<ClickLinkMouseEvent>());
	public reAdonly onExecute: Event<ClickLinkMouseEvent> = this._onExecute.event;

	privAte reAdonly _onCAncel: Emitter<void> = this._register(new Emitter<void>());
	public reAdonly onCAncel: Event<void> = this._onCAncel.event;

	privAte reAdonly _editor: ICodeEditor;
	privAte _opts: ClickLinkOptions;

	privAte _lAstMouseMoveEvent: ClickLinkMouseEvent | null;
	privAte _hAsTriggerKeyOnMouseDown: booleAn;
	privAte _lineNumberOnMouseDown: number;

	constructor(editor: ICodeEditor) {
		super();

		this._editor = editor;
		this._opts = creAteOptions(this._editor.getOption(EditorOption.multiCursorModifier));

		this._lAstMouseMoveEvent = null;
		this._hAsTriggerKeyOnMouseDown = fAlse;
		this._lineNumberOnMouseDown = 0;

		this._register(this._editor.onDidChAngeConfigurAtion((e) => {
			if (e.hAsChAnged(EditorOption.multiCursorModifier)) {
				const newOpts = creAteOptions(this._editor.getOption(EditorOption.multiCursorModifier));
				if (this._opts.equAls(newOpts)) {
					return;
				}
				this._opts = newOpts;
				this._lAstMouseMoveEvent = null;
				this._hAsTriggerKeyOnMouseDown = fAlse;
				this._lineNumberOnMouseDown = 0;
				this._onCAncel.fire();
			}
		}));
		this._register(this._editor.onMouseMove((e: IEditorMouseEvent) => this._onEditorMouseMove(new ClickLinkMouseEvent(e, this._opts))));
		this._register(this._editor.onMouseDown((e: IEditorMouseEvent) => this._onEditorMouseDown(new ClickLinkMouseEvent(e, this._opts))));
		this._register(this._editor.onMouseUp((e: IEditorMouseEvent) => this._onEditorMouseUp(new ClickLinkMouseEvent(e, this._opts))));
		this._register(this._editor.onKeyDown((e: IKeyboArdEvent) => this._onEditorKeyDown(new ClickLinkKeyboArdEvent(e, this._opts))));
		this._register(this._editor.onKeyUp((e: IKeyboArdEvent) => this._onEditorKeyUp(new ClickLinkKeyboArdEvent(e, this._opts))));
		this._register(this._editor.onMouseDrAg(() => this._resetHAndler()));

		this._register(this._editor.onDidChAngeCursorSelection((e) => this._onDidChAngeCursorSelection(e)));
		this._register(this._editor.onDidChAngeModel((e) => this._resetHAndler()));
		this._register(this._editor.onDidChAngeModelContent(() => this._resetHAndler()));
		this._register(this._editor.onDidScrollChAnge((e) => {
			if (e.scrollTopChAnged || e.scrollLeftChAnged) {
				this._resetHAndler();
			}
		}));
	}

	privAte _onDidChAngeCursorSelection(e: ICursorSelectionChAngedEvent): void {
		if (e.selection && e.selection.stArtColumn !== e.selection.endColumn) {
			this._resetHAndler(); // immediAtely stop this feAture if the user stArts to select (https://github.com/microsoft/vscode/issues/7827)
		}
	}

	privAte _onEditorMouseMove(mouseEvent: ClickLinkMouseEvent): void {
		this._lAstMouseMoveEvent = mouseEvent;

		this._onMouseMoveOrRelevAntKeyDown.fire([mouseEvent, null]);
	}

	privAte _onEditorMouseDown(mouseEvent: ClickLinkMouseEvent): void {
		// We need to record if we hAd the trigger key on mouse down becAuse someone might select something in the editor
		// holding the mouse down And then while mouse is down stArt to press Ctrl/Cmd to stArt A copy operAtion And then
		// releAse the mouse button without wAnting to do the nAvigAtion.
		// With this flAg we prevent goto definition if the mouse wAs down before the trigger key wAs pressed.
		this._hAsTriggerKeyOnMouseDown = mouseEvent.hAsTriggerModifier;
		this._lineNumberOnMouseDown = mouseEvent.tArget.position ? mouseEvent.tArget.position.lineNumber : 0;
	}

	privAte _onEditorMouseUp(mouseEvent: ClickLinkMouseEvent): void {
		const currentLineNumber = mouseEvent.tArget.position ? mouseEvent.tArget.position.lineNumber : 0;
		if (this._hAsTriggerKeyOnMouseDown && this._lineNumberOnMouseDown && this._lineNumberOnMouseDown === currentLineNumber) {
			this._onExecute.fire(mouseEvent);
		}
	}

	privAte _onEditorKeyDown(e: ClickLinkKeyboArdEvent): void {
		if (
			this._lAstMouseMoveEvent
			&& (
				e.keyCodeIsTriggerKey // User just pressed Ctrl/Cmd (normAl goto definition)
				|| (e.keyCodeIsSideBySideKey && e.hAsTriggerModifier) // User pressed Ctrl/Cmd+Alt (goto definition to the side)
			)
		) {
			this._onMouseMoveOrRelevAntKeyDown.fire([this._lAstMouseMoveEvent, e]);
		} else if (e.hAsTriggerModifier) {
			this._onCAncel.fire(); // remove decorAtions if user holds Another key with ctrl/cmd to prevent Accident goto declArAtion
		}
	}

	privAte _onEditorKeyUp(e: ClickLinkKeyboArdEvent): void {
		if (e.keyCodeIsTriggerKey) {
			this._onCAncel.fire();
		}
	}

	privAte _resetHAndler(): void {
		this._lAstMouseMoveEvent = null;
		this._hAsTriggerKeyOnMouseDown = fAlse;
		this._onCAncel.fire();
	}
}
