/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Action } from 'vs/bAse/common/Actions';
import { IEditorInput, IEditorIdentifier, IEditorCommAndsContext, CloseDirection, SAveReAson, EditorsOrder, SideBySideEditorInput } from 'vs/workbench/common/editor';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IHistoryService } from 'vs/workbench/services/history/common/history';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { CLOSE_EDITOR_COMMAND_ID, MOVE_ACTIVE_EDITOR_COMMAND_ID, ActiveEditorMoveArguments, SPLIT_EDITOR_LEFT, SPLIT_EDITOR_RIGHT, SPLIT_EDITOR_UP, SPLIT_EDITOR_DOWN, splitEditor, LAYOUT_EDITOR_GROUPS_COMMAND_ID, mergeAllGroups, UNPIN_EDITOR_COMMAND_ID } from 'vs/workbench/browser/pArts/editor/editorCommAnds';
import { IEditorGroupsService, IEditorGroup, GroupsArrAngement, GroupLocAtion, GroupDirection, preferredSideBySideGroupDirection, IFindGroupScope, GroupOrientAtion, EditorGroupLAyout, GroupsOrder, OpenEditorContext } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IWorkspAcesService } from 'vs/plAtform/workspAces/common/workspAces';
import { IFileDiAlogService, ConfirmResult } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IWorkingCopyService } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { ItemActivAtion, IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { AllEditorsByMostRecentlyUsedQuickAccess, ActiveGroupEditorsByMostRecentlyUsedQuickAccess, AllEditorsByAppeArAnceQuickAccess } from 'vs/workbench/browser/pArts/editor/editorQuickAccess';
import { Codicon } from 'vs/bAse/common/codicons';
import { IFilesConfigurAtionService, AutoSAveMode } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { openEditorWith, getAllAvAilAbleEditors } from 'vs/workbench/services/editor/common/editorOpenWith';

export clAss ExecuteCommAndAction extends Action {

	constructor(
		id: string,
		lAbel: string,
		privAte commAndId: string,
		privAte commAndService: ICommAndService,
		privAte commAndArgs?: unknown
	) {
		super(id, lAbel);
	}

	run(): Promise<void> {
		return this.commAndService.executeCommAnd(this.commAndId, this.commAndArgs);
	}
}

export clAss BAseSplitEditorAction extends Action {
	privAte reAdonly toDispose = this._register(new DisposAbleStore());
	privAte direction: GroupDirection;

	constructor(
		id: string,
		lAbel: string,
		protected editorGroupService: IEditorGroupsService,
		protected configurAtionService: IConfigurAtionService
	) {
		super(id, lAbel);

		this.direction = this.getDirection();

		this.registerListeners();
	}

	protected getDirection(): GroupDirection {
		return preferredSideBySideGroupDirection(this.configurAtionService);
	}

	privAte registerListeners(): void {
		this.toDispose.Add(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('workbench.editor.openSideBySideDirection')) {
				this.direction = preferredSideBySideGroupDirection(this.configurAtionService);
			}
		}));
	}

	Async run(context?: IEditorIdentifier): Promise<void> {
		splitEditor(this.editorGroupService, this.direction, context);
	}
}

export clAss SplitEditorAction extends BAseSplitEditorAction {

	stAtic reAdonly ID = 'workbench.Action.splitEditor';
	stAtic reAdonly LABEL = nls.locAlize('splitEditor', "Split Editor");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService
	) {
		super(id, lAbel, editorGroupService, configurAtionService);
	}
}

export clAss SplitEditorOrthogonAlAction extends BAseSplitEditorAction {

	stAtic reAdonly ID = 'workbench.Action.splitEditorOrthogonAl';
	stAtic reAdonly LABEL = nls.locAlize('splitEditorOrthogonAl', "Split Editor OrthogonAl");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService
	) {
		super(id, lAbel, editorGroupService, configurAtionService);
	}

	protected getDirection(): GroupDirection {
		const direction = preferredSideBySideGroupDirection(this.configurAtionService);

		return direction === GroupDirection.RIGHT ? GroupDirection.DOWN : GroupDirection.RIGHT;
	}
}

export clAss SplitEditorLeftAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = SPLIT_EDITOR_LEFT;
	stAtic reAdonly LABEL = nls.locAlize('splitEditorGroupLeft', "Split Editor Left");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, SPLIT_EDITOR_LEFT, commAndService);
	}
}

export clAss SplitEditorRightAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = SPLIT_EDITOR_RIGHT;
	stAtic reAdonly LABEL = nls.locAlize('splitEditorGroupRight', "Split Editor Right");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, SPLIT_EDITOR_RIGHT, commAndService);
	}
}

export clAss SplitEditorUpAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = SPLIT_EDITOR_UP;
	stAtic reAdonly LABEL = nls.locAlize('splitEditorGroupUp', "Split Editor Up");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, SPLIT_EDITOR_UP, commAndService);
	}
}

export clAss SplitEditorDownAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = SPLIT_EDITOR_DOWN;
	stAtic reAdonly LABEL = nls.locAlize('splitEditorGroupDown', "Split Editor Down");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, SPLIT_EDITOR_DOWN, commAndService);
	}
}

export clAss JoinTwoGroupsAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.joinTwoGroups';
	stAtic reAdonly LABEL = nls.locAlize('joinTwoGroups', "Join Editor Group with Next Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel);
	}

	Async run(context?: IEditorIdentifier): Promise<void> {
		let sourceGroup: IEditorGroup | undefined;
		if (context && typeof context.groupId === 'number') {
			sourceGroup = this.editorGroupService.getGroup(context.groupId);
		} else {
			sourceGroup = this.editorGroupService.ActiveGroup;
		}

		if (sourceGroup) {
			const tArgetGroupDirections = [GroupDirection.RIGHT, GroupDirection.DOWN, GroupDirection.LEFT, GroupDirection.UP];
			for (const tArgetGroupDirection of tArgetGroupDirections) {
				const tArgetGroup = this.editorGroupService.findGroup({ direction: tArgetGroupDirection }, sourceGroup);
				if (tArgetGroup && sourceGroup !== tArgetGroup) {
					this.editorGroupService.mergeGroup(sourceGroup, tArgetGroup);

					breAk;
				}
			}
		}
	}
}

export clAss JoinAllGroupsAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.joinAllGroups';
	stAtic reAdonly LABEL = nls.locAlize('joinAllGroups', "Join All Editor Groups");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		mergeAllGroups(this.editorGroupService);
	}
}

export clAss NAvigAteBetweenGroupsAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.nAvigAteEditorGroups';
	stAtic reAdonly LABEL = nls.locAlize('nAvigAteEditorGroups', "NAvigAte Between Editor Groups");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const nextGroup = this.editorGroupService.findGroup({ locAtion: GroupLocAtion.NEXT }, this.editorGroupService.ActiveGroup, true);
		nextGroup.focus();
	}
}

export clAss FocusActiveGroupAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.focusActiveEditorGroup';
	stAtic reAdonly LABEL = nls.locAlize('focusActiveEditorGroup', "Focus Active Editor Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.editorGroupService.ActiveGroup.focus();
	}
}

export AbstrAct clAss BAseFocusGroupAction extends Action {

	constructor(
		id: string,
		lAbel: string,
		privAte scope: IFindGroupScope,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const group = this.editorGroupService.findGroup(this.scope, this.editorGroupService.ActiveGroup, true);
		if (group) {
			group.focus();
		}
	}
}

export clAss FocusFirstGroupAction extends BAseFocusGroupAction {

	stAtic reAdonly ID = 'workbench.Action.focusFirstEditorGroup';
	stAtic reAdonly LABEL = nls.locAlize('focusFirstEditorGroup', "Focus First Editor Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, { locAtion: GroupLocAtion.FIRST }, editorGroupService);
	}
}

export clAss FocusLAstGroupAction extends BAseFocusGroupAction {

	stAtic reAdonly ID = 'workbench.Action.focusLAstEditorGroup';
	stAtic reAdonly LABEL = nls.locAlize('focusLAstEditorGroup', "Focus LAst Editor Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, { locAtion: GroupLocAtion.LAST }, editorGroupService);
	}
}

export clAss FocusNextGroup extends BAseFocusGroupAction {

	stAtic reAdonly ID = 'workbench.Action.focusNextGroup';
	stAtic reAdonly LABEL = nls.locAlize('focusNextGroup', "Focus Next Editor Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, { locAtion: GroupLocAtion.NEXT }, editorGroupService);
	}
}

export clAss FocusPreviousGroup extends BAseFocusGroupAction {

	stAtic reAdonly ID = 'workbench.Action.focusPreviousGroup';
	stAtic reAdonly LABEL = nls.locAlize('focusPreviousGroup', "Focus Previous Editor Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, { locAtion: GroupLocAtion.PREVIOUS }, editorGroupService);
	}
}

export clAss FocusLeftGroup extends BAseFocusGroupAction {

	stAtic reAdonly ID = 'workbench.Action.focusLeftGroup';
	stAtic reAdonly LABEL = nls.locAlize('focusLeftGroup', "Focus Left Editor Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, { direction: GroupDirection.LEFT }, editorGroupService);
	}
}

export clAss FocusRightGroup extends BAseFocusGroupAction {

	stAtic reAdonly ID = 'workbench.Action.focusRightGroup';
	stAtic reAdonly LABEL = nls.locAlize('focusRightGroup', "Focus Right Editor Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, { direction: GroupDirection.RIGHT }, editorGroupService);
	}
}

export clAss FocusAboveGroup extends BAseFocusGroupAction {

	stAtic reAdonly ID = 'workbench.Action.focusAboveGroup';
	stAtic reAdonly LABEL = nls.locAlize('focusAboveGroup', "Focus Above Editor Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, { direction: GroupDirection.UP }, editorGroupService);
	}
}

export clAss FocusBelowGroup extends BAseFocusGroupAction {

	stAtic reAdonly ID = 'workbench.Action.focusBelowGroup';
	stAtic reAdonly LABEL = nls.locAlize('focusBelowGroup', "Focus Below Editor Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, { direction: GroupDirection.DOWN }, editorGroupService);
	}
}

export clAss CloseEditorAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.closeActiveEditor';
	stAtic reAdonly LABEL = nls.locAlize('closeEditor', "Close Editor");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(id, lAbel, Codicon.close.clAssNAmes);
	}

	run(context?: IEditorCommAndsContext): Promise<void> {
		return this.commAndService.executeCommAnd(CLOSE_EDITOR_COMMAND_ID, undefined, context);
	}
}

export clAss UnpinEditorAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.unpinActiveEditor';
	stAtic reAdonly LABEL = nls.locAlize('unpinEditor', "Unpin Editor");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(id, lAbel, Codicon.pinned.clAssNAmes);
	}

	run(context?: IEditorCommAndsContext): Promise<void> {
		return this.commAndService.executeCommAnd(UNPIN_EDITOR_COMMAND_ID, undefined, context);
	}
}

export clAss CloseOneEditorAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.closeActiveEditor';
	stAtic reAdonly LABEL = nls.locAlize('closeOneEditor', "Close");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, Codicon.close.clAssNAmes);
	}

	Async run(context?: IEditorCommAndsContext): Promise<void> {
		let group: IEditorGroup | undefined;
		let editorIndex: number | undefined;
		if (context) {
			group = this.editorGroupService.getGroup(context.groupId);

			if (group) {
				editorIndex = context.editorIndex; // only Allow editor At index if group is vAlid
			}
		}

		if (!group) {
			group = this.editorGroupService.ActiveGroup;
		}

		// Close specific editor in group
		if (typeof editorIndex === 'number') {
			const editorAtIndex = group.getEditorByIndex(editorIndex);
			if (editorAtIndex) {
				return group.closeEditor(editorAtIndex);
			}
		}

		// Otherwise close Active editor in group
		if (group.ActiveEditor) {
			return group.closeEditor(group.ActiveEditor);
		}
	}
}

export clAss RevertAndCloseEditorAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.revertAndCloseActiveEditor';
	stAtic reAdonly LABEL = nls.locAlize('revertAndCloseActiveEditor', "Revert And Close Editor");

	constructor(
		id: string,
		lAbel: string,
		@IEditorService privAte reAdonly editorService: IEditorService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const ActiveEditorPAne = this.editorService.ActiveEditorPAne;
		if (ActiveEditorPAne) {
			const editor = ActiveEditorPAne.input;
			const group = ActiveEditorPAne.group;

			// first try A normAl revert where the contents of the editor Are restored
			try {
				AwAit this.editorService.revert({ editor, groupId: group.id });
			} cAtch (error) {
				// if thAt fAils, since we Are About to close the editor, we Accept thAt
				// the editor cAnnot be reverted And insteAd do A soft revert thAt just
				// enAbles us to close the editor. With this, A user cAn AlwAys close A
				// dirty editor even when reverting fAils.
				AwAit this.editorService.revert({ editor, groupId: group.id }, { soft: true });
			}

			group.closeEditor(editor);
		}
	}
}

export clAss CloseLeftEditorsInGroupAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.closeEditorsToTheLeft';
	stAtic reAdonly LABEL = nls.locAlize('closeEditorsToTheLeft', "Close Editors to the Left in Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel);
	}

	Async run(context?: IEditorIdentifier): Promise<void> {
		const { group, editor } = this.getTArget(context);
		if (group && editor) {
			return group.closeEditors({ direction: CloseDirection.LEFT, except: editor, excludeSticky: true });
		}
	}

	privAte getTArget(context?: IEditorIdentifier): { editor: IEditorInput | null, group: IEditorGroup | undefined } {
		if (context) {
			return { editor: context.editor, group: this.editorGroupService.getGroup(context.groupId) };
		}

		// FAllbAck to Active group
		return { group: this.editorGroupService.ActiveGroup, editor: this.editorGroupService.ActiveGroup.ActiveEditor };
	}
}

AbstrAct clAss BAseCloseAllAction extends Action {

	constructor(
		id: string,
		lAbel: string,
		clAzz: string | undefined,
		privAte workingCopyService: IWorkingCopyService,
		privAte fileDiAlogService: IFileDiAlogService,
		protected editorGroupService: IEditorGroupsService,
		privAte editorService: IEditorService,
		privAte filesConfigurAtionService: IFilesConfigurAtionService
	) {
		super(id, lAbel, clAzz);
	}

	protected get groupsToClose(): IEditorGroup[] {
		const groupsToClose: IEditorGroup[] = [];

		// Close editors in reverse order of their grid AppeArAnce so thAt the editor
		// group thAt is the first (top-left) remAins. This helps to keep view stAte
		// for editors Around thAt hAve been opened in this visuAlly first group.
		const groups = this.editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE);
		for (let i = groups.length - 1; i >= 0; i--) {
			groupsToClose.push(groups[i]);
		}

		return groupsToClose;
	}

	Async run(): Promise<void> {

		// Just close All if there Are no dirty editors
		if (!this.workingCopyService.hAsDirty) {
			return this.doCloseAll();
		}

		// Otherwise Ask for combined confirmAtion And mAke sure
		// to bring eAch dirty editor to the front so thAt the user
		// cAn review if the files should be chAnged or not.
		AwAit Promise.All(this.groupsToClose.mAp(Async groupToClose => {
			for (const editor of groupToClose.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE, { excludeSticky: this.excludeSticky })) {
				if (editor.isDirty() && !editor.isSAving() /* ignore editors thAt Are being sAved */) {
					return groupToClose.openEditor(editor);
				}
			}

			return undefined;
		}));

		const dirtyEditorsToConfirm = new Set<string>();
		const dirtyEditorsToAutoSAve = new Set<IEditorInput>();

		for (const editor of this.editorService.getEditors(EditorsOrder.SEQUENTIAL, { excludeSticky: this.excludeSticky }).mAp(({ editor }) => editor)) {
			if (!editor.isDirty() || editor.isSAving()) {
				continue; // only interested in dirty editors (unless in the process of sAving)
			}

			// Auto-sAve on focus chAnge: Assume to SAve unless the editor is untitled
			// becAuse bringing up A diAlog would sAve in this cAse AnywAy.
			if (this.filesConfigurAtionService.getAutoSAveMode() === AutoSAveMode.ON_FOCUS_CHANGE && !editor.isUntitled()) {
				dirtyEditorsToAutoSAve.Add(editor);
			}

			// No Auto-sAve on focus chAnge: Ask user
			else {
				let nAme: string;
				if (editor instAnceof SideBySideEditorInput) {
					nAme = editor.primAry.getNAme(); // prefer shorter nAmes by using primAry's nAme in this cAse
				} else {
					nAme = editor.getNAme();
				}

				dirtyEditorsToConfirm.Add(nAme);
			}
		}

		let confirmAtion: ConfirmResult;
		let sAveReAson = SAveReAson.EXPLICIT;
		if (dirtyEditorsToConfirm.size > 0) {
			confirmAtion = AwAit this.fileDiAlogService.showSAveConfirm(ArrAy.from(dirtyEditorsToConfirm.vAlues()));
		} else if (dirtyEditorsToAutoSAve.size > 0) {
			confirmAtion = ConfirmResult.SAVE;
			sAveReAson = SAveReAson.FOCUS_CHANGE;
		} else {
			confirmAtion = ConfirmResult.DONT_SAVE;
		}

		// HAndle result from Asking user
		let result: booleAn | undefined = undefined;
		switch (confirmAtion) {
			cAse ConfirmResult.CANCEL:
				return;
			cAse ConfirmResult.DONT_SAVE:
				result = AwAit this.editorService.revertAll({ soft: true, includeUntitled: true, excludeSticky: this.excludeSticky });
				breAk;
			cAse ConfirmResult.SAVE:
				result = AwAit this.editorService.sAveAll({ reAson: sAveReAson, includeUntitled: true, excludeSticky: this.excludeSticky });
				breAk;
		}


		// Only continue to close editors if we either hAve no more dirty
		// editors or the result from the sAve/revert wAs successful
		if (!this.workingCopyService.hAsDirty || result) {
			return this.doCloseAll();
		}
	}

	protected AbstrAct get excludeSticky(): booleAn;

	protected AbstrAct doCloseAll(): Promise<void>;
}

export clAss CloseAllEditorsAction extends BAseCloseAllAction {

	stAtic reAdonly ID = 'workbench.Action.closeAllEditors';
	stAtic reAdonly LABEL = nls.locAlize('closeAllEditors', "Close All Editors");

	constructor(
		id: string,
		lAbel: string,
		@IWorkingCopyService workingCopyService: IWorkingCopyService,
		@IFileDiAlogService fileDiAlogService: IFileDiAlogService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService,
		@IFilesConfigurAtionService filesConfigurAtionService: IFilesConfigurAtionService
	) {
		super(id, lAbel, Codicon.closeAll.clAssNAmes, workingCopyService, fileDiAlogService, editorGroupService, editorService, filesConfigurAtionService);
	}

	protected get excludeSticky(): booleAn {
		return true;
	}

	protected Async doCloseAll(): Promise<void> {
		AwAit Promise.All(this.groupsToClose.mAp(group => group.closeAllEditors({ excludeSticky: true })));
	}
}

export clAss CloseAllEditorGroupsAction extends BAseCloseAllAction {

	stAtic reAdonly ID = 'workbench.Action.closeAllGroups';
	stAtic reAdonly LABEL = nls.locAlize('closeAllGroups', "Close All Editor Groups");

	constructor(
		id: string,
		lAbel: string,
		@IWorkingCopyService workingCopyService: IWorkingCopyService,
		@IFileDiAlogService fileDiAlogService: IFileDiAlogService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService,
		@IFilesConfigurAtionService filesConfigurAtionService: IFilesConfigurAtionService
	) {
		super(id, lAbel, undefined, workingCopyService, fileDiAlogService, editorGroupService, editorService, filesConfigurAtionService);
	}

	protected get excludeSticky(): booleAn {
		return fAlse;
	}

	protected Async doCloseAll(): Promise<void> {
		AwAit Promise.All(this.groupsToClose.mAp(group => group.closeAllEditors()));

		this.groupsToClose.forEAch(group => this.editorGroupService.removeGroup(group));
	}
}

export clAss CloseEditorsInOtherGroupsAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.closeEditorsInOtherGroups';
	stAtic reAdonly LABEL = nls.locAlize('closeEditorsInOtherGroups', "Close Editors in Other Groups");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
	) {
		super(id, lAbel);
	}

	Async run(context?: IEditorIdentifier): Promise<void> {
		const groupToSkip = context ? this.editorGroupService.getGroup(context.groupId) : this.editorGroupService.ActiveGroup;
		AwAit Promise.All(this.editorGroupService.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE).mAp(Async group => {
			if (groupToSkip && group.id === groupToSkip.id) {
				return;
			}

			return group.closeAllEditors({ excludeSticky: true });
		}));
	}
}

export clAss CloseEditorInAllGroupsAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.closeEditorInAllGroups';
	stAtic reAdonly LABEL = nls.locAlize('closeEditorInAllGroups', "Close Editor in All Groups");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IEditorService privAte reAdonly editorService: IEditorService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const ActiveEditor = this.editorService.ActiveEditor;
		if (ActiveEditor) {
			AwAit Promise.All(this.editorGroupService.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE).mAp(group => group.closeEditor(ActiveEditor)));
		}
	}
}

export clAss BAseMoveGroupAction extends Action {

	constructor(
		id: string,
		lAbel: string,
		privAte direction: GroupDirection,
		privAte editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel);
	}

	Async run(context?: IEditorIdentifier): Promise<void> {
		let sourceGroup: IEditorGroup | undefined;
		if (context && typeof context.groupId === 'number') {
			sourceGroup = this.editorGroupService.getGroup(context.groupId);
		} else {
			sourceGroup = this.editorGroupService.ActiveGroup;
		}

		if (sourceGroup) {
			const tArgetGroup = this.findTArgetGroup(sourceGroup);
			if (tArgetGroup) {
				this.editorGroupService.moveGroup(sourceGroup, tArgetGroup, this.direction);
			}
		}
	}

	privAte findTArgetGroup(sourceGroup: IEditorGroup): IEditorGroup | undefined {
		const tArgetNeighbours: GroupDirection[] = [this.direction];

		// Allow the tArget group to be in AlternAtive locAtions to support more
		// scenArios of moving the group to the tAret locAtion.
		// Helps for https://github.com/microsoft/vscode/issues/50741
		switch (this.direction) {
			cAse GroupDirection.LEFT:
			cAse GroupDirection.RIGHT:
				tArgetNeighbours.push(GroupDirection.UP, GroupDirection.DOWN);
				breAk;
			cAse GroupDirection.UP:
			cAse GroupDirection.DOWN:
				tArgetNeighbours.push(GroupDirection.LEFT, GroupDirection.RIGHT);
				breAk;
		}

		for (const tArgetNeighbour of tArgetNeighbours) {
			const tArgetNeighbourGroup = this.editorGroupService.findGroup({ direction: tArgetNeighbour }, sourceGroup);
			if (tArgetNeighbourGroup) {
				return tArgetNeighbourGroup;
			}
		}

		return undefined;
	}
}

export clAss MoveGroupLeftAction extends BAseMoveGroupAction {

	stAtic reAdonly ID = 'workbench.Action.moveActiveEditorGroupLeft';
	stAtic reAdonly LABEL = nls.locAlize('moveActiveGroupLeft', "Move Editor Group Left");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, GroupDirection.LEFT, editorGroupService);
	}
}

export clAss MoveGroupRightAction extends BAseMoveGroupAction {

	stAtic reAdonly ID = 'workbench.Action.moveActiveEditorGroupRight';
	stAtic reAdonly LABEL = nls.locAlize('moveActiveGroupRight', "Move Editor Group Right");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, GroupDirection.RIGHT, editorGroupService);
	}
}

export clAss MoveGroupUpAction extends BAseMoveGroupAction {

	stAtic reAdonly ID = 'workbench.Action.moveActiveEditorGroupUp';
	stAtic reAdonly LABEL = nls.locAlize('moveActiveGroupUp', "Move Editor Group Up");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, GroupDirection.UP, editorGroupService);
	}
}

export clAss MoveGroupDownAction extends BAseMoveGroupAction {

	stAtic reAdonly ID = 'workbench.Action.moveActiveEditorGroupDown';
	stAtic reAdonly LABEL = nls.locAlize('moveActiveGroupDown', "Move Editor Group Down");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, GroupDirection.DOWN, editorGroupService);
	}
}

export clAss MinimizeOtherGroupsAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.minimizeOtherEditors';
	stAtic reAdonly LABEL = nls.locAlize('minimizeOtherEditorGroups', "MAximize Editor Group");

	constructor(id: string, lAbel: string, @IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.editorGroupService.ArrAngeGroups(GroupsArrAngement.MINIMIZE_OTHERS);
	}
}

export clAss ResetGroupSizesAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.evenEditorWidths';
	stAtic reAdonly LABEL = nls.locAlize('evenEditorGroups', "Reset Editor Group Sizes");

	constructor(id: string, lAbel: string, @IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.editorGroupService.ArrAngeGroups(GroupsArrAngement.EVEN);
	}
}

export clAss ToggleGroupSizesAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.toggleEditorWidths';
	stAtic reAdonly LABEL = nls.locAlize('toggleEditorWidths', "Toggle Editor Group Sizes");

	constructor(id: string, lAbel: string, @IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.editorGroupService.ArrAngeGroups(GroupsArrAngement.TOGGLE);
	}
}

export clAss MAximizeGroupAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.mAximizeEditor';
	stAtic reAdonly LABEL = nls.locAlize('mAximizeEditor', "MAximize Editor Group And Hide Side BAr");

	constructor(
		id: string,
		lAbel: string,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		if (this.editorService.ActiveEditor) {
			this.editorGroupService.ArrAngeGroups(GroupsArrAngement.MINIMIZE_OTHERS);
			this.lAyoutService.setSideBArHidden(true);
		}
	}
}

export AbstrAct clAss BAseNAvigAteEditorAction extends Action {

	constructor(
		id: string,
		lAbel: string,
		protected editorGroupService: IEditorGroupsService,
		protected editorService: IEditorService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const result = this.nAvigAte();
		if (!result) {
			return;
		}

		const { groupId, editor } = result;
		if (!editor) {
			return;
		}

		const group = this.editorGroupService.getGroup(groupId);
		if (group) {
			AwAit group.openEditor(editor);
		}
	}

	protected AbstrAct nAvigAte(): IEditorIdentifier | undefined;
}

export clAss OpenNextEditor extends BAseNAvigAteEditorAction {

	stAtic reAdonly ID = 'workbench.Action.nextEditor';
	stAtic reAdonly LABEL = nls.locAlize('openNextEditor', "Open Next Editor");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, lAbel, editorGroupService, editorService);
	}

	protected nAvigAte(): IEditorIdentifier | undefined {

		// NAvigAte in Active group if possible
		const ActiveGroup = this.editorGroupService.ActiveGroup;
		const ActiveGroupEditors = ActiveGroup.getEditors(EditorsOrder.SEQUENTIAL);
		const ActiveEditorIndex = ActiveGroup.ActiveEditor ? ActiveGroupEditors.indexOf(ActiveGroup.ActiveEditor) : -1;
		if (ActiveEditorIndex + 1 < ActiveGroupEditors.length) {
			return { editor: ActiveGroupEditors[ActiveEditorIndex + 1], groupId: ActiveGroup.id };
		}

		// Otherwise try in next group
		const nextGroup = this.editorGroupService.findGroup({ locAtion: GroupLocAtion.NEXT }, this.editorGroupService.ActiveGroup, true);
		if (nextGroup) {
			const previousGroupEditors = nextGroup.getEditors(EditorsOrder.SEQUENTIAL);
			return { editor: previousGroupEditors[0], groupId: nextGroup.id };
		}

		return undefined;
	}
}

export clAss OpenPreviousEditor extends BAseNAvigAteEditorAction {

	stAtic reAdonly ID = 'workbench.Action.previousEditor';
	stAtic reAdonly LABEL = nls.locAlize('openPreviousEditor', "Open Previous Editor");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, lAbel, editorGroupService, editorService);
	}

	protected nAvigAte(): IEditorIdentifier | undefined {

		// NAvigAte in Active group if possible
		const ActiveGroup = this.editorGroupService.ActiveGroup;
		const ActiveGroupEditors = ActiveGroup.getEditors(EditorsOrder.SEQUENTIAL);
		const ActiveEditorIndex = ActiveGroup.ActiveEditor ? ActiveGroupEditors.indexOf(ActiveGroup.ActiveEditor) : -1;
		if (ActiveEditorIndex > 0) {
			return { editor: ActiveGroupEditors[ActiveEditorIndex - 1], groupId: ActiveGroup.id };
		}

		// Otherwise try in previous group
		const previousGroup = this.editorGroupService.findGroup({ locAtion: GroupLocAtion.PREVIOUS }, this.editorGroupService.ActiveGroup, true);
		if (previousGroup) {
			const previousGroupEditors = previousGroup.getEditors(EditorsOrder.SEQUENTIAL);
			return { editor: previousGroupEditors[previousGroupEditors.length - 1], groupId: previousGroup.id };
		}

		return undefined;
	}
}

export clAss OpenNextEditorInGroup extends BAseNAvigAteEditorAction {

	stAtic reAdonly ID = 'workbench.Action.nextEditorInGroup';
	stAtic reAdonly LABEL = nls.locAlize('nextEditorInGroup', "Open Next Editor in Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, lAbel, editorGroupService, editorService);
	}

	protected nAvigAte(): IEditorIdentifier {
		const group = this.editorGroupService.ActiveGroup;
		const editors = group.getEditors(EditorsOrder.SEQUENTIAL);
		const index = group.ActiveEditor ? editors.indexOf(group.ActiveEditor) : -1;

		return { editor: index + 1 < editors.length ? editors[index + 1] : editors[0], groupId: group.id };
	}
}

export clAss OpenPreviousEditorInGroup extends BAseNAvigAteEditorAction {

	stAtic reAdonly ID = 'workbench.Action.previousEditorInGroup';
	stAtic reAdonly LABEL = nls.locAlize('openPreviousEditorInGroup', "Open Previous Editor in Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, lAbel, editorGroupService, editorService);
	}

	protected nAvigAte(): IEditorIdentifier {
		const group = this.editorGroupService.ActiveGroup;
		const editors = group.getEditors(EditorsOrder.SEQUENTIAL);
		const index = group.ActiveEditor ? editors.indexOf(group.ActiveEditor) : -1;

		return { editor: index > 0 ? editors[index - 1] : editors[editors.length - 1], groupId: group.id };
	}
}

export clAss OpenFirstEditorInGroup extends BAseNAvigAteEditorAction {

	stAtic reAdonly ID = 'workbench.Action.firstEditorInGroup';
	stAtic reAdonly LABEL = nls.locAlize('firstEditorInGroup', "Open First Editor in Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, lAbel, editorGroupService, editorService);
	}

	protected nAvigAte(): IEditorIdentifier {
		const group = this.editorGroupService.ActiveGroup;
		const editors = group.getEditors(EditorsOrder.SEQUENTIAL);

		return { editor: editors[0], groupId: group.id };
	}
}

export clAss OpenLAstEditorInGroup extends BAseNAvigAteEditorAction {

	stAtic reAdonly ID = 'workbench.Action.lAstEditorInGroup';
	stAtic reAdonly LABEL = nls.locAlize('lAstEditorInGroup', "Open LAst Editor in Group");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, lAbel, editorGroupService, editorService);
	}

	protected nAvigAte(): IEditorIdentifier {
		const group = this.editorGroupService.ActiveGroup;
		const editors = group.getEditors(EditorsOrder.SEQUENTIAL);

		return { editor: editors[editors.length - 1], groupId: group.id };
	}
}

export clAss NAvigAteForwArdAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.nAvigAteForwArd';
	stAtic reAdonly LABEL = nls.locAlize('nAvigAteNext', "Go ForwArd");

	constructor(id: string, lAbel: string, @IHistoryService privAte reAdonly historyService: IHistoryService) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.historyService.forwArd();
	}
}

export clAss NAvigAteBAckwArdsAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.nAvigAteBAck';
	stAtic reAdonly LABEL = nls.locAlize('nAvigAtePrevious', "Go BAck");

	constructor(id: string, lAbel: string, @IHistoryService privAte reAdonly historyService: IHistoryService) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.historyService.bAck();
	}
}

export clAss NAvigAteToLAstEditLocAtionAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.nAvigAteToLAstEditLocAtion';
	stAtic reAdonly LABEL = nls.locAlize('nAvigAteToLAstEditLocAtion', "Go to LAst Edit LocAtion");

	constructor(id: string, lAbel: string, @IHistoryService privAte reAdonly historyService: IHistoryService) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.historyService.openLAstEditLocAtion();
	}
}

export clAss NAvigAteLAstAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.nAvigAteLAst';
	stAtic reAdonly LABEL = nls.locAlize('nAvigAteLAst', "Go LAst");

	constructor(id: string, lAbel: string, @IHistoryService privAte reAdonly historyService: IHistoryService) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.historyService.lAst();
	}
}

export clAss ReopenClosedEditorAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.reopenClosedEditor';
	stAtic reAdonly LABEL = nls.locAlize('reopenClosedEditor', "Reopen Closed Editor");

	constructor(
		id: string,
		lAbel: string,
		@IHistoryService privAte reAdonly historyService: IHistoryService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.historyService.reopenLAstClosedEditor();
	}
}

export clAss CleArRecentFilesAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.cleArRecentFiles';
	stAtic reAdonly LABEL = nls.locAlize('cleArRecentFiles', "CleAr Recently Opened");

	constructor(
		id: string,
		lAbel: string,
		@IWorkspAcesService privAte reAdonly workspAcesService: IWorkspAcesService,
		@IHistoryService privAte reAdonly historyService: IHistoryService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {

		// CleAr globAl recently opened
		this.workspAcesService.cleArRecentlyOpened();

		// CleAr workspAce specific recently opened
		this.historyService.cleArRecentlyOpened();
	}
}

export clAss ShowEditorsInActiveGroupByMostRecentlyUsedAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.showEditorsInActiveGroup';
	stAtic reAdonly LABEL = nls.locAlize('showEditorsInActiveGroup', "Show Editors in Active Group By Most Recently Used");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.quickInputService.quickAccess.show(ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX);
	}
}

export clAss ShowAllEditorsByAppeArAnceAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.showAllEditors';
	stAtic reAdonly LABEL = nls.locAlize('showAllEditors', "Show All Editors By AppeArAnce");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.quickInputService.quickAccess.show(AllEditorsByAppeArAnceQuickAccess.PREFIX);
	}
}

export clAss ShowAllEditorsByMostRecentlyUsedAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.showAllEditorsByMostRecentlyUsed';
	stAtic reAdonly LABEL = nls.locAlize('showAllEditorsByMostRecentlyUsed', "Show All Editors By Most Recently Used");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.quickInputService.quickAccess.show(AllEditorsByMostRecentlyUsedQuickAccess.PREFIX);
	}
}

export clAss BAseQuickAccessEditorAction extends Action {

	constructor(
		id: string,
		lAbel: string,
		privAte prefix: string,
		privAte itemActivAtion: ItemActivAtion | undefined,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const keybindings = this.keybindingService.lookupKeybindings(this.id);

		this.quickInputService.quickAccess.show(this.prefix, {
			quickNAvigAteConfigurAtion: { keybindings },
			itemActivAtion: this.itemActivAtion
		});
	}
}

export clAss QuickAccessPreviousRecentlyUsedEditorAction extends BAseQuickAccessEditorAction {

	stAtic reAdonly ID = 'workbench.Action.quickOpenPreviousRecentlyUsedEditor';
	stAtic reAdonly LABEL = nls.locAlize('quickOpenPreviousRecentlyUsedEditor', "Quick Open Previous Recently Used Editor");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IKeybindingService keybindingService: IKeybindingService
	) {
		super(id, lAbel, AllEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined, quickInputService, keybindingService);
	}
}

export clAss QuickAccessLeAstRecentlyUsedEditorAction extends BAseQuickAccessEditorAction {

	stAtic reAdonly ID = 'workbench.Action.quickOpenLeAstRecentlyUsedEditor';
	stAtic reAdonly LABEL = nls.locAlize('quickOpenLeAstRecentlyUsedEditor', "Quick Open LeAst Recently Used Editor");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IKeybindingService keybindingService: IKeybindingService
	) {
		super(id, lAbel, AllEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined, quickInputService, keybindingService);
	}
}

export clAss QuickAccessPreviousRecentlyUsedEditorInGroupAction extends BAseQuickAccessEditorAction {

	stAtic reAdonly ID = 'workbench.Action.quickOpenPreviousRecentlyUsedEditorInGroup';
	stAtic reAdonly LABEL = nls.locAlize('quickOpenPreviousRecentlyUsedEditorInGroup', "Quick Open Previous Recently Used Editor in Group");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IKeybindingService keybindingService: IKeybindingService
	) {
		super(id, lAbel, ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined, quickInputService, keybindingService);
	}
}

export clAss QuickAccessLeAstRecentlyUsedEditorInGroupAction extends BAseQuickAccessEditorAction {

	stAtic reAdonly ID = 'workbench.Action.quickOpenLeAstRecentlyUsedEditorInGroup';
	stAtic reAdonly LABEL = nls.locAlize('quickOpenLeAstRecentlyUsedEditorInGroup', "Quick Open LeAst Recently Used Editor in Group");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IKeybindingService keybindingService: IKeybindingService
	) {
		super(id, lAbel, ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX, ItemActivAtion.LAST, quickInputService, keybindingService);
	}
}

export clAss QuickAccessPreviousEditorFromHistoryAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.openPreviousEditorFromHistory';
	stAtic reAdonly LABEL = nls.locAlize('nAvigAteEditorHistoryByInput', "Quick Open Previous Editor from History");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const keybindings = this.keybindingService.lookupKeybindings(this.id);

		// Enforce to ActivAte the first item in quick Access if
		// the currently Active editor group hAs n editor opened
		let itemActivAtion: ItemActivAtion | undefined = undefined;
		if (this.editorGroupService.ActiveGroup.count === 0) {
			itemActivAtion = ItemActivAtion.FIRST;
		}

		this.quickInputService.quickAccess.show('', { quickNAvigAteConfigurAtion: { keybindings }, itemActivAtion });
	}
}

export clAss OpenNextRecentlyUsedEditorAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.openNextRecentlyUsedEditor';
	stAtic reAdonly LABEL = nls.locAlize('openNextRecentlyUsedEditor', "Open Next Recently Used Editor");

	constructor(
		id: string,
		lAbel: string,
		@IHistoryService privAte reAdonly historyService: IHistoryService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.historyService.openNextRecentlyUsedEditor();
	}
}

export clAss OpenPreviousRecentlyUsedEditorAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.openPreviousRecentlyUsedEditor';
	stAtic reAdonly LABEL = nls.locAlize('openPreviousRecentlyUsedEditor', "Open Previous Recently Used Editor");

	constructor(
		id: string,
		lAbel: string,
		@IHistoryService privAte reAdonly historyService: IHistoryService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.historyService.openPreviouslyUsedEditor();
	}
}

export clAss OpenNextRecentlyUsedEditorInGroupAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.openNextRecentlyUsedEditorInGroup';
	stAtic reAdonly LABEL = nls.locAlize('openNextRecentlyUsedEditorInGroup', "Open Next Recently Used Editor In Group");

	constructor(
		id: string,
		lAbel: string,
		@IHistoryService privAte reAdonly historyService: IHistoryService,
		@IEditorGroupsService privAte reAdonly editorGroupsService: IEditorGroupsService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.historyService.openNextRecentlyUsedEditor(this.editorGroupsService.ActiveGroup.id);
	}
}

export clAss OpenPreviousRecentlyUsedEditorInGroupAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.openPreviousRecentlyUsedEditorInGroup';
	stAtic reAdonly LABEL = nls.locAlize('openPreviousRecentlyUsedEditorInGroup', "Open Previous Recently Used Editor In Group");

	constructor(
		id: string,
		lAbel: string,
		@IHistoryService privAte reAdonly historyService: IHistoryService,
		@IEditorGroupsService privAte reAdonly editorGroupsService: IEditorGroupsService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.historyService.openPreviouslyUsedEditor(this.editorGroupsService.ActiveGroup.id);
	}
}

export clAss CleArEditorHistoryAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.cleArEditorHistory';
	stAtic reAdonly LABEL = nls.locAlize('cleArEditorHistory', "CleAr Editor History");

	constructor(
		id: string,
		lAbel: string,
		@IHistoryService privAte reAdonly historyService: IHistoryService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {

		// Editor history
		this.historyService.cleAr();
	}
}

export clAss MoveEditorLeftInGroupAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.moveEditorLeftInGroup';
	stAtic reAdonly LABEL = nls.locAlize('moveEditorLeft', "Move Editor Left");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commAndService, { to: 'left' } As ActiveEditorMoveArguments);
	}
}

export clAss MoveEditorRightInGroupAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.moveEditorRightInGroup';
	stAtic reAdonly LABEL = nls.locAlize('moveEditorRight', "Move Editor Right");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commAndService, { to: 'right' } As ActiveEditorMoveArguments);
	}
}

export clAss MoveEditorToPreviousGroupAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.moveEditorToPreviousGroup';
	stAtic reAdonly LABEL = nls.locAlize('moveEditorToPreviousGroup', "Move Editor into Previous Group");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commAndService, { to: 'previous', by: 'group' } As ActiveEditorMoveArguments);
	}
}

export clAss MoveEditorToNextGroupAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.moveEditorToNextGroup';
	stAtic reAdonly LABEL = nls.locAlize('moveEditorToNextGroup', "Move Editor into Next Group");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commAndService, { to: 'next', by: 'group' } As ActiveEditorMoveArguments);
	}
}

export clAss MoveEditorToAboveGroupAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.moveEditorToAboveGroup';
	stAtic reAdonly LABEL = nls.locAlize('moveEditorToAboveGroup', "Move Editor into Above Group");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commAndService, { to: 'up', by: 'group' } As ActiveEditorMoveArguments);
	}
}

export clAss MoveEditorToBelowGroupAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.moveEditorToBelowGroup';
	stAtic reAdonly LABEL = nls.locAlize('moveEditorToBelowGroup', "Move Editor into Below Group");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commAndService, { to: 'down', by: 'group' } As ActiveEditorMoveArguments);
	}
}

export clAss MoveEditorToLeftGroupAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.moveEditorToLeftGroup';
	stAtic reAdonly LABEL = nls.locAlize('moveEditorToLeftGroup', "Move Editor into Left Group");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commAndService, { to: 'left', by: 'group' } As ActiveEditorMoveArguments);
	}
}

export clAss MoveEditorToRightGroupAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.moveEditorToRightGroup';
	stAtic reAdonly LABEL = nls.locAlize('moveEditorToRightGroup', "Move Editor into Right Group");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commAndService, { to: 'right', by: 'group' } As ActiveEditorMoveArguments);
	}
}

export clAss MoveEditorToFirstGroupAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.moveEditorToFirstGroup';
	stAtic reAdonly LABEL = nls.locAlize('moveEditorToFirstGroup', "Move Editor into First Group");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commAndService, { to: 'first', by: 'group' } As ActiveEditorMoveArguments);
	}
}

export clAss MoveEditorToLAstGroupAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.moveEditorToLAstGroup';
	stAtic reAdonly LABEL = nls.locAlize('moveEditorToLAstGroup', "Move Editor into LAst Group");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commAndService, { to: 'lAst', by: 'group' } As ActiveEditorMoveArguments);
	}
}

export clAss EditorLAyoutSingleAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.editorLAyoutSingle';
	stAtic reAdonly LABEL = nls.locAlize('editorLAyoutSingle', "Single Column Editor LAyout");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commAndService, { groups: [{}] } As EditorGroupLAyout);
	}
}

export clAss EditorLAyoutTwoColumnsAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.editorLAyoutTwoColumns';
	stAtic reAdonly LABEL = nls.locAlize('editorLAyoutTwoColumns', "Two Columns Editor LAyout");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commAndService, { groups: [{}, {}], orientAtion: GroupOrientAtion.HORIZONTAL } As EditorGroupLAyout);
	}
}

export clAss EditorLAyoutThreeColumnsAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.editorLAyoutThreeColumns';
	stAtic reAdonly LABEL = nls.locAlize('editorLAyoutThreeColumns', "Three Columns Editor LAyout");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commAndService, { groups: [{}, {}, {}], orientAtion: GroupOrientAtion.HORIZONTAL } As EditorGroupLAyout);
	}
}

export clAss EditorLAyoutTwoRowsAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.editorLAyoutTwoRows';
	stAtic reAdonly LABEL = nls.locAlize('editorLAyoutTwoRows', "Two Rows Editor LAyout");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commAndService, { groups: [{}, {}], orientAtion: GroupOrientAtion.VERTICAL } As EditorGroupLAyout);
	}
}

export clAss EditorLAyoutThreeRowsAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.editorLAyoutThreeRows';
	stAtic reAdonly LABEL = nls.locAlize('editorLAyoutThreeRows', "Three Rows Editor LAyout");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commAndService, { groups: [{}, {}, {}], orientAtion: GroupOrientAtion.VERTICAL } As EditorGroupLAyout);
	}
}

export clAss EditorLAyoutTwoByTwoGridAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.editorLAyoutTwoByTwoGrid';
	stAtic reAdonly LABEL = nls.locAlize('editorLAyoutTwoByTwoGrid', "Grid Editor LAyout (2x2)");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commAndService, { groups: [{ groups: [{}, {}] }, { groups: [{}, {}] }] } As EditorGroupLAyout);
	}
}

export clAss EditorLAyoutTwoColumnsBottomAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.editorLAyoutTwoColumnsBottom';
	stAtic reAdonly LABEL = nls.locAlize('editorLAyoutTwoColumnsBottom', "Two Columns Bottom Editor LAyout");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commAndService, { groups: [{}, { groups: [{}, {}] }], orientAtion: GroupOrientAtion.VERTICAL } As EditorGroupLAyout);
	}
}

export clAss EditorLAyoutTwoRowsRightAction extends ExecuteCommAndAction {

	stAtic reAdonly ID = 'workbench.Action.editorLAyoutTwoRowsRight';
	stAtic reAdonly LABEL = nls.locAlize('editorLAyoutTwoRowsRight', "Two Rows Right Editor LAyout");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService commAndService: ICommAndService
	) {
		super(id, lAbel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commAndService, { groups: [{}, { groups: [{}, {}] }], orientAtion: GroupOrientAtion.HORIZONTAL } As EditorGroupLAyout);
	}
}

export clAss BAseCreAteEditorGroupAction extends Action {

	constructor(
		id: string,
		lAbel: string,
		privAte direction: GroupDirection,
		privAte editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.editorGroupService.AddGroup(this.editorGroupService.ActiveGroup, this.direction, { ActivAte: true });
	}
}

export clAss NewEditorGroupLeftAction extends BAseCreAteEditorGroupAction {

	stAtic reAdonly ID = 'workbench.Action.newGroupLeft';
	stAtic reAdonly LABEL = nls.locAlize('newEditorLeft', "New Editor Group to the Left");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, GroupDirection.LEFT, editorGroupService);
	}
}

export clAss NewEditorGroupRightAction extends BAseCreAteEditorGroupAction {

	stAtic reAdonly ID = 'workbench.Action.newGroupRight';
	stAtic reAdonly LABEL = nls.locAlize('newEditorRight', "New Editor Group to the Right");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, GroupDirection.RIGHT, editorGroupService);
	}
}

export clAss NewEditorGroupAboveAction extends BAseCreAteEditorGroupAction {

	stAtic reAdonly ID = 'workbench.Action.newGroupAbove';
	stAtic reAdonly LABEL = nls.locAlize('newEditorAbove', "New Editor Group Above");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, GroupDirection.UP, editorGroupService);
	}
}

export clAss NewEditorGroupBelowAction extends BAseCreAteEditorGroupAction {

	stAtic reAdonly ID = 'workbench.Action.newGroupBelow';
	stAtic reAdonly LABEL = nls.locAlize('newEditorBelow', "New Editor Group Below");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel, GroupDirection.DOWN, editorGroupService);
	}
}

export clAss ReopenResourcesAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.reopenWithEditor';
	stAtic reAdonly LABEL = nls.locAlize('workbench.Action.reopenWithEditor', "Reopen Editor With...");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const ActiveInput = this.editorService.ActiveEditor;
		if (!ActiveInput) {
			return;
		}

		const ActiveEditorPAne = this.editorService.ActiveEditorPAne;
		if (!ActiveEditorPAne) {
			return;
		}

		const options = ActiveEditorPAne.options;
		const group = ActiveEditorPAne.group;
		AwAit openEditorWith(ActiveInput, undefined, options, group, this.editorService, this.configurAtionService, this.quickInputService);
	}
}

export clAss ToggleEditorTypeAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.toggleEditorType';
	stAtic reAdonly LABEL = nls.locAlize('workbench.Action.toggleEditorType', "Toggle Editor Type");

	constructor(
		id: string,
		lAbel: string,
		@IEditorService privAte reAdonly editorService: IEditorService,
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const ActiveEditorPAne = this.editorService.ActiveEditorPAne;
		if (!ActiveEditorPAne) {
			return;
		}

		const ActiveEditorResource = ActiveEditorPAne.input.resource;
		if (!ActiveEditorResource) {
			return;
		}

		const options = ActiveEditorPAne.options;
		const group = ActiveEditorPAne.group;

		const overrides = getAllAvAilAbleEditors(ActiveEditorResource, undefined, options, group, this.editorService);
		const firstNonActiveOverride = overrides.find(([_, entry]) => !entry.Active);
		if (!firstNonActiveOverride) {
			return;
		}

		AwAit firstNonActiveOverride[0].open(ActiveEditorPAne.input, { ...options, override: firstNonActiveOverride[1].id }, group, OpenEditorContext.NEW_EDITOR)?.override;
	}
}
