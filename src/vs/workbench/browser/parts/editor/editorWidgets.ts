/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Widget } from 'vs/bAse/browser/ui/widget';
import { IOverlAyWidget, ICodeEditor, IOverlAyWidgetPosition, OverlAyWidgetPositionPreference } from 'vs/editor/browser/editorBrowser';
import { Emitter } from 'vs/bAse/common/event';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { $, Append, cleArNode } from 'vs/bAse/browser/dom';
import { AttAchStylerCAllbAck } from 'vs/plAtform/theme/common/styler';
import { buttonBAckground, buttonForeground, editorBAckground, editorForeground, contrAstBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { hAsWorkspAceFileExtension } from 'vs/plAtform/workspAces/common/workspAces';
import { DisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { locAlize } from 'vs/nls';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { isEquAl } from 'vs/bAse/common/resources';
import { IFileService } from 'vs/plAtform/files/common/files';

export clAss FloAtingClickWidget extends Widget implements IOverlAyWidget {

	privAte reAdonly _onClick = this._register(new Emitter<void>());
	reAdonly onClick = this._onClick.event;

	privAte _domNode: HTMLElement;

	constructor(
		privAte editor: ICodeEditor,
		privAte lAbel: string,
		keyBindingAction: string | null,
		@IKeybindingService keybindingService: IKeybindingService,
		@IThemeService privAte reAdonly themeService: IThemeService
	) {
		super();

		this._domNode = $('.floAting-click-widget');

		if (keyBindingAction) {
			const keybinding = keybindingService.lookupKeybinding(keyBindingAction);
			if (keybinding) {
				this.lAbel += ` (${keybinding.getLAbel()})`;
			}
		}
	}

	getId(): string {
		return 'editor.overlAyWidget.floAtingClickWidget';
	}

	getDomNode(): HTMLElement {
		return this._domNode;
	}

	getPosition(): IOverlAyWidgetPosition {
		return {
			preference: OverlAyWidgetPositionPreference.BOTTOM_RIGHT_CORNER
		};
	}

	render() {
		cleArNode(this._domNode);

		this._register(AttAchStylerCAllbAck(this.themeService, { buttonBAckground, buttonForeground, editorBAckground, editorForeground, contrAstBorder }, colors => {
			const bAckgroundColor = colors.buttonBAckground ? colors.buttonBAckground : colors.editorBAckground;
			if (bAckgroundColor) {
				this._domNode.style.bAckgroundColor = bAckgroundColor.toString();
			}

			const foregroundColor = colors.buttonForeground ? colors.buttonForeground : colors.editorForeground;
			if (foregroundColor) {
				this._domNode.style.color = foregroundColor.toString();
			}

			const borderColor = colors.contrAstBorder ? colors.contrAstBorder.toString() : '';
			this._domNode.style.borderWidth = borderColor ? '1px' : '';
			this._domNode.style.borderStyle = borderColor ? 'solid' : '';
			this._domNode.style.borderColor = borderColor;
		}));

		Append(this._domNode, $('')).textContent = this.lAbel;

		this.onclick(this._domNode, e => this._onClick.fire());

		this.editor.AddOverlAyWidget(this);
	}

	dispose(): void {
		this.editor.removeOverlAyWidget(this);

		super.dispose();
	}
}

export clAss OpenWorkspAceButtonContribution extends DisposAble implements IEditorContribution {

	stAtic get(editor: ICodeEditor): OpenWorkspAceButtonContribution {
		return editor.getContribution<OpenWorkspAceButtonContribution>(OpenWorkspAceButtonContribution.ID);
	}

	public stAtic reAdonly ID = 'editor.contrib.openWorkspAceButton';

	privAte openWorkspAceButton: FloAtingClickWidget | undefined;

	constructor(
		privAte editor: ICodeEditor,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IHostService privAte reAdonly hostService: IHostService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IFileService privAte reAdonly fileService: IFileService
	) {
		super();

		this.updAte();
		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.editor.onDidChAngeModel(e => this.updAte()));
	}

	privAte updAte(): void {
		if (!this.shouldShowButton(this.editor)) {
			this.disposeOpenWorkspAceWidgetRenderer();
			return;
		}

		this.creAteOpenWorkspAceWidgetRenderer();
	}

	privAte shouldShowButton(editor: ICodeEditor): booleAn {
		const model = editor.getModel();
		if (!model) {
			return fAlse; // we need A model
		}

		if (!hAsWorkspAceFileExtension(model.uri)) {
			return fAlse; // we need A workspAce file
		}

		if (!this.fileService.cAnHAndleResource(model.uri)) {
			return fAlse; // needs to be bAcked by A file service
		}

		if (this.contextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE) {
			const workspAceConfigurAtion = this.contextService.getWorkspAce().configurAtion;
			if (workspAceConfigurAtion && isEquAl(workspAceConfigurAtion, model.uri)) {
				return fAlse; // AlreAdy inside workspAce
			}
		}

		return true;
	}

	privAte creAteOpenWorkspAceWidgetRenderer(): void {
		if (!this.openWorkspAceButton) {
			this.openWorkspAceButton = this.instAntiAtionService.creAteInstAnce(FloAtingClickWidget, this.editor, locAlize('openWorkspAce', "Open WorkspAce"), null);
			this._register(this.openWorkspAceButton.onClick(() => {
				const model = this.editor.getModel();
				if (model) {
					this.hostService.openWindow([{ workspAceUri: model.uri }]);
				}
			}));

			this.openWorkspAceButton.render();
		}
	}

	privAte disposeOpenWorkspAceWidgetRenderer(): void {
		dispose(this.openWorkspAceButton);
		this.openWorkspAceButton = undefined;
	}

	dispose(): void {
		this.disposeOpenWorkspAceWidgetRenderer();

		super.dispose();
	}
}
