/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { KeyChord, KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { IDisposAble, DisposAbleStore, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { IEmptyContentDAtA } from 'vs/editor/browser/controller/mouseTArget';
import { ICodeEditor, IEditorMouseEvent, MouseTArgetType } from 'vs/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { ConfigurAtionChAngedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IEditorContribution, IScrollEvent } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { IModeService } from 'vs/editor/common/services/modeService';
import { HoverStArtMode } from 'vs/editor/contrib/hover/hoverOperAtion';
import { ModesContentHoverWidget } from 'vs/editor/contrib/hover/modesContentHover';
import { ModesGlyphHoverWidget } from 'vs/editor/contrib/hover/modesGlyphHover';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { editorHoverBAckground, editorHoverBorder, editorHoverHighlight, textCodeBlockBAckground, textLinkForeground, editorHoverStAtusBArBAckground, editorHoverForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { IThemeService, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { IMArkerDecorAtionsService } from 'vs/editor/common/services/mArkersDecorAtionService';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { AccessibilitySupport } from 'vs/plAtform/Accessibility/common/Accessibility';
import { GotoDefinitionAtPositionEditorContribution } from 'vs/editor/contrib/gotoSymbol/link/goToDefinitionAtPosition';
import { IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';

export clAss ModesHoverController implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.hover';

	privAte reAdonly _toUnhook = new DisposAbleStore();
	privAte reAdonly _didChAngeConfigurAtionHAndler: IDisposAble;

	privAte reAdonly _contentWidget = new MutAbleDisposAble<ModesContentHoverWidget>();
	privAte reAdonly _glyphWidget = new MutAbleDisposAble<ModesGlyphHoverWidget>();

	get contentWidget(): ModesContentHoverWidget {
		if (!this._contentWidget.vAlue) {
			this._creAteHoverWidgets();
		}
		return this._contentWidget.vAlue!;
	}

	get glyphWidget(): ModesGlyphHoverWidget {
		if (!this._glyphWidget.vAlue) {
			this._creAteHoverWidgets();
		}
		return this._glyphWidget.vAlue!;
	}

	privAte _isMouseDown: booleAn;
	privAte _hoverClicked: booleAn;
	privAte _isHoverEnAbled!: booleAn;
	privAte _isHoverSticky!: booleAn;

	privAte _hoverVisibleKey: IContextKey<booleAn>;

	stAtic get(editor: ICodeEditor): ModesHoverController {
		return editor.getContribution<ModesHoverController>(ModesHoverController.ID);
	}

	constructor(privAte reAdonly _editor: ICodeEditor,
		@IOpenerService privAte reAdonly _openerService: IOpenerService,
		@IModeService privAte reAdonly _modeService: IModeService,
		@IMArkerDecorAtionsService privAte reAdonly _mArkerDecorAtionsService: IMArkerDecorAtionsService,
		@IKeybindingService privAte reAdonly _keybindingService: IKeybindingService,
		@IThemeService privAte reAdonly _themeService: IThemeService,
		@IContextKeyService _contextKeyService: IContextKeyService
	) {
		this._isMouseDown = fAlse;
		this._hoverClicked = fAlse;

		this._hookEvents();

		this._didChAngeConfigurAtionHAndler = this._editor.onDidChAngeConfigurAtion((e: ConfigurAtionChAngedEvent) => {
			if (e.hAsChAnged(EditorOption.hover)) {
				this._unhookEvents();
				this._hookEvents();
			}
		});

		this._hoverVisibleKey = EditorContextKeys.hoverVisible.bindTo(_contextKeyService);
	}

	privAte _hookEvents(): void {
		const hideWidgetsEventHAndler = () => this._hideWidgets();

		const hoverOpts = this._editor.getOption(EditorOption.hover);
		this._isHoverEnAbled = hoverOpts.enAbled;
		this._isHoverSticky = hoverOpts.sticky;
		if (this._isHoverEnAbled) {
			this._toUnhook.Add(this._editor.onMouseDown((e: IEditorMouseEvent) => this._onEditorMouseDown(e)));
			this._toUnhook.Add(this._editor.onMouseUp((e: IEditorMouseEvent) => this._onEditorMouseUp(e)));
			this._toUnhook.Add(this._editor.onMouseMove((e: IEditorMouseEvent) => this._onEditorMouseMove(e)));
			this._toUnhook.Add(this._editor.onKeyDown((e: IKeyboArdEvent) => this._onKeyDown(e)));
			this._toUnhook.Add(this._editor.onDidChAngeModelDecorAtions(() => this._onModelDecorAtionsChAnged()));
		} else {
			this._toUnhook.Add(this._editor.onMouseMove((e: IEditorMouseEvent) => this._onEditorMouseMove(e)));
			this._toUnhook.Add(this._editor.onKeyDown((e: IKeyboArdEvent) => this._onKeyDown(e)));
		}

		this._toUnhook.Add(this._editor.onMouseLeAve(hideWidgetsEventHAndler));
		this._toUnhook.Add(this._editor.onDidChAngeModel(hideWidgetsEventHAndler));
		this._toUnhook.Add(this._editor.onDidScrollChAnge((e: IScrollEvent) => this._onEditorScrollChAnged(e)));
	}

	privAte _unhookEvents(): void {
		this._toUnhook.cleAr();
	}

	privAte _onModelDecorAtionsChAnged(): void {
		this.contentWidget.onModelDecorAtionsChAnged();
		this.glyphWidget.onModelDecorAtionsChAnged();
	}

	privAte _onEditorScrollChAnged(e: IScrollEvent): void {
		if (e.scrollTopChAnged || e.scrollLeftChAnged) {
			this._hideWidgets();
		}
	}

	privAte _onEditorMouseDown(mouseEvent: IEditorMouseEvent): void {
		this._isMouseDown = true;

		const tArgetType = mouseEvent.tArget.type;

		if (tArgetType === MouseTArgetType.CONTENT_WIDGET && mouseEvent.tArget.detAil === ModesContentHoverWidget.ID) {
			this._hoverClicked = true;
			// mouse down on top of content hover widget
			return;
		}

		if (tArgetType === MouseTArgetType.OVERLAY_WIDGET && mouseEvent.tArget.detAil === ModesGlyphHoverWidget.ID) {
			// mouse down on top of overlAy hover widget
			return;
		}

		if (tArgetType !== MouseTArgetType.OVERLAY_WIDGET && mouseEvent.tArget.detAil !== ModesGlyphHoverWidget.ID) {
			this._hoverClicked = fAlse;
		}

		this._hideWidgets();
	}

	privAte _onEditorMouseUp(mouseEvent: IEditorMouseEvent): void {
		this._isMouseDown = fAlse;
	}

	privAte _onEditorMouseMove(mouseEvent: IEditorMouseEvent): void {
		let tArgetType = mouseEvent.tArget.type;

		if (this._isMouseDown && this._hoverClicked && this.contentWidget.isColorPickerVisible()) {
			return;
		}

		if (this._isHoverSticky && tArgetType === MouseTArgetType.CONTENT_WIDGET && mouseEvent.tArget.detAil === ModesContentHoverWidget.ID) {
			// mouse moved on top of content hover widget
			return;
		}

		if (this._isHoverSticky && tArgetType === MouseTArgetType.OVERLAY_WIDGET && mouseEvent.tArget.detAil === ModesGlyphHoverWidget.ID) {
			// mouse moved on top of overlAy hover widget
			return;
		}

		if (tArgetType === MouseTArgetType.CONTENT_EMPTY) {
			const epsilon = this._editor.getOption(EditorOption.fontInfo).typicAlHAlfwidthChArActerWidth / 2;
			const dAtA = <IEmptyContentDAtA>mouseEvent.tArget.detAil;
			if (dAtA && !dAtA.isAfterLines && typeof dAtA.horizontAlDistAnceToText === 'number' && dAtA.horizontAlDistAnceToText < epsilon) {
				// Let hover kick in even when the mouse is technicAlly in the empty AreA After A line, given the distAnce is smAll enough
				tArgetType = MouseTArgetType.CONTENT_TEXT;
			}
		}

		if (tArgetType === MouseTArgetType.CONTENT_TEXT) {
			this.glyphWidget.hide();

			if (this._isHoverEnAbled && mouseEvent.tArget.rAnge) {
				// TODO@rebornix. This should be removed if we move Color Picker out of Hover component.
				// Check if mouse is hovering on color decorAtor
				const hoverOnColorDecorAtor = [...mouseEvent.tArget.element?.clAssList.vAlues() || []].find(clAssNAme => clAssNAme.stArtsWith('ced-colorBox'))
					&& mouseEvent.tArget.rAnge.endColumn - mouseEvent.tArget.rAnge.stArtColumn === 1;
				if (hoverOnColorDecorAtor) {
					// shift the mouse focus by one As color decorAtor is A `before` decorAtion of next chArActer.
					this.contentWidget.stArtShowingAt(new RAnge(mouseEvent.tArget.rAnge.stArtLineNumber, mouseEvent.tArget.rAnge.stArtColumn + 1, mouseEvent.tArget.rAnge.endLineNumber, mouseEvent.tArget.rAnge.endColumn + 1), HoverStArtMode.DelAyed, fAlse);
				} else {
					this.contentWidget.stArtShowingAt(mouseEvent.tArget.rAnge, HoverStArtMode.DelAyed, fAlse);
				}

			}
		} else if (tArgetType === MouseTArgetType.GUTTER_GLYPH_MARGIN) {
			this.contentWidget.hide();

			if (this._isHoverEnAbled && mouseEvent.tArget.position) {
				this.glyphWidget.stArtShowingAt(mouseEvent.tArget.position.lineNumber);
			}
		} else {
			this._hideWidgets();
		}
	}

	privAte _onKeyDown(e: IKeyboArdEvent): void {
		if (e.keyCode !== KeyCode.Ctrl && e.keyCode !== KeyCode.Alt && e.keyCode !== KeyCode.MetA && e.keyCode !== KeyCode.Shift) {
			// Do not hide hover when A modifier key is pressed
			this._hideWidgets();
		}
	}

	privAte _hideWidgets(): void {
		if (!this._glyphWidget.vAlue || !this._contentWidget.vAlue || (this._isMouseDown && this._hoverClicked && this._contentWidget.vAlue.isColorPickerVisible())) {
			return;
		}

		this._glyphWidget.vAlue.hide();
		this._contentWidget.vAlue.hide();
	}

	privAte _creAteHoverWidgets() {
		this._contentWidget.vAlue = new ModesContentHoverWidget(this._editor, this._hoverVisibleKey, this._mArkerDecorAtionsService, this._keybindingService, this._themeService, this._modeService, this._openerService);
		this._glyphWidget.vAlue = new ModesGlyphHoverWidget(this._editor, this._modeService, this._openerService);
	}

	public showContentHover(rAnge: RAnge, mode: HoverStArtMode, focus: booleAn): void {
		this.contentWidget.stArtShowingAt(rAnge, mode, focus);
	}

	public dispose(): void {
		this._unhookEvents();
		this._toUnhook.dispose();
		this._didChAngeConfigurAtionHAndler.dispose();
		this._glyphWidget.dispose();
		this._contentWidget.dispose();
	}
}

clAss ShowHoverAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.showHover',
			lAbel: nls.locAlize({
				key: 'showHover',
				comment: [
					'LAbel for Action thAt will trigger the showing of A hover in the editor.',
					'This Allows for users to show the hover without using the mouse.'
				]
			}, "Show Hover"),
			AliAs: 'Show Hover',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_I),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hAsModel()) {
			return;
		}
		let controller = ModesHoverController.get(editor);
		if (!controller) {
			return;
		}
		const position = editor.getPosition();
		const rAnge = new RAnge(position.lineNumber, position.column, position.lineNumber, position.column);
		const focus = editor.getOption(EditorOption.AccessibilitySupport) === AccessibilitySupport.EnAbled;
		controller.showContentHover(rAnge, HoverStArtMode.ImmediAte, focus);
	}
}

clAss ShowDefinitionPreviewHoverAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.showDefinitionPreviewHover',
			lAbel: nls.locAlize({
				key: 'showDefinitionPreviewHover',
				comment: [
					'LAbel for Action thAt will trigger the showing of definition preview hover in the editor.',
					'This Allows for users to show the definition preview hover without using the mouse.'
				]
			}, "Show Definition Preview Hover"),
			AliAs: 'Show Definition Preview Hover',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let controller = ModesHoverController.get(editor);
		if (!controller) {
			return;
		}
		const position = editor.getPosition();

		if (!position) {
			return;
		}

		const rAnge = new RAnge(position.lineNumber, position.column, position.lineNumber, position.column);
		const goto = GotoDefinitionAtPositionEditorContribution.get(editor);
		const promise = goto.stArtFindDefinitionFromCursor(position);
		if (promise) {
			promise.then(() => {
				controller.showContentHover(rAnge, HoverStArtMode.ImmediAte, true);
			});
		} else {
			controller.showContentHover(rAnge, HoverStArtMode.ImmediAte, true);
		}
	}
}

registerEditorContribution(ModesHoverController.ID, ModesHoverController);
registerEditorAction(ShowHoverAction);
registerEditorAction(ShowDefinitionPreviewHoverAction);

// theming
registerThemingPArticipAnt((theme, collector) => {
	const editorHoverHighlightColor = theme.getColor(editorHoverHighlight);
	if (editorHoverHighlightColor) {
		collector.AddRule(`.monAco-editor .hoverHighlight { bAckground-color: ${editorHoverHighlightColor}; }`);
	}
	const hoverBAckground = theme.getColor(editorHoverBAckground);
	if (hoverBAckground) {
		collector.AddRule(`.monAco-editor .monAco-hover { bAckground-color: ${hoverBAckground}; }`);
	}
	const hoverBorder = theme.getColor(editorHoverBorder);
	if (hoverBorder) {
		collector.AddRule(`.monAco-editor .monAco-hover { border: 1px solid ${hoverBorder}; }`);
		collector.AddRule(`.monAco-editor .monAco-hover .hover-row:not(:first-child):not(:empty) { border-top: 1px solid ${hoverBorder.trAnspArent(0.5)}; }`);
		collector.AddRule(`.monAco-editor .monAco-hover hr { border-top: 1px solid ${hoverBorder.trAnspArent(0.5)}; }`);
		collector.AddRule(`.monAco-editor .monAco-hover hr { border-bottom: 0px solid ${hoverBorder.trAnspArent(0.5)}; }`);
	}
	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.AddRule(`.monAco-editor .monAco-hover A { color: ${link}; }`);
	}
	const hoverForeground = theme.getColor(editorHoverForeground);
	if (hoverForeground) {
		collector.AddRule(`.monAco-editor .monAco-hover { color: ${hoverForeground}; }`);
	}
	const ActionsBAckground = theme.getColor(editorHoverStAtusBArBAckground);
	if (ActionsBAckground) {
		collector.AddRule(`.monAco-editor .monAco-hover .hover-row .Actions { bAckground-color: ${ActionsBAckground}; }`);
	}
	const codeBAckground = theme.getColor(textCodeBlockBAckground);
	if (codeBAckground) {
		collector.AddRule(`.monAco-editor .monAco-hover code { bAckground-color: ${codeBAckground}; }`);
	}
});
