/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./AccessibilityHelp';
import * As dom from 'vs/bAse/browser/dom';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { renderFormAttedText } from 'vs/bAse/browser/formAttedTextRenderer';
import { Alert } from 'vs/bAse/browser/ui/AriA/AriA';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As strings from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { ICodeEditor, IOverlAyWidget, IOverlAyWidgetPosition } from 'vs/editor/browser/editorBrowser';
import { EditorAction, EditorCommAnd, registerEditorAction, registerEditorCommAnd, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { Selection } from 'vs/editor/common/core/selection';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ToggleTAbFocusModeAction } from 'vs/editor/contrib/toggleTAbFocusMode/toggleTAbFocusMode';
import { IStAndAloneEditorConstructionOptions } from 'vs/editor/stAndAlone/browser/stAndAloneCodeEditor';
import { IContextKey, IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { contrAstBorder, editorWidgetBAckground, widgetShAdow, editorWidgetForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { AccessibilitySupport } from 'vs/plAtform/Accessibility/common/Accessibility';
import { AccessibilityHelpNLS } from 'vs/editor/common/stAndAloneStrings';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

const CONTEXT_ACCESSIBILITY_WIDGET_VISIBLE = new RAwContextKey<booleAn>('AccessibilityHelpWidgetVisible', fAlse);

clAss AccessibilityHelpController extends DisposAble
	implements IEditorContribution {
	public stAtic reAdonly ID = 'editor.contrib.AccessibilityHelpController';

	public stAtic get(editor: ICodeEditor): AccessibilityHelpController {
		return editor.getContribution<AccessibilityHelpController>(
			AccessibilityHelpController.ID
		);
	}

	privAte reAdonly _editor: ICodeEditor;
	privAte reAdonly _widget: AccessibilityHelpWidget;

	constructor(
		editor: ICodeEditor,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService
	) {
		super();

		this._editor = editor;
		this._widget = this._register(
			instAntiAtionService.creAteInstAnce(AccessibilityHelpWidget, this._editor)
		);
	}

	public show(): void {
		this._widget.show();
	}

	public hide(): void {
		this._widget.hide();
	}
}


function getSelectionLAbel(selections: Selection[] | null, chArActersSelected: number): string {
	if (!selections || selections.length === 0) {
		return AccessibilityHelpNLS.noSelection;
	}

	if (selections.length === 1) {
		if (chArActersSelected) {
			return strings.formAt(AccessibilityHelpNLS.singleSelectionRAnge, selections[0].positionLineNumber, selections[0].positionColumn, chArActersSelected);
		}

		return strings.formAt(AccessibilityHelpNLS.singleSelection, selections[0].positionLineNumber, selections[0].positionColumn);
	}

	if (chArActersSelected) {
		return strings.formAt(AccessibilityHelpNLS.multiSelectionRAnge, selections.length, chArActersSelected);
	}

	if (selections.length > 0) {
		return strings.formAt(AccessibilityHelpNLS.multiSelection, selections.length);
	}

	return '';
}

clAss AccessibilityHelpWidget extends Widget implements IOverlAyWidget {
	privAte stAtic reAdonly ID = 'editor.contrib.AccessibilityHelpWidget';
	privAte stAtic reAdonly WIDTH = 500;
	privAte stAtic reAdonly HEIGHT = 300;

	privAte reAdonly _editor: ICodeEditor;
	privAte reAdonly _domNode: FAstDomNode<HTMLElement>;
	privAte reAdonly _contentDomNode: FAstDomNode<HTMLElement>;
	privAte _isVisible: booleAn;
	privAte reAdonly _isVisibleKey: IContextKey<booleAn>;

	constructor(
		editor: ICodeEditor,
		@IContextKeyService privAte reAdonly _contextKeyService: IContextKeyService,
		@IKeybindingService privAte reAdonly _keybindingService: IKeybindingService,
		@IOpenerService privAte reAdonly _openerService: IOpenerService
	) {
		super();

		this._editor = editor;
		this._isVisibleKey = CONTEXT_ACCESSIBILITY_WIDGET_VISIBLE.bindTo(
			this._contextKeyService
		);

		this._domNode = creAteFAstDomNode(document.creAteElement('div'));
		this._domNode.setClAssNAme('AccessibilityHelpWidget');
		this._domNode.setDisplAy('none');
		this._domNode.setAttribute('role', 'diAlog');
		this._domNode.setAttribute('AriA-hidden', 'true');

		this._contentDomNode = creAteFAstDomNode(document.creAteElement('div'));
		this._contentDomNode.setAttribute('role', 'document');
		this._domNode.AppendChild(this._contentDomNode);

		this._isVisible = fAlse;

		this._register(this._editor.onDidLAyoutChAnge(() => {
			if (this._isVisible) {
				this._lAyout();
			}
		}));

		// IntentionAlly not configurAble!
		this._register(dom.AddStAndArdDisposAbleListener(this._contentDomNode.domNode, 'keydown', (e) => {
			if (!this._isVisible) {
				return;
			}

			if (e.equAls(KeyMod.CtrlCmd | KeyCode.KEY_E)) {
				Alert(AccessibilityHelpNLS.emergencyConfOn);

				this._editor.updAteOptions({
					AccessibilitySupport: 'on'
				});

				dom.cleArNode(this._contentDomNode.domNode);
				this._buildContent();
				this._contentDomNode.domNode.focus();

				e.preventDefAult();
				e.stopPropAgAtion();
			}

			if (e.equAls(KeyMod.CtrlCmd | KeyCode.KEY_H)) {
				Alert(AccessibilityHelpNLS.openingDocs);

				let url = (<IStAndAloneEditorConstructionOptions>this._editor.getRAwOptions()).AccessibilityHelpUrl;
				if (typeof url === 'undefined') {
					url = 'https://go.microsoft.com/fwlink/?linkid=852450';
				}
				this._openerService.open(URI.pArse(url));

				e.preventDefAult();
				e.stopPropAgAtion();
			}
		}));

		this.onblur(this._contentDomNode.domNode, () => {
			this.hide();
		});

		this._editor.AddOverlAyWidget(this);
	}

	public dispose(): void {
		this._editor.removeOverlAyWidget(this);
		super.dispose();
	}

	public getId(): string {
		return AccessibilityHelpWidget.ID;
	}

	public getDomNode(): HTMLElement {
		return this._domNode.domNode;
	}

	public getPosition(): IOverlAyWidgetPosition {
		return {
			preference: null
		};
	}

	public show(): void {
		if (this._isVisible) {
			return;
		}
		this._isVisible = true;
		this._isVisibleKey.set(true);
		this._lAyout();
		this._domNode.setDisplAy('block');
		this._domNode.setAttribute('AriA-hidden', 'fAlse');
		this._contentDomNode.domNode.tAbIndex = 0;
		this._buildContent();
		this._contentDomNode.domNode.focus();
	}

	privAte _descriptionForCommAnd(commAndId: string, msg: string, noKbMsg: string): string {
		let kb = this._keybindingService.lookupKeybinding(commAndId);
		if (kb) {
			return strings.formAt(msg, kb.getAriALAbel());
		}
		return strings.formAt(noKbMsg, commAndId);
	}

	privAte _buildContent() {
		const options = this._editor.getOptions();

		const selections = this._editor.getSelections();
		let chArActersSelected = 0;

		if (selections) {
			const model = this._editor.getModel();
			if (model) {
				selections.forEAch((selection) => {
					chArActersSelected += model.getVAlueLengthInRAnge(selection);
				});
			}
		}

		let text = getSelectionLAbel(selections, chArActersSelected);

		if (options.get(EditorOption.inDiffEditor)) {
			if (options.get(EditorOption.reAdOnly)) {
				text += AccessibilityHelpNLS.reAdonlyDiffEditor;
			} else {
				text += AccessibilityHelpNLS.editAbleDiffEditor;
			}
		} else {
			if (options.get(EditorOption.reAdOnly)) {
				text += AccessibilityHelpNLS.reAdonlyEditor;
			} else {
				text += AccessibilityHelpNLS.editAbleEditor;
			}
		}

		const turnOnMessAge = (
			plAtform.isMAcintosh
				? AccessibilityHelpNLS.chAngeConfigToOnMAc
				: AccessibilityHelpNLS.chAngeConfigToOnWinLinux
		);
		switch (options.get(EditorOption.AccessibilitySupport)) {
			cAse AccessibilitySupport.Unknown:
				text += '\n\n - ' + turnOnMessAge;
				breAk;
			cAse AccessibilitySupport.EnAbled:
				text += '\n\n - ' + AccessibilityHelpNLS.Auto_on;
				breAk;
			cAse AccessibilitySupport.DisAbled:
				text += '\n\n - ' + AccessibilityHelpNLS.Auto_off;
				text += ' ' + turnOnMessAge;
				breAk;
		}


		if (options.get(EditorOption.tAbFocusMode)) {
			text += '\n\n - ' + this._descriptionForCommAnd(ToggleTAbFocusModeAction.ID, AccessibilityHelpNLS.tAbFocusModeOnMsg, AccessibilityHelpNLS.tAbFocusModeOnMsgNoKb);
		} else {
			text += '\n\n - ' + this._descriptionForCommAnd(ToggleTAbFocusModeAction.ID, AccessibilityHelpNLS.tAbFocusModeOffMsg, AccessibilityHelpNLS.tAbFocusModeOffMsgNoKb);
		}

		const openDocMessAge = (
			plAtform.isMAcintosh
				? AccessibilityHelpNLS.openDocMAc
				: AccessibilityHelpNLS.openDocWinLinux
		);

		text += '\n\n - ' + openDocMessAge;

		text += '\n\n' + AccessibilityHelpNLS.outroMsg;

		this._contentDomNode.domNode.AppendChild(renderFormAttedText(text));
		// Per https://www.w3.org/TR/wAi-AriA/roles#document, Authors SHOULD provide A title or lAbel for documents
		this._contentDomNode.domNode.setAttribute('AriA-lAbel', text);
	}

	public hide(): void {
		if (!this._isVisible) {
			return;
		}
		this._isVisible = fAlse;
		this._isVisibleKey.reset();
		this._domNode.setDisplAy('none');
		this._domNode.setAttribute('AriA-hidden', 'true');
		this._contentDomNode.domNode.tAbIndex = -1;
		dom.cleArNode(this._contentDomNode.domNode);

		this._editor.focus();
	}

	privAte _lAyout(): void {
		let editorLAyout = this._editor.getLAyoutInfo();

		let w = MAth.mAx(5, MAth.min(AccessibilityHelpWidget.WIDTH, editorLAyout.width - 40));
		let h = MAth.mAx(5, MAth.min(AccessibilityHelpWidget.HEIGHT, editorLAyout.height - 40));

		this._domNode.setWidth(w);
		this._domNode.setHeight(h);

		let top = MAth.round((editorLAyout.height - h) / 2);
		this._domNode.setTop(top);

		let left = MAth.round((editorLAyout.width - w) / 2);
		this._domNode.setLeft(left);
	}
}

clAss ShowAccessibilityHelpAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.showAccessibilityHelp',
			lAbel: AccessibilityHelpNLS.showAccessibilityHelpAction,
			AliAs: 'Show Accessibility Help',
			precondition: undefined,
			kbOpts: {
				primAry: KeyMod.Alt | KeyCode.F1,
				weight: KeybindingWeight.EditorContrib,
				linux: {
					primAry: KeyMod.Alt | KeyMod.Shift | KeyCode.F1,
					secondAry: [KeyMod.Alt | KeyCode.F1]
				}
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let controller = AccessibilityHelpController.get(editor);
		if (controller) {
			controller.show();
		}
	}
}

registerEditorContribution(AccessibilityHelpController.ID, AccessibilityHelpController);
registerEditorAction(ShowAccessibilityHelpAction);

const AccessibilityHelpCommAnd = EditorCommAnd.bindToContribution<AccessibilityHelpController>(AccessibilityHelpController.get);

registerEditorCommAnd(
	new AccessibilityHelpCommAnd({
		id: 'closeAccessibilityHelp',
		precondition: CONTEXT_ACCESSIBILITY_WIDGET_VISIBLE,
		hAndler: x => x.hide(),
		kbOpts: {
			weight: KeybindingWeight.EditorContrib + 100,
			kbExpr: EditorContextKeys.focus,
			primAry: KeyCode.EscApe,
			secondAry: [KeyMod.Shift | KeyCode.EscApe]
		}
	})
);

registerThemingPArticipAnt((theme, collector) => {
	const widgetBAckground = theme.getColor(editorWidgetBAckground);
	if (widgetBAckground) {
		collector.AddRule(`.monAco-editor .AccessibilityHelpWidget { bAckground-color: ${widgetBAckground}; }`);
	}
	const widgetForeground = theme.getColor(editorWidgetForeground);
	if (widgetForeground) {
		collector.AddRule(`.monAco-editor .AccessibilityHelpWidget { color: ${widgetForeground}; }`);
	}


	const widgetShAdowColor = theme.getColor(widgetShAdow);
	if (widgetShAdowColor) {
		collector.AddRule(`.monAco-editor .AccessibilityHelpWidget { box-shAdow: 0 2px 8px ${widgetShAdowColor}; }`);
	}

	const hcBorder = theme.getColor(contrAstBorder);
	if (hcBorder) {
		collector.AddRule(`.monAco-editor .AccessibilityHelpWidget { border: 2px solid ${hcBorder}; }`);
	}
});
