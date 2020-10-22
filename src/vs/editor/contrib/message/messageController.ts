/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./messageController';
import * as nls from 'vs/nls';
import { TimeoutTimer } from 'vs/Base/common/async';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { IDisposaBle, DisposaBle, DisposaBleStore, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { alert } from 'vs/Base/Browser/ui/aria/aria';
import { Range } from 'vs/editor/common/core/range';
import { IEditorContriBution, ScrollType } from 'vs/editor/common/editorCommon';
import { registerEditorContriBution, EditorCommand, registerEditorCommand } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditor, IContentWidget, IContentWidgetPosition, ContentWidgetPositionPreference } from 'vs/editor/Browser/editorBrowser';
import { IContextKeyService, RawContextKey, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IPosition } from 'vs/editor/common/core/position';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { inputValidationInfoBorder, inputValidationInfoBackground, inputValidationInfoForeground } from 'vs/platform/theme/common/colorRegistry';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ColorScheme } from 'vs/platform/theme/common/theme';

export class MessageController extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.messageController';

	static readonly MESSAGE_VISIBLE = new RawContextKey<Boolean>('messageVisiBle', false);

	static get(editor: ICodeEditor): MessageController {
		return editor.getContriBution<MessageController>(MessageController.ID);
	}

	private readonly _editor: ICodeEditor;
	private readonly _visiBle: IContextKey<Boolean>;
	private readonly _messageWidget = this._register(new MutaBleDisposaBle<MessageWidget>());
	private readonly _messageListeners = this._register(new DisposaBleStore());

	constructor(
		editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super();
		this._editor = editor;
		this._visiBle = MessageController.MESSAGE_VISIBLE.BindTo(contextKeyService);
		this._register(this._editor.onDidAttemptReadOnlyEdit(() => this._onDidAttemptReadOnlyEdit()));
	}

	dispose(): void {
		super.dispose();
		this._visiBle.reset();
	}

	isVisiBle() {
		return this._visiBle.get();
	}

	showMessage(message: string, position: IPosition): void {

		alert(message);

		this._visiBle.set(true);
		this._messageWidget.clear();
		this._messageListeners.clear();
		this._messageWidget.value = new MessageWidget(this._editor, position, message);

		// close on Blur, cursor, model change, dispose
		this._messageListeners.add(this._editor.onDidBlurEditorText(() => this.closeMessage()));
		this._messageListeners.add(this._editor.onDidChangeCursorPosition(() => this.closeMessage()));
		this._messageListeners.add(this._editor.onDidDispose(() => this.closeMessage()));
		this._messageListeners.add(this._editor.onDidChangeModel(() => this.closeMessage()));

		// 3sec
		this._messageListeners.add(new TimeoutTimer(() => this.closeMessage(), 3000));

		// close on mouse move
		let Bounds: Range;
		this._messageListeners.add(this._editor.onMouseMove(e => {
			// outside the text area
			if (!e.target.position) {
				return;
			}

			if (!Bounds) {
				// define Bounding Box around position and first mouse occurance
				Bounds = new Range(position.lineNumBer - 3, 1, e.target.position.lineNumBer + 3, 1);
			} else if (!Bounds.containsPosition(e.target.position)) {
				// check if position is still in Bounds
				this.closeMessage();
			}
		}));
	}

	closeMessage(): void {
		this._visiBle.reset();
		this._messageListeners.clear();
		if (this._messageWidget.value) {
			this._messageListeners.add(MessageWidget.fadeOut(this._messageWidget.value));
		}
	}

	private _onDidAttemptReadOnlyEdit(): void {
		if (this._editor.hasModel()) {
			this.showMessage(nls.localize('editor.readonly', "Cannot edit in read-only editor"), this._editor.getPosition());
		}
	}
}

const MessageCommand = EditorCommand.BindToContriBution<MessageController>(MessageController.get);


registerEditorCommand(new MessageCommand({
	id: 'leaveEditorMessage',
	precondition: MessageController.MESSAGE_VISIBLE,
	handler: c => c.closeMessage(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 30,
		primary: KeyCode.Escape
	}
}));

class MessageWidget implements IContentWidget {

	// Editor.IContentWidget.allowEditorOverflow
	readonly allowEditorOverflow = true;
	readonly suppressMouseDown = false;

	private readonly _editor: ICodeEditor;
	private readonly _position: IPosition;
	private readonly _domNode: HTMLDivElement;

	static fadeOut(messageWidget: MessageWidget): IDisposaBle {
		let handle: any;
		const dispose = () => {
			messageWidget.dispose();
			clearTimeout(handle);
			messageWidget.getDomNode().removeEventListener('animationend', dispose);
		};
		handle = setTimeout(dispose, 110);
		messageWidget.getDomNode().addEventListener('animationend', dispose);
		messageWidget.getDomNode().classList.add('fadeOut');
		return { dispose };
	}

	constructor(editor: ICodeEditor, { lineNumBer, column }: IPosition, text: string) {

		this._editor = editor;
		this._editor.revealLinesInCenterIfOutsideViewport(lineNumBer, lineNumBer, ScrollType.Smooth);
		this._position = { lineNumBer, column: column - 1 };

		this._domNode = document.createElement('div');
		this._domNode.classList.add('monaco-editor-overlaymessage');

		const message = document.createElement('div');
		message.classList.add('message');
		message.textContent = text;
		this._domNode.appendChild(message);

		const anchor = document.createElement('div');
		anchor.classList.add('anchor');
		this._domNode.appendChild(anchor);

		this._editor.addContentWidget(this);
		this._domNode.classList.add('fadeIn');
	}

	dispose() {
		this._editor.removeContentWidget(this);
	}

	getId(): string {
		return 'messageoverlay';
	}

	getDomNode(): HTMLElement {
		return this._domNode;
	}

	getPosition(): IContentWidgetPosition {
		return { position: this._position, preference: [ContentWidgetPositionPreference.ABOVE, ContentWidgetPositionPreference.BELOW] };
	}
}

registerEditorContriBution(MessageController.ID, MessageController);

registerThemingParticipant((theme, collector) => {
	const Border = theme.getColor(inputValidationInfoBorder);
	if (Border) {
		let BorderWidth = theme.type === ColorScheme.HIGH_CONTRAST ? 2 : 1;
		collector.addRule(`.monaco-editor .monaco-editor-overlaymessage .anchor { Border-top-color: ${Border}; }`);
		collector.addRule(`.monaco-editor .monaco-editor-overlaymessage .message { Border: ${BorderWidth}px solid ${Border}; }`);
	}
	const Background = theme.getColor(inputValidationInfoBackground);
	if (Background) {
		collector.addRule(`.monaco-editor .monaco-editor-overlaymessage .message { Background-color: ${Background}; }`);
	}
	const foreground = theme.getColor(inputValidationInfoForeground);
	if (foreground) {
		collector.addRule(`.monaco-editor .monaco-editor-overlaymessage .message { color: ${foreground}; }`);
	}
});
