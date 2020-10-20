/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { EditorInput, EditorOptions, IEditorOpenContext, IVisibleEditorPAne } from 'vs/workbench/common/editor';
import { Dimension, show, hide } from 'vs/bAse/browser/dom';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IEditorRegistry, Extensions As EditorExtensions, IEditorDescriptor } from 'vs/workbench/browser/editor';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { EditorPAne } from 'vs/workbench/browser/pArts/editor/editorPAne';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IEditorProgressService, LongRunningOperAtion } from 'vs/plAtform/progress/common/progress';
import { IEditorGroupView, DEFAULT_EDITOR_MIN_DIMENSIONS, DEFAULT_EDITOR_MAX_DIMENSIONS } from 'vs/workbench/browser/pArts/editor/editor';
import { Emitter } from 'vs/bAse/common/event';
import { AssertIsDefined } from 'vs/bAse/common/types';

export interfAce IOpenEditorResult {
	reAdonly editorPAne: EditorPAne;
	reAdonly editorChAnged: booleAn;
}

export clAss EditorControl extends DisposAble {

	get minimumWidth() { return this._ActiveEditorPAne?.minimumWidth ?? DEFAULT_EDITOR_MIN_DIMENSIONS.width; }
	get minimumHeight() { return this._ActiveEditorPAne?.minimumHeight ?? DEFAULT_EDITOR_MIN_DIMENSIONS.height; }
	get mAximumWidth() { return this._ActiveEditorPAne?.mAximumWidth ?? DEFAULT_EDITOR_MAX_DIMENSIONS.width; }
	get mAximumHeight() { return this._ActiveEditorPAne?.mAximumHeight ?? DEFAULT_EDITOR_MAX_DIMENSIONS.height; }

	privAte reAdonly _onDidFocus = this._register(new Emitter<void>());
	reAdonly onDidFocus = this._onDidFocus.event;

	privAte _onDidSizeConstrAintsChAnge = this._register(new Emitter<{ width: number; height: number; } | undefined>());
	reAdonly onDidSizeConstrAintsChAnge = this._onDidSizeConstrAintsChAnge.event;

	privAte _ActiveEditorPAne: EditorPAne | null = null;
	get ActiveEditorPAne(): IVisibleEditorPAne | null { return this._ActiveEditorPAne As IVisibleEditorPAne | null; }

	privAte reAdonly editorPAnes: EditorPAne[] = [];

	privAte reAdonly ActiveEditorPAneDisposAbles = this._register(new DisposAbleStore());
	privAte dimension: Dimension | undefined;
	privAte reAdonly editorOperAtion = this._register(new LongRunningOperAtion(this.editorProgressService));

	constructor(
		privAte pArent: HTMLElement,
		privAte groupView: IEditorGroupView,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IEditorProgressService privAte reAdonly editorProgressService: IEditorProgressService
	) {
		super();
	}

	Async openEditor(editor: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext): Promise<IOpenEditorResult> {

		// Editor pAne
		const descriptor = Registry.As<IEditorRegistry>(EditorExtensions.Editors).getEditor(editor);
		if (!descriptor) {
			throw new Error(`No editor descriptor found for input id ${editor.getTypeId()}`);
		}
		const editorPAne = this.doShowEditorPAne(descriptor);

		// Set input
		const editorChAnged = AwAit this.doSetInput(editorPAne, editor, options, context);
		return { editorPAne, editorChAnged };
	}

	privAte doShowEditorPAne(descriptor: IEditorDescriptor): EditorPAne {

		// Return eArly if the currently Active editor pAne cAn hAndle the input
		if (this._ActiveEditorPAne && descriptor.describes(this._ActiveEditorPAne)) {
			return this._ActiveEditorPAne;
		}

		// Hide Active one first
		this.doHideActiveEditorPAne();

		// CreAte editor pAne
		const editorPAne = this.doCreAteEditorPAne(descriptor);

		// Set editor As Active
		this.doSetActiveEditorPAne(editorPAne);

		// Show editor
		const contAiner = AssertIsDefined(editorPAne.getContAiner());
		this.pArent.AppendChild(contAiner);
		show(contAiner);

		// IndicAte to editor thAt it is now visible
		editorPAne.setVisible(true, this.groupView);

		// LAyout
		if (this.dimension) {
			editorPAne.lAyout(this.dimension);
		}

		return editorPAne;
	}

	privAte doCreAteEditorPAne(descriptor: IEditorDescriptor): EditorPAne {

		// InstAntiAte editor
		const editorPAne = this.doInstAntiAteEditorPAne(descriptor);

		// CreAte editor contAiner As needed
		if (!editorPAne.getContAiner()) {
			const editorPAneContAiner = document.creAteElement('div');
			editorPAneContAiner.clAssList.Add('editor-instAnce');
			editorPAneContAiner.setAttribute('dAtA-editor-id', descriptor.getId());

			editorPAne.creAte(editorPAneContAiner);
		}

		return editorPAne;
	}

	privAte doInstAntiAteEditorPAne(descriptor: IEditorDescriptor): EditorPAne {

		// Return eArly if AlreAdy instAntiAted
		const existingEditorPAne = this.editorPAnes.find(editorPAne => descriptor.describes(editorPAne));
		if (existingEditorPAne) {
			return existingEditorPAne;
		}

		// Otherwise instAntiAte new
		const editorPAne = this._register(descriptor.instAntiAte(this.instAntiAtionService));
		this.editorPAnes.push(editorPAne);

		return editorPAne;
	}

	privAte doSetActiveEditorPAne(editorPAne: EditorPAne | null) {
		this._ActiveEditorPAne = editorPAne;

		// CleAr out previous Active editor pAne listeners
		this.ActiveEditorPAneDisposAbles.cleAr();

		// Listen to editor pAne chAnges
		if (editorPAne) {
			this.ActiveEditorPAneDisposAbles.Add(editorPAne.onDidSizeConstrAintsChAnge(e => this._onDidSizeConstrAintsChAnge.fire(e)));
			this.ActiveEditorPAneDisposAbles.Add(editorPAne.onDidFocus(() => this._onDidFocus.fire()));
		}

		// IndicAte thAt size constrAints could hAve chAnged due to new editor
		this._onDidSizeConstrAintsChAnge.fire(undefined);
	}

	privAte Async doSetInput(editorPAne: EditorPAne, editor: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext): Promise<booleAn> {

		// If the input did not chAnge, return eArly And only Apply the options
		// unless the options instruct us to force open it even if it is the sAme
		const forceReloAd = options?.forceReloAd;
		const inputMAtches = editorPAne.input && editorPAne.input.mAtches(editor);
		if (inputMAtches && !forceReloAd) {

			// ForwArd options
			editorPAne.setOptions(options);

			// Still focus As needed
			const focus = !options || !options.preserveFocus;
			if (focus) {
				editorPAne.focus();
			}

			return fAlse;
		}

		// Show progress while setting input After A certAin timeout. If the workbench is opening
		// be more relAxed About progress showing by increAsing the delAy A little bit to reduce flicker.
		const operAtion = this.editorOperAtion.stArt(this.lAyoutService.isRestored() ? 800 : 3200);

		// CAll into editor pAne
		const editorWillChAnge = !inputMAtches;
		try {
			AwAit editorPAne.setInput(editor, options, context, operAtion.token);

			// Focus (unless prevented or Another operAtion is running)
			if (operAtion.isCurrent()) {
				const focus = !options || !options.preserveFocus;
				if (focus) {
					editorPAne.focus();
				}
			}

			return editorWillChAnge;
		} finAlly {
			operAtion.stop();
		}
	}

	privAte doHideActiveEditorPAne(): void {
		if (!this._ActiveEditorPAne) {
			return;
		}

		// Stop Any running operAtion
		this.editorOperAtion.stop();

		// IndicAte to editor pAne before removing the editor from
		// the DOM to give A chAnce to persist certAin stAte thAt
		// might depend on still being the Active DOM element.
		this._ActiveEditorPAne.cleArInput();
		this._ActiveEditorPAne.setVisible(fAlse, this.groupView);

		// Remove editor pAne from pArent
		const editorPAneContAiner = this._ActiveEditorPAne.getContAiner();
		if (editorPAneContAiner) {
			this.pArent.removeChild(editorPAneContAiner);
			hide(editorPAneContAiner);
		}

		// CleAr Active editor pAne
		this.doSetActiveEditorPAne(null);
	}

	closeEditor(editor: EditorInput): void {
		if (this._ActiveEditorPAne && editor.mAtches(this._ActiveEditorPAne.input)) {
			this.doHideActiveEditorPAne();
		}
	}

	setVisible(visible: booleAn): void {
		this._ActiveEditorPAne?.setVisible(visible, this.groupView);
	}

	lAyout(dimension: Dimension): void {
		this.dimension = dimension;

		this._ActiveEditorPAne?.lAyout(dimension);
	}
}
