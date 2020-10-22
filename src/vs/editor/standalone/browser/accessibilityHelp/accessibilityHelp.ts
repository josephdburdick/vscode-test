/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./accessiBilityHelp';
import * as dom from 'vs/Base/Browser/dom';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { renderFormattedText } from 'vs/Base/Browser/formattedTextRenderer';
import { alert } from 'vs/Base/Browser/ui/aria/aria';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import * as strings from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { ICodeEditor, IOverlayWidget, IOverlayWidgetPosition } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { Selection } from 'vs/editor/common/core/selection';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ToggleTaBFocusModeAction } from 'vs/editor/contriB/toggleTaBFocusMode/toggleTaBFocusMode';
import { IStandaloneEditorConstructionOptions } from 'vs/editor/standalone/Browser/standaloneCodeEditor';
import { IContextKey, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { contrastBorder, editorWidgetBackground, widgetShadow, editorWidgetForeground } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';
import { AccessiBilityHelpNLS } from 'vs/editor/common/standaloneStrings';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

const CONTEXT_ACCESSIBILITY_WIDGET_VISIBLE = new RawContextKey<Boolean>('accessiBilityHelpWidgetVisiBle', false);

class AccessiBilityHelpController extends DisposaBle
	implements IEditorContriBution {
	puBlic static readonly ID = 'editor.contriB.accessiBilityHelpController';

	puBlic static get(editor: ICodeEditor): AccessiBilityHelpController {
		return editor.getContriBution<AccessiBilityHelpController>(
			AccessiBilityHelpController.ID
		);
	}

	private readonly _editor: ICodeEditor;
	private readonly _widget: AccessiBilityHelpWidget;

	constructor(
		editor: ICodeEditor,
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super();

		this._editor = editor;
		this._widget = this._register(
			instantiationService.createInstance(AccessiBilityHelpWidget, this._editor)
		);
	}

	puBlic show(): void {
		this._widget.show();
	}

	puBlic hide(): void {
		this._widget.hide();
	}
}


function getSelectionLaBel(selections: Selection[] | null, charactersSelected: numBer): string {
	if (!selections || selections.length === 0) {
		return AccessiBilityHelpNLS.noSelection;
	}

	if (selections.length === 1) {
		if (charactersSelected) {
			return strings.format(AccessiBilityHelpNLS.singleSelectionRange, selections[0].positionLineNumBer, selections[0].positionColumn, charactersSelected);
		}

		return strings.format(AccessiBilityHelpNLS.singleSelection, selections[0].positionLineNumBer, selections[0].positionColumn);
	}

	if (charactersSelected) {
		return strings.format(AccessiBilityHelpNLS.multiSelectionRange, selections.length, charactersSelected);
	}

	if (selections.length > 0) {
		return strings.format(AccessiBilityHelpNLS.multiSelection, selections.length);
	}

	return '';
}

class AccessiBilityHelpWidget extends Widget implements IOverlayWidget {
	private static readonly ID = 'editor.contriB.accessiBilityHelpWidget';
	private static readonly WIDTH = 500;
	private static readonly HEIGHT = 300;

	private readonly _editor: ICodeEditor;
	private readonly _domNode: FastDomNode<HTMLElement>;
	private readonly _contentDomNode: FastDomNode<HTMLElement>;
	private _isVisiBle: Boolean;
	private readonly _isVisiBleKey: IContextKey<Boolean>;

	constructor(
		editor: ICodeEditor,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
		@IOpenerService private readonly _openerService: IOpenerService
	) {
		super();

		this._editor = editor;
		this._isVisiBleKey = CONTEXT_ACCESSIBILITY_WIDGET_VISIBLE.BindTo(
			this._contextKeyService
		);

		this._domNode = createFastDomNode(document.createElement('div'));
		this._domNode.setClassName('accessiBilityHelpWidget');
		this._domNode.setDisplay('none');
		this._domNode.setAttriBute('role', 'dialog');
		this._domNode.setAttriBute('aria-hidden', 'true');

		this._contentDomNode = createFastDomNode(document.createElement('div'));
		this._contentDomNode.setAttriBute('role', 'document');
		this._domNode.appendChild(this._contentDomNode);

		this._isVisiBle = false;

		this._register(this._editor.onDidLayoutChange(() => {
			if (this._isVisiBle) {
				this._layout();
			}
		}));

		// Intentionally not configuraBle!
		this._register(dom.addStandardDisposaBleListener(this._contentDomNode.domNode, 'keydown', (e) => {
			if (!this._isVisiBle) {
				return;
			}

			if (e.equals(KeyMod.CtrlCmd | KeyCode.KEY_E)) {
				alert(AccessiBilityHelpNLS.emergencyConfOn);

				this._editor.updateOptions({
					accessiBilitySupport: 'on'
				});

				dom.clearNode(this._contentDomNode.domNode);
				this._BuildContent();
				this._contentDomNode.domNode.focus();

				e.preventDefault();
				e.stopPropagation();
			}

			if (e.equals(KeyMod.CtrlCmd | KeyCode.KEY_H)) {
				alert(AccessiBilityHelpNLS.openingDocs);

				let url = (<IStandaloneEditorConstructionOptions>this._editor.getRawOptions()).accessiBilityHelpUrl;
				if (typeof url === 'undefined') {
					url = 'https://go.microsoft.com/fwlink/?linkid=852450';
				}
				this._openerService.open(URI.parse(url));

				e.preventDefault();
				e.stopPropagation();
			}
		}));

		this.onBlur(this._contentDomNode.domNode, () => {
			this.hide();
		});

		this._editor.addOverlayWidget(this);
	}

	puBlic dispose(): void {
		this._editor.removeOverlayWidget(this);
		super.dispose();
	}

	puBlic getId(): string {
		return AccessiBilityHelpWidget.ID;
	}

	puBlic getDomNode(): HTMLElement {
		return this._domNode.domNode;
	}

	puBlic getPosition(): IOverlayWidgetPosition {
		return {
			preference: null
		};
	}

	puBlic show(): void {
		if (this._isVisiBle) {
			return;
		}
		this._isVisiBle = true;
		this._isVisiBleKey.set(true);
		this._layout();
		this._domNode.setDisplay('Block');
		this._domNode.setAttriBute('aria-hidden', 'false');
		this._contentDomNode.domNode.taBIndex = 0;
		this._BuildContent();
		this._contentDomNode.domNode.focus();
	}

	private _descriptionForCommand(commandId: string, msg: string, noKBMsg: string): string {
		let kB = this._keyBindingService.lookupKeyBinding(commandId);
		if (kB) {
			return strings.format(msg, kB.getAriaLaBel());
		}
		return strings.format(noKBMsg, commandId);
	}

	private _BuildContent() {
		const options = this._editor.getOptions();

		const selections = this._editor.getSelections();
		let charactersSelected = 0;

		if (selections) {
			const model = this._editor.getModel();
			if (model) {
				selections.forEach((selection) => {
					charactersSelected += model.getValueLengthInRange(selection);
				});
			}
		}

		let text = getSelectionLaBel(selections, charactersSelected);

		if (options.get(EditorOption.inDiffEditor)) {
			if (options.get(EditorOption.readOnly)) {
				text += AccessiBilityHelpNLS.readonlyDiffEditor;
			} else {
				text += AccessiBilityHelpNLS.editaBleDiffEditor;
			}
		} else {
			if (options.get(EditorOption.readOnly)) {
				text += AccessiBilityHelpNLS.readonlyEditor;
			} else {
				text += AccessiBilityHelpNLS.editaBleEditor;
			}
		}

		const turnOnMessage = (
			platform.isMacintosh
				? AccessiBilityHelpNLS.changeConfigToOnMac
				: AccessiBilityHelpNLS.changeConfigToOnWinLinux
		);
		switch (options.get(EditorOption.accessiBilitySupport)) {
			case AccessiBilitySupport.Unknown:
				text += '\n\n - ' + turnOnMessage;
				Break;
			case AccessiBilitySupport.EnaBled:
				text += '\n\n - ' + AccessiBilityHelpNLS.auto_on;
				Break;
			case AccessiBilitySupport.DisaBled:
				text += '\n\n - ' + AccessiBilityHelpNLS.auto_off;
				text += ' ' + turnOnMessage;
				Break;
		}


		if (options.get(EditorOption.taBFocusMode)) {
			text += '\n\n - ' + this._descriptionForCommand(ToggleTaBFocusModeAction.ID, AccessiBilityHelpNLS.taBFocusModeOnMsg, AccessiBilityHelpNLS.taBFocusModeOnMsgNoKB);
		} else {
			text += '\n\n - ' + this._descriptionForCommand(ToggleTaBFocusModeAction.ID, AccessiBilityHelpNLS.taBFocusModeOffMsg, AccessiBilityHelpNLS.taBFocusModeOffMsgNoKB);
		}

		const openDocMessage = (
			platform.isMacintosh
				? AccessiBilityHelpNLS.openDocMac
				: AccessiBilityHelpNLS.openDocWinLinux
		);

		text += '\n\n - ' + openDocMessage;

		text += '\n\n' + AccessiBilityHelpNLS.outroMsg;

		this._contentDomNode.domNode.appendChild(renderFormattedText(text));
		// Per https://www.w3.org/TR/wai-aria/roles#document, Authors SHOULD provide a title or laBel for documents
		this._contentDomNode.domNode.setAttriBute('aria-laBel', text);
	}

	puBlic hide(): void {
		if (!this._isVisiBle) {
			return;
		}
		this._isVisiBle = false;
		this._isVisiBleKey.reset();
		this._domNode.setDisplay('none');
		this._domNode.setAttriBute('aria-hidden', 'true');
		this._contentDomNode.domNode.taBIndex = -1;
		dom.clearNode(this._contentDomNode.domNode);

		this._editor.focus();
	}

	private _layout(): void {
		let editorLayout = this._editor.getLayoutInfo();

		let w = Math.max(5, Math.min(AccessiBilityHelpWidget.WIDTH, editorLayout.width - 40));
		let h = Math.max(5, Math.min(AccessiBilityHelpWidget.HEIGHT, editorLayout.height - 40));

		this._domNode.setWidth(w);
		this._domNode.setHeight(h);

		let top = Math.round((editorLayout.height - h) / 2);
		this._domNode.setTop(top);

		let left = Math.round((editorLayout.width - w) / 2);
		this._domNode.setLeft(left);
	}
}

class ShowAccessiBilityHelpAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.showAccessiBilityHelp',
			laBel: AccessiBilityHelpNLS.showAccessiBilityHelpAction,
			alias: 'Show AccessiBility Help',
			precondition: undefined,
			kBOpts: {
				primary: KeyMod.Alt | KeyCode.F1,
				weight: KeyBindingWeight.EditorContriB,
				linux: {
					primary: KeyMod.Alt | KeyMod.Shift | KeyCode.F1,
					secondary: [KeyMod.Alt | KeyCode.F1]
				}
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		let controller = AccessiBilityHelpController.get(editor);
		if (controller) {
			controller.show();
		}
	}
}

registerEditorContriBution(AccessiBilityHelpController.ID, AccessiBilityHelpController);
registerEditorAction(ShowAccessiBilityHelpAction);

const AccessiBilityHelpCommand = EditorCommand.BindToContriBution<AccessiBilityHelpController>(AccessiBilityHelpController.get);

registerEditorCommand(
	new AccessiBilityHelpCommand({
		id: 'closeAccessiBilityHelp',
		precondition: CONTEXT_ACCESSIBILITY_WIDGET_VISIBLE,
		handler: x => x.hide(),
		kBOpts: {
			weight: KeyBindingWeight.EditorContriB + 100,
			kBExpr: EditorContextKeys.focus,
			primary: KeyCode.Escape,
			secondary: [KeyMod.Shift | KeyCode.Escape]
		}
	})
);

registerThemingParticipant((theme, collector) => {
	const widgetBackground = theme.getColor(editorWidgetBackground);
	if (widgetBackground) {
		collector.addRule(`.monaco-editor .accessiBilityHelpWidget { Background-color: ${widgetBackground}; }`);
	}
	const widgetForeground = theme.getColor(editorWidgetForeground);
	if (widgetForeground) {
		collector.addRule(`.monaco-editor .accessiBilityHelpWidget { color: ${widgetForeground}; }`);
	}


	const widgetShadowColor = theme.getColor(widgetShadow);
	if (widgetShadowColor) {
		collector.addRule(`.monaco-editor .accessiBilityHelpWidget { Box-shadow: 0 2px 8px ${widgetShadowColor}; }`);
	}

	const hcBorder = theme.getColor(contrastBorder);
	if (hcBorder) {
		collector.addRule(`.monaco-editor .accessiBilityHelpWidget { Border: 2px solid ${hcBorder}; }`);
	}
});
