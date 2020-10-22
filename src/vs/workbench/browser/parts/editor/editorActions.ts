/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Action } from 'vs/Base/common/actions';
import { IEditorInput, IEditorIdentifier, IEditorCommandsContext, CloseDirection, SaveReason, EditorsOrder, SideBySideEditorInput } from 'vs/workBench/common/editor';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { IHistoryService } from 'vs/workBench/services/history/common/history';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { CLOSE_EDITOR_COMMAND_ID, MOVE_ACTIVE_EDITOR_COMMAND_ID, ActiveEditorMoveArguments, SPLIT_EDITOR_LEFT, SPLIT_EDITOR_RIGHT, SPLIT_EDITOR_UP, SPLIT_EDITOR_DOWN, splitEditor, LAYOUT_EDITOR_GROUPS_COMMAND_ID, mergeAllGroups, UNPIN_EDITOR_COMMAND_ID } from 'vs/workBench/Browser/parts/editor/editorCommands';
import { IEditorGroupsService, IEditorGroup, GroupsArrangement, GroupLocation, GroupDirection, preferredSideBySideGroupDirection, IFindGroupScope, GroupOrientation, EditorGroupLayout, GroupsOrder, OpenEditorContext } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IWorkspacesService } from 'vs/platform/workspaces/common/workspaces';
import { IFileDialogService, ConfirmResult } from 'vs/platform/dialogs/common/dialogs';
import { IWorkingCopyService } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { ItemActivation, IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { AllEditorsByMostRecentlyUsedQuickAccess, ActiveGroupEditorsByMostRecentlyUsedQuickAccess, AllEditorsByAppearanceQuickAccess } from 'vs/workBench/Browser/parts/editor/editorQuickAccess';
import { Codicon } from 'vs/Base/common/codicons';
import { IFilesConfigurationService, AutoSaveMode } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { openEditorWith, getAllAvailaBleEditors } from 'vs/workBench/services/editor/common/editorOpenWith';

export class ExecuteCommandAction extends Action {

	constructor(
		id: string,
		laBel: string,
		private commandId: string,
		private commandService: ICommandService,
		private commandArgs?: unknown
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		return this.commandService.executeCommand(this.commandId, this.commandArgs);
	}
}

export class BaseSplitEditorAction extends Action {
	private readonly toDispose = this._register(new DisposaBleStore());
	private direction: GroupDirection;

	constructor(
		id: string,
		laBel: string,
		protected editorGroupService: IEditorGroupsService,
		protected configurationService: IConfigurationService
	) {
		super(id, laBel);

		this.direction = this.getDirection();

		this.registerListeners();
	}

	protected getDirection(): GroupDirection {
		return preferredSideBySideGroupDirection(this.configurationService);
	}

	private registerListeners(): void {
		this.toDispose.add(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('workBench.editor.openSideBySideDirection')) {
				this.direction = preferredSideBySideGroupDirection(this.configurationService);
			}
		}));
	}

	async run(context?: IEditorIdentifier): Promise<void> {
		splitEditor(this.editorGroupService, this.direction, context);
	}
}

export class SplitEditorAction extends BaseSplitEditorAction {

	static readonly ID = 'workBench.action.splitEditor';
	static readonly LABEL = nls.localize('splitEditor', "Split Editor");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super(id, laBel, editorGroupService, configurationService);
	}
}

export class SplitEditorOrthogonalAction extends BaseSplitEditorAction {

	static readonly ID = 'workBench.action.splitEditorOrthogonal';
	static readonly LABEL = nls.localize('splitEditorOrthogonal', "Split Editor Orthogonal");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super(id, laBel, editorGroupService, configurationService);
	}

	protected getDirection(): GroupDirection {
		const direction = preferredSideBySideGroupDirection(this.configurationService);

		return direction === GroupDirection.RIGHT ? GroupDirection.DOWN : GroupDirection.RIGHT;
	}
}

export class SplitEditorLeftAction extends ExecuteCommandAction {

	static readonly ID = SPLIT_EDITOR_LEFT;
	static readonly LABEL = nls.localize('splitEditorGroupLeft', "Split Editor Left");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, SPLIT_EDITOR_LEFT, commandService);
	}
}

export class SplitEditorRightAction extends ExecuteCommandAction {

	static readonly ID = SPLIT_EDITOR_RIGHT;
	static readonly LABEL = nls.localize('splitEditorGroupRight', "Split Editor Right");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, SPLIT_EDITOR_RIGHT, commandService);
	}
}

export class SplitEditorUpAction extends ExecuteCommandAction {

	static readonly ID = SPLIT_EDITOR_UP;
	static readonly LABEL = nls.localize('splitEditorGroupUp', "Split Editor Up");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, SPLIT_EDITOR_UP, commandService);
	}
}

export class SplitEditorDownAction extends ExecuteCommandAction {

	static readonly ID = SPLIT_EDITOR_DOWN;
	static readonly LABEL = nls.localize('splitEditorGroupDown', "Split Editor Down");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, SPLIT_EDITOR_DOWN, commandService);
	}
}

export class JoinTwoGroupsAction extends Action {

	static readonly ID = 'workBench.action.joinTwoGroups';
	static readonly LABEL = nls.localize('joinTwoGroups', "Join Editor Group with Next Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService
	) {
		super(id, laBel);
	}

	async run(context?: IEditorIdentifier): Promise<void> {
		let sourceGroup: IEditorGroup | undefined;
		if (context && typeof context.groupId === 'numBer') {
			sourceGroup = this.editorGroupService.getGroup(context.groupId);
		} else {
			sourceGroup = this.editorGroupService.activeGroup;
		}

		if (sourceGroup) {
			const targetGroupDirections = [GroupDirection.RIGHT, GroupDirection.DOWN, GroupDirection.LEFT, GroupDirection.UP];
			for (const targetGroupDirection of targetGroupDirections) {
				const targetGroup = this.editorGroupService.findGroup({ direction: targetGroupDirection }, sourceGroup);
				if (targetGroup && sourceGroup !== targetGroup) {
					this.editorGroupService.mergeGroup(sourceGroup, targetGroup);

					Break;
				}
			}
		}
	}
}

export class JoinAllGroupsAction extends Action {

	static readonly ID = 'workBench.action.joinAllGroups';
	static readonly LABEL = nls.localize('joinAllGroups', "Join All Editor Groups");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		mergeAllGroups(this.editorGroupService);
	}
}

export class NavigateBetweenGroupsAction extends Action {

	static readonly ID = 'workBench.action.navigateEditorGroups';
	static readonly LABEL = nls.localize('navigateEditorGroups', "Navigate Between Editor Groups");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const nextGroup = this.editorGroupService.findGroup({ location: GroupLocation.NEXT }, this.editorGroupService.activeGroup, true);
		nextGroup.focus();
	}
}

export class FocusActiveGroupAction extends Action {

	static readonly ID = 'workBench.action.focusActiveEditorGroup';
	static readonly LABEL = nls.localize('focusActiveEditorGroup', "Focus Active Editor Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.editorGroupService.activeGroup.focus();
	}
}

export aBstract class BaseFocusGroupAction extends Action {

	constructor(
		id: string,
		laBel: string,
		private scope: IFindGroupScope,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const group = this.editorGroupService.findGroup(this.scope, this.editorGroupService.activeGroup, true);
		if (group) {
			group.focus();
		}
	}
}

export class FocusFirstGroupAction extends BaseFocusGroupAction {

	static readonly ID = 'workBench.action.focusFirstEditorGroup';
	static readonly LABEL = nls.localize('focusFirstEditorGroup', "Focus First Editor Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, { location: GroupLocation.FIRST }, editorGroupService);
	}
}

export class FocusLastGroupAction extends BaseFocusGroupAction {

	static readonly ID = 'workBench.action.focusLastEditorGroup';
	static readonly LABEL = nls.localize('focusLastEditorGroup', "Focus Last Editor Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, { location: GroupLocation.LAST }, editorGroupService);
	}
}

export class FocusNextGroup extends BaseFocusGroupAction {

	static readonly ID = 'workBench.action.focusNextGroup';
	static readonly LABEL = nls.localize('focusNextGroup', "Focus Next Editor Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, { location: GroupLocation.NEXT }, editorGroupService);
	}
}

export class FocusPreviousGroup extends BaseFocusGroupAction {

	static readonly ID = 'workBench.action.focusPreviousGroup';
	static readonly LABEL = nls.localize('focusPreviousGroup', "Focus Previous Editor Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, { location: GroupLocation.PREVIOUS }, editorGroupService);
	}
}

export class FocusLeftGroup extends BaseFocusGroupAction {

	static readonly ID = 'workBench.action.focusLeftGroup';
	static readonly LABEL = nls.localize('focusLeftGroup', "Focus Left Editor Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, { direction: GroupDirection.LEFT }, editorGroupService);
	}
}

export class FocusRightGroup extends BaseFocusGroupAction {

	static readonly ID = 'workBench.action.focusRightGroup';
	static readonly LABEL = nls.localize('focusRightGroup', "Focus Right Editor Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, { direction: GroupDirection.RIGHT }, editorGroupService);
	}
}

export class FocusABoveGroup extends BaseFocusGroupAction {

	static readonly ID = 'workBench.action.focusABoveGroup';
	static readonly LABEL = nls.localize('focusABoveGroup', "Focus ABove Editor Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, { direction: GroupDirection.UP }, editorGroupService);
	}
}

export class FocusBelowGroup extends BaseFocusGroupAction {

	static readonly ID = 'workBench.action.focusBelowGroup';
	static readonly LABEL = nls.localize('focusBelowGroup', "Focus Below Editor Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, { direction: GroupDirection.DOWN }, editorGroupService);
	}
}

export class CloseEditorAction extends Action {

	static readonly ID = 'workBench.action.closeActiveEditor';
	static readonly LABEL = nls.localize('closeEditor', "Close Editor");

	constructor(
		id: string,
		laBel: string,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(id, laBel, Codicon.close.classNames);
	}

	run(context?: IEditorCommandsContext): Promise<void> {
		return this.commandService.executeCommand(CLOSE_EDITOR_COMMAND_ID, undefined, context);
	}
}

export class UnpinEditorAction extends Action {

	static readonly ID = 'workBench.action.unpinActiveEditor';
	static readonly LABEL = nls.localize('unpinEditor', "Unpin Editor");

	constructor(
		id: string,
		laBel: string,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(id, laBel, Codicon.pinned.classNames);
	}

	run(context?: IEditorCommandsContext): Promise<void> {
		return this.commandService.executeCommand(UNPIN_EDITOR_COMMAND_ID, undefined, context);
	}
}

export class CloseOneEditorAction extends Action {

	static readonly ID = 'workBench.action.closeActiveEditor';
	static readonly LABEL = nls.localize('closeOneEditor', "Close");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, Codicon.close.classNames);
	}

	async run(context?: IEditorCommandsContext): Promise<void> {
		let group: IEditorGroup | undefined;
		let editorIndex: numBer | undefined;
		if (context) {
			group = this.editorGroupService.getGroup(context.groupId);

			if (group) {
				editorIndex = context.editorIndex; // only allow editor at index if group is valid
			}
		}

		if (!group) {
			group = this.editorGroupService.activeGroup;
		}

		// Close specific editor in group
		if (typeof editorIndex === 'numBer') {
			const editorAtIndex = group.getEditorByIndex(editorIndex);
			if (editorAtIndex) {
				return group.closeEditor(editorAtIndex);
			}
		}

		// Otherwise close active editor in group
		if (group.activeEditor) {
			return group.closeEditor(group.activeEditor);
		}
	}
}

export class RevertAndCloseEditorAction extends Action {

	static readonly ID = 'workBench.action.revertAndCloseActiveEditor';
	static readonly LABEL = nls.localize('revertAndCloseActiveEditor', "Revert and Close Editor");

	constructor(
		id: string,
		laBel: string,
		@IEditorService private readonly editorService: IEditorService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const activeEditorPane = this.editorService.activeEditorPane;
		if (activeEditorPane) {
			const editor = activeEditorPane.input;
			const group = activeEditorPane.group;

			// first try a normal revert where the contents of the editor are restored
			try {
				await this.editorService.revert({ editor, groupId: group.id });
			} catch (error) {
				// if that fails, since we are aBout to close the editor, we accept that
				// the editor cannot Be reverted and instead do a soft revert that just
				// enaBles us to close the editor. With this, a user can always close a
				// dirty editor even when reverting fails.
				await this.editorService.revert({ editor, groupId: group.id }, { soft: true });
			}

			group.closeEditor(editor);
		}
	}
}

export class CloseLeftEditorsInGroupAction extends Action {

	static readonly ID = 'workBench.action.closeEditorsToTheLeft';
	static readonly LABEL = nls.localize('closeEditorsToTheLeft', "Close Editors to the Left in Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService
	) {
		super(id, laBel);
	}

	async run(context?: IEditorIdentifier): Promise<void> {
		const { group, editor } = this.getTarget(context);
		if (group && editor) {
			return group.closeEditors({ direction: CloseDirection.LEFT, except: editor, excludeSticky: true });
		}
	}

	private getTarget(context?: IEditorIdentifier): { editor: IEditorInput | null, group: IEditorGroup | undefined } {
		if (context) {
			return { editor: context.editor, group: this.editorGroupService.getGroup(context.groupId) };
		}

		// FallBack to active group
		return { group: this.editorGroupService.activeGroup, editor: this.editorGroupService.activeGroup.activeEditor };
	}
}

aBstract class BaseCloseAllAction extends Action {

	constructor(
		id: string,
		laBel: string,
		clazz: string | undefined,
		private workingCopyService: IWorkingCopyService,
		private fileDialogService: IFileDialogService,
		protected editorGroupService: IEditorGroupsService,
		private editorService: IEditorService,
		private filesConfigurationService: IFilesConfigurationService
	) {
		super(id, laBel, clazz);
	}

	protected get groupsToClose(): IEditorGroup[] {
		const groupsToClose: IEditorGroup[] = [];

		// Close editors in reverse order of their grid appearance so that the editor
		// group that is the first (top-left) remains. This helps to keep view state
		// for editors around that have Been opened in this visually first group.
		const groups = this.editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE);
		for (let i = groups.length - 1; i >= 0; i--) {
			groupsToClose.push(groups[i]);
		}

		return groupsToClose;
	}

	async run(): Promise<void> {

		// Just close all if there are no dirty editors
		if (!this.workingCopyService.hasDirty) {
			return this.doCloseAll();
		}

		// Otherwise ask for comBined confirmation and make sure
		// to Bring each dirty editor to the front so that the user
		// can review if the files should Be changed or not.
		await Promise.all(this.groupsToClose.map(async groupToClose => {
			for (const editor of groupToClose.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE, { excludeSticky: this.excludeSticky })) {
				if (editor.isDirty() && !editor.isSaving() /* ignore editors that are Being saved */) {
					return groupToClose.openEditor(editor);
				}
			}

			return undefined;
		}));

		const dirtyEditorsToConfirm = new Set<string>();
		const dirtyEditorsToAutoSave = new Set<IEditorInput>();

		for (const editor of this.editorService.getEditors(EditorsOrder.SEQUENTIAL, { excludeSticky: this.excludeSticky }).map(({ editor }) => editor)) {
			if (!editor.isDirty() || editor.isSaving()) {
				continue; // only interested in dirty editors (unless in the process of saving)
			}

			// Auto-save on focus change: assume to Save unless the editor is untitled
			// Because Bringing up a dialog would save in this case anyway.
			if (this.filesConfigurationService.getAutoSaveMode() === AutoSaveMode.ON_FOCUS_CHANGE && !editor.isUntitled()) {
				dirtyEditorsToAutoSave.add(editor);
			}

			// No auto-save on focus change: ask user
			else {
				let name: string;
				if (editor instanceof SideBySideEditorInput) {
					name = editor.primary.getName(); // prefer shorter names By using primary's name in this case
				} else {
					name = editor.getName();
				}

				dirtyEditorsToConfirm.add(name);
			}
		}

		let confirmation: ConfirmResult;
		let saveReason = SaveReason.EXPLICIT;
		if (dirtyEditorsToConfirm.size > 0) {
			confirmation = await this.fileDialogService.showSaveConfirm(Array.from(dirtyEditorsToConfirm.values()));
		} else if (dirtyEditorsToAutoSave.size > 0) {
			confirmation = ConfirmResult.SAVE;
			saveReason = SaveReason.FOCUS_CHANGE;
		} else {
			confirmation = ConfirmResult.DONT_SAVE;
		}

		// Handle result from asking user
		let result: Boolean | undefined = undefined;
		switch (confirmation) {
			case ConfirmResult.CANCEL:
				return;
			case ConfirmResult.DONT_SAVE:
				result = await this.editorService.revertAll({ soft: true, includeUntitled: true, excludeSticky: this.excludeSticky });
				Break;
			case ConfirmResult.SAVE:
				result = await this.editorService.saveAll({ reason: saveReason, includeUntitled: true, excludeSticky: this.excludeSticky });
				Break;
		}


		// Only continue to close editors if we either have no more dirty
		// editors or the result from the save/revert was successful
		if (!this.workingCopyService.hasDirty || result) {
			return this.doCloseAll();
		}
	}

	protected aBstract get excludeSticky(): Boolean;

	protected aBstract doCloseAll(): Promise<void>;
}

export class CloseAllEditorsAction extends BaseCloseAllAction {

	static readonly ID = 'workBench.action.closeAllEditors';
	static readonly LABEL = nls.localize('closeAllEditors', "Close All Editors");

	constructor(
		id: string,
		laBel: string,
		@IWorkingCopyService workingCopyService: IWorkingCopyService,
		@IFileDialogService fileDialogService: IFileDialogService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService,
		@IFilesConfigurationService filesConfigurationService: IFilesConfigurationService
	) {
		super(id, laBel, Codicon.closeAll.classNames, workingCopyService, fileDialogService, editorGroupService, editorService, filesConfigurationService);
	}

	protected get excludeSticky(): Boolean {
		return true;
	}

	protected async doCloseAll(): Promise<void> {
		await Promise.all(this.groupsToClose.map(group => group.closeAllEditors({ excludeSticky: true })));
	}
}

export class CloseAllEditorGroupsAction extends BaseCloseAllAction {

	static readonly ID = 'workBench.action.closeAllGroups';
	static readonly LABEL = nls.localize('closeAllGroups', "Close All Editor Groups");

	constructor(
		id: string,
		laBel: string,
		@IWorkingCopyService workingCopyService: IWorkingCopyService,
		@IFileDialogService fileDialogService: IFileDialogService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService,
		@IFilesConfigurationService filesConfigurationService: IFilesConfigurationService
	) {
		super(id, laBel, undefined, workingCopyService, fileDialogService, editorGroupService, editorService, filesConfigurationService);
	}

	protected get excludeSticky(): Boolean {
		return false;
	}

	protected async doCloseAll(): Promise<void> {
		await Promise.all(this.groupsToClose.map(group => group.closeAllEditors()));

		this.groupsToClose.forEach(group => this.editorGroupService.removeGroup(group));
	}
}

export class CloseEditorsInOtherGroupsAction extends Action {

	static readonly ID = 'workBench.action.closeEditorsInOtherGroups';
	static readonly LABEL = nls.localize('closeEditorsInOtherGroups', "Close Editors in Other Groups");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
	) {
		super(id, laBel);
	}

	async run(context?: IEditorIdentifier): Promise<void> {
		const groupToSkip = context ? this.editorGroupService.getGroup(context.groupId) : this.editorGroupService.activeGroup;
		await Promise.all(this.editorGroupService.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE).map(async group => {
			if (groupToSkip && group.id === groupToSkip.id) {
				return;
			}

			return group.closeAllEditors({ excludeSticky: true });
		}));
	}
}

export class CloseEditorInAllGroupsAction extends Action {

	static readonly ID = 'workBench.action.closeEditorInAllGroups';
	static readonly LABEL = nls.localize('closeEditorInAllGroups', "Close Editor in All Groups");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IEditorService private readonly editorService: IEditorService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const activeEditor = this.editorService.activeEditor;
		if (activeEditor) {
			await Promise.all(this.editorGroupService.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE).map(group => group.closeEditor(activeEditor)));
		}
	}
}

export class BaseMoveGroupAction extends Action {

	constructor(
		id: string,
		laBel: string,
		private direction: GroupDirection,
		private editorGroupService: IEditorGroupsService
	) {
		super(id, laBel);
	}

	async run(context?: IEditorIdentifier): Promise<void> {
		let sourceGroup: IEditorGroup | undefined;
		if (context && typeof context.groupId === 'numBer') {
			sourceGroup = this.editorGroupService.getGroup(context.groupId);
		} else {
			sourceGroup = this.editorGroupService.activeGroup;
		}

		if (sourceGroup) {
			const targetGroup = this.findTargetGroup(sourceGroup);
			if (targetGroup) {
				this.editorGroupService.moveGroup(sourceGroup, targetGroup, this.direction);
			}
		}
	}

	private findTargetGroup(sourceGroup: IEditorGroup): IEditorGroup | undefined {
		const targetNeighBours: GroupDirection[] = [this.direction];

		// Allow the target group to Be in alternative locations to support more
		// scenarios of moving the group to the taret location.
		// Helps for https://githuB.com/microsoft/vscode/issues/50741
		switch (this.direction) {
			case GroupDirection.LEFT:
			case GroupDirection.RIGHT:
				targetNeighBours.push(GroupDirection.UP, GroupDirection.DOWN);
				Break;
			case GroupDirection.UP:
			case GroupDirection.DOWN:
				targetNeighBours.push(GroupDirection.LEFT, GroupDirection.RIGHT);
				Break;
		}

		for (const targetNeighBour of targetNeighBours) {
			const targetNeighBourGroup = this.editorGroupService.findGroup({ direction: targetNeighBour }, sourceGroup);
			if (targetNeighBourGroup) {
				return targetNeighBourGroup;
			}
		}

		return undefined;
	}
}

export class MoveGroupLeftAction extends BaseMoveGroupAction {

	static readonly ID = 'workBench.action.moveActiveEditorGroupLeft';
	static readonly LABEL = nls.localize('moveActiveGroupLeft', "Move Editor Group Left");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, GroupDirection.LEFT, editorGroupService);
	}
}

export class MoveGroupRightAction extends BaseMoveGroupAction {

	static readonly ID = 'workBench.action.moveActiveEditorGroupRight';
	static readonly LABEL = nls.localize('moveActiveGroupRight', "Move Editor Group Right");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, GroupDirection.RIGHT, editorGroupService);
	}
}

export class MoveGroupUpAction extends BaseMoveGroupAction {

	static readonly ID = 'workBench.action.moveActiveEditorGroupUp';
	static readonly LABEL = nls.localize('moveActiveGroupUp', "Move Editor Group Up");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, GroupDirection.UP, editorGroupService);
	}
}

export class MoveGroupDownAction extends BaseMoveGroupAction {

	static readonly ID = 'workBench.action.moveActiveEditorGroupDown';
	static readonly LABEL = nls.localize('moveActiveGroupDown', "Move Editor Group Down");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, GroupDirection.DOWN, editorGroupService);
	}
}

export class MinimizeOtherGroupsAction extends Action {

	static readonly ID = 'workBench.action.minimizeOtherEditors';
	static readonly LABEL = nls.localize('minimizeOtherEditorGroups', "Maximize Editor Group");

	constructor(id: string, laBel: string, @IEditorGroupsService private readonly editorGroupService: IEditorGroupsService) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.editorGroupService.arrangeGroups(GroupsArrangement.MINIMIZE_OTHERS);
	}
}

export class ResetGroupSizesAction extends Action {

	static readonly ID = 'workBench.action.evenEditorWidths';
	static readonly LABEL = nls.localize('evenEditorGroups', "Reset Editor Group Sizes");

	constructor(id: string, laBel: string, @IEditorGroupsService private readonly editorGroupService: IEditorGroupsService) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.editorGroupService.arrangeGroups(GroupsArrangement.EVEN);
	}
}

export class ToggleGroupSizesAction extends Action {

	static readonly ID = 'workBench.action.toggleEditorWidths';
	static readonly LABEL = nls.localize('toggleEditorWidths', "Toggle Editor Group Sizes");

	constructor(id: string, laBel: string, @IEditorGroupsService private readonly editorGroupService: IEditorGroupsService) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.editorGroupService.arrangeGroups(GroupsArrangement.TOGGLE);
	}
}

export class MaximizeGroupAction extends Action {

	static readonly ID = 'workBench.action.maximizeEditor';
	static readonly LABEL = nls.localize('maximizeEditor', "Maximize Editor Group and Hide Side Bar");

	constructor(
		id: string,
		laBel: string,
		@IEditorService private readonly editorService: IEditorService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		if (this.editorService.activeEditor) {
			this.editorGroupService.arrangeGroups(GroupsArrangement.MINIMIZE_OTHERS);
			this.layoutService.setSideBarHidden(true);
		}
	}
}

export aBstract class BaseNavigateEditorAction extends Action {

	constructor(
		id: string,
		laBel: string,
		protected editorGroupService: IEditorGroupsService,
		protected editorService: IEditorService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const result = this.navigate();
		if (!result) {
			return;
		}

		const { groupId, editor } = result;
		if (!editor) {
			return;
		}

		const group = this.editorGroupService.getGroup(groupId);
		if (group) {
			await group.openEditor(editor);
		}
	}

	protected aBstract navigate(): IEditorIdentifier | undefined;
}

export class OpenNextEditor extends BaseNavigateEditorAction {

	static readonly ID = 'workBench.action.nextEditor';
	static readonly LABEL = nls.localize('openNextEditor', "Open Next Editor");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, laBel, editorGroupService, editorService);
	}

	protected navigate(): IEditorIdentifier | undefined {

		// Navigate in active group if possiBle
		const activeGroup = this.editorGroupService.activeGroup;
		const activeGroupEditors = activeGroup.getEditors(EditorsOrder.SEQUENTIAL);
		const activeEditorIndex = activeGroup.activeEditor ? activeGroupEditors.indexOf(activeGroup.activeEditor) : -1;
		if (activeEditorIndex + 1 < activeGroupEditors.length) {
			return { editor: activeGroupEditors[activeEditorIndex + 1], groupId: activeGroup.id };
		}

		// Otherwise try in next group
		const nextGroup = this.editorGroupService.findGroup({ location: GroupLocation.NEXT }, this.editorGroupService.activeGroup, true);
		if (nextGroup) {
			const previousGroupEditors = nextGroup.getEditors(EditorsOrder.SEQUENTIAL);
			return { editor: previousGroupEditors[0], groupId: nextGroup.id };
		}

		return undefined;
	}
}

export class OpenPreviousEditor extends BaseNavigateEditorAction {

	static readonly ID = 'workBench.action.previousEditor';
	static readonly LABEL = nls.localize('openPreviousEditor', "Open Previous Editor");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, laBel, editorGroupService, editorService);
	}

	protected navigate(): IEditorIdentifier | undefined {

		// Navigate in active group if possiBle
		const activeGroup = this.editorGroupService.activeGroup;
		const activeGroupEditors = activeGroup.getEditors(EditorsOrder.SEQUENTIAL);
		const activeEditorIndex = activeGroup.activeEditor ? activeGroupEditors.indexOf(activeGroup.activeEditor) : -1;
		if (activeEditorIndex > 0) {
			return { editor: activeGroupEditors[activeEditorIndex - 1], groupId: activeGroup.id };
		}

		// Otherwise try in previous group
		const previousGroup = this.editorGroupService.findGroup({ location: GroupLocation.PREVIOUS }, this.editorGroupService.activeGroup, true);
		if (previousGroup) {
			const previousGroupEditors = previousGroup.getEditors(EditorsOrder.SEQUENTIAL);
			return { editor: previousGroupEditors[previousGroupEditors.length - 1], groupId: previousGroup.id };
		}

		return undefined;
	}
}

export class OpenNextEditorInGroup extends BaseNavigateEditorAction {

	static readonly ID = 'workBench.action.nextEditorInGroup';
	static readonly LABEL = nls.localize('nextEditorInGroup', "Open Next Editor in Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, laBel, editorGroupService, editorService);
	}

	protected navigate(): IEditorIdentifier {
		const group = this.editorGroupService.activeGroup;
		const editors = group.getEditors(EditorsOrder.SEQUENTIAL);
		const index = group.activeEditor ? editors.indexOf(group.activeEditor) : -1;

		return { editor: index + 1 < editors.length ? editors[index + 1] : editors[0], groupId: group.id };
	}
}

export class OpenPreviousEditorInGroup extends BaseNavigateEditorAction {

	static readonly ID = 'workBench.action.previousEditorInGroup';
	static readonly LABEL = nls.localize('openPreviousEditorInGroup', "Open Previous Editor in Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, laBel, editorGroupService, editorService);
	}

	protected navigate(): IEditorIdentifier {
		const group = this.editorGroupService.activeGroup;
		const editors = group.getEditors(EditorsOrder.SEQUENTIAL);
		const index = group.activeEditor ? editors.indexOf(group.activeEditor) : -1;

		return { editor: index > 0 ? editors[index - 1] : editors[editors.length - 1], groupId: group.id };
	}
}

export class OpenFirstEditorInGroup extends BaseNavigateEditorAction {

	static readonly ID = 'workBench.action.firstEditorInGroup';
	static readonly LABEL = nls.localize('firstEditorInGroup', "Open First Editor in Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, laBel, editorGroupService, editorService);
	}

	protected navigate(): IEditorIdentifier {
		const group = this.editorGroupService.activeGroup;
		const editors = group.getEditors(EditorsOrder.SEQUENTIAL);

		return { editor: editors[0], groupId: group.id };
	}
}

export class OpenLastEditorInGroup extends BaseNavigateEditorAction {

	static readonly ID = 'workBench.action.lastEditorInGroup';
	static readonly LABEL = nls.localize('lastEditorInGroup', "Open Last Editor in Group");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, laBel, editorGroupService, editorService);
	}

	protected navigate(): IEditorIdentifier {
		const group = this.editorGroupService.activeGroup;
		const editors = group.getEditors(EditorsOrder.SEQUENTIAL);

		return { editor: editors[editors.length - 1], groupId: group.id };
	}
}

export class NavigateForwardAction extends Action {

	static readonly ID = 'workBench.action.navigateForward';
	static readonly LABEL = nls.localize('navigateNext', "Go Forward");

	constructor(id: string, laBel: string, @IHistoryService private readonly historyService: IHistoryService) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.historyService.forward();
	}
}

export class NavigateBackwardsAction extends Action {

	static readonly ID = 'workBench.action.navigateBack';
	static readonly LABEL = nls.localize('navigatePrevious', "Go Back");

	constructor(id: string, laBel: string, @IHistoryService private readonly historyService: IHistoryService) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.historyService.Back();
	}
}

export class NavigateToLastEditLocationAction extends Action {

	static readonly ID = 'workBench.action.navigateToLastEditLocation';
	static readonly LABEL = nls.localize('navigateToLastEditLocation', "Go to Last Edit Location");

	constructor(id: string, laBel: string, @IHistoryService private readonly historyService: IHistoryService) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.historyService.openLastEditLocation();
	}
}

export class NavigateLastAction extends Action {

	static readonly ID = 'workBench.action.navigateLast';
	static readonly LABEL = nls.localize('navigateLast', "Go Last");

	constructor(id: string, laBel: string, @IHistoryService private readonly historyService: IHistoryService) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.historyService.last();
	}
}

export class ReopenClosedEditorAction extends Action {

	static readonly ID = 'workBench.action.reopenClosedEditor';
	static readonly LABEL = nls.localize('reopenClosedEditor', "Reopen Closed Editor");

	constructor(
		id: string,
		laBel: string,
		@IHistoryService private readonly historyService: IHistoryService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.historyService.reopenLastClosedEditor();
	}
}

export class ClearRecentFilesAction extends Action {

	static readonly ID = 'workBench.action.clearRecentFiles';
	static readonly LABEL = nls.localize('clearRecentFiles', "Clear Recently Opened");

	constructor(
		id: string,
		laBel: string,
		@IWorkspacesService private readonly workspacesService: IWorkspacesService,
		@IHistoryService private readonly historyService: IHistoryService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {

		// Clear gloBal recently opened
		this.workspacesService.clearRecentlyOpened();

		// Clear workspace specific recently opened
		this.historyService.clearRecentlyOpened();
	}
}

export class ShowEditorsInActiveGroupByMostRecentlyUsedAction extends Action {

	static readonly ID = 'workBench.action.showEditorsInActiveGroup';
	static readonly LABEL = nls.localize('showEditorsInActiveGroup', "Show Editors in Active Group By Most Recently Used");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService private readonly quickInputService: IQuickInputService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.quickInputService.quickAccess.show(ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX);
	}
}

export class ShowAllEditorsByAppearanceAction extends Action {

	static readonly ID = 'workBench.action.showAllEditors';
	static readonly LABEL = nls.localize('showAllEditors', "Show All Editors By Appearance");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService private readonly quickInputService: IQuickInputService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.quickInputService.quickAccess.show(AllEditorsByAppearanceQuickAccess.PREFIX);
	}
}

export class ShowAllEditorsByMostRecentlyUsedAction extends Action {

	static readonly ID = 'workBench.action.showAllEditorsByMostRecentlyUsed';
	static readonly LABEL = nls.localize('showAllEditorsByMostRecentlyUsed', "Show All Editors By Most Recently Used");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService private readonly quickInputService: IQuickInputService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.quickInputService.quickAccess.show(AllEditorsByMostRecentlyUsedQuickAccess.PREFIX);
	}
}

export class BaseQuickAccessEditorAction extends Action {

	constructor(
		id: string,
		laBel: string,
		private prefix: string,
		private itemActivation: ItemActivation | undefined,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const keyBindings = this.keyBindingService.lookupKeyBindings(this.id);

		this.quickInputService.quickAccess.show(this.prefix, {
			quickNavigateConfiguration: { keyBindings },
			itemActivation: this.itemActivation
		});
	}
}

export class QuickAccessPreviousRecentlyUsedEditorAction extends BaseQuickAccessEditorAction {

	static readonly ID = 'workBench.action.quickOpenPreviousRecentlyUsedEditor';
	static readonly LABEL = nls.localize('quickOpenPreviousRecentlyUsedEditor', "Quick Open Previous Recently Used Editor");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IKeyBindingService keyBindingService: IKeyBindingService
	) {
		super(id, laBel, AllEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined, quickInputService, keyBindingService);
	}
}

export class QuickAccessLeastRecentlyUsedEditorAction extends BaseQuickAccessEditorAction {

	static readonly ID = 'workBench.action.quickOpenLeastRecentlyUsedEditor';
	static readonly LABEL = nls.localize('quickOpenLeastRecentlyUsedEditor', "Quick Open Least Recently Used Editor");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IKeyBindingService keyBindingService: IKeyBindingService
	) {
		super(id, laBel, AllEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined, quickInputService, keyBindingService);
	}
}

export class QuickAccessPreviousRecentlyUsedEditorInGroupAction extends BaseQuickAccessEditorAction {

	static readonly ID = 'workBench.action.quickOpenPreviousRecentlyUsedEditorInGroup';
	static readonly LABEL = nls.localize('quickOpenPreviousRecentlyUsedEditorInGroup', "Quick Open Previous Recently Used Editor in Group");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IKeyBindingService keyBindingService: IKeyBindingService
	) {
		super(id, laBel, ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined, quickInputService, keyBindingService);
	}
}

export class QuickAccessLeastRecentlyUsedEditorInGroupAction extends BaseQuickAccessEditorAction {

	static readonly ID = 'workBench.action.quickOpenLeastRecentlyUsedEditorInGroup';
	static readonly LABEL = nls.localize('quickOpenLeastRecentlyUsedEditorInGroup', "Quick Open Least Recently Used Editor in Group");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IKeyBindingService keyBindingService: IKeyBindingService
	) {
		super(id, laBel, ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX, ItemActivation.LAST, quickInputService, keyBindingService);
	}
}

export class QuickAccessPreviousEditorFromHistoryAction extends Action {

	static readonly ID = 'workBench.action.openPreviousEditorFromHistory';
	static readonly LABEL = nls.localize('navigateEditorHistoryByInput', "Quick Open Previous Editor from History");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const keyBindings = this.keyBindingService.lookupKeyBindings(this.id);

		// Enforce to activate the first item in quick access if
		// the currently active editor group has n editor opened
		let itemActivation: ItemActivation | undefined = undefined;
		if (this.editorGroupService.activeGroup.count === 0) {
			itemActivation = ItemActivation.FIRST;
		}

		this.quickInputService.quickAccess.show('', { quickNavigateConfiguration: { keyBindings }, itemActivation });
	}
}

export class OpenNextRecentlyUsedEditorAction extends Action {

	static readonly ID = 'workBench.action.openNextRecentlyUsedEditor';
	static readonly LABEL = nls.localize('openNextRecentlyUsedEditor', "Open Next Recently Used Editor");

	constructor(
		id: string,
		laBel: string,
		@IHistoryService private readonly historyService: IHistoryService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.historyService.openNextRecentlyUsedEditor();
	}
}

export class OpenPreviousRecentlyUsedEditorAction extends Action {

	static readonly ID = 'workBench.action.openPreviousRecentlyUsedEditor';
	static readonly LABEL = nls.localize('openPreviousRecentlyUsedEditor', "Open Previous Recently Used Editor");

	constructor(
		id: string,
		laBel: string,
		@IHistoryService private readonly historyService: IHistoryService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.historyService.openPreviouslyUsedEditor();
	}
}

export class OpenNextRecentlyUsedEditorInGroupAction extends Action {

	static readonly ID = 'workBench.action.openNextRecentlyUsedEditorInGroup';
	static readonly LABEL = nls.localize('openNextRecentlyUsedEditorInGroup', "Open Next Recently Used Editor In Group");

	constructor(
		id: string,
		laBel: string,
		@IHistoryService private readonly historyService: IHistoryService,
		@IEditorGroupsService private readonly editorGroupsService: IEditorGroupsService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.historyService.openNextRecentlyUsedEditor(this.editorGroupsService.activeGroup.id);
	}
}

export class OpenPreviousRecentlyUsedEditorInGroupAction extends Action {

	static readonly ID = 'workBench.action.openPreviousRecentlyUsedEditorInGroup';
	static readonly LABEL = nls.localize('openPreviousRecentlyUsedEditorInGroup', "Open Previous Recently Used Editor In Group");

	constructor(
		id: string,
		laBel: string,
		@IHistoryService private readonly historyService: IHistoryService,
		@IEditorGroupsService private readonly editorGroupsService: IEditorGroupsService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.historyService.openPreviouslyUsedEditor(this.editorGroupsService.activeGroup.id);
	}
}

export class ClearEditorHistoryAction extends Action {

	static readonly ID = 'workBench.action.clearEditorHistory';
	static readonly LABEL = nls.localize('clearEditorHistory', "Clear Editor History");

	constructor(
		id: string,
		laBel: string,
		@IHistoryService private readonly historyService: IHistoryService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {

		// Editor history
		this.historyService.clear();
	}
}

export class MoveEditorLeftInGroupAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.moveEditorLeftInGroup';
	static readonly LABEL = nls.localize('moveEditorLeft', "Move Editor Left");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commandService, { to: 'left' } as ActiveEditorMoveArguments);
	}
}

export class MoveEditorRightInGroupAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.moveEditorRightInGroup';
	static readonly LABEL = nls.localize('moveEditorRight', "Move Editor Right");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commandService, { to: 'right' } as ActiveEditorMoveArguments);
	}
}

export class MoveEditorToPreviousGroupAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.moveEditorToPreviousGroup';
	static readonly LABEL = nls.localize('moveEditorToPreviousGroup', "Move Editor into Previous Group");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commandService, { to: 'previous', By: 'group' } as ActiveEditorMoveArguments);
	}
}

export class MoveEditorToNextGroupAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.moveEditorToNextGroup';
	static readonly LABEL = nls.localize('moveEditorToNextGroup', "Move Editor into Next Group");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commandService, { to: 'next', By: 'group' } as ActiveEditorMoveArguments);
	}
}

export class MoveEditorToABoveGroupAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.moveEditorToABoveGroup';
	static readonly LABEL = nls.localize('moveEditorToABoveGroup', "Move Editor into ABove Group");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commandService, { to: 'up', By: 'group' } as ActiveEditorMoveArguments);
	}
}

export class MoveEditorToBelowGroupAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.moveEditorToBelowGroup';
	static readonly LABEL = nls.localize('moveEditorToBelowGroup', "Move Editor into Below Group");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commandService, { to: 'down', By: 'group' } as ActiveEditorMoveArguments);
	}
}

export class MoveEditorToLeftGroupAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.moveEditorToLeftGroup';
	static readonly LABEL = nls.localize('moveEditorToLeftGroup', "Move Editor into Left Group");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commandService, { to: 'left', By: 'group' } as ActiveEditorMoveArguments);
	}
}

export class MoveEditorToRightGroupAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.moveEditorToRightGroup';
	static readonly LABEL = nls.localize('moveEditorToRightGroup', "Move Editor into Right Group");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commandService, { to: 'right', By: 'group' } as ActiveEditorMoveArguments);
	}
}

export class MoveEditorToFirstGroupAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.moveEditorToFirstGroup';
	static readonly LABEL = nls.localize('moveEditorToFirstGroup', "Move Editor into First Group");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commandService, { to: 'first', By: 'group' } as ActiveEditorMoveArguments);
	}
}

export class MoveEditorToLastGroupAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.moveEditorToLastGroup';
	static readonly LABEL = nls.localize('moveEditorToLastGroup', "Move Editor into Last Group");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, MOVE_ACTIVE_EDITOR_COMMAND_ID, commandService, { to: 'last', By: 'group' } as ActiveEditorMoveArguments);
	}
}

export class EditorLayoutSingleAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.editorLayoutSingle';
	static readonly LABEL = nls.localize('editorLayoutSingle', "Single Column Editor Layout");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commandService, { groups: [{}] } as EditorGroupLayout);
	}
}

export class EditorLayoutTwoColumnsAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.editorLayoutTwoColumns';
	static readonly LABEL = nls.localize('editorLayoutTwoColumns', "Two Columns Editor Layout");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commandService, { groups: [{}, {}], orientation: GroupOrientation.HORIZONTAL } as EditorGroupLayout);
	}
}

export class EditorLayoutThreeColumnsAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.editorLayoutThreeColumns';
	static readonly LABEL = nls.localize('editorLayoutThreeColumns', "Three Columns Editor Layout");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commandService, { groups: [{}, {}, {}], orientation: GroupOrientation.HORIZONTAL } as EditorGroupLayout);
	}
}

export class EditorLayoutTwoRowsAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.editorLayoutTwoRows';
	static readonly LABEL = nls.localize('editorLayoutTwoRows', "Two Rows Editor Layout");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commandService, { groups: [{}, {}], orientation: GroupOrientation.VERTICAL } as EditorGroupLayout);
	}
}

export class EditorLayoutThreeRowsAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.editorLayoutThreeRows';
	static readonly LABEL = nls.localize('editorLayoutThreeRows', "Three Rows Editor Layout");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commandService, { groups: [{}, {}, {}], orientation: GroupOrientation.VERTICAL } as EditorGroupLayout);
	}
}

export class EditorLayoutTwoByTwoGridAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.editorLayoutTwoByTwoGrid';
	static readonly LABEL = nls.localize('editorLayoutTwoByTwoGrid', "Grid Editor Layout (2x2)");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commandService, { groups: [{ groups: [{}, {}] }, { groups: [{}, {}] }] } as EditorGroupLayout);
	}
}

export class EditorLayoutTwoColumnsBottomAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.editorLayoutTwoColumnsBottom';
	static readonly LABEL = nls.localize('editorLayoutTwoColumnsBottom', "Two Columns Bottom Editor Layout");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commandService, { groups: [{}, { groups: [{}, {}] }], orientation: GroupOrientation.VERTICAL } as EditorGroupLayout);
	}
}

export class EditorLayoutTwoRowsRightAction extends ExecuteCommandAction {

	static readonly ID = 'workBench.action.editorLayoutTwoRowsRight';
	static readonly LABEL = nls.localize('editorLayoutTwoRowsRight', "Two Rows Right Editor Layout");

	constructor(
		id: string,
		laBel: string,
		@ICommandService commandService: ICommandService
	) {
		super(id, laBel, LAYOUT_EDITOR_GROUPS_COMMAND_ID, commandService, { groups: [{}, { groups: [{}, {}] }], orientation: GroupOrientation.HORIZONTAL } as EditorGroupLayout);
	}
}

export class BaseCreateEditorGroupAction extends Action {

	constructor(
		id: string,
		laBel: string,
		private direction: GroupDirection,
		private editorGroupService: IEditorGroupsService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.editorGroupService.addGroup(this.editorGroupService.activeGroup, this.direction, { activate: true });
	}
}

export class NewEditorGroupLeftAction extends BaseCreateEditorGroupAction {

	static readonly ID = 'workBench.action.newGroupLeft';
	static readonly LABEL = nls.localize('newEditorLeft', "New Editor Group to the Left");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, GroupDirection.LEFT, editorGroupService);
	}
}

export class NewEditorGroupRightAction extends BaseCreateEditorGroupAction {

	static readonly ID = 'workBench.action.newGroupRight';
	static readonly LABEL = nls.localize('newEditorRight', "New Editor Group to the Right");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, GroupDirection.RIGHT, editorGroupService);
	}
}

export class NewEditorGroupABoveAction extends BaseCreateEditorGroupAction {

	static readonly ID = 'workBench.action.newGroupABove';
	static readonly LABEL = nls.localize('newEditorABove', "New Editor Group ABove");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, GroupDirection.UP, editorGroupService);
	}
}

export class NewEditorGroupBelowAction extends BaseCreateEditorGroupAction {

	static readonly ID = 'workBench.action.newGroupBelow';
	static readonly LABEL = nls.localize('newEditorBelow', "New Editor Group Below");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(id, laBel, GroupDirection.DOWN, editorGroupService);
	}
}

export class ReopenResourcesAction extends Action {

	static readonly ID = 'workBench.action.reopenWithEditor';
	static readonly LABEL = nls.localize('workBench.action.reopenWithEditor', "Reopen Editor With...");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const activeInput = this.editorService.activeEditor;
		if (!activeInput) {
			return;
		}

		const activeEditorPane = this.editorService.activeEditorPane;
		if (!activeEditorPane) {
			return;
		}

		const options = activeEditorPane.options;
		const group = activeEditorPane.group;
		await openEditorWith(activeInput, undefined, options, group, this.editorService, this.configurationService, this.quickInputService);
	}
}

export class ToggleEditorTypeAction extends Action {

	static readonly ID = 'workBench.action.toggleEditorType';
	static readonly LABEL = nls.localize('workBench.action.toggleEditorType', "Toggle Editor Type");

	constructor(
		id: string,
		laBel: string,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const activeEditorPane = this.editorService.activeEditorPane;
		if (!activeEditorPane) {
			return;
		}

		const activeEditorResource = activeEditorPane.input.resource;
		if (!activeEditorResource) {
			return;
		}

		const options = activeEditorPane.options;
		const group = activeEditorPane.group;

		const overrides = getAllAvailaBleEditors(activeEditorResource, undefined, options, group, this.editorService);
		const firstNonActiveOverride = overrides.find(([_, entry]) => !entry.active);
		if (!firstNonActiveOverride) {
			return;
		}

		await firstNonActiveOverride[0].open(activeEditorPane.input, { ...options, override: firstNonActiveOverride[1].id }, group, OpenEditorContext.NEW_EDITOR)?.override;
	}
}
