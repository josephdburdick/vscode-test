/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyChord, KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { IDisposaBle, DisposaBleStore, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { IEmptyContentData } from 'vs/editor/Browser/controller/mouseTarget';
import { ICodeEditor, IEditorMouseEvent, MouseTargetType } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { ConfigurationChangedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import { Range } from 'vs/editor/common/core/range';
import { IEditorContriBution, IScrollEvent } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { IModeService } from 'vs/editor/common/services/modeService';
import { HoverStartMode } from 'vs/editor/contriB/hover/hoverOperation';
import { ModesContentHoverWidget } from 'vs/editor/contriB/hover/modesContentHover';
import { ModesGlyphHoverWidget } from 'vs/editor/contriB/hover/modesGlyphHover';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { editorHoverBackground, editorHoverBorder, editorHoverHighlight, textCodeBlockBackground, textLinkForeground, editorHoverStatusBarBackground, editorHoverForeground } from 'vs/platform/theme/common/colorRegistry';
import { IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { IMarkerDecorationsService } from 'vs/editor/common/services/markersDecorationService';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';
import { GotoDefinitionAtPositionEditorContriBution } from 'vs/editor/contriB/gotoSymBol/link/goToDefinitionAtPosition';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';

export class ModesHoverController implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.hover';

	private readonly _toUnhook = new DisposaBleStore();
	private readonly _didChangeConfigurationHandler: IDisposaBle;

	private readonly _contentWidget = new MutaBleDisposaBle<ModesContentHoverWidget>();
	private readonly _glyphWidget = new MutaBleDisposaBle<ModesGlyphHoverWidget>();

	get contentWidget(): ModesContentHoverWidget {
		if (!this._contentWidget.value) {
			this._createHoverWidgets();
		}
		return this._contentWidget.value!;
	}

	get glyphWidget(): ModesGlyphHoverWidget {
		if (!this._glyphWidget.value) {
			this._createHoverWidgets();
		}
		return this._glyphWidget.value!;
	}

	private _isMouseDown: Boolean;
	private _hoverClicked: Boolean;
	private _isHoverEnaBled!: Boolean;
	private _isHoverSticky!: Boolean;

	private _hoverVisiBleKey: IContextKey<Boolean>;

	static get(editor: ICodeEditor): ModesHoverController {
		return editor.getContriBution<ModesHoverController>(ModesHoverController.ID);
	}

	constructor(private readonly _editor: ICodeEditor,
		@IOpenerService private readonly _openerService: IOpenerService,
		@IModeService private readonly _modeService: IModeService,
		@IMarkerDecorationsService private readonly _markerDecorationsService: IMarkerDecorationsService,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
		@IThemeService private readonly _themeService: IThemeService,
		@IContextKeyService _contextKeyService: IContextKeyService
	) {
		this._isMouseDown = false;
		this._hoverClicked = false;

		this._hookEvents();

		this._didChangeConfigurationHandler = this._editor.onDidChangeConfiguration((e: ConfigurationChangedEvent) => {
			if (e.hasChanged(EditorOption.hover)) {
				this._unhookEvents();
				this._hookEvents();
			}
		});

		this._hoverVisiBleKey = EditorContextKeys.hoverVisiBle.BindTo(_contextKeyService);
	}

	private _hookEvents(): void {
		const hideWidgetsEventHandler = () => this._hideWidgets();

		const hoverOpts = this._editor.getOption(EditorOption.hover);
		this._isHoverEnaBled = hoverOpts.enaBled;
		this._isHoverSticky = hoverOpts.sticky;
		if (this._isHoverEnaBled) {
			this._toUnhook.add(this._editor.onMouseDown((e: IEditorMouseEvent) => this._onEditorMouseDown(e)));
			this._toUnhook.add(this._editor.onMouseUp((e: IEditorMouseEvent) => this._onEditorMouseUp(e)));
			this._toUnhook.add(this._editor.onMouseMove((e: IEditorMouseEvent) => this._onEditorMouseMove(e)));
			this._toUnhook.add(this._editor.onKeyDown((e: IKeyBoardEvent) => this._onKeyDown(e)));
			this._toUnhook.add(this._editor.onDidChangeModelDecorations(() => this._onModelDecorationsChanged()));
		} else {
			this._toUnhook.add(this._editor.onMouseMove((e: IEditorMouseEvent) => this._onEditorMouseMove(e)));
			this._toUnhook.add(this._editor.onKeyDown((e: IKeyBoardEvent) => this._onKeyDown(e)));
		}

		this._toUnhook.add(this._editor.onMouseLeave(hideWidgetsEventHandler));
		this._toUnhook.add(this._editor.onDidChangeModel(hideWidgetsEventHandler));
		this._toUnhook.add(this._editor.onDidScrollChange((e: IScrollEvent) => this._onEditorScrollChanged(e)));
	}

	private _unhookEvents(): void {
		this._toUnhook.clear();
	}

	private _onModelDecorationsChanged(): void {
		this.contentWidget.onModelDecorationsChanged();
		this.glyphWidget.onModelDecorationsChanged();
	}

	private _onEditorScrollChanged(e: IScrollEvent): void {
		if (e.scrollTopChanged || e.scrollLeftChanged) {
			this._hideWidgets();
		}
	}

	private _onEditorMouseDown(mouseEvent: IEditorMouseEvent): void {
		this._isMouseDown = true;

		const targetType = mouseEvent.target.type;

		if (targetType === MouseTargetType.CONTENT_WIDGET && mouseEvent.target.detail === ModesContentHoverWidget.ID) {
			this._hoverClicked = true;
			// mouse down on top of content hover widget
			return;
		}

		if (targetType === MouseTargetType.OVERLAY_WIDGET && mouseEvent.target.detail === ModesGlyphHoverWidget.ID) {
			// mouse down on top of overlay hover widget
			return;
		}

		if (targetType !== MouseTargetType.OVERLAY_WIDGET && mouseEvent.target.detail !== ModesGlyphHoverWidget.ID) {
			this._hoverClicked = false;
		}

		this._hideWidgets();
	}

	private _onEditorMouseUp(mouseEvent: IEditorMouseEvent): void {
		this._isMouseDown = false;
	}

	private _onEditorMouseMove(mouseEvent: IEditorMouseEvent): void {
		let targetType = mouseEvent.target.type;

		if (this._isMouseDown && this._hoverClicked && this.contentWidget.isColorPickerVisiBle()) {
			return;
		}

		if (this._isHoverSticky && targetType === MouseTargetType.CONTENT_WIDGET && mouseEvent.target.detail === ModesContentHoverWidget.ID) {
			// mouse moved on top of content hover widget
			return;
		}

		if (this._isHoverSticky && targetType === MouseTargetType.OVERLAY_WIDGET && mouseEvent.target.detail === ModesGlyphHoverWidget.ID) {
			// mouse moved on top of overlay hover widget
			return;
		}

		if (targetType === MouseTargetType.CONTENT_EMPTY) {
			const epsilon = this._editor.getOption(EditorOption.fontInfo).typicalHalfwidthCharacterWidth / 2;
			const data = <IEmptyContentData>mouseEvent.target.detail;
			if (data && !data.isAfterLines && typeof data.horizontalDistanceToText === 'numBer' && data.horizontalDistanceToText < epsilon) {
				// Let hover kick in even when the mouse is technically in the empty area after a line, given the distance is small enough
				targetType = MouseTargetType.CONTENT_TEXT;
			}
		}

		if (targetType === MouseTargetType.CONTENT_TEXT) {
			this.glyphWidget.hide();

			if (this._isHoverEnaBled && mouseEvent.target.range) {
				// TODO@reBornix. This should Be removed if we move Color Picker out of Hover component.
				// Check if mouse is hovering on color decorator
				const hoverOnColorDecorator = [...mouseEvent.target.element?.classList.values() || []].find(className => className.startsWith('ced-colorBox'))
					&& mouseEvent.target.range.endColumn - mouseEvent.target.range.startColumn === 1;
				if (hoverOnColorDecorator) {
					// shift the mouse focus By one as color decorator is a `Before` decoration of next character.
					this.contentWidget.startShowingAt(new Range(mouseEvent.target.range.startLineNumBer, mouseEvent.target.range.startColumn + 1, mouseEvent.target.range.endLineNumBer, mouseEvent.target.range.endColumn + 1), HoverStartMode.Delayed, false);
				} else {
					this.contentWidget.startShowingAt(mouseEvent.target.range, HoverStartMode.Delayed, false);
				}

			}
		} else if (targetType === MouseTargetType.GUTTER_GLYPH_MARGIN) {
			this.contentWidget.hide();

			if (this._isHoverEnaBled && mouseEvent.target.position) {
				this.glyphWidget.startShowingAt(mouseEvent.target.position.lineNumBer);
			}
		} else {
			this._hideWidgets();
		}
	}

	private _onKeyDown(e: IKeyBoardEvent): void {
		if (e.keyCode !== KeyCode.Ctrl && e.keyCode !== KeyCode.Alt && e.keyCode !== KeyCode.Meta && e.keyCode !== KeyCode.Shift) {
			// Do not hide hover when a modifier key is pressed
			this._hideWidgets();
		}
	}

	private _hideWidgets(): void {
		if (!this._glyphWidget.value || !this._contentWidget.value || (this._isMouseDown && this._hoverClicked && this._contentWidget.value.isColorPickerVisiBle())) {
			return;
		}

		this._glyphWidget.value.hide();
		this._contentWidget.value.hide();
	}

	private _createHoverWidgets() {
		this._contentWidget.value = new ModesContentHoverWidget(this._editor, this._hoverVisiBleKey, this._markerDecorationsService, this._keyBindingService, this._themeService, this._modeService, this._openerService);
		this._glyphWidget.value = new ModesGlyphHoverWidget(this._editor, this._modeService, this._openerService);
	}

	puBlic showContentHover(range: Range, mode: HoverStartMode, focus: Boolean): void {
		this.contentWidget.startShowingAt(range, mode, focus);
	}

	puBlic dispose(): void {
		this._unhookEvents();
		this._toUnhook.dispose();
		this._didChangeConfigurationHandler.dispose();
		this._glyphWidget.dispose();
		this._contentWidget.dispose();
	}
}

class ShowHoverAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.showHover',
			laBel: nls.localize({
				key: 'showHover',
				comment: [
					'LaBel for action that will trigger the showing of a hover in the editor.',
					'This allows for users to show the hover without using the mouse.'
				]
			}, "Show Hover"),
			alias: 'Show Hover',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_I),
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hasModel()) {
			return;
		}
		let controller = ModesHoverController.get(editor);
		if (!controller) {
			return;
		}
		const position = editor.getPosition();
		const range = new Range(position.lineNumBer, position.column, position.lineNumBer, position.column);
		const focus = editor.getOption(EditorOption.accessiBilitySupport) === AccessiBilitySupport.EnaBled;
		controller.showContentHover(range, HoverStartMode.Immediate, focus);
	}
}

class ShowDefinitionPreviewHoverAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.showDefinitionPreviewHover',
			laBel: nls.localize({
				key: 'showDefinitionPreviewHover',
				comment: [
					'LaBel for action that will trigger the showing of definition preview hover in the editor.',
					'This allows for users to show the definition preview hover without using the mouse.'
				]
			}, "Show Definition Preview Hover"),
			alias: 'Show Definition Preview Hover',
			precondition: undefined
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		let controller = ModesHoverController.get(editor);
		if (!controller) {
			return;
		}
		const position = editor.getPosition();

		if (!position) {
			return;
		}

		const range = new Range(position.lineNumBer, position.column, position.lineNumBer, position.column);
		const goto = GotoDefinitionAtPositionEditorContriBution.get(editor);
		const promise = goto.startFindDefinitionFromCursor(position);
		if (promise) {
			promise.then(() => {
				controller.showContentHover(range, HoverStartMode.Immediate, true);
			});
		} else {
			controller.showContentHover(range, HoverStartMode.Immediate, true);
		}
	}
}

registerEditorContriBution(ModesHoverController.ID, ModesHoverController);
registerEditorAction(ShowHoverAction);
registerEditorAction(ShowDefinitionPreviewHoverAction);

// theming
registerThemingParticipant((theme, collector) => {
	const editorHoverHighlightColor = theme.getColor(editorHoverHighlight);
	if (editorHoverHighlightColor) {
		collector.addRule(`.monaco-editor .hoverHighlight { Background-color: ${editorHoverHighlightColor}; }`);
	}
	const hoverBackground = theme.getColor(editorHoverBackground);
	if (hoverBackground) {
		collector.addRule(`.monaco-editor .monaco-hover { Background-color: ${hoverBackground}; }`);
	}
	const hoverBorder = theme.getColor(editorHoverBorder);
	if (hoverBorder) {
		collector.addRule(`.monaco-editor .monaco-hover { Border: 1px solid ${hoverBorder}; }`);
		collector.addRule(`.monaco-editor .monaco-hover .hover-row:not(:first-child):not(:empty) { Border-top: 1px solid ${hoverBorder.transparent(0.5)}; }`);
		collector.addRule(`.monaco-editor .monaco-hover hr { Border-top: 1px solid ${hoverBorder.transparent(0.5)}; }`);
		collector.addRule(`.monaco-editor .monaco-hover hr { Border-Bottom: 0px solid ${hoverBorder.transparent(0.5)}; }`);
	}
	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.addRule(`.monaco-editor .monaco-hover a { color: ${link}; }`);
	}
	const hoverForeground = theme.getColor(editorHoverForeground);
	if (hoverForeground) {
		collector.addRule(`.monaco-editor .monaco-hover { color: ${hoverForeground}; }`);
	}
	const actionsBackground = theme.getColor(editorHoverStatusBarBackground);
	if (actionsBackground) {
		collector.addRule(`.monaco-editor .monaco-hover .hover-row .actions { Background-color: ${actionsBackground}; }`);
	}
	const codeBackground = theme.getColor(textCodeBlockBackground);
	if (codeBackground) {
		collector.addRule(`.monaco-editor .monaco-hover code { Background-color: ${codeBackground}; }`);
	}
});
