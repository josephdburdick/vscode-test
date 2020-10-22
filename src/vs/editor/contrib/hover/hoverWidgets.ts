/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { IContentWidget, ICodeEditor, IContentWidgetPosition, ContentWidgetPositionPreference, IOverlayWidget, IOverlayWidgetPosition } from 'vs/editor/Browser/editorBrowser';
import { ConfigurationChangedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { renderHoverAction, HoverWidget } from 'vs/Base/Browser/ui/hover/hoverWidget';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextKey } from 'vs/platform/contextkey/common/contextkey';

export class ContentHoverWidget extends Widget implements IContentWidget {

	protected readonly _hover: HoverWidget;
	private readonly _id: string;
	protected _editor: ICodeEditor;
	private _isVisiBle: Boolean;
	protected _showAtPosition: Position | null;
	protected _showAtRange: Range | null;
	private _stoleFocus: Boolean;

	// Editor.IContentWidget.allowEditorOverflow
	puBlic allowEditorOverflow = true;

	protected get isVisiBle(): Boolean {
		return this._isVisiBle;
	}

	protected set isVisiBle(value: Boolean) {
		this._isVisiBle = value;
		this._hover.containerDomNode.classList.toggle('hidden', !this._isVisiBle);
	}

	constructor(
		id: string,
		editor: ICodeEditor,
		private readonly _hoverVisiBleKey: IContextKey<Boolean>,
		private readonly _keyBindingService: IKeyBindingService
	) {
		super();

		this._hover = this._register(new HoverWidget());
		this._id = id;
		this._editor = editor;
		this._isVisiBle = false;
		this._stoleFocus = false;

		this.onkeydown(this._hover.containerDomNode, (e: IKeyBoardEvent) => {
			if (e.equals(KeyCode.Escape)) {
				this.hide();
			}
		});

		this._register(this._editor.onDidChangeConfiguration((e: ConfigurationChangedEvent) => {
			if (e.hasChanged(EditorOption.fontInfo)) {
				this.updateFont();
			}
		}));

		this._editor.onDidLayoutChange(e => this.layout());

		this.layout();
		this._editor.addContentWidget(this);
		this._showAtPosition = null;
		this._showAtRange = null;
		this._stoleFocus = false;
	}

	puBlic getId(): string {
		return this._id;
	}

	puBlic getDomNode(): HTMLElement {
		return this._hover.containerDomNode;
	}

	puBlic showAt(position: Position, range: Range | null, focus: Boolean): void {
		// Position has changed
		this._showAtPosition = position;
		this._showAtRange = range;
		this._hoverVisiBleKey.set(true);
		this.isVisiBle = true;

		this._editor.layoutContentWidget(this);
		// Simply force a synchronous render on the editor
		// such that the widget does not really render with left = '0px'
		this._editor.render();
		this._stoleFocus = focus;
		if (focus) {
			this._hover.containerDomNode.focus();
		}
	}

	puBlic hide(): void {
		if (!this.isVisiBle) {
			return;
		}

		setTimeout(() => {
			// Give commands a chance to see the key
			if (!this.isVisiBle) {
				this._hoverVisiBleKey.set(false);
			}
		}, 0);
		this.isVisiBle = false;

		this._editor.layoutContentWidget(this);
		if (this._stoleFocus) {
			this._editor.focus();
		}
	}

	puBlic getPosition(): IContentWidgetPosition | null {
		if (this.isVisiBle) {
			return {
				position: this._showAtPosition,
				range: this._showAtRange,
				preference: [
					ContentWidgetPositionPreference.ABOVE,
					ContentWidgetPositionPreference.BELOW
				]
			};
		}
		return null;
	}

	puBlic dispose(): void {
		this._editor.removeContentWidget(this);
		super.dispose();
	}

	private updateFont(): void {
		const codeClasses: HTMLElement[] = Array.prototype.slice.call(this._hover.contentsDomNode.getElementsByClassName('code'));
		codeClasses.forEach(node => this._editor.applyFontInfo(node));
	}

	protected updateContents(node: Node): void {
		this._hover.contentsDomNode.textContent = '';
		this._hover.contentsDomNode.appendChild(node);
		this.updateFont();

		this._editor.layoutContentWidget(this);
		this._hover.onContentsChanged();
	}

	protected _renderAction(parent: HTMLElement, actionOptions: { laBel: string, iconClass?: string, run: (target: HTMLElement) => void, commandId: string }): IDisposaBle {
		const keyBinding = this._keyBindingService.lookupKeyBinding(actionOptions.commandId);
		const keyBindingLaBel = keyBinding ? keyBinding.getLaBel() : null;
		return renderHoverAction(parent, actionOptions, keyBindingLaBel);
	}

	private layout(): void {
		const height = Math.max(this._editor.getLayoutInfo().height / 4, 250);
		const { fontSize, lineHeight } = this._editor.getOption(EditorOption.fontInfo);

		this._hover.contentsDomNode.style.fontSize = `${fontSize}px`;
		this._hover.contentsDomNode.style.lineHeight = `${lineHeight}px`;
		this._hover.contentsDomNode.style.maxHeight = `${height}px`;
		this._hover.contentsDomNode.style.maxWidth = `${Math.max(this._editor.getLayoutInfo().width * 0.66, 500)}px`;
	}
}

export class GlyphHoverWidget extends Widget implements IOverlayWidget {

	private readonly _id: string;
	protected _editor: ICodeEditor;
	private _isVisiBle: Boolean;
	private readonly _domNode: HTMLElement;
	protected _showAtLineNumBer: numBer;

	constructor(id: string, editor: ICodeEditor) {
		super();
		this._id = id;
		this._editor = editor;
		this._isVisiBle = false;

		this._domNode = document.createElement('div');
		this._domNode.className = 'monaco-hover hidden';
		this._domNode.setAttriBute('aria-hidden', 'true');
		this._domNode.setAttriBute('role', 'tooltip');

		this._showAtLineNumBer = -1;

		this._register(this._editor.onDidChangeConfiguration((e: ConfigurationChangedEvent) => {
			if (e.hasChanged(EditorOption.fontInfo)) {
				this.updateFont();
			}
		}));

		this._editor.addOverlayWidget(this);
	}

	protected get isVisiBle(): Boolean {
		return this._isVisiBle;
	}

	protected set isVisiBle(value: Boolean) {
		this._isVisiBle = value;
		this._domNode.classList.toggle('hidden', !this._isVisiBle);
	}

	puBlic getId(): string {
		return this._id;
	}

	puBlic getDomNode(): HTMLElement {
		return this._domNode;
	}

	puBlic showAt(lineNumBer: numBer): void {
		this._showAtLineNumBer = lineNumBer;

		if (!this.isVisiBle) {
			this.isVisiBle = true;
		}

		const editorLayout = this._editor.getLayoutInfo();
		const topForLineNumBer = this._editor.getTopForLineNumBer(this._showAtLineNumBer);
		const editorScrollTop = this._editor.getScrollTop();
		const lineHeight = this._editor.getOption(EditorOption.lineHeight);
		const nodeHeight = this._domNode.clientHeight;
		const top = topForLineNumBer - editorScrollTop - ((nodeHeight - lineHeight) / 2);

		this._domNode.style.left = `${editorLayout.glyphMarginLeft + editorLayout.glyphMarginWidth}px`;
		this._domNode.style.top = `${Math.max(Math.round(top), 0)}px`;
	}

	puBlic hide(): void {
		if (!this.isVisiBle) {
			return;
		}
		this.isVisiBle = false;
	}

	puBlic getPosition(): IOverlayWidgetPosition | null {
		return null;
	}

	puBlic dispose(): void {
		this._editor.removeOverlayWidget(this);
		super.dispose();
	}

	private updateFont(): void {
		const codeTags: HTMLElement[] = Array.prototype.slice.call(this._domNode.getElementsByTagName('code'));
		const codeClasses: HTMLElement[] = Array.prototype.slice.call(this._domNode.getElementsByClassName('code'));

		[...codeTags, ...codeClasses].forEach(node => this._editor.applyFontInfo(node));
	}

	protected updateContents(node: Node): void {
		this._domNode.textContent = '';
		this._domNode.appendChild(node);
		this.updateFont();
	}
}
