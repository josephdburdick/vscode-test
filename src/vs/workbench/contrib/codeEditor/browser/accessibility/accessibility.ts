/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./accessiBility';
import * as nls from 'vs/nls';
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
import { IEditorOptions, EditorOption } from 'vs/editor/common/config/editorOptions';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ToggleTaBFocusModeAction } from 'vs/editor/contriB/toggleTaBFocusMode/toggleTaBFocusMode';
import { ConfigurationTarget, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKey, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { contrastBorder, editorWidgetBackground, widgetShadow, editorWidgetForeground } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';

const CONTEXT_ACCESSIBILITY_WIDGET_VISIBLE = new RawContextKey<Boolean>('accessiBilityHelpWidgetVisiBle', false);

class AccessiBilityHelpController extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.accessiBilityHelpController';

	puBlic static get(editor: ICodeEditor): AccessiBilityHelpController {
		return editor.getContriBution<AccessiBilityHelpController>(AccessiBilityHelpController.ID);
	}

	private _editor: ICodeEditor;
	private _widget: AccessiBilityHelpWidget;

	constructor(
		editor: ICodeEditor,
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super();

		this._editor = editor;
		this._widget = this._register(instantiationService.createInstance(AccessiBilityHelpWidget, this._editor));
	}

	puBlic show(): void {
		this._widget.show();
	}

	puBlic hide(): void {
		this._widget.hide();
	}
}

class AccessiBilityHelpWidget extends Widget implements IOverlayWidget {

	private static readonly ID = 'editor.contriB.accessiBilityHelpWidget';
	private static readonly WIDTH = 500;
	private static readonly HEIGHT = 300;

	private _editor: ICodeEditor;
	private _domNode: FastDomNode<HTMLElement>;
	private _contentDomNode: FastDomNode<HTMLElement>;
	private _isVisiBle: Boolean;
	private _isVisiBleKey: IContextKey<Boolean>;

	constructor(
		editor: ICodeEditor,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IOpenerService private readonly _openerService: IOpenerService
	) {
		super();

		this._editor = editor;
		this._isVisiBleKey = CONTEXT_ACCESSIBILITY_WIDGET_VISIBLE.BindTo(this._contextKeyService);

		this._domNode = createFastDomNode(document.createElement('div'));
		this._domNode.setClassName('accessiBilityHelpWidget');
		this._domNode.setWidth(AccessiBilityHelpWidget.WIDTH);
		this._domNode.setHeight(AccessiBilityHelpWidget.HEIGHT);
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
				alert(nls.localize('emergencyConfOn', "Now changing the setting `editor.accessiBilitySupport` to 'on'."));

				this._configurationService.updateValue('editor.accessiBilitySupport', 'on', ConfigurationTarget.USER);

				e.preventDefault();
				e.stopPropagation();
			}

			if (e.equals(KeyMod.CtrlCmd | KeyCode.KEY_H)) {
				alert(nls.localize('openingDocs', "Now opening the VS Code AccessiBility documentation page."));

				this._openerService.open(URI.parse('https://go.microsoft.com/fwlink/?linkid=851010'));

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
		let text = nls.localize('introMsg', "Thank you for trying out VS Code's accessiBility options.");

		text += '\n\n' + nls.localize('status', "Status:");

		const configuredValue = this._configurationService.getValue<IEditorOptions>('editor').accessiBilitySupport;
		const actualValue = options.get(EditorOption.accessiBilitySupport);

		const emergencyTurnOnMessage = (
			platform.isMacintosh
				? nls.localize('changeConfigToOnMac', "To configure the editor to Be permanently optimized for usage with a Screen Reader press Command+E now.")
				: nls.localize('changeConfigToOnWinLinux', "To configure the editor to Be permanently optimized for usage with a Screen Reader press Control+E now.")
		);

		switch (configuredValue) {
			case 'auto':
				switch (actualValue) {
					case AccessiBilitySupport.Unknown:
						// Should never happen in VS Code
						text += '\n\n - ' + nls.localize('auto_unknown', "The editor is configured to use platform APIs to detect when a Screen Reader is attached, But the current runtime does not support this.");
						Break;
					case AccessiBilitySupport.EnaBled:
						text += '\n\n - ' + nls.localize('auto_on', "The editor has automatically detected a Screen Reader is attached.");
						Break;
					case AccessiBilitySupport.DisaBled:
						text += '\n\n - ' + nls.localize('auto_off', "The editor is configured to automatically detect when a Screen Reader is attached, which is not the case at this time.");
						text += ' ' + emergencyTurnOnMessage;
						Break;
				}
				Break;
			case 'on':
				text += '\n\n - ' + nls.localize('configuredOn', "The editor is configured to Be permanently optimized for usage with a Screen Reader - you can change this By editing the setting `editor.accessiBilitySupport`.");
				Break;
			case 'off':
				text += '\n\n - ' + nls.localize('configuredOff', "The editor is configured to never Be optimized for usage with a Screen Reader.");
				text += ' ' + emergencyTurnOnMessage;
				Break;
		}

		const NLS_TAB_FOCUS_MODE_ON = nls.localize('taBFocusModeOnMsg', "Pressing TaB in the current editor will move focus to the next focusaBle element. Toggle this Behavior By pressing {0}.");
		const NLS_TAB_FOCUS_MODE_ON_NO_KB = nls.localize('taBFocusModeOnMsgNoKB', "Pressing TaB in the current editor will move focus to the next focusaBle element. The command {0} is currently not triggeraBle By a keyBinding.");
		const NLS_TAB_FOCUS_MODE_OFF = nls.localize('taBFocusModeOffMsg', "Pressing TaB in the current editor will insert the taB character. Toggle this Behavior By pressing {0}.");
		const NLS_TAB_FOCUS_MODE_OFF_NO_KB = nls.localize('taBFocusModeOffMsgNoKB', "Pressing TaB in the current editor will insert the taB character. The command {0} is currently not triggeraBle By a keyBinding.");

		if (options.get(EditorOption.taBFocusMode)) {
			text += '\n\n - ' + this._descriptionForCommand(ToggleTaBFocusModeAction.ID, NLS_TAB_FOCUS_MODE_ON, NLS_TAB_FOCUS_MODE_ON_NO_KB);
		} else {
			text += '\n\n - ' + this._descriptionForCommand(ToggleTaBFocusModeAction.ID, NLS_TAB_FOCUS_MODE_OFF, NLS_TAB_FOCUS_MODE_OFF_NO_KB);
		}

		const openDocMessage = (
			platform.isMacintosh
				? nls.localize('openDocMac', "Press Command+H now to open a Browser window with more VS Code information related to AccessiBility.")
				: nls.localize('openDocWinLinux', "Press Control+H now to open a Browser window with more VS Code information related to AccessiBility.")
		);

		text += '\n\n' + openDocMessage;

		text += '\n\n' + nls.localize('outroMsg', "You can dismiss this tooltip and return to the editor By pressing Escape or Shift+Escape.");

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

		const width = Math.min(editorLayout.width - 40, AccessiBilityHelpWidget.WIDTH);
		const height = Math.min(editorLayout.height - 40, AccessiBilityHelpWidget.HEIGHT);

		this._domNode.setTop(Math.round((editorLayout.height - height) / 2));
		this._domNode.setLeft(Math.round((editorLayout.width - width) / 2));
		this._domNode.setWidth(width);
		this._domNode.setHeight(height);
	}
}

class ShowAccessiBilityHelpAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.showAccessiBilityHelp',
			laBel: nls.localize('ShowAccessiBilityHelpAction', "Show AccessiBility Help"),
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

registerEditorCommand(new AccessiBilityHelpCommand({
	id: 'closeAccessiBilityHelp',
	precondition: CONTEXT_ACCESSIBILITY_WIDGET_VISIBLE,
	handler: x => x.hide(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 100,
		kBExpr: EditorContextKeys.focus,
		primary: KeyCode.Escape, secondary: [KeyMod.Shift | KeyCode.Escape]
	}
}));

registerThemingParticipant((theme, collector) => {
	const widgetBackground = theme.getColor(editorWidgetBackground);
	if (widgetBackground) {
		collector.addRule(`.monaco-editor .accessiBilityHelpWidget { Background-color: ${widgetBackground}; }`);
	}

	const widgetForeground = theme.getColor(editorWidgetForeground);
	if (widgetBackground) {
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
