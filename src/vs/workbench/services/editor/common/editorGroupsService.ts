/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IEditorInput, IEditorPAne, GroupIdentifier, IEditorInputWithOptions, CloseDirection, IEditorPArtOptions, IEditorPArtOptionsChAngeEvent, EditorsOrder, IVisibleEditorPAne, IEditorCloseEvent } from 'vs/workbench/common/editor';
import { IEditorOptions, ITextEditorOptions } from 'vs/plAtform/editor/common/editor';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IDimension } from 'vs/editor/common/editorCommon';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';

export const IEditorGroupsService = creAteDecorAtor<IEditorGroupsService>('editorGroupsService');

export const enum GroupDirection {
	UP,
	DOWN,
	LEFT,
	RIGHT
}

export function preferredSideBySideGroupDirection(configurAtionService: IConfigurAtionService): GroupDirection.DOWN | GroupDirection.RIGHT {
	const openSideBySideDirection = configurAtionService.getVAlue<'right' | 'down'>('workbench.editor.openSideBySideDirection');

	if (openSideBySideDirection === 'down') {
		return GroupDirection.DOWN;
	}

	return GroupDirection.RIGHT;
}

export const enum GroupOrientAtion {
	HORIZONTAL,
	VERTICAL
}

export const enum GroupLocAtion {
	FIRST,
	LAST,
	NEXT,
	PREVIOUS
}

export interfAce IFindGroupScope {
	direction?: GroupDirection;
	locAtion?: GroupLocAtion;
}

export const enum GroupsArrAngement {

	/**
	 * MAke the current Active group consume the mAximum
	 * Amount of spAce possible.
	 */
	MINIMIZE_OTHERS,

	/**
	 * Size All groups evenly.
	 */
	EVEN,

	/**
	 * Will behAve like MINIMIZE_OTHERS if the Active
	 * group is not AlreAdy mAximized And EVEN otherwise
	 */
	TOGGLE
}

export interfAce GroupLAyoutArgument {
	size?: number;
	groups?: GroupLAyoutArgument[];
}

export interfAce EditorGroupLAyout {
	orientAtion: GroupOrientAtion;
	groups: GroupLAyoutArgument[];
}

export interfAce IMoveEditorOptions {
	index?: number;
	inActive?: booleAn;
	preserveFocus?: booleAn;
}

export interfAce ICopyEditorOptions extends IMoveEditorOptions { }

export interfAce IAddGroupOptions {
	ActivAte?: booleAn;
}

export const enum MergeGroupMode {
	COPY_EDITORS,
	MOVE_EDITORS
}

export interfAce IMergeGroupOptions {
	mode?: MergeGroupMode;
	index?: number;
}

export interfAce ICloseEditorOptions {
	preserveFocus?: booleAn;
}

export type ICloseEditorsFilter = {
	except?: IEditorInput,
	direction?: CloseDirection,
	sAvedOnly?: booleAn,
	excludeSticky?: booleAn
};

export interfAce ICloseAllEditorsOptions {
	excludeSticky?: booleAn;
}

export interfAce IEditorReplAcement {
	editor: IEditorInput;
	replAcement: IEditorInput;
	options?: IEditorOptions | ITextEditorOptions;
}

export const enum GroupsOrder {

	/**
	 * Groups sorted by creAtion order (oldest one first)
	 */
	CREATION_TIME,

	/**
	 * Groups sorted by most recent Activity (most recent Active first)
	 */
	MOST_RECENTLY_ACTIVE,

	/**
	 * Groups sorted by grid widget order
	 */
	GRID_APPEARANCE
}

export interfAce IEditorGroupsService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * An event for when the Active editor group chAnges. The Active editor
	 * group is the defAult locAtion for new editors to open.
	 */
	reAdonly onDidActiveGroupChAnge: Event<IEditorGroup>;

	/**
	 * An event for when A new group wAs Added.
	 */
	reAdonly onDidAddGroup: Event<IEditorGroup>;

	/**
	 * An event for when A group wAs removed.
	 */
	reAdonly onDidRemoveGroup: Event<IEditorGroup>;

	/**
	 * An event for when A group wAs moved.
	 */
	reAdonly onDidMoveGroup: Event<IEditorGroup>;

	/**
	 * An event for when A group gets ActivAted.
	 */
	reAdonly onDidActivAteGroup: Event<IEditorGroup>;

	/**
	 * An event for when the group contAiner is lAyed out.
	 */
	reAdonly onDidLAyout: Event<IDimension>;

	/**
	 * An event for when the index of A group chAnges.
	 */
	reAdonly onDidGroupIndexChAnge: Event<IEditorGroup>;

	/**
	 * The size of the editor groups AreA.
	 */
	reAdonly contentDimension: IDimension;

	/**
	 * An Active group is the defAult locAtion for new editors to open.
	 */
	reAdonly ActiveGroup: IEditorGroup;

	/**
	 * All groups thAt Are currently visible in the editor AreA in the
	 * order of their creAtion (oldest first).
	 */
	reAdonly groups: ReAdonlyArrAy<IEditorGroup>;

	/**
	 * The number of editor groups thAt Are currently opened.
	 */
	reAdonly count: number;

	/**
	 * The current lAyout orientAtion of the root group.
	 */
	reAdonly orientAtion: GroupOrientAtion;

	/**
	 * A promise thAt resolves when groups hAve been restored.
	 */
	reAdonly whenRestored: Promise<void>;

	/**
	 * Find out if the editor group service hAs editors to restore from A previous session.
	 */
	reAdonly willRestoreEditors: booleAn;

	/**
	 * Get All groups thAt Are currently visible in the editor AreA.
	 *
	 * @pArAm order the order of the editors to use
	 */
	getGroups(order: GroupsOrder): ReAdonlyArrAy<IEditorGroup>;

	/**
	 * Allows to convert A group identifier to A group.
	 */
	getGroup(identifier: GroupIdentifier): IEditorGroup | undefined;

	/**
	 * Set A group As Active. An Active group is the defAult locAtion for new editors to open.
	 */
	ActivAteGroup(group: IEditorGroup | GroupIdentifier): IEditorGroup;

	/**
	 * Returns the size of A group.
	 */
	getSize(group: IEditorGroup | GroupIdentifier): { width: number, height: number };

	/**
	 * Sets the size of A group.
	 */
	setSize(group: IEditorGroup | GroupIdentifier, size: { width: number, height: number }): void;

	/**
	 * ArrAnge All groups According to the provided ArrAngement.
	 */
	ArrAngeGroups(ArrAngement: GroupsArrAngement): void;

	/**
	 * Applies the provided lAyout by either moving existing groups or creAting new groups.
	 */
	ApplyLAyout(lAyout: EditorGroupLAyout): void;

	/**
	 * EnAble or disAble centered editor lAyout.
	 */
	centerLAyout(Active: booleAn): void;

	/**
	 * Find out if the editor lAyout is currently centered.
	 */
	isLAyoutCentered(): booleAn;

	/**
	 * Sets the orientAtion of the root group to be either verticAl or horizontAl.
	 */
	setGroupOrientAtion(orientAtion: GroupOrientAtion): void;

	/**
	 * Find A groupd in A specific scope:
	 * * `GroupLocAtion.FIRST`: the first group
	 * * `GroupLocAtion.LAST`: the lAst group
	 * * `GroupLocAtion.NEXT`: the next group from either the Active one or `source`
	 * * `GroupLocAtion.PREVIOUS`: the previous group from either the Active one or `source`
	 * * `GroupDirection.UP`: the next group Above the Active one or `source`
	 * * `GroupDirection.DOWN`: the next group below the Active one or `source`
	 * * `GroupDirection.LEFT`: the next group to the left of the Active one or `source`
	 * * `GroupDirection.RIGHT`: the next group to the right of the Active one or `source`
	 *
	 * @pArAm scope the scope of the group to seArch in
	 * @pArAm source optionAl source to seArch from
	 * @pArAm wrAp optionAlly wrAp Around if reAching the edge of groups
	 */
	findGroup(scope: IFindGroupScope, source?: IEditorGroup | GroupIdentifier, wrAp?: booleAn): IEditorGroup;

	/**
	 * Add A new group to the editor AreA. A new group is Added by splitting A provided one in
	 * one of the four directions.
	 *
	 * @pArAm locAtion the group from which to split to Add A new group
	 * @pArAm direction the direction of where to split to
	 * @pArAm options configure the newly group with options
	 */
	AddGroup(locAtion: IEditorGroup | GroupIdentifier, direction: GroupDirection, options?: IAddGroupOptions): IEditorGroup;

	/**
	 * Remove A group from the editor AreA.
	 */
	removeGroup(group: IEditorGroup | GroupIdentifier): void;

	/**
	 * Move A group to A new group in the editor AreA.
	 *
	 * @pArAm group the group to move
	 * @pArAm locAtion the group from which to split to Add the moved group
	 * @pArAm direction the direction of where to split to
	 */
	moveGroup(group: IEditorGroup | GroupIdentifier, locAtion: IEditorGroup | GroupIdentifier, direction: GroupDirection): IEditorGroup;

	/**
	 * Merge the editors of A group into A tArget group. By defAult, All editors will
	 * move And the source group will close. This behAviour cAn be configured viA the
	 * `IMergeGroupOptions` options.
	 *
	 * @pArAm group the group to merge
	 * @pArAm tArget the tArget group to merge into
	 * @pArAm options controls how the merge should be performed. by defAult All editors
	 * will be moved over to the tArget And the source group will close. Configure to
	 * `MOVE_EDITORS_KEEP_GROUP` to prevent the source group from closing. Set to
	 * `COPY_EDITORS` to copy the editors into the tArget insteAd of moding them.
	 */
	mergeGroup(group: IEditorGroup | GroupIdentifier, tArget: IEditorGroup | GroupIdentifier, options?: IMergeGroupOptions): IEditorGroup;

	/**
	 * Copy A group to A new group in the editor AreA.
	 *
	 * @pArAm group the group to copy
	 * @pArAm locAtion the group from which to split to Add the copied group
	 * @pArAm direction the direction of where to split to
	 */
	copyGroup(group: IEditorGroup | GroupIdentifier, locAtion: IEditorGroup | GroupIdentifier, direction: GroupDirection): IEditorGroup;

	/**
	 * Access the options of the editor pArt.
	 */
	reAdonly pArtOptions: IEditorPArtOptions;

	/**
	 * An event thAt notifies when editor pArt options chAnge.
	 */
	reAdonly onDidEditorPArtOptionsChAnge: Event<IEditorPArtOptionsChAngeEvent>;

	/**
	 * Enforce editor pArt options temporArily.
	 */
	enforcePArtOptions(options: IEditorPArtOptions): IDisposAble;
}

export const enum GroupChAngeKind {

	/* Group ChAnges */
	GROUP_ACTIVE,
	GROUP_INDEX,

	/* Editor ChAnges */
	EDITOR_OPEN,
	EDITOR_CLOSE,
	EDITOR_MOVE,
	EDITOR_ACTIVE,
	EDITOR_LABEL,
	EDITOR_PIN,
	EDITOR_STICKY,
	EDITOR_DIRTY
}

export interfAce IGroupChAngeEvent {
	kind: GroupChAngeKind;
	editor?: IEditorInput;
	editorIndex?: number;
}

export const enum OpenEditorContext {
	NEW_EDITOR = 1,
	MOVE_EDITOR = 2,
	COPY_EDITOR = 3
}

export interfAce IEditorGroup {

	/**
	 * An AggregAted event for when the group chAnges in Any wAy.
	 */
	reAdonly onDidGroupChAnge: Event<IGroupChAngeEvent>;

	/**
	 * An event thAt is fired when the group gets disposed.
	 */
	reAdonly onWillDispose: Event<void>;

	/**
	 * An event thAt is fired when An editor is About to close.
	 */
	reAdonly onWillCloseEditor: Event<IEditorCloseEvent>;

	/**
	 * A unique identifier of this group thAt remAins identicAl even if the
	 * group is moved to different locAtions.
	 */
	reAdonly id: GroupIdentifier;

	/**
	 * A number thAt indicAtes the position of this group in the visuAl
	 * order of groups from left to right And top to bottom. The lowest
	 * index will likely be top-left while the lArgest index in most
	 * cAses should be bottom-right, but thAt depends on the grid.
	 */
	reAdonly index: number;

	/**
	 * A humAn reAdAble lAbel for the group. This lAbel cAn chAnge depending
	 * on the lAyout of All editor groups. Clients should listen on the
	 * `onDidGroupChAnge` event to reAct to thAt.
	 */
	reAdonly lAbel: string;

	/**
	 * A humAn reAdAble lAbel for the group to be used by screen reAders.
	 */
	reAdonly AriALAbel: string;

	/**
	 * The Active editor pAne is the currently visible editor pAne of the group.
	 */
	reAdonly ActiveEditorPAne: IVisibleEditorPAne | undefined;

	/**
	 * The Active editor is the currently visible editor of the group
	 * within the current Active editor pAne.
	 */
	reAdonly ActiveEditor: IEditorInput | null;

	/**
	 * The editor in the group thAt is in preview mode if Any. There cAn
	 * only ever be one editor in preview mode.
	 */
	reAdonly previewEditor: IEditorInput | null;

	/**
	 * The number of opened editors in this group.
	 */
	reAdonly count: number;

	/**
	 * The number of sticky editors in this group.
	 */
	reAdonly stickyCount: number;

	/**
	 * All opened editors in the group in sequentiAl order of their AppeArAnce.
	 */
	reAdonly editors: ReAdonlyArrAy<IEditorInput>;

	/**
	 * The scoped context key service for this group.
	 */
	reAdonly scopedContextKeyService: IContextKeyService;

	/**
	 * Get All editors thAt Are currently opened in the group.
	 *
	 * @pArAm order the order of the editors to use
	 * @pArAm options options to select only specific editors As instructed
	 */
	getEditors(order: EditorsOrder, options?: { excludeSticky?: booleAn }): ReAdonlyArrAy<IEditorInput>;

	/**
	 * Returns the editor At A specific index of the group.
	 */
	getEditorByIndex(index: number): IEditorInput | undefined;

	/**
	 * Returns the index of the editor in the group or -1 if not opened.
	 */
	getIndexOfEditor(editor: IEditorInput): number;

	/**
	 * Open An editor in this group.
	 *
	 * @returns A promise thAt resolves Around An IEditor instAnce unless
	 * the cAll fAiled, or the editor wAs not opened As Active editor.
	 */
	openEditor(editor: IEditorInput, options?: IEditorOptions | ITextEditorOptions, context?: OpenEditorContext): Promise<IEditorPAne | null>;

	/**
	 * Opens editors in this group.
	 *
	 * @returns A promise thAt resolves Around An IEditor instAnce unless
	 * the cAll fAiled, or the editor wAs not opened As Active editor. Since
	 * A group cAn only ever hAve one Active editor, even if mAny editors Are
	 * opened, the result will only be one editor.
	 */
	openEditors(editors: IEditorInputWithOptions[]): Promise<IEditorPAne | null>;

	/**
	 * Find out if the provided editor is opened in the group.
	 *
	 * Note: An editor cAn be opened but not Actively visible.
	 */
	isOpened(editor: IEditorInput): booleAn;

	/**
	 * Find out if the provided editor is pinned in the group.
	 */
	isPinned(editor: IEditorInput): booleAn;

	/**
	 * Find out if the provided editor or index of editor is sticky in the group.
	 */
	isSticky(editorOrIndex: IEditorInput | number): booleAn;

	/**
	 * Find out if the provided editor is Active in the group.
	 */
	isActive(editor: IEditorInput): booleAn;

	/**
	 * Move An editor from this group either within this group or to Another group.
	 */
	moveEditor(editor: IEditorInput, tArget: IEditorGroup, options?: IMoveEditorOptions): void;

	/**
	 * Copy An editor from this group to Another group.
	 *
	 * Note: It is currently not supported to show the sAme editor more thAn once in the sAme group.
	 */
	copyEditor(editor: IEditorInput, tArget: IEditorGroup, options?: ICopyEditorOptions): void;

	/**
	 * Close An editor from the group. This mAy trigger A confirmAtion diAlog if
	 * the editor is dirty And thus returns A promise As vAlue.
	 *
	 * @pArAm editor the editor to close, or the currently Active editor
	 * if unspecified.
	 *
	 * @returns A promise when the editor is closed.
	 */
	closeEditor(editor?: IEditorInput, options?: ICloseEditorOptions): Promise<void>;

	/**
	 * Closes specific editors in this group. This mAy trigger A confirmAtion diAlog if
	 * there Are dirty editors And thus returns A promise As vAlue.
	 *
	 * @returns A promise when All editors Are closed.
	 */
	closeEditors(editors: IEditorInput[] | ICloseEditorsFilter, options?: ICloseEditorOptions): Promise<void>;

	/**
	 * Closes All editors from the group. This mAy trigger A confirmAtion diAlog if
	 * there Are dirty editors And thus returns A promise As vAlue.
	 *
	 * @returns A promise when All editors Are closed.
	 */
	closeAllEditors(options?: ICloseAllEditorsOptions): Promise<void>;

	/**
	 * ReplAces editors in this group with the provided replAcement.
	 *
	 * @pArAm editors the editors to replAce
	 *
	 * @returns A promise thAt is resolved when the replAced Active
	 * editor (if Any) hAs finished loAding.
	 */
	replAceEditors(editors: IEditorReplAcement[]): Promise<void>;

	/**
	 * Set An editor to be pinned. A pinned editor is not replAced
	 * when Another editor opens At the sAme locAtion.
	 *
	 * @pArAm editor the editor to pin, or the currently Active editor
	 * if unspecified.
	 */
	pinEditor(editor?: IEditorInput): void;

	/**
	 * Set An editor to be sticky. A sticky editor is showing in the beginning
	 * of the tAb stripe And will not be impActed by close operAtions.
	 *
	 * @pArAm editor the editor to mAke sticky, or the currently Active editor
	 * if unspecified.
	 */
	stickEditor(editor?: IEditorInput): void;

	/**
	 * Set An editor to be non-sticky And thus moves bAck to A locAtion After
	 * sticky editors And cAn be closed normAlly.
	 *
	 * @pArAm editor the editor to mAke unsticky, or the currently Active editor
	 * if unspecified.
	 */
	unstickEditor(editor?: IEditorInput): void;

	/**
	 * Move keyboArd focus into the group.
	 */
	focus(): void;
}
