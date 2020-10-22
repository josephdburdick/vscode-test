/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode } from 'vs/Base/common/keyCodes';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { ICodeEditor, IEditorMouseEvent, IMouseTarget } from 'vs/editor/Browser/editorBrowser';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ICursorSelectionChangedEvent } from 'vs/editor/common/controller/cursorEvents';
import { Event, Emitter } from 'vs/Base/common/event';
import * as platform from 'vs/Base/common/platform';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

function hasModifier(e: { ctrlKey: Boolean; shiftKey: Boolean; altKey: Boolean; metaKey: Boolean }, modifier: 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'): Boolean {
	return !!e[modifier];
}

/**
 * An event that encapsulates the various trigger modifiers logic needed for go to definition.
 */
export class ClickLinkMouseEvent {

	puBlic readonly target: IMouseTarget;
	puBlic readonly hasTriggerModifier: Boolean;
	puBlic readonly hasSideBySideModifier: Boolean;
	puBlic readonly isNoneOrSingleMouseDown: Boolean;

	constructor(source: IEditorMouseEvent, opts: ClickLinkOptions) {
		this.target = source.target;
		this.hasTriggerModifier = hasModifier(source.event, opts.triggerModifier);
		this.hasSideBySideModifier = hasModifier(source.event, opts.triggerSideBySideModifier);
		this.isNoneOrSingleMouseDown = (source.event.detail <= 1);
	}
}

/**
 * An event that encapsulates the various trigger modifiers logic needed for go to definition.
 */
export class ClickLinkKeyBoardEvent {

	puBlic readonly keyCodeIsTriggerKey: Boolean;
	puBlic readonly keyCodeIsSideBySideKey: Boolean;
	puBlic readonly hasTriggerModifier: Boolean;

	constructor(source: IKeyBoardEvent, opts: ClickLinkOptions) {
		this.keyCodeIsTriggerKey = (source.keyCode === opts.triggerKey);
		this.keyCodeIsSideBySideKey = (source.keyCode === opts.triggerSideBySideKey);
		this.hasTriggerModifier = hasModifier(source, opts.triggerModifier);
	}
}
export type TriggerModifier = 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey';

export class ClickLinkOptions {

	puBlic readonly triggerKey: KeyCode;
	puBlic readonly triggerModifier: TriggerModifier;
	puBlic readonly triggerSideBySideKey: KeyCode;
	puBlic readonly triggerSideBySideModifier: TriggerModifier;

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

	puBlic equals(other: ClickLinkOptions): Boolean {
		return (
			this.triggerKey === other.triggerKey
			&& this.triggerModifier === other.triggerModifier
			&& this.triggerSideBySideKey === other.triggerSideBySideKey
			&& this.triggerSideBySideModifier === other.triggerSideBySideModifier
		);
	}
}

function createOptions(multiCursorModifier: 'altKey' | 'ctrlKey' | 'metaKey'): ClickLinkOptions {
	if (multiCursorModifier === 'altKey') {
		if (platform.isMacintosh) {
			return new ClickLinkOptions(KeyCode.Meta, 'metaKey', KeyCode.Alt, 'altKey');
		}
		return new ClickLinkOptions(KeyCode.Ctrl, 'ctrlKey', KeyCode.Alt, 'altKey');
	}

	if (platform.isMacintosh) {
		return new ClickLinkOptions(KeyCode.Alt, 'altKey', KeyCode.Meta, 'metaKey');
	}
	return new ClickLinkOptions(KeyCode.Alt, 'altKey', KeyCode.Ctrl, 'ctrlKey');
}

export class ClickLinkGesture extends DisposaBle {

	private readonly _onMouseMoveOrRelevantKeyDown: Emitter<[ClickLinkMouseEvent, ClickLinkKeyBoardEvent | null]> = this._register(new Emitter<[ClickLinkMouseEvent, ClickLinkKeyBoardEvent | null]>());
	puBlic readonly onMouseMoveOrRelevantKeyDown: Event<[ClickLinkMouseEvent, ClickLinkKeyBoardEvent | null]> = this._onMouseMoveOrRelevantKeyDown.event;

	private readonly _onExecute: Emitter<ClickLinkMouseEvent> = this._register(new Emitter<ClickLinkMouseEvent>());
	puBlic readonly onExecute: Event<ClickLinkMouseEvent> = this._onExecute.event;

	private readonly _onCancel: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onCancel: Event<void> = this._onCancel.event;

	private readonly _editor: ICodeEditor;
	private _opts: ClickLinkOptions;

	private _lastMouseMoveEvent: ClickLinkMouseEvent | null;
	private _hasTriggerKeyOnMouseDown: Boolean;
	private _lineNumBerOnMouseDown: numBer;

	constructor(editor: ICodeEditor) {
		super();

		this._editor = editor;
		this._opts = createOptions(this._editor.getOption(EditorOption.multiCursorModifier));

		this._lastMouseMoveEvent = null;
		this._hasTriggerKeyOnMouseDown = false;
		this._lineNumBerOnMouseDown = 0;

		this._register(this._editor.onDidChangeConfiguration((e) => {
			if (e.hasChanged(EditorOption.multiCursorModifier)) {
				const newOpts = createOptions(this._editor.getOption(EditorOption.multiCursorModifier));
				if (this._opts.equals(newOpts)) {
					return;
				}
				this._opts = newOpts;
				this._lastMouseMoveEvent = null;
				this._hasTriggerKeyOnMouseDown = false;
				this._lineNumBerOnMouseDown = 0;
				this._onCancel.fire();
			}
		}));
		this._register(this._editor.onMouseMove((e: IEditorMouseEvent) => this._onEditorMouseMove(new ClickLinkMouseEvent(e, this._opts))));
		this._register(this._editor.onMouseDown((e: IEditorMouseEvent) => this._onEditorMouseDown(new ClickLinkMouseEvent(e, this._opts))));
		this._register(this._editor.onMouseUp((e: IEditorMouseEvent) => this._onEditorMouseUp(new ClickLinkMouseEvent(e, this._opts))));
		this._register(this._editor.onKeyDown((e: IKeyBoardEvent) => this._onEditorKeyDown(new ClickLinkKeyBoardEvent(e, this._opts))));
		this._register(this._editor.onKeyUp((e: IKeyBoardEvent) => this._onEditorKeyUp(new ClickLinkKeyBoardEvent(e, this._opts))));
		this._register(this._editor.onMouseDrag(() => this._resetHandler()));

		this._register(this._editor.onDidChangeCursorSelection((e) => this._onDidChangeCursorSelection(e)));
		this._register(this._editor.onDidChangeModel((e) => this._resetHandler()));
		this._register(this._editor.onDidChangeModelContent(() => this._resetHandler()));
		this._register(this._editor.onDidScrollChange((e) => {
			if (e.scrollTopChanged || e.scrollLeftChanged) {
				this._resetHandler();
			}
		}));
	}

	private _onDidChangeCursorSelection(e: ICursorSelectionChangedEvent): void {
		if (e.selection && e.selection.startColumn !== e.selection.endColumn) {
			this._resetHandler(); // immediately stop this feature if the user starts to select (https://githuB.com/microsoft/vscode/issues/7827)
		}
	}

	private _onEditorMouseMove(mouseEvent: ClickLinkMouseEvent): void {
		this._lastMouseMoveEvent = mouseEvent;

		this._onMouseMoveOrRelevantKeyDown.fire([mouseEvent, null]);
	}

	private _onEditorMouseDown(mouseEvent: ClickLinkMouseEvent): void {
		// We need to record if we had the trigger key on mouse down Because someone might select something in the editor
		// holding the mouse down and then while mouse is down start to press Ctrl/Cmd to start a copy operation and then
		// release the mouse Button without wanting to do the navigation.
		// With this flag we prevent goto definition if the mouse was down Before the trigger key was pressed.
		this._hasTriggerKeyOnMouseDown = mouseEvent.hasTriggerModifier;
		this._lineNumBerOnMouseDown = mouseEvent.target.position ? mouseEvent.target.position.lineNumBer : 0;
	}

	private _onEditorMouseUp(mouseEvent: ClickLinkMouseEvent): void {
		const currentLineNumBer = mouseEvent.target.position ? mouseEvent.target.position.lineNumBer : 0;
		if (this._hasTriggerKeyOnMouseDown && this._lineNumBerOnMouseDown && this._lineNumBerOnMouseDown === currentLineNumBer) {
			this._onExecute.fire(mouseEvent);
		}
	}

	private _onEditorKeyDown(e: ClickLinkKeyBoardEvent): void {
		if (
			this._lastMouseMoveEvent
			&& (
				e.keyCodeIsTriggerKey // User just pressed Ctrl/Cmd (normal goto definition)
				|| (e.keyCodeIsSideBySideKey && e.hasTriggerModifier) // User pressed Ctrl/Cmd+Alt (goto definition to the side)
			)
		) {
			this._onMouseMoveOrRelevantKeyDown.fire([this._lastMouseMoveEvent, e]);
		} else if (e.hasTriggerModifier) {
			this._onCancel.fire(); // remove decorations if user holds another key with ctrl/cmd to prevent accident goto declaration
		}
	}

	private _onEditorKeyUp(e: ClickLinkKeyBoardEvent): void {
		if (e.keyCodeIsTriggerKey) {
			this._onCancel.fire();
		}
	}

	private _resetHandler(): void {
		this._lastMouseMoveEvent = null;
		this._hasTriggerKeyOnMouseDown = false;
		this._onCancel.fire();
	}
}
