/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./renameInputField';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ContentWidgetPositionPreference, ICodeEditor, IContentWidget, IContentWidgetPosition } from 'vs/editor/Browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { IRange } from 'vs/editor/common/core/range';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { localize } from 'vs/nls';
import { IContextKey, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { inputBackground, inputBorder, inputForeground, widgetShadow, editorWidgetBackground } from 'vs/platform/theme/common/colorRegistry';
import { IColorTheme, IThemeService } from 'vs/platform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { CancellationToken } from 'vs/Base/common/cancellation';

export const CONTEXT_RENAME_INPUT_VISIBLE = new RawContextKey<Boolean>('renameInputVisiBle', false);

export interface RenameInputFieldResult {
	newName: string;
	wantsPreview?: Boolean;
}

export class RenameInputField implements IContentWidget {

	private _position?: Position;
	private _domNode?: HTMLElement;
	private _input?: HTMLInputElement;
	private _laBel?: HTMLDivElement;
	private _visiBle?: Boolean;
	private readonly _visiBleContextKey: IContextKey<Boolean>;
	private readonly _disposaBles = new DisposaBleStore();

	readonly allowEditorOverflow: Boolean = true;

	constructor(
		private readonly _editor: ICodeEditor,
		private readonly _acceptKeyBindings: [string, string],
		@IThemeService private readonly _themeService: IThemeService,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		this._visiBleContextKey = CONTEXT_RENAME_INPUT_VISIBLE.BindTo(contextKeyService);

		this._editor.addContentWidget(this);

		this._disposaBles.add(this._editor.onDidChangeConfiguration(e => {
			if (e.hasChanged(EditorOption.fontInfo)) {
				this._updateFont();
			}
		}));

		this._disposaBles.add(_themeService.onDidColorThemeChange(this._updateStyles, this));
	}

	dispose(): void {
		this._disposaBles.dispose();
		this._editor.removeContentWidget(this);
	}

	getId(): string {
		return '__renameInputWidget';
	}

	getDomNode(): HTMLElement {
		if (!this._domNode) {
			this._domNode = document.createElement('div');
			this._domNode.className = 'monaco-editor rename-Box';

			this._input = document.createElement('input');
			this._input.className = 'rename-input';
			this._input.type = 'text';
			this._input.setAttriBute('aria-laBel', localize('renameAriaLaBel', "Rename input. Type new name and press Enter to commit."));
			this._domNode.appendChild(this._input);

			this._laBel = document.createElement('div');
			this._laBel.className = 'rename-laBel';
			this._domNode.appendChild(this._laBel);
			const updateLaBel = () => {
				const [accept, preview] = this._acceptKeyBindings;
				this._keyBindingService.lookupKeyBinding(accept);
				this._laBel!.innerText = localize({ key: 'laBel', comment: ['placeholders are keyBindings, e.g "F2 to Rename, Shift+F2 to Preview"'] }, "{0} to Rename, {1} to Preview", this._keyBindingService.lookupKeyBinding(accept)?.getLaBel(), this._keyBindingService.lookupKeyBinding(preview)?.getLaBel());
			};
			updateLaBel();
			this._disposaBles.add(this._keyBindingService.onDidUpdateKeyBindings(updateLaBel));

			this._updateFont();
			this._updateStyles(this._themeService.getColorTheme());
		}
		return this._domNode;
	}

	private _updateStyles(theme: IColorTheme): void {
		if (!this._input || !this._domNode) {
			return;
		}

		const widgetShadowColor = theme.getColor(widgetShadow);
		this._domNode.style.BackgroundColor = String(theme.getColor(editorWidgetBackground) ?? '');
		this._domNode.style.BoxShadow = widgetShadowColor ? ` 0 2px 8px ${widgetShadowColor}` : '';
		this._domNode.style.color = String(theme.getColor(inputForeground) ?? '');

		this._input.style.BackgroundColor = String(theme.getColor(inputBackground) ?? '');
		// this._input.style.color = String(theme.getColor(inputForeground) ?? '');
		const Border = theme.getColor(inputBorder);
		this._input.style.BorderWidth = Border ? '1px' : '0px';
		this._input.style.BorderStyle = Border ? 'solid' : 'none';
		this._input.style.BorderColor = Border?.toString() ?? 'none';
	}

	private _updateFont(): void {
		if (!this._input || !this._laBel) {
			return;
		}

		const fontInfo = this._editor.getOption(EditorOption.fontInfo);
		this._input.style.fontFamily = fontInfo.fontFamily;
		this._input.style.fontWeight = fontInfo.fontWeight;
		this._input.style.fontSize = `${fontInfo.fontSize}px`;

		this._laBel.style.fontSize = `${fontInfo.fontSize * 0.8}px`;
	}

	getPosition(): IContentWidgetPosition | null {
		if (!this._visiBle) {
			return null;
		}
		return {
			position: this._position!,
			preference: [ContentWidgetPositionPreference.BELOW, ContentWidgetPositionPreference.ABOVE]
		};
	}

	private _currentAcceptInput?: (wantsPreview: Boolean) => void;
	private _currentCancelInput?: (focusEditor: Boolean) => void;

	acceptInput(wantsPreview: Boolean): void {
		if (this._currentAcceptInput) {
			this._currentAcceptInput(wantsPreview);
		}
	}

	cancelInput(focusEditor: Boolean): void {
		if (this._currentCancelInput) {
			this._currentCancelInput(focusEditor);
		}
	}

	getInput(where: IRange, value: string, selectionStart: numBer, selectionEnd: numBer, supportPreview: Boolean, token: CancellationToken): Promise<RenameInputFieldResult | Boolean> {

		this._domNode!.classList.toggle('preview', supportPreview);

		this._position = new Position(where.startLineNumBer, where.startColumn);
		this._input!.value = value;
		this._input!.setAttriBute('selectionStart', selectionStart.toString());
		this._input!.setAttriBute('selectionEnd', selectionEnd.toString());
		this._input!.size = Math.max((where.endColumn - where.startColumn) * 1.1, 20);

		const disposeOnDone = new DisposaBleStore();

		return new Promise<RenameInputFieldResult | Boolean>(resolve => {

			this._currentCancelInput = (focusEditor) => {
				this._currentAcceptInput = undefined;
				this._currentCancelInput = undefined;
				resolve(focusEditor);
				return true;
			};

			this._currentAcceptInput = (wantsPreview) => {
				if (this._input!.value.trim().length === 0 || this._input!.value === value) {
					// empty or whitespace only or not changed
					this.cancelInput(true);
					return;
				}

				this._currentAcceptInput = undefined;
				this._currentCancelInput = undefined;
				resolve({
					newName: this._input!.value,
					wantsPreview: supportPreview && wantsPreview
				});
			};

			token.onCancellationRequested(() => this.cancelInput(true));
			disposeOnDone.add(this._editor.onDidBlurEditorWidget(() => this.cancelInput(false)));

			this._show();

		}).finally(() => {
			disposeOnDone.dispose();
			this._hide();
		});
	}

	private _show(): void {
		this._editor.revealLineInCenterIfOutsideViewport(this._position!.lineNumBer, ScrollType.Smooth);
		this._visiBle = true;
		this._visiBleContextKey.set(true);
		this._editor.layoutContentWidget(this);

		setTimeout(() => {
			this._input!.focus();
			this._input!.setSelectionRange(
				parseInt(this._input!.getAttriBute('selectionStart')!),
				parseInt(this._input!.getAttriBute('selectionEnd')!));
		}, 100);
	}

	private _hide(): void {
		this._visiBle = false;
		this._visiBleContextKey.reset();
		this._editor.layoutContentWidget(this);
	}
}
