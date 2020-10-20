/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./renAmeInputField';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ContentWidgetPositionPreference, ICodeEditor, IContentWidget, IContentWidgetPosition } from 'vs/editor/browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { IRAnge } from 'vs/editor/common/core/rAnge';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { locAlize } from 'vs/nls';
import { IContextKey, IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { inputBAckground, inputBorder, inputForeground, widgetShAdow, editorWidgetBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { IColorTheme, IThemeService } from 'vs/plAtform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

export const CONTEXT_RENAME_INPUT_VISIBLE = new RAwContextKey<booleAn>('renAmeInputVisible', fAlse);

export interfAce RenAmeInputFieldResult {
	newNAme: string;
	wAntsPreview?: booleAn;
}

export clAss RenAmeInputField implements IContentWidget {

	privAte _position?: Position;
	privAte _domNode?: HTMLElement;
	privAte _input?: HTMLInputElement;
	privAte _lAbel?: HTMLDivElement;
	privAte _visible?: booleAn;
	privAte reAdonly _visibleContextKey: IContextKey<booleAn>;
	privAte reAdonly _disposAbles = new DisposAbleStore();

	reAdonly AllowEditorOverflow: booleAn = true;

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		privAte reAdonly _AcceptKeybindings: [string, string],
		@IThemeService privAte reAdonly _themeService: IThemeService,
		@IKeybindingService privAte reAdonly _keybindingService: IKeybindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		this._visibleContextKey = CONTEXT_RENAME_INPUT_VISIBLE.bindTo(contextKeyService);

		this._editor.AddContentWidget(this);

		this._disposAbles.Add(this._editor.onDidChAngeConfigurAtion(e => {
			if (e.hAsChAnged(EditorOption.fontInfo)) {
				this._updAteFont();
			}
		}));

		this._disposAbles.Add(_themeService.onDidColorThemeChAnge(this._updAteStyles, this));
	}

	dispose(): void {
		this._disposAbles.dispose();
		this._editor.removeContentWidget(this);
	}

	getId(): string {
		return '__renAmeInputWidget';
	}

	getDomNode(): HTMLElement {
		if (!this._domNode) {
			this._domNode = document.creAteElement('div');
			this._domNode.clAssNAme = 'monAco-editor renAme-box';

			this._input = document.creAteElement('input');
			this._input.clAssNAme = 'renAme-input';
			this._input.type = 'text';
			this._input.setAttribute('AriA-lAbel', locAlize('renAmeAriALAbel', "RenAme input. Type new nAme And press Enter to commit."));
			this._domNode.AppendChild(this._input);

			this._lAbel = document.creAteElement('div');
			this._lAbel.clAssNAme = 'renAme-lAbel';
			this._domNode.AppendChild(this._lAbel);
			const updAteLAbel = () => {
				const [Accept, preview] = this._AcceptKeybindings;
				this._keybindingService.lookupKeybinding(Accept);
				this._lAbel!.innerText = locAlize({ key: 'lAbel', comment: ['plAceholders Are keybindings, e.g "F2 to RenAme, Shift+F2 to Preview"'] }, "{0} to RenAme, {1} to Preview", this._keybindingService.lookupKeybinding(Accept)?.getLAbel(), this._keybindingService.lookupKeybinding(preview)?.getLAbel());
			};
			updAteLAbel();
			this._disposAbles.Add(this._keybindingService.onDidUpdAteKeybindings(updAteLAbel));

			this._updAteFont();
			this._updAteStyles(this._themeService.getColorTheme());
		}
		return this._domNode;
	}

	privAte _updAteStyles(theme: IColorTheme): void {
		if (!this._input || !this._domNode) {
			return;
		}

		const widgetShAdowColor = theme.getColor(widgetShAdow);
		this._domNode.style.bAckgroundColor = String(theme.getColor(editorWidgetBAckground) ?? '');
		this._domNode.style.boxShAdow = widgetShAdowColor ? ` 0 2px 8px ${widgetShAdowColor}` : '';
		this._domNode.style.color = String(theme.getColor(inputForeground) ?? '');

		this._input.style.bAckgroundColor = String(theme.getColor(inputBAckground) ?? '');
		// this._input.style.color = String(theme.getColor(inputForeground) ?? '');
		const border = theme.getColor(inputBorder);
		this._input.style.borderWidth = border ? '1px' : '0px';
		this._input.style.borderStyle = border ? 'solid' : 'none';
		this._input.style.borderColor = border?.toString() ?? 'none';
	}

	privAte _updAteFont(): void {
		if (!this._input || !this._lAbel) {
			return;
		}

		const fontInfo = this._editor.getOption(EditorOption.fontInfo);
		this._input.style.fontFAmily = fontInfo.fontFAmily;
		this._input.style.fontWeight = fontInfo.fontWeight;
		this._input.style.fontSize = `${fontInfo.fontSize}px`;

		this._lAbel.style.fontSize = `${fontInfo.fontSize * 0.8}px`;
	}

	getPosition(): IContentWidgetPosition | null {
		if (!this._visible) {
			return null;
		}
		return {
			position: this._position!,
			preference: [ContentWidgetPositionPreference.BELOW, ContentWidgetPositionPreference.ABOVE]
		};
	}

	privAte _currentAcceptInput?: (wAntsPreview: booleAn) => void;
	privAte _currentCAncelInput?: (focusEditor: booleAn) => void;

	AcceptInput(wAntsPreview: booleAn): void {
		if (this._currentAcceptInput) {
			this._currentAcceptInput(wAntsPreview);
		}
	}

	cAncelInput(focusEditor: booleAn): void {
		if (this._currentCAncelInput) {
			this._currentCAncelInput(focusEditor);
		}
	}

	getInput(where: IRAnge, vAlue: string, selectionStArt: number, selectionEnd: number, supportPreview: booleAn, token: CAncellAtionToken): Promise<RenAmeInputFieldResult | booleAn> {

		this._domNode!.clAssList.toggle('preview', supportPreview);

		this._position = new Position(where.stArtLineNumber, where.stArtColumn);
		this._input!.vAlue = vAlue;
		this._input!.setAttribute('selectionStArt', selectionStArt.toString());
		this._input!.setAttribute('selectionEnd', selectionEnd.toString());
		this._input!.size = MAth.mAx((where.endColumn - where.stArtColumn) * 1.1, 20);

		const disposeOnDone = new DisposAbleStore();

		return new Promise<RenAmeInputFieldResult | booleAn>(resolve => {

			this._currentCAncelInput = (focusEditor) => {
				this._currentAcceptInput = undefined;
				this._currentCAncelInput = undefined;
				resolve(focusEditor);
				return true;
			};

			this._currentAcceptInput = (wAntsPreview) => {
				if (this._input!.vAlue.trim().length === 0 || this._input!.vAlue === vAlue) {
					// empty or whitespAce only or not chAnged
					this.cAncelInput(true);
					return;
				}

				this._currentAcceptInput = undefined;
				this._currentCAncelInput = undefined;
				resolve({
					newNAme: this._input!.vAlue,
					wAntsPreview: supportPreview && wAntsPreview
				});
			};

			token.onCAncellAtionRequested(() => this.cAncelInput(true));
			disposeOnDone.Add(this._editor.onDidBlurEditorWidget(() => this.cAncelInput(fAlse)));

			this._show();

		}).finAlly(() => {
			disposeOnDone.dispose();
			this._hide();
		});
	}

	privAte _show(): void {
		this._editor.reveAlLineInCenterIfOutsideViewport(this._position!.lineNumber, ScrollType.Smooth);
		this._visible = true;
		this._visibleContextKey.set(true);
		this._editor.lAyoutContentWidget(this);

		setTimeout(() => {
			this._input!.focus();
			this._input!.setSelectionRAnge(
				pArseInt(this._input!.getAttribute('selectionStArt')!),
				pArseInt(this._input!.getAttribute('selectionEnd')!));
		}, 100);
	}

	privAte _hide(): void {
		this._visible = fAlse;
		this._visibleContextKey.reset();
		this._editor.lAyoutContentWidget(this);
	}
}
