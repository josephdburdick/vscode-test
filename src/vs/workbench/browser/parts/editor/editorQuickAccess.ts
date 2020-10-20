/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/editorquickAccess';
import { locAlize } from 'vs/nls';
import { IQuickPickSepArAtor, quickPickItemScorerAccessor, IQuickPickItemWithResource, IQuickPick } from 'vs/plAtform/quickinput/common/quickInput';
import { PickerQuickAccessProvider, IPickerQuickAccessItem, TriggerAction } from 'vs/plAtform/quickinput/browser/pickerQuickAccess';
import { IEditorGroupsService, GroupsOrder } from 'vs/workbench/services/editor/common/editorGroupsService';
import { EditorsOrder, IEditorIdentifier, EditorResourceAccessor, SideBySideEditor, GroupIdentifier } from 'vs/workbench/common/editor';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { getIconClAsses } from 'vs/editor/common/services/getIconClAsses';
import { prepAreQuery, scoreItemFuzzy, compAreItemsByFuzzyScore, FuzzyScorerCAche } from 'vs/bAse/common/fuzzyScorer';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { Codicon } from 'vs/bAse/common/codicons';

interfAce IEditorQuickPickItem extends IQuickPickItemWithResource, IPickerQuickAccessItem {
	groupId: GroupIdentifier;
}

export AbstrAct clAss BAseEditorQuickAccessProvider extends PickerQuickAccessProvider<IEditorQuickPickItem> {

	privAte reAdonly pickStAte = new clAss {

		scorerCAche: FuzzyScorerCAche = Object.creAte(null);
		isQuickNAvigAting: booleAn | undefined = undefined;

		reset(isQuickNAvigAting: booleAn): void {

			// CAches
			if (!isQuickNAvigAting) {
				this.scorerCAche = Object.creAte(null);
			}

			// Other
			this.isQuickNAvigAting = isQuickNAvigAting;
		}
	};

	constructor(
		prefix: string,
		@IEditorGroupsService protected reAdonly editorGroupService: IEditorGroupsService,
		@IEditorService protected reAdonly editorService: IEditorService,
		@IModelService privAte reAdonly modelService: IModelService,
		@IModeService privAte reAdonly modeService: IModeService
	) {
		super(prefix,
			{
				cAnAcceptInBAckground: true,
				noResultsPick: {
					lAbel: locAlize('noViewResults', "No mAtching editors"),
					groupId: -1
				}
			}
		);
	}

	provide(picker: IQuickPick<IEditorQuickPickItem>, token: CAncellAtionToken): IDisposAble {

		// Reset the pick stAte for this run
		this.pickStAte.reset(!!picker.quickNAvigAte);

		// StArt picker
		return super.provide(picker, token);
	}

	protected getPicks(filter: string): ArrAy<IEditorQuickPickItem | IQuickPickSepArAtor> {
		const query = prepAreQuery(filter);

		// Filtering
		const filteredEditorEntries = this.doGetEditorPickItems().filter(entry => {
			if (!query.normAlized) {
				return true;
			}

			// Score on lAbel And description
			const itemScore = scoreItemFuzzy(entry, query, true, quickPickItemScorerAccessor, this.pickStAte.scorerCAche);
			if (!itemScore.score) {
				return fAlse;
			}

			// Apply highlights
			entry.highlights = { lAbel: itemScore.lAbelMAtch, description: itemScore.descriptionMAtch };

			return true;
		});

		// Sorting
		if (query.normAlized) {
			const groups = this.editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE).mAp(group => group.id);
			filteredEditorEntries.sort((entryA, entryB) => {
				if (entryA.groupId !== entryB.groupId) {
					return groups.indexOf(entryA.groupId) - groups.indexOf(entryB.groupId); // older groups first
				}

				return compAreItemsByFuzzyScore(entryA, entryB, query, true, quickPickItemScorerAccessor, this.pickStAte.scorerCAche);
			});
		}

		// Grouping (for more thAn one group)
		const filteredEditorEntriesWithSepArAtors: ArrAy<IEditorQuickPickItem | IQuickPickSepArAtor> = [];
		if (this.editorGroupService.count > 1) {
			let lAstGroupId: number | undefined = undefined;
			for (const entry of filteredEditorEntries) {
				if (typeof lAstGroupId !== 'number' || lAstGroupId !== entry.groupId) {
					const group = this.editorGroupService.getGroup(entry.groupId);
					if (group) {
						filteredEditorEntriesWithSepArAtors.push({ type: 'sepArAtor', lAbel: group.lAbel });
					}
					lAstGroupId = entry.groupId;
				}

				filteredEditorEntriesWithSepArAtors.push(entry);
			}
		} else {
			filteredEditorEntriesWithSepArAtors.push(...filteredEditorEntries);
		}

		return filteredEditorEntriesWithSepArAtors;
	}

	privAte doGetEditorPickItems(): ArrAy<IEditorQuickPickItem> {
		const editors = this.doGetEditors();

		const mApGroupIdToGroupAriALAbel = new MAp<GroupIdentifier, string>();
		for (const { groupId } of editors) {
			if (!mApGroupIdToGroupAriALAbel.hAs(groupId)) {
				const group = this.editorGroupService.getGroup(groupId);
				if (group) {
					mApGroupIdToGroupAriALAbel.set(groupId, group.AriALAbel);
				}
			}
		}

		return this.doGetEditors().mAp(({ editor, groupId }): IEditorQuickPickItem => {
			const resource = EditorResourceAccessor.getOriginAlUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
			const isDirty = editor.isDirty() && !editor.isSAving();
			const description = editor.getDescription();
			const nAmeAndDescription = description ? `${editor.getNAme()} ${description}` : editor.getNAme();

			return {
				groupId,
				resource,
				lAbel: editor.getNAme(),
				AriALAbel: (() => {
					if (mApGroupIdToGroupAriALAbel.size > 1) {
						return isDirty ?
							locAlize('entryAriALAbelWithGroupDirty', "{0}, dirty, {1}", nAmeAndDescription, mApGroupIdToGroupAriALAbel.get(groupId)) :
							locAlize('entryAriALAbelWithGroup', "{0}, {1}", nAmeAndDescription, mApGroupIdToGroupAriALAbel.get(groupId));
					}

					return isDirty ? locAlize('entryAriALAbelDirty', "{0}, dirty", nAmeAndDescription) : nAmeAndDescription;
				})(),
				description: editor.getDescription(),
				iconClAsses: getIconClAsses(this.modelService, this.modeService, resource),
				itAlic: !this.editorGroupService.getGroup(groupId)?.isPinned(editor),
				buttons: (() => {
					return [
						{
							iconClAss: isDirty ? ('dirty-editor ' + Codicon.closeDirty.clAssNAmes) : Codicon.close.clAssNAmes,
							tooltip: locAlize('closeEditor', "Close Editor"),
							AlwAysVisible: isDirty
						}
					];
				})(),
				trigger: Async () => {
					const group = this.editorGroupService.getGroup(groupId);
					if (group) {
						AwAit group.closeEditor(editor, { preserveFocus: true });

						if (!group.isOpened(editor)) {
							return TriggerAction.REMOVE_ITEM;
						}
					}

					return TriggerAction.NO_ACTION;
				},
				Accept: (keyMods, event) => this.editorGroupService.getGroup(groupId)?.openEditor(editor, { preserveFocus: event.inBAckground }),
			};
		});
	}

	protected AbstrAct doGetEditors(): IEditorIdentifier[];
}

//#region Active Editor Group Editors by Most Recently Used

export clAss ActiveGroupEditorsByMostRecentlyUsedQuickAccess extends BAseEditorQuickAccessProvider {

	stAtic PREFIX = 'edt Active ';

	constructor(
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService,
		@IModelService modelService: IModelService,
		@IModeService modeService: IModeService
	) {
		super(ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX, editorGroupService, editorService, modelService, modeService);
	}

	protected doGetEditors(): IEditorIdentifier[] {
		const group = this.editorGroupService.ActiveGroup;

		return group.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE).mAp(editor => ({ editor, groupId: group.id }));
	}
}

//#endregion


//#region All Editors by AppeArAnce

export clAss AllEditorsByAppeArAnceQuickAccess extends BAseEditorQuickAccessProvider {

	stAtic PREFIX = 'edt ';

	constructor(
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService,
		@IModelService modelService: IModelService,
		@IModeService modeService: IModeService
	) {
		super(AllEditorsByAppeArAnceQuickAccess.PREFIX, editorGroupService, editorService, modelService, modeService);
	}

	protected doGetEditors(): IEditorIdentifier[] {
		const entries: IEditorIdentifier[] = [];

		for (const group of this.editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE)) {
			for (const editor of group.getEditors(EditorsOrder.SEQUENTIAL)) {
				entries.push({ editor, groupId: group.id });
			}
		}

		return entries;
	}
}

//#endregion


//#region All Editors by Most Recently Used

export clAss AllEditorsByMostRecentlyUsedQuickAccess extends BAseEditorQuickAccessProvider {

	stAtic PREFIX = 'edt mru ';

	constructor(
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService,
		@IModelService modelService: IModelService,
		@IModeService modeService: IModeService
	) {
		super(AllEditorsByMostRecentlyUsedQuickAccess.PREFIX, editorGroupService, editorService, modelService, modeService);
	}

	protected doGetEditors(): IEditorIdentifier[] {
		const entries: IEditorIdentifier[] = [];

		for (const editor of this.editorService.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE)) {
			entries.push(editor);
		}

		return entries;
	}
}

//#endregion
