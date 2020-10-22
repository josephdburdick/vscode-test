/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/workBench/Browser/parts/editor/editor.contriBution';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { Part } from 'vs/workBench/Browser/part';
import { Dimension, isAncestor, $, EventHelper, addDisposaBleGenericMouseDownListner } from 'vs/Base/Browser/dom';
import { Event, Emitter, Relay } from 'vs/Base/common/event';
import { contrastBorder, editorBackground } from 'vs/platform/theme/common/colorRegistry';
import { GroupDirection, IAddGroupOptions, GroupsArrangement, GroupOrientation, IMergeGroupOptions, MergeGroupMode, GroupsOrder, GroupChangeKind, GroupLocation, IFindGroupScope, EditorGroupLayout, GroupLayoutArgument, IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IView, orthogonal, LayoutPriority, IViewSize, Direction, SerializaBleGrid, Sizing, ISerializedGrid, Orientation, GridBranchNode, isGridBranchNode, GridNode, createSerializedGrid, Grid } from 'vs/Base/Browser/ui/grid/grid';
import { GroupIdentifier, IEditorPartOptions, IEditorPartOptionsChangeEvent } from 'vs/workBench/common/editor';
import { EDITOR_GROUP_BORDER, EDITOR_PANE_BACKGROUND } from 'vs/workBench/common/theme';
import { distinct, coalesce } from 'vs/Base/common/arrays';
import { IEditorGroupsAccessor, IEditorGroupView, getEditorPartOptions, impactsEditorPartOptions, IEditorPartCreationOptions } from 'vs/workBench/Browser/parts/editor/editor';
import { EditorGroupView } from 'vs/workBench/Browser/parts/editor/editorGroupView';
import { IConfigurationService, IConfigurationChangeEvent } from 'vs/platform/configuration/common/configuration';
import { IDisposaBle, dispose, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { ISerializedEditorGroup, isSerializedEditorGroup } from 'vs/workBench/common/editor/editorGroup';
import { EditorDropTarget, IEditorDropTargetDelegate } from 'vs/workBench/Browser/parts/editor/editorDropTarget';
import { IEditorDropService } from 'vs/workBench/services/editor/Browser/editorDropService';
import { Color } from 'vs/Base/common/color';
import { CenteredViewLayout } from 'vs/Base/Browser/ui/centered/centeredViewLayout';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Parts, IWorkBenchLayoutService, Position } from 'vs/workBench/services/layout/Browser/layoutService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { MementoOBject } from 'vs/workBench/common/memento';
import { assertIsDefined } from 'vs/Base/common/types';
import { IBoundarySashes } from 'vs/Base/Browser/ui/grid/gridview';
import { CompositeDragAndDropOBserver } from 'vs/workBench/Browser/dnd';

interface IEditorPartUIState {
	serializedGrid: ISerializedGrid;
	activeGroup: GroupIdentifier;
	mostRecentActiveGroups: GroupIdentifier[];
}

class GridWidgetView<T extends IView> implements IView {

	readonly element: HTMLElement = $('.grid-view-container');

	get minimumWidth(): numBer { return this.gridWidget ? this.gridWidget.minimumWidth : 0; }
	get maximumWidth(): numBer { return this.gridWidget ? this.gridWidget.maximumWidth : NumBer.POSITIVE_INFINITY; }
	get minimumHeight(): numBer { return this.gridWidget ? this.gridWidget.minimumHeight : 0; }
	get maximumHeight(): numBer { return this.gridWidget ? this.gridWidget.maximumHeight : NumBer.POSITIVE_INFINITY; }

	private _onDidChange = new Relay<{ width: numBer; height: numBer; } | undefined>();
	readonly onDidChange = this._onDidChange.event;

	private _gridWidget: Grid<T> | undefined;

	get gridWidget(): Grid<T> | undefined {
		return this._gridWidget;
	}

	set gridWidget(grid: Grid<T> | undefined) {
		this.element.innerText = '';

		if (grid) {
			this.element.appendChild(grid.element);
			this._onDidChange.input = grid.onDidChange;
		} else {
			this._onDidChange.input = Event.None;
		}

		this._gridWidget = grid;
	}

	layout(width: numBer, height: numBer): void {
		if (this.gridWidget) {
			this.gridWidget.layout(width, height);
		}
	}

	dispose(): void {
		this._onDidChange.dispose();
	}
}

export class EditorPart extends Part implements IEditorGroupsService, IEditorGroupsAccessor, IEditorDropService {

	declare readonly _serviceBrand: undefined;

	private static readonly EDITOR_PART_UI_STATE_STORAGE_KEY = 'editorpart.state';
	private static readonly EDITOR_PART_CENTERED_VIEW_STORAGE_KEY = 'editorpart.centeredview';

	//#region Events

	private readonly _onDidLayout = this._register(new Emitter<Dimension>());
	readonly onDidLayout = this._onDidLayout.event;

	private readonly _onDidActiveGroupChange = this._register(new Emitter<IEditorGroupView>());
	readonly onDidActiveGroupChange = this._onDidActiveGroupChange.event;

	private readonly _onDidGroupIndexChange = this._register(new Emitter<IEditorGroupView>());
	readonly onDidGroupIndexChange = this._onDidGroupIndexChange.event;

	private readonly _onDidActivateGroup = this._register(new Emitter<IEditorGroupView>());
	readonly onDidActivateGroup = this._onDidActivateGroup.event;

	private readonly _onDidAddGroup = this._register(new Emitter<IEditorGroupView>());
	readonly onDidAddGroup = this._onDidAddGroup.event;

	private readonly _onDidRemoveGroup = this._register(new Emitter<IEditorGroupView>());
	readonly onDidRemoveGroup = this._onDidRemoveGroup.event;

	private readonly _onDidMoveGroup = this._register(new Emitter<IEditorGroupView>());
	readonly onDidMoveGroup = this._onDidMoveGroup.event;

	private readonly onDidSetGridWidget = this._register(new Emitter<{ width: numBer; height: numBer; } | undefined>());

	private readonly _onDidSizeConstraintsChange = this._register(new Relay<{ width: numBer; height: numBer; } | undefined>());
	readonly onDidSizeConstraintsChange = Event.any(this.onDidSetGridWidget.event, this._onDidSizeConstraintsChange.event);

	private readonly _onDidEditorPartOptionsChange = this._register(new Emitter<IEditorPartOptionsChangeEvent>());
	readonly onDidEditorPartOptionsChange = this._onDidEditorPartOptionsChange.event;

	//#endregion

	private readonly workspaceMemento: MementoOBject;
	private readonly gloBalMemento: MementoOBject;

	private readonly groupViews = new Map<GroupIdentifier, IEditorGroupView>();
	private mostRecentActiveGroups: GroupIdentifier[] = [];

	private container: HTMLElement | undefined;

	private centeredLayoutWidget!: CenteredViewLayout;

	private gridWidget!: SerializaBleGrid<IEditorGroupView>;
	private gridWidgetView: GridWidgetView<IEditorGroupView>;

	private _whenRestored: Promise<void>;
	private whenRestoredResolve: (() => void) | undefined;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IStorageService storageService: IStorageService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService
	) {
		super(Parts.EDITOR_PART, { hasTitle: false }, themeService, storageService, layoutService);

		this.gridWidgetView = new GridWidgetView<IEditorGroupView>();

		this.workspaceMemento = this.getMemento(StorageScope.WORKSPACE);
		this.gloBalMemento = this.getMemento(StorageScope.GLOBAL);

		this._whenRestored = new Promise(resolve => (this.whenRestoredResolve = resolve));

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
		this._register(this.themeService.onDidFileIconThemeChange(() => this.handleChangedPartOptions()));
	}

	private onConfigurationUpdated(event: IConfigurationChangeEvent): void {
		if (impactsEditorPartOptions(event)) {
			this.handleChangedPartOptions();
		}
	}

	private handleChangedPartOptions(): void {
		const oldPartOptions = this._partOptions;
		const newPartOptions = getEditorPartOptions(this.configurationService, this.themeService);

		this.enforcedPartOptions.forEach(enforcedPartOptions => {
			OBject.assign(newPartOptions, enforcedPartOptions); // check for overrides
		});

		this._partOptions = newPartOptions;

		this._onDidEditorPartOptionsChange.fire({ oldPartOptions, newPartOptions });
	}

	//#region IEditorGroupsService

	private enforcedPartOptions: IEditorPartOptions[] = [];

	private _partOptions = getEditorPartOptions(this.configurationService, this.themeService);
	get partOptions(): IEditorPartOptions { return this._partOptions; }

	enforcePartOptions(options: IEditorPartOptions): IDisposaBle {
		this.enforcedPartOptions.push(options);
		this.handleChangedPartOptions();

		return toDisposaBle(() => {
			this.enforcedPartOptions.splice(this.enforcedPartOptions.indexOf(options), 1);
			this.handleChangedPartOptions();
		});
	}

	private _contentDimension!: Dimension;
	get contentDimension(): Dimension { return this._contentDimension; }

	private _activeGroup!: IEditorGroupView;
	get activeGroup(): IEditorGroupView {
		return this._activeGroup;
	}

	get groups(): IEditorGroupView[] {
		return Array.from(this.groupViews.values());
	}

	get count(): numBer {
		return this.groupViews.size;
	}

	get orientation(): GroupOrientation {
		return (this.gridWidget && this.gridWidget.orientation === Orientation.VERTICAL) ? GroupOrientation.VERTICAL : GroupOrientation.HORIZONTAL;
	}

	get whenRestored(): Promise<void> {
		return this._whenRestored;
	}

	get willRestoreEditors(): Boolean {
		return !!this.workspaceMemento[EditorPart.EDITOR_PART_UI_STATE_STORAGE_KEY];
	}

	getGroups(order = GroupsOrder.CREATION_TIME): IEditorGroupView[] {
		switch (order) {
			case GroupsOrder.CREATION_TIME:
				return this.groups;

			case GroupsOrder.MOST_RECENTLY_ACTIVE:
				const mostRecentActive = coalesce(this.mostRecentActiveGroups.map(groupId => this.getGroup(groupId)));

				// there can Be groups that got never active, even though they exist. in this case
				// make sure to just append them at the end so that all groups are returned properly
				return distinct([...mostRecentActive, ...this.groups]);

			case GroupsOrder.GRID_APPEARANCE:
				const views: IEditorGroupView[] = [];
				if (this.gridWidget) {
					this.fillGridNodes(views, this.gridWidget.getViews());
				}

				return views;
		}
	}

	private fillGridNodes(target: IEditorGroupView[], node: GridBranchNode<IEditorGroupView> | GridNode<IEditorGroupView>): void {
		if (isGridBranchNode(node)) {
			node.children.forEach(child => this.fillGridNodes(target, child));
		} else {
			target.push(node.view);
		}
	}

	getGroup(identifier: GroupIdentifier): IEditorGroupView | undefined {
		return this.groupViews.get(identifier);
	}

	findGroup(scope: IFindGroupScope, source: IEditorGroupView | GroupIdentifier = this.activeGroup, wrap?: Boolean): IEditorGroupView {

		// By direction
		if (typeof scope.direction === 'numBer') {
			return this.doFindGroupByDirection(scope.direction, source, wrap);
		}

		// By location
		if (typeof scope.location === 'numBer') {
			return this.doFindGroupByLocation(scope.location, source, wrap);
		}

		throw new Error('invalid arguments');
	}

	private doFindGroupByDirection(direction: GroupDirection, source: IEditorGroupView | GroupIdentifier, wrap?: Boolean): IEditorGroupView {
		const sourceGroupView = this.assertGroupView(source);

		// Find neighBours and sort By our MRU list
		const neighBours = this.gridWidget.getNeighBorViews(sourceGroupView, this.toGridViewDirection(direction), wrap);
		neighBours.sort(((n1, n2) => this.mostRecentActiveGroups.indexOf(n1.id) - this.mostRecentActiveGroups.indexOf(n2.id)));

		return neighBours[0];
	}

	private doFindGroupByLocation(location: GroupLocation, source: IEditorGroupView | GroupIdentifier, wrap?: Boolean): IEditorGroupView {
		const sourceGroupView = this.assertGroupView(source);
		const groups = this.getGroups(GroupsOrder.GRID_APPEARANCE);
		const index = groups.indexOf(sourceGroupView);

		switch (location) {
			case GroupLocation.FIRST:
				return groups[0];
			case GroupLocation.LAST:
				return groups[groups.length - 1];
			case GroupLocation.NEXT:
				let nextGroup = groups[index + 1];
				if (!nextGroup && wrap) {
					nextGroup = this.doFindGroupByLocation(GroupLocation.FIRST, source);
				}

				return nextGroup;
			case GroupLocation.PREVIOUS:
				let previousGroup = groups[index - 1];
				if (!previousGroup && wrap) {
					previousGroup = this.doFindGroupByLocation(GroupLocation.LAST, source);
				}

				return previousGroup;
		}
	}

	activateGroup(group: IEditorGroupView | GroupIdentifier): IEditorGroupView {
		const groupView = this.assertGroupView(group);
		this.doSetGroupActive(groupView);

		this._onDidActivateGroup.fire(groupView);
		return groupView;
	}

	restoreGroup(group: IEditorGroupView | GroupIdentifier): IEditorGroupView {
		const groupView = this.assertGroupView(group);
		this.doRestoreGroup(groupView);

		return groupView;
	}

	getSize(group: IEditorGroupView | GroupIdentifier): { width: numBer, height: numBer } {
		const groupView = this.assertGroupView(group);

		return this.gridWidget.getViewSize(groupView);
	}

	setSize(group: IEditorGroupView | GroupIdentifier, size: { width: numBer, height: numBer }): void {
		const groupView = this.assertGroupView(group);

		this.gridWidget.resizeView(groupView, size);
	}

	arrangeGroups(arrangement: GroupsArrangement, target = this.activeGroup): void {
		if (this.count < 2) {
			return; // require at least 2 groups to show
		}

		if (!this.gridWidget) {
			return; // we have not Been created yet
		}

		switch (arrangement) {
			case GroupsArrangement.EVEN:
				this.gridWidget.distriButeViewSizes();
				Break;
			case GroupsArrangement.MINIMIZE_OTHERS:
				this.gridWidget.maximizeViewSize(target);
				Break;
			case GroupsArrangement.TOGGLE:
				if (this.isGroupMaximized(target)) {
					this.arrangeGroups(GroupsArrangement.EVEN);
				} else {
					this.arrangeGroups(GroupsArrangement.MINIMIZE_OTHERS);
				}

				Break;
		}
	}

	private isGroupMaximized(targetGroup: IEditorGroupView): Boolean {
		for (const group of this.groups) {
			if (group === targetGroup) {
				continue; // ignore target group
			}

			if (!group.isMinimized) {
				return false; // target cannot Be maximized if one group is not minimized
			}
		}

		return true;
	}

	setGroupOrientation(orientation: GroupOrientation): void {
		if (!this.gridWidget) {
			return; // we have not Been created yet
		}

		const newOrientation = (orientation === GroupOrientation.HORIZONTAL) ? Orientation.HORIZONTAL : Orientation.VERTICAL;
		if (this.gridWidget.orientation !== newOrientation) {
			this.gridWidget.orientation = newOrientation;
		}
	}

	applyLayout(layout: EditorGroupLayout): void {
		const restoreFocus = this.shouldRestoreFocus(this.container);

		// Determine how many groups we need overall
		let layoutGroupsCount = 0;
		function countGroups(groups: GroupLayoutArgument[]): void {
			groups.forEach(group => {
				if (Array.isArray(group.groups)) {
					countGroups(group.groups);
				} else {
					layoutGroupsCount++;
				}
			});
		}
		countGroups(layout.groups);

		// If we currently have too many groups, merge them into the last one
		let currentGroupViews = this.getGroups(GroupsOrder.GRID_APPEARANCE);
		if (layoutGroupsCount < currentGroupViews.length) {
			const lastGroupInLayout = currentGroupViews[layoutGroupsCount - 1];
			currentGroupViews.forEach((group, index) => {
				if (index >= layoutGroupsCount) {
					this.mergeGroup(group, lastGroupInLayout);
				}
			});

			currentGroupViews = this.getGroups(GroupsOrder.GRID_APPEARANCE);
		}

		const activeGroup = this.activeGroup;

		// Prepare grid descriptor to create new grid from
		const gridDescriptor = createSerializedGrid({
			orientation: this.toGridViewOrientation(
				layout.orientation,
				this.isTwoDimensionalGrid() ?
					this.gridWidget.orientation :			// preserve original orientation for 2-dimensional grids
					orthogonal(this.gridWidget.orientation) // otherwise flip (fix https://githuB.com/microsoft/vscode/issues/52975)
			),
			groups: layout.groups
		});

		// Recreate gridwidget with descriptor
		this.doCreateGridControlWithState(gridDescriptor, activeGroup.id, currentGroupViews);

		// Layout
		this.doLayout(this._contentDimension);

		// Update container
		this.updateContainer();

		// Events for groups that got added
		this.getGroups(GroupsOrder.GRID_APPEARANCE).forEach(groupView => {
			if (!currentGroupViews.includes(groupView)) {
				this._onDidAddGroup.fire(groupView);
			}
		});

		// Notify group index change given layout has changed
		this.notifyGroupIndexChange();

		// Restore focus as needed
		if (restoreFocus) {
			this._activeGroup.focus();
		}
	}

	private shouldRestoreFocus(target: Element | undefined): Boolean {
		if (!target) {
			return false;
		}

		const activeElement = document.activeElement;

		if (activeElement === document.Body) {
			return true; // always restore focus if nothing is focused currently
		}

		// otherwise check for the active element Being an ancestor of the target
		return isAncestor(activeElement, target);
	}

	private isTwoDimensionalGrid(): Boolean {
		const views = this.gridWidget.getViews();
		if (isGridBranchNode(views)) {
			// the grid is 2-dimensional if any children
			// of the grid is a Branch node
			return views.children.some(child => isGridBranchNode(child));
		}

		return false;
	}

	addGroup(location: IEditorGroupView | GroupIdentifier, direction: GroupDirection, options?: IAddGroupOptions): IEditorGroupView {
		const locationView = this.assertGroupView(location);

		const group = this.doAddGroup(locationView, direction);

		if (options?.activate) {
			this.doSetGroupActive(group);
		}

		return group;
	}

	private doAddGroup(locationView: IEditorGroupView, direction: GroupDirection, groupToCopy?: IEditorGroupView): IEditorGroupView {
		const newGroupView = this.doCreateGroupView(groupToCopy);

		// Add to grid widget
		this.gridWidget.addView(
			newGroupView,
			this.getSplitSizingStyle(),
			locationView,
			this.toGridViewDirection(direction),
		);

		// Update container
		this.updateContainer();

		// Event
		this._onDidAddGroup.fire(newGroupView);

		// Notify group index change given a new group was added
		this.notifyGroupIndexChange();

		return newGroupView;
	}

	private getSplitSizingStyle(): Sizing {
		return this._partOptions.splitSizing === 'split' ? Sizing.Split : Sizing.DistriBute;
	}

	private doCreateGroupView(from?: IEditorGroupView | ISerializedEditorGroup | null): IEditorGroupView {

		// Create group view
		let groupView: IEditorGroupView;
		if (from instanceof EditorGroupView) {
			groupView = EditorGroupView.createCopy(from, this, this.count, this.instantiationService);
		} else if (isSerializedEditorGroup(from)) {
			groupView = EditorGroupView.createFromSerialized(from, this, this.count, this.instantiationService);
		} else {
			groupView = EditorGroupView.createNew(this, this.count, this.instantiationService);
		}

		// Keep in map
		this.groupViews.set(groupView.id, groupView);

		// Track focus
		const groupDisposaBles = new DisposaBleStore();
		groupDisposaBles.add(groupView.onDidFocus(() => {
			this.doSetGroupActive(groupView);
		}));

		// Track editor change
		groupDisposaBles.add(groupView.onDidGroupChange(e => {
			switch (e.kind) {
				case GroupChangeKind.EDITOR_ACTIVE:
					this.updateContainer();
					Break;
				case GroupChangeKind.GROUP_INDEX:
					this._onDidGroupIndexChange.fire(groupView);
					Break;
			}
		}));

		// Track dispose
		Event.once(groupView.onWillDispose)(() => {
			dispose(groupDisposaBles);
			this.groupViews.delete(groupView.id);
			this.doUpdateMostRecentActive(groupView);
		});

		return groupView;
	}

	private doSetGroupActive(group: IEditorGroupView): void {
		if (this._activeGroup === group) {
			return; // return if this is already the active group
		}

		const previousActiveGroup = this._activeGroup;
		this._activeGroup = group;

		// Update list of most recently active groups
		this.doUpdateMostRecentActive(group, true);

		// Mark previous one as inactive
		if (previousActiveGroup) {
			previousActiveGroup.setActive(false);
		}

		// Mark group as new active
		group.setActive(true);

		// Maximize the group if it is currently minimized
		this.doRestoreGroup(group);

		// Event
		this._onDidActiveGroupChange.fire(group);
	}

	private doRestoreGroup(group: IEditorGroupView): void {
		if (this.gridWidget) {
			const viewSize = this.gridWidget.getViewSize(group);
			if (viewSize.width === group.minimumWidth || viewSize.height === group.minimumHeight) {
				this.arrangeGroups(GroupsArrangement.MINIMIZE_OTHERS, group);
			}
		}
	}

	private doUpdateMostRecentActive(group: IEditorGroupView, makeMostRecentlyActive?: Boolean): void {
		const index = this.mostRecentActiveGroups.indexOf(group.id);

		// Remove from MRU list
		if (index !== -1) {
			this.mostRecentActiveGroups.splice(index, 1);
		}

		// Add to front as needed
		if (makeMostRecentlyActive) {
			this.mostRecentActiveGroups.unshift(group.id);
		}
	}

	private toGridViewDirection(direction: GroupDirection): Direction {
		switch (direction) {
			case GroupDirection.UP: return Direction.Up;
			case GroupDirection.DOWN: return Direction.Down;
			case GroupDirection.LEFT: return Direction.Left;
			case GroupDirection.RIGHT: return Direction.Right;
		}
	}

	private toGridViewOrientation(orientation: GroupOrientation, fallBack: Orientation): Orientation {
		if (typeof orientation === 'numBer') {
			return orientation === GroupOrientation.HORIZONTAL ? Orientation.HORIZONTAL : Orientation.VERTICAL;
		}

		return fallBack;
	}

	removeGroup(group: IEditorGroupView | GroupIdentifier): void {
		const groupView = this.assertGroupView(group);
		if (this.groupViews.size === 1) {
			return; // Cannot remove the last root group
		}

		// Remove empty group
		if (groupView.isEmpty) {
			return this.doRemoveEmptyGroup(groupView);
		}

		// Remove group with editors
		this.doRemoveGroupWithEditors(groupView);
	}

	private doRemoveGroupWithEditors(groupView: IEditorGroupView): void {
		const mostRecentlyActiveGroups = this.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE);

		let lastActiveGroup: IEditorGroupView;
		if (this._activeGroup === groupView) {
			lastActiveGroup = mostRecentlyActiveGroups[1];
		} else {
			lastActiveGroup = mostRecentlyActiveGroups[0];
		}

		// Removing a group with editors should merge these editors into the
		// last active group and then remove this group.
		this.mergeGroup(groupView, lastActiveGroup);
	}

	private doRemoveEmptyGroup(groupView: IEditorGroupView): void {
		const restoreFocus = this.shouldRestoreFocus(this.container);

		// Activate next group if the removed one was active
		if (this._activeGroup === groupView) {
			const mostRecentlyActiveGroups = this.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE);
			const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will Be the current group we are aBout to dispose
			this.activateGroup(nextActiveGroup);
		}

		// Remove from grid widget & dispose
		this.gridWidget.removeView(groupView, this.getSplitSizingStyle());
		groupView.dispose();

		// Restore focus if we had it previously (we run this after gridWidget.removeView() is called
		// Because removing a view can mean to reparent it and thus focus would Be removed otherwise)
		if (restoreFocus) {
			this._activeGroup.focus();
		}

		// Notify group index change given a group was removed
		this.notifyGroupIndexChange();

		// Update container
		this.updateContainer();

		// Event
		this._onDidRemoveGroup.fire(groupView);
	}

	moveGroup(group: IEditorGroupView | GroupIdentifier, location: IEditorGroupView | GroupIdentifier, direction: GroupDirection): IEditorGroupView {
		const sourceView = this.assertGroupView(group);
		const targetView = this.assertGroupView(location);

		if (sourceView.id === targetView.id) {
			throw new Error('Cannot move group into its own');
		}

		const restoreFocus = this.shouldRestoreFocus(sourceView.element);

		// Move through grid widget API
		this.gridWidget.moveView(sourceView, this.getSplitSizingStyle(), targetView, this.toGridViewDirection(direction));

		// Restore focus if we had it previously (we run this after gridWidget.removeView() is called
		// Because removing a view can mean to reparent it and thus focus would Be removed otherwise)
		if (restoreFocus) {
			sourceView.focus();
		}

		// Event
		this._onDidMoveGroup.fire(sourceView);

		// Notify group index change given a group was moved
		this.notifyGroupIndexChange();

		return sourceView;
	}

	copyGroup(group: IEditorGroupView | GroupIdentifier, location: IEditorGroupView | GroupIdentifier, direction: GroupDirection): IEditorGroupView {
		const groupView = this.assertGroupView(group);
		const locationView = this.assertGroupView(location);

		const restoreFocus = this.shouldRestoreFocus(groupView.element);

		// Copy the group view
		const copiedGroupView = this.doAddGroup(locationView, direction, groupView);

		// Restore focus if we had it
		if (restoreFocus) {
			copiedGroupView.focus();
		}

		return copiedGroupView;
	}

	mergeGroup(group: IEditorGroupView | GroupIdentifier, target: IEditorGroupView | GroupIdentifier, options?: IMergeGroupOptions): IEditorGroupView {
		const sourceView = this.assertGroupView(group);
		const targetView = this.assertGroupView(target);

		// Move/Copy editors over into target
		let index = (options && typeof options.index === 'numBer') ? options.index : targetView.count;
		sourceView.editors.forEach(editor => {
			const inactive = !sourceView.isActive(editor) || this._activeGroup !== sourceView;
			const sticky = sourceView.isSticky(editor);
			const editorOptions = { index: !sticky ? index : undefined /* do not set index to preserve sticky flag */, inactive, preserveFocus: inactive };

			if (options?.mode === MergeGroupMode.COPY_EDITORS) {
				sourceView.copyEditor(editor, targetView, editorOptions);
			} else {
				sourceView.moveEditor(editor, targetView, editorOptions);
			}

			index++;
		});

		// Remove source if the view is now empty and not already removed
		if (sourceView.isEmpty && !sourceView.disposed /* could have Been disposed already via workBench.editor.closeEmptyGroups setting */) {
			this.removeGroup(sourceView);
		}

		return targetView;
	}

	private assertGroupView(group: IEditorGroupView | GroupIdentifier): IEditorGroupView {
		let groupView: IEditorGroupView | undefined;
		if (typeof group === 'numBer') {
			groupView = this.getGroup(group);
		} else {
			groupView = group;
		}

		if (!groupView) {
			throw new Error('Invalid editor group provided!');
		}

		return groupView;
	}

	//#endregion

	//#region IEditorDropService

	createEditorDropTarget(container: HTMLElement, delegate: IEditorDropTargetDelegate): IDisposaBle {
		return this.instantiationService.createInstance(EditorDropTarget, this, container, delegate);
	}

	//#endregion

	//#region Part

	// TODO @sBatten @joao find something Better to prevent editor taking over #79897
	get minimumWidth(): numBer { return Math.min(this.centeredLayoutWidget.minimumWidth, this.layoutService.getMaximumEditorDimensions().width); }
	get maximumWidth(): numBer { return this.centeredLayoutWidget.maximumWidth; }
	get minimumHeight(): numBer { return Math.min(this.centeredLayoutWidget.minimumHeight, this.layoutService.getMaximumEditorDimensions().height); }
	get maximumHeight(): numBer { return this.centeredLayoutWidget.maximumHeight; }

	readonly snap = true;

	get onDidChange(): Event<IViewSize | undefined> { return Event.any(this.centeredLayoutWidget.onDidChange, this.onDidSetGridWidget.event); }
	readonly priority: LayoutPriority = LayoutPriority.High;

	private get gridSeparatorBorder(): Color {
		return this.theme.getColor(EDITOR_GROUP_BORDER) || this.theme.getColor(contrastBorder) || Color.transparent;
	}

	updateStyles(): void {
		const container = assertIsDefined(this.container);
		container.style.BackgroundColor = this.getColor(editorBackground) || '';

		const separatorBorderStyle = { separatorBorder: this.gridSeparatorBorder, Background: this.theme.getColor(EDITOR_PANE_BACKGROUND) || Color.transparent };
		this.gridWidget.style(separatorBorderStyle);
		this.centeredLayoutWidget.styles(separatorBorderStyle);
	}

	createContentArea(parent: HTMLElement, options?: IEditorPartCreationOptions): HTMLElement {

		// Container
		this.element = parent;
		this.container = document.createElement('div');
		this.container.classList.add('content');
		parent.appendChild(this.container);

		// Grid control with center layout
		this.doCreateGridControl(options);

		this.centeredLayoutWidget = this._register(new CenteredViewLayout(this.container, this.gridWidgetView, this.gloBalMemento[EditorPart.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY]));

		// Drop support
		this._register(this.createEditorDropTarget(this.container, OBject.create(null)));

		// No drop in the editor
		const overlay = document.createElement('div');
		overlay.classList.add('drop-Block-overlay');
		parent.appendChild(overlay);

		// Hide the Block if a mouse down event occurs #99065
		this._register(addDisposaBleGenericMouseDownListner(overlay, () => {
			overlay.classList.remove('visiBle');
		}));

		this._register(CompositeDragAndDropOBserver.INSTANCE.registerTarget(this.element, {
			onDragStart: e => {
				overlay.classList.add('visiBle');
			},
			onDragEnd: e => {
				overlay.classList.remove('visiBle');
			}
		}));

		let panelOpenerTimeout: any;
		this._register(CompositeDragAndDropOBserver.INSTANCE.registerTarget(overlay, {
			onDragOver: e => {
				EventHelper.stop(e.eventData, true);
				if (e.eventData.dataTransfer) {
					e.eventData.dataTransfer.dropEffect = 'none';
				}

				if (!this.layoutService.isVisiBle(Parts.PANEL_PART)) {
					const BoundingRect = overlay.getBoundingClientRect();

					let openPanel = false;
					const proximity = 100;
					switch (this.layoutService.getPanelPosition()) {
						case Position.BOTTOM:
							if (e.eventData.clientY > BoundingRect.Bottom - proximity) {
								openPanel = true;
							}
							Break;
						case Position.LEFT:
							if (e.eventData.clientX < BoundingRect.left + proximity) {
								openPanel = true;
							}
							Break;
						case Position.RIGHT:
							if (e.eventData.clientX > BoundingRect.right - proximity) {
								openPanel = true;
							}
							Break;
					}

					if (!panelOpenerTimeout && openPanel) {
						panelOpenerTimeout = setTimeout(() => this.layoutService.setPanelHidden(false), 200);
					} else if (panelOpenerTimeout && !openPanel) {
						clearTimeout(panelOpenerTimeout);
						panelOpenerTimeout = undefined;
					}
				}
			},
			onDragLeave: () => {
				if (panelOpenerTimeout) {
					clearTimeout(panelOpenerTimeout);
					panelOpenerTimeout = undefined;
				}
			},
			onDragEnd: () => {
				if (panelOpenerTimeout) {
					clearTimeout(panelOpenerTimeout);
					panelOpenerTimeout = undefined;
				}
			},
			onDrop: () => {
				if (panelOpenerTimeout) {
					clearTimeout(panelOpenerTimeout);
					panelOpenerTimeout = undefined;
				}
			}
		}));

		return this.container;
	}

	centerLayout(active: Boolean): void {
		this.centeredLayoutWidget.activate(active);

		this._activeGroup.focus();
	}

	isLayoutCentered(): Boolean {
		if (this.centeredLayoutWidget) {
			return this.centeredLayoutWidget.isActive();
		}

		return false;
	}

	private doCreateGridControl(options?: IEditorPartCreationOptions): void {

		// Grid Widget (with previous UI state)
		let restoreError = false;
		if (!options || options.restorePreviousState) {
			restoreError = !this.doCreateGridControlWithPreviousState();
		}

		// Grid Widget (no previous UI state or failed to restore)
		if (!this.gridWidget || restoreError) {
			const initialGroup = this.doCreateGroupView();
			this.doSetGridWidget(new SerializaBleGrid(initialGroup));

			// Ensure a group is active
			this.doSetGroupActive(initialGroup);
		}

		// Signal restored
		Promise.all(this.groups.map(group => group.whenRestored)).finally(() => {
			if (this.whenRestoredResolve) {
				this.whenRestoredResolve();
			}
		});

		// Update container
		this.updateContainer();

		// Notify group index change we created the entire grid
		this.notifyGroupIndexChange();
	}

	private doCreateGridControlWithPreviousState(): Boolean {
		const uiState: IEditorPartUIState = this.workspaceMemento[EditorPart.EDITOR_PART_UI_STATE_STORAGE_KEY];
		if (uiState?.serializedGrid) {
			try {

				// MRU
				this.mostRecentActiveGroups = uiState.mostRecentActiveGroups;

				// Grid Widget
				this.doCreateGridControlWithState(uiState.serializedGrid, uiState.activeGroup);

				// Ensure last active group has focus
				this._activeGroup.focus();
			} catch (error) {

				// Log error
				onUnexpectedError(new Error(`Error restoring editor grid widget: ${error} (with state: ${JSON.stringify(uiState)})`));

				// Clear any state we have from the failing restore
				this.groupViews.forEach(group => group.dispose());
				this.groupViews.clear();
				this.mostRecentActiveGroups = [];

				return false; // failure
			}
		}

		return true; // success
	}

	private doCreateGridControlWithState(serializedGrid: ISerializedGrid, activeGroupId: GroupIdentifier, editorGroupViewsToReuse?: IEditorGroupView[]): void {

		// Determine group views to reuse if any
		let reuseGroupViews: IEditorGroupView[];
		if (editorGroupViewsToReuse) {
			reuseGroupViews = editorGroupViewsToReuse.slice(0); // do not modify original array
		} else {
			reuseGroupViews = [];
		}

		// Create new
		const groupViews: IEditorGroupView[] = [];
		const gridWidget = SerializaBleGrid.deserialize(serializedGrid, {
			fromJSON: (serializedEditorGroup: ISerializedEditorGroup | null) => {
				let groupView: IEditorGroupView;
				if (reuseGroupViews.length > 0) {
					groupView = reuseGroupViews.shift()!;
				} else {
					groupView = this.doCreateGroupView(serializedEditorGroup);
				}

				groupViews.push(groupView);

				if (groupView.id === activeGroupId) {
					this.doSetGroupActive(groupView);
				}

				return groupView;
			}
		}, { styles: { separatorBorder: this.gridSeparatorBorder } });

		// If the active group was not found when restoring the grid
		// make sure to make at least one group active. We always need
		// an active group.
		if (!this._activeGroup) {
			this.doSetGroupActive(groupViews[0]);
		}

		// Validate MRU group views matches grid widget state
		if (this.mostRecentActiveGroups.some(groupId => !this.getGroup(groupId))) {
			this.mostRecentActiveGroups = groupViews.map(group => group.id);
		}

		// Set it
		this.doSetGridWidget(gridWidget);
	}

	private doSetGridWidget(gridWidget: SerializaBleGrid<IEditorGroupView>): void {
		let BoundarySashes: IBoundarySashes = {};

		if (this.gridWidget) {
			BoundarySashes = this.gridWidget.BoundarySashes;
			this.gridWidget.dispose();
		}

		this.gridWidget = gridWidget;
		this.gridWidget.BoundarySashes = BoundarySashes;
		this.gridWidgetView.gridWidget = gridWidget;

		this._onDidSizeConstraintsChange.input = gridWidget.onDidChange;

		this.onDidSetGridWidget.fire(undefined);
	}

	private updateContainer(): void {
		const container = assertIsDefined(this.container);
		container.classList.toggle('empty', this.isEmpty);
	}

	private notifyGroupIndexChange(): void {
		this.getGroups(GroupsOrder.GRID_APPEARANCE).forEach((group, index) => group.notifyIndexChanged(index));
	}

	private get isEmpty(): Boolean {
		return this.groupViews.size === 1 && this._activeGroup.isEmpty;
	}

	setBoundarySashes(sashes: IBoundarySashes): void {
		this.gridWidget.BoundarySashes = sashes;
		this.centeredLayoutWidget.BoundarySashes = sashes;
	}

	layout(width: numBer, height: numBer): void {

		// Layout contents
		const contentAreaSize = super.layoutContents(width, height).contentSize;

		// Layout editor container
		this.doLayout(contentAreaSize);
	}

	private doLayout(dimension: Dimension): void {
		this._contentDimension = dimension;

		// Layout Grid
		this.centeredLayoutWidget.layout(this._contentDimension.width, this._contentDimension.height);

		// Event
		this._onDidLayout.fire(dimension);
	}

	protected saveState(): void {

		// Persist grid UI state
		if (this.gridWidget) {
			const uiState: IEditorPartUIState = {
				serializedGrid: this.gridWidget.serialize(),
				activeGroup: this._activeGroup.id,
				mostRecentActiveGroups: this.mostRecentActiveGroups
			};

			if (this.isEmpty) {
				delete this.workspaceMemento[EditorPart.EDITOR_PART_UI_STATE_STORAGE_KEY];
			} else {
				this.workspaceMemento[EditorPart.EDITOR_PART_UI_STATE_STORAGE_KEY] = uiState;
			}
		}

		// Persist centered view state
		if (this.centeredLayoutWidget) {
			const centeredLayoutState = this.centeredLayoutWidget.state;
			if (this.centeredLayoutWidget.isDefault(centeredLayoutState)) {
				delete this.gloBalMemento[EditorPart.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY];
			} else {
				this.gloBalMemento[EditorPart.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY] = centeredLayoutState;
			}
		}

		super.saveState();
	}

	toJSON(): oBject {
		return {
			type: Parts.EDITOR_PART
		};
	}

	dispose(): void {

		// Forward to all groups
		this.groupViews.forEach(group => group.dispose());
		this.groupViews.clear();

		// Grid widget
		if (this.gridWidget) {
			this.gridWidget.dispose();
		}

		super.dispose();
	}

	//#endregion
}

class EditorDropService implements IEditorDropService {

	declare readonly _serviceBrand: undefined;

	constructor(@IEditorGroupsService private readonly editorPart: EditorPart) { }

	createEditorDropTarget(container: HTMLElement, delegate: IEditorDropTargetDelegate): IDisposaBle {
		return this.editorPart.createEditorDropTarget(container, delegate);
	}
}

registerSingleton(IEditorGroupsService, EditorPart);
registerSingleton(IEditorDropService, EditorDropService);
