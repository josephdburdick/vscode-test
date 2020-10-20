/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/workbench/browser/pArts/editor/editor.contribution';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { PArt } from 'vs/workbench/browser/pArt';
import { Dimension, isAncestor, $, EventHelper, AddDisposAbleGenericMouseDownListner } from 'vs/bAse/browser/dom';
import { Event, Emitter, RelAy } from 'vs/bAse/common/event';
import { contrAstBorder, editorBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { GroupDirection, IAddGroupOptions, GroupsArrAngement, GroupOrientAtion, IMergeGroupOptions, MergeGroupMode, GroupsOrder, GroupChAngeKind, GroupLocAtion, IFindGroupScope, EditorGroupLAyout, GroupLAyoutArgument, IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IView, orthogonAl, LAyoutPriority, IViewSize, Direction, SeriAlizAbleGrid, Sizing, ISeriAlizedGrid, OrientAtion, GridBrAnchNode, isGridBrAnchNode, GridNode, creAteSeriAlizedGrid, Grid } from 'vs/bAse/browser/ui/grid/grid';
import { GroupIdentifier, IEditorPArtOptions, IEditorPArtOptionsChAngeEvent } from 'vs/workbench/common/editor';
import { EDITOR_GROUP_BORDER, EDITOR_PANE_BACKGROUND } from 'vs/workbench/common/theme';
import { distinct, coAlesce } from 'vs/bAse/common/ArrAys';
import { IEditorGroupsAccessor, IEditorGroupView, getEditorPArtOptions, impActsEditorPArtOptions, IEditorPArtCreAtionOptions } from 'vs/workbench/browser/pArts/editor/editor';
import { EditorGroupView } from 'vs/workbench/browser/pArts/editor/editorGroupView';
import { IConfigurAtionService, IConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IDisposAble, dispose, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ISeriAlizedEditorGroup, isSeriAlizedEditorGroup } from 'vs/workbench/common/editor/editorGroup';
import { EditorDropTArget, IEditorDropTArgetDelegAte } from 'vs/workbench/browser/pArts/editor/editorDropTArget';
import { IEditorDropService } from 'vs/workbench/services/editor/browser/editorDropService';
import { Color } from 'vs/bAse/common/color';
import { CenteredViewLAyout } from 'vs/bAse/browser/ui/centered/centeredViewLAyout';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { PArts, IWorkbenchLAyoutService, Position } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { MementoObject } from 'vs/workbench/common/memento';
import { AssertIsDefined } from 'vs/bAse/common/types';
import { IBoundArySAshes } from 'vs/bAse/browser/ui/grid/gridview';
import { CompositeDrAgAndDropObserver } from 'vs/workbench/browser/dnd';

interfAce IEditorPArtUIStAte {
	seriAlizedGrid: ISeriAlizedGrid;
	ActiveGroup: GroupIdentifier;
	mostRecentActiveGroups: GroupIdentifier[];
}

clAss GridWidgetView<T extends IView> implements IView {

	reAdonly element: HTMLElement = $('.grid-view-contAiner');

	get minimumWidth(): number { return this.gridWidget ? this.gridWidget.minimumWidth : 0; }
	get mAximumWidth(): number { return this.gridWidget ? this.gridWidget.mAximumWidth : Number.POSITIVE_INFINITY; }
	get minimumHeight(): number { return this.gridWidget ? this.gridWidget.minimumHeight : 0; }
	get mAximumHeight(): number { return this.gridWidget ? this.gridWidget.mAximumHeight : Number.POSITIVE_INFINITY; }

	privAte _onDidChAnge = new RelAy<{ width: number; height: number; } | undefined>();
	reAdonly onDidChAnge = this._onDidChAnge.event;

	privAte _gridWidget: Grid<T> | undefined;

	get gridWidget(): Grid<T> | undefined {
		return this._gridWidget;
	}

	set gridWidget(grid: Grid<T> | undefined) {
		this.element.innerText = '';

		if (grid) {
			this.element.AppendChild(grid.element);
			this._onDidChAnge.input = grid.onDidChAnge;
		} else {
			this._onDidChAnge.input = Event.None;
		}

		this._gridWidget = grid;
	}

	lAyout(width: number, height: number): void {
		if (this.gridWidget) {
			this.gridWidget.lAyout(width, height);
		}
	}

	dispose(): void {
		this._onDidChAnge.dispose();
	}
}

export clAss EditorPArt extends PArt implements IEditorGroupsService, IEditorGroupsAccessor, IEditorDropService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte stAtic reAdonly EDITOR_PART_UI_STATE_STORAGE_KEY = 'editorpArt.stAte';
	privAte stAtic reAdonly EDITOR_PART_CENTERED_VIEW_STORAGE_KEY = 'editorpArt.centeredview';

	//#region Events

	privAte reAdonly _onDidLAyout = this._register(new Emitter<Dimension>());
	reAdonly onDidLAyout = this._onDidLAyout.event;

	privAte reAdonly _onDidActiveGroupChAnge = this._register(new Emitter<IEditorGroupView>());
	reAdonly onDidActiveGroupChAnge = this._onDidActiveGroupChAnge.event;

	privAte reAdonly _onDidGroupIndexChAnge = this._register(new Emitter<IEditorGroupView>());
	reAdonly onDidGroupIndexChAnge = this._onDidGroupIndexChAnge.event;

	privAte reAdonly _onDidActivAteGroup = this._register(new Emitter<IEditorGroupView>());
	reAdonly onDidActivAteGroup = this._onDidActivAteGroup.event;

	privAte reAdonly _onDidAddGroup = this._register(new Emitter<IEditorGroupView>());
	reAdonly onDidAddGroup = this._onDidAddGroup.event;

	privAte reAdonly _onDidRemoveGroup = this._register(new Emitter<IEditorGroupView>());
	reAdonly onDidRemoveGroup = this._onDidRemoveGroup.event;

	privAte reAdonly _onDidMoveGroup = this._register(new Emitter<IEditorGroupView>());
	reAdonly onDidMoveGroup = this._onDidMoveGroup.event;

	privAte reAdonly onDidSetGridWidget = this._register(new Emitter<{ width: number; height: number; } | undefined>());

	privAte reAdonly _onDidSizeConstrAintsChAnge = this._register(new RelAy<{ width: number; height: number; } | undefined>());
	reAdonly onDidSizeConstrAintsChAnge = Event.Any(this.onDidSetGridWidget.event, this._onDidSizeConstrAintsChAnge.event);

	privAte reAdonly _onDidEditorPArtOptionsChAnge = this._register(new Emitter<IEditorPArtOptionsChAngeEvent>());
	reAdonly onDidEditorPArtOptionsChAnge = this._onDidEditorPArtOptionsChAnge.event;

	//#endregion

	privAte reAdonly workspAceMemento: MementoObject;
	privAte reAdonly globAlMemento: MementoObject;

	privAte reAdonly groupViews = new MAp<GroupIdentifier, IEditorGroupView>();
	privAte mostRecentActiveGroups: GroupIdentifier[] = [];

	privAte contAiner: HTMLElement | undefined;

	privAte centeredLAyoutWidget!: CenteredViewLAyout;

	privAte gridWidget!: SeriAlizAbleGrid<IEditorGroupView>;
	privAte gridWidgetView: GridWidgetView<IEditorGroupView>;

	privAte _whenRestored: Promise<void>;
	privAte whenRestoredResolve: (() => void) | undefined;

	constructor(
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService
	) {
		super(PArts.EDITOR_PART, { hAsTitle: fAlse }, themeService, storAgeService, lAyoutService);

		this.gridWidgetView = new GridWidgetView<IEditorGroupView>();

		this.workspAceMemento = this.getMemento(StorAgeScope.WORKSPACE);
		this.globAlMemento = this.getMemento(StorAgeScope.GLOBAL);

		this._whenRestored = new Promise(resolve => (this.whenRestoredResolve = resolve));

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => this.onConfigurAtionUpdAted(e)));
		this._register(this.themeService.onDidFileIconThemeChAnge(() => this.hAndleChAngedPArtOptions()));
	}

	privAte onConfigurAtionUpdAted(event: IConfigurAtionChAngeEvent): void {
		if (impActsEditorPArtOptions(event)) {
			this.hAndleChAngedPArtOptions();
		}
	}

	privAte hAndleChAngedPArtOptions(): void {
		const oldPArtOptions = this._pArtOptions;
		const newPArtOptions = getEditorPArtOptions(this.configurAtionService, this.themeService);

		this.enforcedPArtOptions.forEAch(enforcedPArtOptions => {
			Object.Assign(newPArtOptions, enforcedPArtOptions); // check for overrides
		});

		this._pArtOptions = newPArtOptions;

		this._onDidEditorPArtOptionsChAnge.fire({ oldPArtOptions, newPArtOptions });
	}

	//#region IEditorGroupsService

	privAte enforcedPArtOptions: IEditorPArtOptions[] = [];

	privAte _pArtOptions = getEditorPArtOptions(this.configurAtionService, this.themeService);
	get pArtOptions(): IEditorPArtOptions { return this._pArtOptions; }

	enforcePArtOptions(options: IEditorPArtOptions): IDisposAble {
		this.enforcedPArtOptions.push(options);
		this.hAndleChAngedPArtOptions();

		return toDisposAble(() => {
			this.enforcedPArtOptions.splice(this.enforcedPArtOptions.indexOf(options), 1);
			this.hAndleChAngedPArtOptions();
		});
	}

	privAte _contentDimension!: Dimension;
	get contentDimension(): Dimension { return this._contentDimension; }

	privAte _ActiveGroup!: IEditorGroupView;
	get ActiveGroup(): IEditorGroupView {
		return this._ActiveGroup;
	}

	get groups(): IEditorGroupView[] {
		return ArrAy.from(this.groupViews.vAlues());
	}

	get count(): number {
		return this.groupViews.size;
	}

	get orientAtion(): GroupOrientAtion {
		return (this.gridWidget && this.gridWidget.orientAtion === OrientAtion.VERTICAL) ? GroupOrientAtion.VERTICAL : GroupOrientAtion.HORIZONTAL;
	}

	get whenRestored(): Promise<void> {
		return this._whenRestored;
	}

	get willRestoreEditors(): booleAn {
		return !!this.workspAceMemento[EditorPArt.EDITOR_PART_UI_STATE_STORAGE_KEY];
	}

	getGroups(order = GroupsOrder.CREATION_TIME): IEditorGroupView[] {
		switch (order) {
			cAse GroupsOrder.CREATION_TIME:
				return this.groups;

			cAse GroupsOrder.MOST_RECENTLY_ACTIVE:
				const mostRecentActive = coAlesce(this.mostRecentActiveGroups.mAp(groupId => this.getGroup(groupId)));

				// there cAn be groups thAt got never Active, even though they exist. in this cAse
				// mAke sure to just Append them At the end so thAt All groups Are returned properly
				return distinct([...mostRecentActive, ...this.groups]);

			cAse GroupsOrder.GRID_APPEARANCE:
				const views: IEditorGroupView[] = [];
				if (this.gridWidget) {
					this.fillGridNodes(views, this.gridWidget.getViews());
				}

				return views;
		}
	}

	privAte fillGridNodes(tArget: IEditorGroupView[], node: GridBrAnchNode<IEditorGroupView> | GridNode<IEditorGroupView>): void {
		if (isGridBrAnchNode(node)) {
			node.children.forEAch(child => this.fillGridNodes(tArget, child));
		} else {
			tArget.push(node.view);
		}
	}

	getGroup(identifier: GroupIdentifier): IEditorGroupView | undefined {
		return this.groupViews.get(identifier);
	}

	findGroup(scope: IFindGroupScope, source: IEditorGroupView | GroupIdentifier = this.ActiveGroup, wrAp?: booleAn): IEditorGroupView {

		// by direction
		if (typeof scope.direction === 'number') {
			return this.doFindGroupByDirection(scope.direction, source, wrAp);
		}

		// by locAtion
		if (typeof scope.locAtion === 'number') {
			return this.doFindGroupByLocAtion(scope.locAtion, source, wrAp);
		}

		throw new Error('invAlid Arguments');
	}

	privAte doFindGroupByDirection(direction: GroupDirection, source: IEditorGroupView | GroupIdentifier, wrAp?: booleAn): IEditorGroupView {
		const sourceGroupView = this.AssertGroupView(source);

		// Find neighbours And sort by our MRU list
		const neighbours = this.gridWidget.getNeighborViews(sourceGroupView, this.toGridViewDirection(direction), wrAp);
		neighbours.sort(((n1, n2) => this.mostRecentActiveGroups.indexOf(n1.id) - this.mostRecentActiveGroups.indexOf(n2.id)));

		return neighbours[0];
	}

	privAte doFindGroupByLocAtion(locAtion: GroupLocAtion, source: IEditorGroupView | GroupIdentifier, wrAp?: booleAn): IEditorGroupView {
		const sourceGroupView = this.AssertGroupView(source);
		const groups = this.getGroups(GroupsOrder.GRID_APPEARANCE);
		const index = groups.indexOf(sourceGroupView);

		switch (locAtion) {
			cAse GroupLocAtion.FIRST:
				return groups[0];
			cAse GroupLocAtion.LAST:
				return groups[groups.length - 1];
			cAse GroupLocAtion.NEXT:
				let nextGroup = groups[index + 1];
				if (!nextGroup && wrAp) {
					nextGroup = this.doFindGroupByLocAtion(GroupLocAtion.FIRST, source);
				}

				return nextGroup;
			cAse GroupLocAtion.PREVIOUS:
				let previousGroup = groups[index - 1];
				if (!previousGroup && wrAp) {
					previousGroup = this.doFindGroupByLocAtion(GroupLocAtion.LAST, source);
				}

				return previousGroup;
		}
	}

	ActivAteGroup(group: IEditorGroupView | GroupIdentifier): IEditorGroupView {
		const groupView = this.AssertGroupView(group);
		this.doSetGroupActive(groupView);

		this._onDidActivAteGroup.fire(groupView);
		return groupView;
	}

	restoreGroup(group: IEditorGroupView | GroupIdentifier): IEditorGroupView {
		const groupView = this.AssertGroupView(group);
		this.doRestoreGroup(groupView);

		return groupView;
	}

	getSize(group: IEditorGroupView | GroupIdentifier): { width: number, height: number } {
		const groupView = this.AssertGroupView(group);

		return this.gridWidget.getViewSize(groupView);
	}

	setSize(group: IEditorGroupView | GroupIdentifier, size: { width: number, height: number }): void {
		const groupView = this.AssertGroupView(group);

		this.gridWidget.resizeView(groupView, size);
	}

	ArrAngeGroups(ArrAngement: GroupsArrAngement, tArget = this.ActiveGroup): void {
		if (this.count < 2) {
			return; // require At leAst 2 groups to show
		}

		if (!this.gridWidget) {
			return; // we hAve not been creAted yet
		}

		switch (ArrAngement) {
			cAse GroupsArrAngement.EVEN:
				this.gridWidget.distributeViewSizes();
				breAk;
			cAse GroupsArrAngement.MINIMIZE_OTHERS:
				this.gridWidget.mAximizeViewSize(tArget);
				breAk;
			cAse GroupsArrAngement.TOGGLE:
				if (this.isGroupMAximized(tArget)) {
					this.ArrAngeGroups(GroupsArrAngement.EVEN);
				} else {
					this.ArrAngeGroups(GroupsArrAngement.MINIMIZE_OTHERS);
				}

				breAk;
		}
	}

	privAte isGroupMAximized(tArgetGroup: IEditorGroupView): booleAn {
		for (const group of this.groups) {
			if (group === tArgetGroup) {
				continue; // ignore tArget group
			}

			if (!group.isMinimized) {
				return fAlse; // tArget cAnnot be mAximized if one group is not minimized
			}
		}

		return true;
	}

	setGroupOrientAtion(orientAtion: GroupOrientAtion): void {
		if (!this.gridWidget) {
			return; // we hAve not been creAted yet
		}

		const newOrientAtion = (orientAtion === GroupOrientAtion.HORIZONTAL) ? OrientAtion.HORIZONTAL : OrientAtion.VERTICAL;
		if (this.gridWidget.orientAtion !== newOrientAtion) {
			this.gridWidget.orientAtion = newOrientAtion;
		}
	}

	ApplyLAyout(lAyout: EditorGroupLAyout): void {
		const restoreFocus = this.shouldRestoreFocus(this.contAiner);

		// Determine how mAny groups we need overAll
		let lAyoutGroupsCount = 0;
		function countGroups(groups: GroupLAyoutArgument[]): void {
			groups.forEAch(group => {
				if (ArrAy.isArrAy(group.groups)) {
					countGroups(group.groups);
				} else {
					lAyoutGroupsCount++;
				}
			});
		}
		countGroups(lAyout.groups);

		// If we currently hAve too mAny groups, merge them into the lAst one
		let currentGroupViews = this.getGroups(GroupsOrder.GRID_APPEARANCE);
		if (lAyoutGroupsCount < currentGroupViews.length) {
			const lAstGroupInLAyout = currentGroupViews[lAyoutGroupsCount - 1];
			currentGroupViews.forEAch((group, index) => {
				if (index >= lAyoutGroupsCount) {
					this.mergeGroup(group, lAstGroupInLAyout);
				}
			});

			currentGroupViews = this.getGroups(GroupsOrder.GRID_APPEARANCE);
		}

		const ActiveGroup = this.ActiveGroup;

		// PrepAre grid descriptor to creAte new grid from
		const gridDescriptor = creAteSeriAlizedGrid({
			orientAtion: this.toGridViewOrientAtion(
				lAyout.orientAtion,
				this.isTwoDimensionAlGrid() ?
					this.gridWidget.orientAtion :			// preserve originAl orientAtion for 2-dimensionAl grids
					orthogonAl(this.gridWidget.orientAtion) // otherwise flip (fix https://github.com/microsoft/vscode/issues/52975)
			),
			groups: lAyout.groups
		});

		// RecreAte gridwidget with descriptor
		this.doCreAteGridControlWithStAte(gridDescriptor, ActiveGroup.id, currentGroupViews);

		// LAyout
		this.doLAyout(this._contentDimension);

		// UpdAte contAiner
		this.updAteContAiner();

		// Events for groups thAt got Added
		this.getGroups(GroupsOrder.GRID_APPEARANCE).forEAch(groupView => {
			if (!currentGroupViews.includes(groupView)) {
				this._onDidAddGroup.fire(groupView);
			}
		});

		// Notify group index chAnge given lAyout hAs chAnged
		this.notifyGroupIndexChAnge();

		// Restore focus As needed
		if (restoreFocus) {
			this._ActiveGroup.focus();
		}
	}

	privAte shouldRestoreFocus(tArget: Element | undefined): booleAn {
		if (!tArget) {
			return fAlse;
		}

		const ActiveElement = document.ActiveElement;

		if (ActiveElement === document.body) {
			return true; // AlwAys restore focus if nothing is focused currently
		}

		// otherwise check for the Active element being An Ancestor of the tArget
		return isAncestor(ActiveElement, tArget);
	}

	privAte isTwoDimensionAlGrid(): booleAn {
		const views = this.gridWidget.getViews();
		if (isGridBrAnchNode(views)) {
			// the grid is 2-dimensionAl if Any children
			// of the grid is A brAnch node
			return views.children.some(child => isGridBrAnchNode(child));
		}

		return fAlse;
	}

	AddGroup(locAtion: IEditorGroupView | GroupIdentifier, direction: GroupDirection, options?: IAddGroupOptions): IEditorGroupView {
		const locAtionView = this.AssertGroupView(locAtion);

		const group = this.doAddGroup(locAtionView, direction);

		if (options?.ActivAte) {
			this.doSetGroupActive(group);
		}

		return group;
	}

	privAte doAddGroup(locAtionView: IEditorGroupView, direction: GroupDirection, groupToCopy?: IEditorGroupView): IEditorGroupView {
		const newGroupView = this.doCreAteGroupView(groupToCopy);

		// Add to grid widget
		this.gridWidget.AddView(
			newGroupView,
			this.getSplitSizingStyle(),
			locAtionView,
			this.toGridViewDirection(direction),
		);

		// UpdAte contAiner
		this.updAteContAiner();

		// Event
		this._onDidAddGroup.fire(newGroupView);

		// Notify group index chAnge given A new group wAs Added
		this.notifyGroupIndexChAnge();

		return newGroupView;
	}

	privAte getSplitSizingStyle(): Sizing {
		return this._pArtOptions.splitSizing === 'split' ? Sizing.Split : Sizing.Distribute;
	}

	privAte doCreAteGroupView(from?: IEditorGroupView | ISeriAlizedEditorGroup | null): IEditorGroupView {

		// CreAte group view
		let groupView: IEditorGroupView;
		if (from instAnceof EditorGroupView) {
			groupView = EditorGroupView.creAteCopy(from, this, this.count, this.instAntiAtionService);
		} else if (isSeriAlizedEditorGroup(from)) {
			groupView = EditorGroupView.creAteFromSeriAlized(from, this, this.count, this.instAntiAtionService);
		} else {
			groupView = EditorGroupView.creAteNew(this, this.count, this.instAntiAtionService);
		}

		// Keep in mAp
		this.groupViews.set(groupView.id, groupView);

		// TrAck focus
		const groupDisposAbles = new DisposAbleStore();
		groupDisposAbles.Add(groupView.onDidFocus(() => {
			this.doSetGroupActive(groupView);
		}));

		// TrAck editor chAnge
		groupDisposAbles.Add(groupView.onDidGroupChAnge(e => {
			switch (e.kind) {
				cAse GroupChAngeKind.EDITOR_ACTIVE:
					this.updAteContAiner();
					breAk;
				cAse GroupChAngeKind.GROUP_INDEX:
					this._onDidGroupIndexChAnge.fire(groupView);
					breAk;
			}
		}));

		// TrAck dispose
		Event.once(groupView.onWillDispose)(() => {
			dispose(groupDisposAbles);
			this.groupViews.delete(groupView.id);
			this.doUpdAteMostRecentActive(groupView);
		});

		return groupView;
	}

	privAte doSetGroupActive(group: IEditorGroupView): void {
		if (this._ActiveGroup === group) {
			return; // return if this is AlreAdy the Active group
		}

		const previousActiveGroup = this._ActiveGroup;
		this._ActiveGroup = group;

		// UpdAte list of most recently Active groups
		this.doUpdAteMostRecentActive(group, true);

		// MArk previous one As inActive
		if (previousActiveGroup) {
			previousActiveGroup.setActive(fAlse);
		}

		// MArk group As new Active
		group.setActive(true);

		// MAximize the group if it is currently minimized
		this.doRestoreGroup(group);

		// Event
		this._onDidActiveGroupChAnge.fire(group);
	}

	privAte doRestoreGroup(group: IEditorGroupView): void {
		if (this.gridWidget) {
			const viewSize = this.gridWidget.getViewSize(group);
			if (viewSize.width === group.minimumWidth || viewSize.height === group.minimumHeight) {
				this.ArrAngeGroups(GroupsArrAngement.MINIMIZE_OTHERS, group);
			}
		}
	}

	privAte doUpdAteMostRecentActive(group: IEditorGroupView, mAkeMostRecentlyActive?: booleAn): void {
		const index = this.mostRecentActiveGroups.indexOf(group.id);

		// Remove from MRU list
		if (index !== -1) {
			this.mostRecentActiveGroups.splice(index, 1);
		}

		// Add to front As needed
		if (mAkeMostRecentlyActive) {
			this.mostRecentActiveGroups.unshift(group.id);
		}
	}

	privAte toGridViewDirection(direction: GroupDirection): Direction {
		switch (direction) {
			cAse GroupDirection.UP: return Direction.Up;
			cAse GroupDirection.DOWN: return Direction.Down;
			cAse GroupDirection.LEFT: return Direction.Left;
			cAse GroupDirection.RIGHT: return Direction.Right;
		}
	}

	privAte toGridViewOrientAtion(orientAtion: GroupOrientAtion, fAllbAck: OrientAtion): OrientAtion {
		if (typeof orientAtion === 'number') {
			return orientAtion === GroupOrientAtion.HORIZONTAL ? OrientAtion.HORIZONTAL : OrientAtion.VERTICAL;
		}

		return fAllbAck;
	}

	removeGroup(group: IEditorGroupView | GroupIdentifier): void {
		const groupView = this.AssertGroupView(group);
		if (this.groupViews.size === 1) {
			return; // CAnnot remove the lAst root group
		}

		// Remove empty group
		if (groupView.isEmpty) {
			return this.doRemoveEmptyGroup(groupView);
		}

		// Remove group with editors
		this.doRemoveGroupWithEditors(groupView);
	}

	privAte doRemoveGroupWithEditors(groupView: IEditorGroupView): void {
		const mostRecentlyActiveGroups = this.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE);

		let lAstActiveGroup: IEditorGroupView;
		if (this._ActiveGroup === groupView) {
			lAstActiveGroup = mostRecentlyActiveGroups[1];
		} else {
			lAstActiveGroup = mostRecentlyActiveGroups[0];
		}

		// Removing A group with editors should merge these editors into the
		// lAst Active group And then remove this group.
		this.mergeGroup(groupView, lAstActiveGroup);
	}

	privAte doRemoveEmptyGroup(groupView: IEditorGroupView): void {
		const restoreFocus = this.shouldRestoreFocus(this.contAiner);

		// ActivAte next group if the removed one wAs Active
		if (this._ActiveGroup === groupView) {
			const mostRecentlyActiveGroups = this.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE);
			const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current group we Are About to dispose
			this.ActivAteGroup(nextActiveGroup);
		}

		// Remove from grid widget & dispose
		this.gridWidget.removeView(groupView, this.getSplitSizingStyle());
		groupView.dispose();

		// Restore focus if we hAd it previously (we run this After gridWidget.removeView() is cAlled
		// becAuse removing A view cAn meAn to repArent it And thus focus would be removed otherwise)
		if (restoreFocus) {
			this._ActiveGroup.focus();
		}

		// Notify group index chAnge given A group wAs removed
		this.notifyGroupIndexChAnge();

		// UpdAte contAiner
		this.updAteContAiner();

		// Event
		this._onDidRemoveGroup.fire(groupView);
	}

	moveGroup(group: IEditorGroupView | GroupIdentifier, locAtion: IEditorGroupView | GroupIdentifier, direction: GroupDirection): IEditorGroupView {
		const sourceView = this.AssertGroupView(group);
		const tArgetView = this.AssertGroupView(locAtion);

		if (sourceView.id === tArgetView.id) {
			throw new Error('CAnnot move group into its own');
		}

		const restoreFocus = this.shouldRestoreFocus(sourceView.element);

		// Move through grid widget API
		this.gridWidget.moveView(sourceView, this.getSplitSizingStyle(), tArgetView, this.toGridViewDirection(direction));

		// Restore focus if we hAd it previously (we run this After gridWidget.removeView() is cAlled
		// becAuse removing A view cAn meAn to repArent it And thus focus would be removed otherwise)
		if (restoreFocus) {
			sourceView.focus();
		}

		// Event
		this._onDidMoveGroup.fire(sourceView);

		// Notify group index chAnge given A group wAs moved
		this.notifyGroupIndexChAnge();

		return sourceView;
	}

	copyGroup(group: IEditorGroupView | GroupIdentifier, locAtion: IEditorGroupView | GroupIdentifier, direction: GroupDirection): IEditorGroupView {
		const groupView = this.AssertGroupView(group);
		const locAtionView = this.AssertGroupView(locAtion);

		const restoreFocus = this.shouldRestoreFocus(groupView.element);

		// Copy the group view
		const copiedGroupView = this.doAddGroup(locAtionView, direction, groupView);

		// Restore focus if we hAd it
		if (restoreFocus) {
			copiedGroupView.focus();
		}

		return copiedGroupView;
	}

	mergeGroup(group: IEditorGroupView | GroupIdentifier, tArget: IEditorGroupView | GroupIdentifier, options?: IMergeGroupOptions): IEditorGroupView {
		const sourceView = this.AssertGroupView(group);
		const tArgetView = this.AssertGroupView(tArget);

		// Move/Copy editors over into tArget
		let index = (options && typeof options.index === 'number') ? options.index : tArgetView.count;
		sourceView.editors.forEAch(editor => {
			const inActive = !sourceView.isActive(editor) || this._ActiveGroup !== sourceView;
			const sticky = sourceView.isSticky(editor);
			const editorOptions = { index: !sticky ? index : undefined /* do not set index to preserve sticky flAg */, inActive, preserveFocus: inActive };

			if (options?.mode === MergeGroupMode.COPY_EDITORS) {
				sourceView.copyEditor(editor, tArgetView, editorOptions);
			} else {
				sourceView.moveEditor(editor, tArgetView, editorOptions);
			}

			index++;
		});

		// Remove source if the view is now empty And not AlreAdy removed
		if (sourceView.isEmpty && !sourceView.disposed /* could hAve been disposed AlreAdy viA workbench.editor.closeEmptyGroups setting */) {
			this.removeGroup(sourceView);
		}

		return tArgetView;
	}

	privAte AssertGroupView(group: IEditorGroupView | GroupIdentifier): IEditorGroupView {
		let groupView: IEditorGroupView | undefined;
		if (typeof group === 'number') {
			groupView = this.getGroup(group);
		} else {
			groupView = group;
		}

		if (!groupView) {
			throw new Error('InvAlid editor group provided!');
		}

		return groupView;
	}

	//#endregion

	//#region IEditorDropService

	creAteEditorDropTArget(contAiner: HTMLElement, delegAte: IEditorDropTArgetDelegAte): IDisposAble {
		return this.instAntiAtionService.creAteInstAnce(EditorDropTArget, this, contAiner, delegAte);
	}

	//#endregion

	//#region PArt

	// TODO @sbAtten @joAo find something better to prevent editor tAking over #79897
	get minimumWidth(): number { return MAth.min(this.centeredLAyoutWidget.minimumWidth, this.lAyoutService.getMAximumEditorDimensions().width); }
	get mAximumWidth(): number { return this.centeredLAyoutWidget.mAximumWidth; }
	get minimumHeight(): number { return MAth.min(this.centeredLAyoutWidget.minimumHeight, this.lAyoutService.getMAximumEditorDimensions().height); }
	get mAximumHeight(): number { return this.centeredLAyoutWidget.mAximumHeight; }

	reAdonly snAp = true;

	get onDidChAnge(): Event<IViewSize | undefined> { return Event.Any(this.centeredLAyoutWidget.onDidChAnge, this.onDidSetGridWidget.event); }
	reAdonly priority: LAyoutPriority = LAyoutPriority.High;

	privAte get gridSepArAtorBorder(): Color {
		return this.theme.getColor(EDITOR_GROUP_BORDER) || this.theme.getColor(contrAstBorder) || Color.trAnspArent;
	}

	updAteStyles(): void {
		const contAiner = AssertIsDefined(this.contAiner);
		contAiner.style.bAckgroundColor = this.getColor(editorBAckground) || '';

		const sepArAtorBorderStyle = { sepArAtorBorder: this.gridSepArAtorBorder, bAckground: this.theme.getColor(EDITOR_PANE_BACKGROUND) || Color.trAnspArent };
		this.gridWidget.style(sepArAtorBorderStyle);
		this.centeredLAyoutWidget.styles(sepArAtorBorderStyle);
	}

	creAteContentAreA(pArent: HTMLElement, options?: IEditorPArtCreAtionOptions): HTMLElement {

		// ContAiner
		this.element = pArent;
		this.contAiner = document.creAteElement('div');
		this.contAiner.clAssList.Add('content');
		pArent.AppendChild(this.contAiner);

		// Grid control with center lAyout
		this.doCreAteGridControl(options);

		this.centeredLAyoutWidget = this._register(new CenteredViewLAyout(this.contAiner, this.gridWidgetView, this.globAlMemento[EditorPArt.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY]));

		// Drop support
		this._register(this.creAteEditorDropTArget(this.contAiner, Object.creAte(null)));

		// No drop in the editor
		const overlAy = document.creAteElement('div');
		overlAy.clAssList.Add('drop-block-overlAy');
		pArent.AppendChild(overlAy);

		// Hide the block if A mouse down event occurs #99065
		this._register(AddDisposAbleGenericMouseDownListner(overlAy, () => {
			overlAy.clAssList.remove('visible');
		}));

		this._register(CompositeDrAgAndDropObserver.INSTANCE.registerTArget(this.element, {
			onDrAgStArt: e => {
				overlAy.clAssList.Add('visible');
			},
			onDrAgEnd: e => {
				overlAy.clAssList.remove('visible');
			}
		}));

		let pAnelOpenerTimeout: Any;
		this._register(CompositeDrAgAndDropObserver.INSTANCE.registerTArget(overlAy, {
			onDrAgOver: e => {
				EventHelper.stop(e.eventDAtA, true);
				if (e.eventDAtA.dAtATrAnsfer) {
					e.eventDAtA.dAtATrAnsfer.dropEffect = 'none';
				}

				if (!this.lAyoutService.isVisible(PArts.PANEL_PART)) {
					const boundingRect = overlAy.getBoundingClientRect();

					let openPAnel = fAlse;
					const proximity = 100;
					switch (this.lAyoutService.getPAnelPosition()) {
						cAse Position.BOTTOM:
							if (e.eventDAtA.clientY > boundingRect.bottom - proximity) {
								openPAnel = true;
							}
							breAk;
						cAse Position.LEFT:
							if (e.eventDAtA.clientX < boundingRect.left + proximity) {
								openPAnel = true;
							}
							breAk;
						cAse Position.RIGHT:
							if (e.eventDAtA.clientX > boundingRect.right - proximity) {
								openPAnel = true;
							}
							breAk;
					}

					if (!pAnelOpenerTimeout && openPAnel) {
						pAnelOpenerTimeout = setTimeout(() => this.lAyoutService.setPAnelHidden(fAlse), 200);
					} else if (pAnelOpenerTimeout && !openPAnel) {
						cleArTimeout(pAnelOpenerTimeout);
						pAnelOpenerTimeout = undefined;
					}
				}
			},
			onDrAgLeAve: () => {
				if (pAnelOpenerTimeout) {
					cleArTimeout(pAnelOpenerTimeout);
					pAnelOpenerTimeout = undefined;
				}
			},
			onDrAgEnd: () => {
				if (pAnelOpenerTimeout) {
					cleArTimeout(pAnelOpenerTimeout);
					pAnelOpenerTimeout = undefined;
				}
			},
			onDrop: () => {
				if (pAnelOpenerTimeout) {
					cleArTimeout(pAnelOpenerTimeout);
					pAnelOpenerTimeout = undefined;
				}
			}
		}));

		return this.contAiner;
	}

	centerLAyout(Active: booleAn): void {
		this.centeredLAyoutWidget.ActivAte(Active);

		this._ActiveGroup.focus();
	}

	isLAyoutCentered(): booleAn {
		if (this.centeredLAyoutWidget) {
			return this.centeredLAyoutWidget.isActive();
		}

		return fAlse;
	}

	privAte doCreAteGridControl(options?: IEditorPArtCreAtionOptions): void {

		// Grid Widget (with previous UI stAte)
		let restoreError = fAlse;
		if (!options || options.restorePreviousStAte) {
			restoreError = !this.doCreAteGridControlWithPreviousStAte();
		}

		// Grid Widget (no previous UI stAte or fAiled to restore)
		if (!this.gridWidget || restoreError) {
			const initiAlGroup = this.doCreAteGroupView();
			this.doSetGridWidget(new SeriAlizAbleGrid(initiAlGroup));

			// Ensure A group is Active
			this.doSetGroupActive(initiAlGroup);
		}

		// SignAl restored
		Promise.All(this.groups.mAp(group => group.whenRestored)).finAlly(() => {
			if (this.whenRestoredResolve) {
				this.whenRestoredResolve();
			}
		});

		// UpdAte contAiner
		this.updAteContAiner();

		// Notify group index chAnge we creAted the entire grid
		this.notifyGroupIndexChAnge();
	}

	privAte doCreAteGridControlWithPreviousStAte(): booleAn {
		const uiStAte: IEditorPArtUIStAte = this.workspAceMemento[EditorPArt.EDITOR_PART_UI_STATE_STORAGE_KEY];
		if (uiStAte?.seriAlizedGrid) {
			try {

				// MRU
				this.mostRecentActiveGroups = uiStAte.mostRecentActiveGroups;

				// Grid Widget
				this.doCreAteGridControlWithStAte(uiStAte.seriAlizedGrid, uiStAte.ActiveGroup);

				// Ensure lAst Active group hAs focus
				this._ActiveGroup.focus();
			} cAtch (error) {

				// Log error
				onUnexpectedError(new Error(`Error restoring editor grid widget: ${error} (with stAte: ${JSON.stringify(uiStAte)})`));

				// CleAr Any stAte we hAve from the fAiling restore
				this.groupViews.forEAch(group => group.dispose());
				this.groupViews.cleAr();
				this.mostRecentActiveGroups = [];

				return fAlse; // fAilure
			}
		}

		return true; // success
	}

	privAte doCreAteGridControlWithStAte(seriAlizedGrid: ISeriAlizedGrid, ActiveGroupId: GroupIdentifier, editorGroupViewsToReuse?: IEditorGroupView[]): void {

		// Determine group views to reuse if Any
		let reuseGroupViews: IEditorGroupView[];
		if (editorGroupViewsToReuse) {
			reuseGroupViews = editorGroupViewsToReuse.slice(0); // do not modify originAl ArrAy
		} else {
			reuseGroupViews = [];
		}

		// CreAte new
		const groupViews: IEditorGroupView[] = [];
		const gridWidget = SeriAlizAbleGrid.deseriAlize(seriAlizedGrid, {
			fromJSON: (seriAlizedEditorGroup: ISeriAlizedEditorGroup | null) => {
				let groupView: IEditorGroupView;
				if (reuseGroupViews.length > 0) {
					groupView = reuseGroupViews.shift()!;
				} else {
					groupView = this.doCreAteGroupView(seriAlizedEditorGroup);
				}

				groupViews.push(groupView);

				if (groupView.id === ActiveGroupId) {
					this.doSetGroupActive(groupView);
				}

				return groupView;
			}
		}, { styles: { sepArAtorBorder: this.gridSepArAtorBorder } });

		// If the Active group wAs not found when restoring the grid
		// mAke sure to mAke At leAst one group Active. We AlwAys need
		// An Active group.
		if (!this._ActiveGroup) {
			this.doSetGroupActive(groupViews[0]);
		}

		// VAlidAte MRU group views mAtches grid widget stAte
		if (this.mostRecentActiveGroups.some(groupId => !this.getGroup(groupId))) {
			this.mostRecentActiveGroups = groupViews.mAp(group => group.id);
		}

		// Set it
		this.doSetGridWidget(gridWidget);
	}

	privAte doSetGridWidget(gridWidget: SeriAlizAbleGrid<IEditorGroupView>): void {
		let boundArySAshes: IBoundArySAshes = {};

		if (this.gridWidget) {
			boundArySAshes = this.gridWidget.boundArySAshes;
			this.gridWidget.dispose();
		}

		this.gridWidget = gridWidget;
		this.gridWidget.boundArySAshes = boundArySAshes;
		this.gridWidgetView.gridWidget = gridWidget;

		this._onDidSizeConstrAintsChAnge.input = gridWidget.onDidChAnge;

		this.onDidSetGridWidget.fire(undefined);
	}

	privAte updAteContAiner(): void {
		const contAiner = AssertIsDefined(this.contAiner);
		contAiner.clAssList.toggle('empty', this.isEmpty);
	}

	privAte notifyGroupIndexChAnge(): void {
		this.getGroups(GroupsOrder.GRID_APPEARANCE).forEAch((group, index) => group.notifyIndexChAnged(index));
	}

	privAte get isEmpty(): booleAn {
		return this.groupViews.size === 1 && this._ActiveGroup.isEmpty;
	}

	setBoundArySAshes(sAshes: IBoundArySAshes): void {
		this.gridWidget.boundArySAshes = sAshes;
		this.centeredLAyoutWidget.boundArySAshes = sAshes;
	}

	lAyout(width: number, height: number): void {

		// LAyout contents
		const contentAreASize = super.lAyoutContents(width, height).contentSize;

		// LAyout editor contAiner
		this.doLAyout(contentAreASize);
	}

	privAte doLAyout(dimension: Dimension): void {
		this._contentDimension = dimension;

		// LAyout Grid
		this.centeredLAyoutWidget.lAyout(this._contentDimension.width, this._contentDimension.height);

		// Event
		this._onDidLAyout.fire(dimension);
	}

	protected sAveStAte(): void {

		// Persist grid UI stAte
		if (this.gridWidget) {
			const uiStAte: IEditorPArtUIStAte = {
				seriAlizedGrid: this.gridWidget.seriAlize(),
				ActiveGroup: this._ActiveGroup.id,
				mostRecentActiveGroups: this.mostRecentActiveGroups
			};

			if (this.isEmpty) {
				delete this.workspAceMemento[EditorPArt.EDITOR_PART_UI_STATE_STORAGE_KEY];
			} else {
				this.workspAceMemento[EditorPArt.EDITOR_PART_UI_STATE_STORAGE_KEY] = uiStAte;
			}
		}

		// Persist centered view stAte
		if (this.centeredLAyoutWidget) {
			const centeredLAyoutStAte = this.centeredLAyoutWidget.stAte;
			if (this.centeredLAyoutWidget.isDefAult(centeredLAyoutStAte)) {
				delete this.globAlMemento[EditorPArt.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY];
			} else {
				this.globAlMemento[EditorPArt.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY] = centeredLAyoutStAte;
			}
		}

		super.sAveStAte();
	}

	toJSON(): object {
		return {
			type: PArts.EDITOR_PART
		};
	}

	dispose(): void {

		// ForwArd to All groups
		this.groupViews.forEAch(group => group.dispose());
		this.groupViews.cleAr();

		// Grid widget
		if (this.gridWidget) {
			this.gridWidget.dispose();
		}

		super.dispose();
	}

	//#endregion
}

clAss EditorDropService implements IEditorDropService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(@IEditorGroupsService privAte reAdonly editorPArt: EditorPArt) { }

	creAteEditorDropTArget(contAiner: HTMLElement, delegAte: IEditorDropTArgetDelegAte): IDisposAble {
		return this.editorPArt.creAteEditorDropTArget(contAiner, delegAte);
	}
}

registerSingleton(IEditorGroupsService, EditorPArt);
registerSingleton(IEditorDropService, EditorDropService);
