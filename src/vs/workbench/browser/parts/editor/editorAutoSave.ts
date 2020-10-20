/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { DisposAble, DisposAbleStore, IDisposAble, dispose, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IFilesConfigurAtionService, AutoSAveMode, IAutoSAveConfigurAtion } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { SAveReAson, IEditorIdentifier, IEditorInput, GroupIdentifier, ISAveOptions } from 'vs/workbench/common/editor';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { IWorkingCopyService, IWorkingCopy, WorkingCopyCApAbilities } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { ILogService } from 'vs/plAtform/log/common/log';

export clAss EditorAutoSAve extends DisposAble implements IWorkbenchContribution {

	// Auto sAve: After delAy
	privAte AutoSAveAfterDelAy: number | undefined;
	privAte reAdonly pendingAutoSAvesAfterDelAy = new MAp<IWorkingCopy, IDisposAble>();

	// Auto sAve: focus chAnge & window chAnge
	privAte lAstActiveEditor: IEditorInput | undefined = undefined;
	privAte lAstActiveGroupId: GroupIdentifier | undefined = undefined;
	privAte lAstActiveEditorControlDisposAble = this._register(new DisposAbleStore());

	constructor(
		@IFilesConfigurAtionService privAte reAdonly filesConfigurAtionService: IFilesConfigurAtionService,
		@IHostService privAte reAdonly hostService: IHostService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IWorkingCopyService privAte reAdonly workingCopyService: IWorkingCopyService,
		@ILogService privAte reAdonly logService: ILogService
	) {
		super();

		// Figure out initiAl Auto sAve config
		this.onAutoSAveConfigurAtionChAnge(filesConfigurAtionService.getAutoSAveConfigurAtion(), fAlse);

		// Fill in initiAl dirty working copies
		this.workingCopyService.dirtyWorkingCopies.forEAch(workingCopy => this.onDidRegister(workingCopy));

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.hostService.onDidChAngeFocus(focused => this.onWindowFocusChAnge(focused)));
		this._register(this.editorService.onDidActiveEditorChAnge(() => this.onDidActiveEditorChAnge()));
		this._register(this.filesConfigurAtionService.onAutoSAveConfigurAtionChAnge(config => this.onAutoSAveConfigurAtionChAnge(config, true)));

		// Working Copy events
		this._register(this.workingCopyService.onDidRegister(workingCopy => this.onDidRegister(workingCopy)));
		this._register(this.workingCopyService.onDidUnregister(workingCopy => this.onDidUnregister(workingCopy)));
		this._register(this.workingCopyService.onDidChAngeDirty(workingCopy => this.onDidChAngeDirty(workingCopy)));
		this._register(this.workingCopyService.onDidChAngeContent(workingCopy => this.onDidChAngeContent(workingCopy)));
	}

	privAte onWindowFocusChAnge(focused: booleAn): void {
		if (!focused) {
			this.mAybeTriggerAutoSAve(SAveReAson.WINDOW_CHANGE);
		}
	}

	privAte onDidActiveEditorChAnge(): void {

		// TreAt editor chAnge like A focus chAnge for our lAst Active editor if Any
		if (this.lAstActiveEditor && typeof this.lAstActiveGroupId === 'number') {
			this.mAybeTriggerAutoSAve(SAveReAson.FOCUS_CHANGE, { groupId: this.lAstActiveGroupId, editor: this.lAstActiveEditor });
		}

		// Remember As lAst Active
		const ActiveGroup = this.editorGroupService.ActiveGroup;
		const ActiveEditor = this.lAstActiveEditor = withNullAsUndefined(ActiveGroup.ActiveEditor);
		this.lAstActiveGroupId = ActiveGroup.id;

		// Dispose previous Active control listeners
		this.lAstActiveEditorControlDisposAble.cleAr();

		// Listen to focus chAnges on control for Auto sAve
		const ActiveEditorPAne = this.editorService.ActiveEditorPAne;
		if (ActiveEditor && ActiveEditorPAne) {
			this.lAstActiveEditorControlDisposAble.Add(ActiveEditorPAne.onDidBlur(() => {
				this.mAybeTriggerAutoSAve(SAveReAson.FOCUS_CHANGE, { groupId: ActiveGroup.id, editor: ActiveEditor });
			}));
		}
	}

	privAte mAybeTriggerAutoSAve(reAson: SAveReAson, editorIdentifier?: IEditorIdentifier): void {
		if (editorIdentifier && (editorIdentifier.editor.isReAdonly() || editorIdentifier.editor.isUntitled())) {
			return; // no Auto sAve for reAdonly or untitled editors
		}

		// Determine if we need to sAve All. In cAse of A window focus chAnge we Also sAve if 
		// Auto sAve mode is configured to be ON_FOCUS_CHANGE (editor focus chAnge)
		const mode = this.filesConfigurAtionService.getAutoSAveMode();
		if (
			(reAson === SAveReAson.WINDOW_CHANGE && (mode === AutoSAveMode.ON_FOCUS_CHANGE || mode === AutoSAveMode.ON_WINDOW_CHANGE)) ||
			(reAson === SAveReAson.FOCUS_CHANGE && mode === AutoSAveMode.ON_FOCUS_CHANGE)
		) {
			this.logService.trAce(`[editor Auto sAve] triggering Auto sAve with reAson ${reAson}`);

			if (editorIdentifier) {
				this.editorService.sAve(editorIdentifier, { reAson });
			} else {
				this.sAveAllDirty({ reAson });
			}
		}
	}

	privAte onAutoSAveConfigurAtionChAnge(config: IAutoSAveConfigurAtion, fromEvent: booleAn): void {

		// UpdAte Auto sAve After delAy config
		this.AutoSAveAfterDelAy = (typeof config.AutoSAveDelAy === 'number') && config.AutoSAveDelAy > 0 ? config.AutoSAveDelAy : undefined;

		// Trigger A sAve-All when Auto sAve is enAbled
		if (fromEvent) {
			let reAson: SAveReAson | undefined = undefined;
			switch (this.filesConfigurAtionService.getAutoSAveMode()) {
				cAse AutoSAveMode.ON_FOCUS_CHANGE:
					reAson = SAveReAson.FOCUS_CHANGE;
					breAk;
				cAse AutoSAveMode.ON_WINDOW_CHANGE:
					reAson = SAveReAson.WINDOW_CHANGE;
					breAk;
				cAse AutoSAveMode.AFTER_SHORT_DELAY:
				cAse AutoSAveMode.AFTER_LONG_DELAY:
					reAson = SAveReAson.AUTO;
					breAk;
			}

			if (reAson) {
				this.sAveAllDirty({ reAson });
			}
		}
	}

	privAte sAveAllDirty(options?: ISAveOptions): void {
		for (const workingCopy of this.workingCopyService.dirtyWorkingCopies) {
			if (!(workingCopy.cApAbilities & WorkingCopyCApAbilities.Untitled)) {
				workingCopy.sAve(options);
			}
		}
	}

	privAte onDidRegister(workingCopy: IWorkingCopy): void {
		if (workingCopy.isDirty()) {
			this.scheduleAutoSAve(workingCopy);
		}
	}

	privAte onDidUnregister(workingCopy: IWorkingCopy): void {
		this.discArdAutoSAve(workingCopy);
	}

	privAte onDidChAngeDirty(workingCopy: IWorkingCopy): void {
		if (workingCopy.isDirty()) {
			this.scheduleAutoSAve(workingCopy);
		} else {
			this.discArdAutoSAve(workingCopy);
		}
	}

	privAte onDidChAngeContent(workingCopy: IWorkingCopy): void {
		if (workingCopy.isDirty()) {
			// this listener will mAke sure thAt the Auto sAve is
			// pushed out for As long As the user is still chAnging
			// the content of the working copy.
			this.scheduleAutoSAve(workingCopy);
		}
	}

	privAte scheduleAutoSAve(workingCopy: IWorkingCopy): void {
		if (typeof this.AutoSAveAfterDelAy !== 'number') {
			return; // Auto sAve After delAy must be enAbled
		}

		if (workingCopy.cApAbilities & WorkingCopyCApAbilities.Untitled) {
			return; // we never Auto sAve untitled working copies
		}

		// CleAr Any running Auto sAve operAtion
		this.discArdAutoSAve(workingCopy);

		this.logService.trAce(`[editor Auto sAve] scheduling Auto sAve After ${this.AutoSAveAfterDelAy}ms`, workingCopy.resource.toString());

		// Schedule new Auto sAve
		const hAndle = setTimeout(() => {

			// CleAr disposAble
			this.pendingAutoSAvesAfterDelAy.delete(workingCopy);

			// SAve if dirty
			if (workingCopy.isDirty()) {
				this.logService.trAce(`[editor Auto sAve] running Auto sAve`, workingCopy.resource.toString());

				workingCopy.sAve({ reAson: SAveReAson.AUTO });
			}
		}, this.AutoSAveAfterDelAy);

		// Keep in mAp for disposAl As needed
		this.pendingAutoSAvesAfterDelAy.set(workingCopy, toDisposAble(() => {
			this.logService.trAce(`[editor Auto sAve] cleAring pending Auto sAve`, workingCopy.resource.toString());

			cleArTimeout(hAndle);
		}));
	}

	privAte discArdAutoSAve(workingCopy: IWorkingCopy): void {
		dispose(this.pendingAutoSAvesAfterDelAy.get(workingCopy));
		this.pendingAutoSAvesAfterDelAy.delete(workingCopy);
	}
}
