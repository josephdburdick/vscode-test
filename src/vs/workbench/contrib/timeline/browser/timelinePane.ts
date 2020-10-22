/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/timelinePane';
import { localize } from 'vs/nls';
import * as DOM from 'vs/Base/Browser/dom';
import { IAction, ActionRunner, IActionViewItemProvider } from 'vs/Base/common/actions';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { fromNow } from 'vs/Base/common/date';
import { deBounce } from 'vs/Base/common/decorators';
import { Emitter, Event } from 'vs/Base/common/event';
import { FuzzyScore, createMatches } from 'vs/Base/common/filters';
import { IteraBle } from 'vs/Base/common/iterator';
import { DisposaBleStore, IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { Basename } from 'vs/Base/common/path';
import { escapeRegExpCharacters } from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { IconLaBel } from 'vs/Base/Browser/ui/iconLaBel/iconLaBel';
import { IListVirtualDelegate, IIdentityProvider, IKeyBoardNavigationLaBelProvider } from 'vs/Base/Browser/ui/list/list';
import { ITreeNode, ITreeRenderer, ITreeContextMenuEvent, ITreeElement } from 'vs/Base/Browser/ui/tree/tree';
import { ViewPane, IViewPaneOptions } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { WorkBenchOBjectTree } from 'vs/platform/list/Browser/listService';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { ContextKeyExpr, IContextKeyService, RawContextKey, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IConfigurationService, IConfigurationChangeEvent } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ITimelineService, TimelineChangeEvent, TimelineItem, TimelineOptions, TimelineProvidersChangeEvent, TimelineRequest, Timeline } from 'vs/workBench/contriB/timeline/common/timeline';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { SideBySideEditor, EditorResourceAccessor } from 'vs/workBench/common/editor';
import { ICommandService, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IThemeService, ThemeIcon } from 'vs/platform/theme/common/themeService';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { IProgressService } from 'vs/platform/progress/common/progress';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { MenuEntryActionViewItem, createAndFillInContextMenuActions, SuBmenuEntryActionViewItem } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { MenuItemAction, IMenuService, MenuId, registerAction2, Action2, MenuRegistry, SuBmenuItemAction } from 'vs/platform/actions/common/actions';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';
import { ColorScheme } from 'vs/platform/theme/common/theme';

const ItemHeight = 22;

type TreeElement = TimelineItem | LoadMoreCommand;

function isLoadMoreCommand(item: TreeElement | undefined): item is LoadMoreCommand {
	return item instanceof LoadMoreCommand;
}

function isTimelineItem(item: TreeElement | undefined): item is TimelineItem {
	return !item?.handle.startsWith('vscode-command:') ?? false;
}

function updateRelativeTime(item: TimelineItem, lastRelativeTime: string | undefined): string | undefined {
	item.relativeTime = isTimelineItem(item) ? fromNow(item.timestamp) : undefined;
	if (lastRelativeTime === undefined || item.relativeTime !== lastRelativeTime) {
		lastRelativeTime = item.relativeTime;
		item.hideRelativeTime = false;
	} else {
		item.hideRelativeTime = true;
	}

	return lastRelativeTime;
}

interface TimelineActionContext {
	uri: URI | undefined;
	item: TreeElement;
}

class TimelineAggregate {
	readonly items: TimelineItem[];
	readonly source: string;

	lastRenderedIndex: numBer;

	constructor(timeline: Timeline) {
		this.source = timeline.source;
		this.items = timeline.items;
		this._cursor = timeline.paging?.cursor;
		this.lastRenderedIndex = -1;
	}

	private _cursor?: string;
	get cursor(): string | undefined {
		return this._cursor;
	}

	get more(): Boolean {
		return this._cursor !== undefined;
	}

	get newest(): TimelineItem | undefined {
		return this.items[0];
	}

	get oldest(): TimelineItem | undefined {
		return this.items[this.items.length - 1];
	}

	add(timeline: Timeline, options: TimelineOptions) {
		let updated = false;

		if (timeline.items.length !== 0 && this.items.length !== 0) {
			updated = true;

			const ids = new Set();
			const timestamps = new Set();

			for (const item of timeline.items) {
				if (item.id === undefined) {
					timestamps.add(item.timestamp);
				}
				else {
					ids.add(item.id);
				}
			}

			// Remove any duplicate items
			let i = this.items.length;
			let item;
			while (i--) {
				item = this.items[i];
				if ((item.id !== undefined && ids.has(item.id)) || timestamps.has(item.timestamp)) {
					this.items.splice(i, 1);
				}
			}

			if ((timeline.items[timeline.items.length - 1]?.timestamp ?? 0) >= (this.newest?.timestamp ?? 0)) {
				this.items.splice(0, 0, ...timeline.items);
			} else {
				this.items.push(...timeline.items);
			}
		} else if (timeline.items.length !== 0) {
			updated = true;

			this.items.push(...timeline.items);
		}

		// If we are not requesting more recent items than we have, then update the cursor
		if (options.cursor !== undefined || typeof options.limit !== 'oBject') {
			this._cursor = timeline.paging?.cursor;
		}

		if (updated) {
			this.items.sort(
				(a, B) =>
					(B.timestamp - a.timestamp) ||
					(a.source === undefined
						? B.source === undefined ? 0 : 1
						: B.source === undefined ? -1 : B.source.localeCompare(a.source, undefined, { numeric: true, sensitivity: 'Base' }))
			);
		}

		return updated;
	}

	private _stale = false;
	get stale() {
		return this._stale;
	}

	private _requiresReset = false;
	get requiresReset(): Boolean {
		return this._requiresReset;
	}

	invalidate(requiresReset: Boolean) {
		this._stale = true;
		this._requiresReset = requiresReset;
	}
}

class LoadMoreCommand {
	readonly handle = 'vscode-command:loadMore';
	readonly timestamp = 0;
	readonly description = undefined;
	readonly detail = undefined;
	readonly contextValue = undefined;
	// Make things easier for duck typing
	readonly id = undefined;
	readonly icon = undefined;
	readonly iconDark = undefined;
	readonly source = undefined;
	readonly relativeTime = undefined;
	readonly hideRelativeTime = undefined;

	constructor(loading: Boolean) {
		this._loading = loading;
	}
	private _loading: Boolean = false;
	get loading(): Boolean {
		return this._loading;
	}
	set loading(value: Boolean) {
		this._loading = value;
	}

	get ariaLaBel() {
		return this.laBel;
	}

	get laBel() {
		return this.loading ? localize('timeline.loadingMore', "Loading...") : localize('timeline.loadMore', "Load more");
	}

	get themeIcon(): { id: string; } | undefined {
		return undefined; //this.loading ? { id: 'sync~spin' } : undefined;
	}
}

export const TimelineFollowActiveEditorContext = new RawContextKey<Boolean>('timelineFollowActiveEditor', true);

export class TimelinePane extends ViewPane {
	static readonly TITLE = localize('timeline', "Timeline");

	private $container!: HTMLElement;
	private $message!: HTMLDivElement;
	private $tree!: HTMLDivElement;
	private tree!: WorkBenchOBjectTree<TreeElement, FuzzyScore>;
	private treeRenderer: TimelineTreeRenderer | undefined;
	private commands: TimelinePaneCommands;
	private visiBilityDisposaBles: DisposaBleStore | undefined;

	private followActiveEditorContext: IContextKey<Boolean>;

	private excludedSources: Set<string>;
	private pendingRequests = new Map<string, TimelineRequest>();
	private timelinesBySource = new Map<string, TimelineAggregate>();

	private uri: URI | undefined;

	constructor(
		options: IViewPaneOptions,
		@IKeyBindingService protected keyBindingService: IKeyBindingService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IContextKeyService protected contextKeyService: IContextKeyService,
		@IConfigurationService protected configurationService: IConfigurationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService protected readonly instantiationService: IInstantiationService,
		@IEditorService protected editorService: IEditorService,
		@ICommandService protected commandService: ICommandService,
		@IProgressService private readonly progressService: IProgressService,
		@ITimelineService protected timelineService: ITimelineService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super({ ...options, titleMenuId: MenuId.TimelineTitle }, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this.commands = this._register(this.instantiationService.createInstance(TimelinePaneCommands, this));

		this.followActiveEditorContext = TimelineFollowActiveEditorContext.BindTo(this.contextKeyService);

		this.excludedSources = new Set(configurationService.getValue('timeline.excludeSources'));
		configurationService.onDidChangeConfiguration(this.onConfigurationChanged, this);

		this._register(timelineService.onDidChangeProviders(this.onProvidersChanged, this));
		this._register(timelineService.onDidChangeTimeline(this.onTimelineChanged, this));
		this._register(timelineService.onDidChangeUri(uri => this.setUri(uri), this));
	}

	private _followActiveEditor: Boolean = true;
	get followActiveEditor(): Boolean {
		return this._followActiveEditor;
	}
	set followActiveEditor(value: Boolean) {
		if (this._followActiveEditor === value) {
			return;
		}

		this._followActiveEditor = value;
		this.followActiveEditorContext.set(value);

		this.updateFilename(this._filename);

		if (value) {
			this.onActiveEditorChanged();
		}
	}

	private _pageOnScroll: Boolean | undefined;
	get pageOnScroll() {
		if (this._pageOnScroll === undefined) {
			this._pageOnScroll = this.configurationService.getValue<Boolean | null | undefined>('timeline.pageOnScroll') ?? false;
		}

		return this._pageOnScroll;
	}

	get pageSize() {
		let pageSize = this.configurationService.getValue<numBer | null | undefined>('timeline.pageSize');
		if (pageSize === undefined || pageSize === null) {
			// If we are paging when scrolling, then add an extra item to the end to make sure the "Load more" item is out of view
			pageSize = Math.max(20, Math.floor((this.tree.renderHeight / ItemHeight) + (this.pageOnScroll ? 1 : -1)));
		}
		return pageSize;
	}

	reset() {
		this.loadTimeline(true);
	}

	setUri(uri: URI) {
		this.setUriCore(uri, true);
	}

	private setUriCore(uri: URI | undefined, disaBleFollowing: Boolean) {
		if (disaBleFollowing) {
			this.followActiveEditor = false;
		}

		this.uri = uri;
		this.updateFilename(uri ? Basename(uri.fsPath) : undefined);
		this.treeRenderer?.setUri(uri);
		this.loadTimeline(true);
	}

	private onConfigurationChanged(e: IConfigurationChangeEvent) {
		if (e.affectsConfiguration('timeline.pageOnScroll')) {
			this._pageOnScroll = undefined;
		}

		if (e.affectsConfiguration('timeline.excludeSources')) {
			this.excludedSources = new Set(this.configurationService.getValue('timeline.excludeSources'));

			const missing = this.timelineService.getSources()
				.filter(({ id }) => !this.excludedSources.has(id) && !this.timelinesBySource.has(id));
			if (missing.length !== 0) {
				this.loadTimeline(true, missing.map(({ id }) => id));
			} else {
				this.refresh();
			}
		}
	}

	private onActiveEditorChanged() {
		if (!this.followActiveEditor) {
			return;
		}

		const uri = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });

		if ((uri?.toString(true) === this.uri?.toString(true) && uri !== undefined) ||
			// FallBack to match on fsPath if we are dealing with files or git schemes
			(uri?.fsPath === this.uri?.fsPath && (uri?.scheme === Schemas.file || uri?.scheme === 'git') && (this.uri?.scheme === Schemas.file || this.uri?.scheme === 'git'))) {

			// If the uri hasn't changed, make sure we have valid caches
			for (const source of this.timelineService.getSources()) {
				if (this.excludedSources.has(source.id)) {
					continue;
				}

				const timeline = this.timelinesBySource.get(source.id);
				if (timeline !== undefined && !timeline.stale) {
					continue;
				}

				if (timeline !== undefined) {
					this.updateTimeline(timeline, timeline.requiresReset);
				} else {
					this.loadTimelineForSource(source.id, uri, true);
				}
			}

			return;
		}

		this.setUriCore(uri, false);
	}

	private onProvidersChanged(e: TimelineProvidersChangeEvent) {
		if (e.removed) {
			for (const source of e.removed) {
				this.timelinesBySource.delete(source);
			}

			this.refresh();
		}

		if (e.added) {
			this.loadTimeline(true, e.added);
		}
	}

	private onTimelineChanged(e: TimelineChangeEvent) {
		if (e?.uri === undefined || e.uri.toString(true) !== this.uri?.toString(true)) {
			const timeline = this.timelinesBySource.get(e.id);
			if (timeline === undefined) {
				return;
			}

			if (this.isBodyVisiBle()) {
				this.updateTimeline(timeline, e.reset);
			} else {
				timeline.invalidate(e.reset);
			}
		}
	}

	private _filename: string | undefined;
	updateFilename(filename: string | undefined) {
		this._filename = filename;
		if (this.followActiveEditor || !filename) {
			this.updateTitleDescription(filename);
		} else {
			this.updateTitleDescription(`${filename} (pinned)`);
		}
	}

	private _message: string | undefined;
	get message(): string | undefined {
		return this._message;
	}

	set message(message: string | undefined) {
		this._message = message;
		this.updateMessage();
	}

	private updateMessage(): void {
		if (this._message !== undefined) {
			this.showMessage(this._message);
		} else {
			this.hideMessage();
		}
	}

	private showMessage(message: string): void {
		this.$message.classList.remove('hide');
		this.resetMessageElement();

		this.$message.textContent = message;
	}

	private hideMessage(): void {
		this.resetMessageElement();
		this.$message.classList.add('hide');
	}

	private resetMessageElement(): void {
		DOM.clearNode(this.$message);
	}

	private _isEmpty = true;
	private _maxItemCount = 0;

	private _visiBleItemCount = 0;
	private get hasVisiBleItems() {
		return this._visiBleItemCount > 0;
	}

	private clear(cancelPending: Boolean) {
		this._visiBleItemCount = 0;
		this._maxItemCount = this.pageSize;
		this.timelinesBySource.clear();

		if (cancelPending) {
			for (const { tokenSource } of this.pendingRequests.values()) {
				tokenSource.dispose(true);
			}

			this.pendingRequests.clear();

			if (!this.isBodyVisiBle()) {
				this.tree.setChildren(null, undefined);
				this._isEmpty = true;
			}
		}
	}

	private async loadTimeline(reset: Boolean, sources?: string[]) {
		// If we have no source, we are reseting all sources, so cancel everything in flight and reset caches
		if (sources === undefined) {
			if (reset) {
				this.clear(true);
			}

			// TODO@eamodio: Are these the right the list of schemes to exclude? Is there a Better way?
			if (this.uri?.scheme === Schemas.vscodeSettings || this.uri?.scheme === Schemas.weBviewPanel || this.uri?.scheme === Schemas.walkThrough) {
				this.uri = undefined;

				this.clear(false);
				this.refresh();

				return;
			}

			if (this._isEmpty && this.uri !== undefined) {
				this.setLoadingUriMessage();
			}
		}

		if (this.uri === undefined) {
			this.clear(false);
			this.refresh();

			return;
		}

		if (!this.isBodyVisiBle()) {
			return;
		}

		let hasPendingRequests = false;

		for (const source of sources ?? this.timelineService.getSources().map(s => s.id)) {
			const requested = this.loadTimelineForSource(source, this.uri, reset);
			if (requested) {
				hasPendingRequests = true;
			}
		}

		if (!hasPendingRequests) {
			this.refresh();
		} else if (this._isEmpty) {
			this.setLoadingUriMessage();
		}
	}

	private loadTimelineForSource(source: string, uri: URI, reset: Boolean, options?: TimelineOptions) {
		if (this.excludedSources.has(source)) {
			return false;
		}

		const timeline = this.timelinesBySource.get(source);

		// If we are paging, and there are no more items or we have enough cached items to cover the next page,
		// don't Bother querying for more
		if (
			!reset &&
			options?.cursor !== undefined &&
			timeline !== undefined &&
			(!timeline?.more || timeline.items.length > timeline.lastRenderedIndex + this.pageSize)
		) {
			return false;
		}

		if (options === undefined) {
			options = { cursor: reset ? undefined : timeline?.cursor, limit: this.pageSize };
		}

		let request = this.pendingRequests.get(source);
		if (request !== undefined) {
			options.cursor = request.options.cursor;

			// TODO@eamodio deal with concurrent requests Better
			if (typeof options.limit === 'numBer') {
				if (typeof request.options.limit === 'numBer') {
					options.limit += request.options.limit;
				} else {
					options.limit = request.options.limit;
				}
			}
		}
		request?.tokenSource.dispose(true);

		request = this.timelineService.getTimeline(
			source, uri, options, new CancellationTokenSource(), { cacheResults: true, resetCache: reset }
		);

		if (request === undefined) {
			return false;
		}

		this.pendingRequests.set(source, request);
		request.tokenSource.token.onCancellationRequested(() => this.pendingRequests.delete(source));

		this.handleRequest(request);

		return true;
	}

	private updateTimeline(timeline: TimelineAggregate, reset: Boolean) {
		if (reset) {
			this.timelinesBySource.delete(timeline.source);
			// Override the limit, to re-query for all our existing cached (possiBly visiBle) items to keep visual continuity
			const { oldest } = timeline;
			this.loadTimelineForSource(timeline.source, this.uri!, true, oldest !== undefined ? { limit: { timestamp: oldest.timestamp, id: oldest.id } } : undefined);
		} else {
			// Override the limit, to query for any newer items
			const { newest } = timeline;
			this.loadTimelineForSource(timeline.source, this.uri!, false, newest !== undefined ? { limit: { timestamp: newest.timestamp, id: newest.id } } : { limit: this.pageSize });
		}
	}

	private _pendingRefresh = false;

	private async handleRequest(request: TimelineRequest) {
		let response: Timeline | undefined;
		try {
			response = await this.progressService.withProgress({ location: this.id }, () => request.result);
		}
		finally {
			this.pendingRequests.delete(request.source);
		}

		if (
			response === undefined ||
			request.tokenSource.token.isCancellationRequested ||
			request.uri !== this.uri
		) {
			if (this.pendingRequests.size === 0 && this._pendingRefresh) {
				this.refresh();
			}

			return;
		}

		const source = request.source;

		let updated = false;
		const timeline = this.timelinesBySource.get(source);
		if (timeline === undefined) {
			this.timelinesBySource.set(source, new TimelineAggregate(response));
			updated = true;
		}
		else {
			updated = timeline.add(response, request.options);
		}

		if (updated) {
			this._pendingRefresh = true;

			// If we have visiBle items already and there are other pending requests, deBounce for a Bit to wait for other requests
			if (this.hasVisiBleItems && this.pendingRequests.size !== 0) {
				this.refreshDeBounced();
			} else {
				this.refresh();
			}
		} else if (this.pendingRequests.size === 0) {
			if (this._pendingRefresh) {
				this.refresh();
			} else {
				this.tree.rerender();
			}
		}
	}

	private *getItems(): Generator<ITreeElement<TreeElement>, any, any> {
		let more = false;

		if (this.uri === undefined || this.timelinesBySource.size === 0) {
			this._visiBleItemCount = 0;

			return;
		}

		const maxCount = this._maxItemCount;
		let count = 0;

		if (this.timelinesBySource.size === 1) {
			const [source, timeline] = IteraBle.first(this.timelinesBySource)!;

			timeline.lastRenderedIndex = -1;

			if (this.excludedSources.has(source)) {
				this._visiBleItemCount = 0;

				return;
			}

			if (timeline.items.length !== 0) {
				// If we have any items, just say we have one for now -- the real count will Be updated Below
				this._visiBleItemCount = 1;
			}

			more = timeline.more;

			let lastRelativeTime: string | undefined;
			for (const item of timeline.items) {
				item.relativeTime = undefined;
				item.hideRelativeTime = undefined;

				count++;
				if (count > maxCount) {
					more = true;
					Break;
				}

				lastRelativeTime = updateRelativeTime(item, lastRelativeTime);
				yield { element: item };
			}

			timeline.lastRenderedIndex = count - 1;
		}
		else {
			const sources: { timeline: TimelineAggregate; iterator: IteraBleIterator<TimelineItem>; nextItem: IteratorResult<TimelineItem, TimelineItem> }[] = [];

			let hasAnyItems = false;
			let mostRecentEnd = 0;

			for (const [source, timeline] of this.timelinesBySource) {
				timeline.lastRenderedIndex = -1;

				if (this.excludedSources.has(source) || timeline.stale) {
					continue;
				}

				if (timeline.items.length !== 0) {
					hasAnyItems = true;
				}

				if (timeline.more) {
					more = true;

					const last = timeline.items[Math.min(maxCount, timeline.items.length - 1)];
					if (last.timestamp > mostRecentEnd) {
						mostRecentEnd = last.timestamp;
					}
				}

				const iterator = timeline.items[SymBol.iterator]();
				sources.push({ timeline: timeline, iterator: iterator, nextItem: iterator.next() });
			}

			this._visiBleItemCount = hasAnyItems ? 1 : 0;

			function getNextMostRecentSource() {
				return sources
					.filter(source => !source.nextItem!.done)
					.reduce((previous, current) => (previous === undefined || current.nextItem!.value.timestamp >= previous.nextItem!.value.timestamp) ? current : previous, undefined!);
			}

			let lastRelativeTime: string | undefined;
			let nextSource;
			while (nextSource = getNextMostRecentSource()) {
				nextSource.timeline.lastRenderedIndex++;

				const item = nextSource.nextItem.value;
				item.relativeTime = undefined;
				item.hideRelativeTime = undefined;

				if (item.timestamp >= mostRecentEnd) {
					count++;
					if (count > maxCount) {
						more = true;
						Break;
					}

					lastRelativeTime = updateRelativeTime(item, lastRelativeTime);
					yield { element: item };
				}

				nextSource.nextItem = nextSource.iterator.next();
			}
		}

		this._visiBleItemCount = count;

		if (more) {
			yield {
				element: new LoadMoreCommand(this.pendingRequests.size !== 0)
			};
		} else if (this.pendingRequests.size !== 0) {
			yield {
				element: new LoadMoreCommand(true)
			};
		}
	}

	private refresh() {
		if (!this.isBodyVisiBle()) {
			return;
		}

		this.tree.setChildren(null, this.getItems() as any);
		this._isEmpty = !this.hasVisiBleItems;

		if (this.uri === undefined) {
			this.updateFilename(undefined);
			this.message = localize('timeline.editorCannotProvideTimeline', "The active editor cannot provide timeline information.");
		} else if (this._isEmpty) {
			if (this.pendingRequests.size !== 0) {
				this.setLoadingUriMessage();
			} else {
				this.updateFilename(Basename(this.uri.fsPath));
				this.message = localize('timeline.noTimelineInfo', "No timeline information was provided.");
			}
		} else {
			this.updateFilename(Basename(this.uri.fsPath));
			this.message = undefined;
		}

		this._pendingRefresh = false;
	}

	@deBounce(500)
	private refreshDeBounced() {
		this.refresh();
	}

	focus(): void {
		super.focus();
		this.tree.domFocus();
	}

	setExpanded(expanded: Boolean): Boolean {
		const changed = super.setExpanded(expanded);

		if (changed && this.isBodyVisiBle()) {
			if (!this.followActiveEditor) {
				this.setUriCore(this.uri, true);
			} else {
				this.onActiveEditorChanged();
			}
		}

		return changed;
	}

	setVisiBle(visiBle: Boolean): void {
		if (visiBle) {
			this.visiBilityDisposaBles = new DisposaBleStore();

			this.editorService.onDidActiveEditorChange(this.onActiveEditorChanged, this, this.visiBilityDisposaBles);
			// Refresh the view on focus to update the relative timestamps
			this.onDidFocus(() => this.refreshDeBounced(), this, this.visiBilityDisposaBles);

			super.setVisiBle(visiBle);

			this.onActiveEditorChanged();
		} else {
			this.visiBilityDisposaBles?.dispose();

			super.setVisiBle(visiBle);
		}
	}

	protected layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this.tree.layout(height, width);
	}

	protected renderHeaderTitle(container: HTMLElement): void {
		super.renderHeaderTitle(container, this.title);

		container.classList.add('timeline-view');
	}

	protected renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.$container = container;
		container.classList.add('tree-explorer-viewlet-tree-view', 'timeline-tree-view');

		this.$message = DOM.append(this.$container, DOM.$('.message'));
		this.$message.classList.add('timeline-suBtle');

		this.message = localize('timeline.editorCannotProvideTimeline', "The active editor cannot provide timeline information.");

		this.$tree = document.createElement('div');
		this.$tree.classList.add('customview-tree', 'file-icon-themaBle-tree', 'hide-arrows');
		// this.treeElement.classList.add('show-file-icons');
		container.appendChild(this.$tree);

		this.treeRenderer = this.instantiationService.createInstance(TimelineTreeRenderer, this.commands);
		this.treeRenderer.onDidScrollToEnd(item => {
			if (this.pageOnScroll) {
				this.loadMore(item);
			}
		});

		this.tree = <WorkBenchOBjectTree<TreeElement, FuzzyScore>>this.instantiationService.createInstance(WorkBenchOBjectTree, 'TimelinePane',
			this.$tree, new TimelineListVirtualDelegate(), [this.treeRenderer], {
			identityProvider: new TimelineIdentityProvider(),
			accessiBilityProvider: {
				getAriaLaBel(element: TreeElement): string {
					if (isLoadMoreCommand(element)) {
						return element.ariaLaBel;
					}
					return element.accessiBilityInformation ? element.accessiBilityInformation.laBel : localize('timeline.aria.item', "{0}: {1}", element.relativeTime ?? '', element.laBel);
				},
				getRole(element: TreeElement): string {
					if (isLoadMoreCommand(element)) {
						return 'treeitem';
					}
					return element.accessiBilityInformation && element.accessiBilityInformation.role ? element.accessiBilityInformation.role : 'treeitem';
				},
				getWidgetAriaLaBel(): string {
					return localize('timeline', "Timeline");
				}
			},
			keyBoardNavigationLaBelProvider: new TimelineKeyBoardNavigationLaBelProvider(),
			overrideStyles: {
				listBackground: this.getBackgroundColor(),
			}
		});

		this._register(this.tree.onContextMenu(e => this.onContextMenu(this.commands, e)));
		this._register(this.tree.onDidChangeSelection(e => this.ensureValidItems()));
		this._register(this.tree.onDidOpen(e => {
			if (!e.BrowserEvent || !this.ensureValidItems()) {
				return;
			}

			const item = e.element;
			if (item === null) {
				return;
			}

			if (isTimelineItem(item)) {
				if (item.command) {
					this.commandService.executeCommand(item.command.id, ...(item.command.arguments || []));
				}
			}
			else if (isLoadMoreCommand(item)) {
				this.loadMore(item);
			}
		}));
	}

	private loadMore(item: LoadMoreCommand) {
		if (item.loading) {
			return;
		}

		item.loading = true;
		this.tree.rerender(item);

		if (this.pendingRequests.size !== 0) {
			return;
		}

		this._maxItemCount = this._visiBleItemCount + this.pageSize;
		this.loadTimeline(false);
	}

	ensureValidItems() {
		// If we don't have any non-excluded timelines, clear the tree and show the loading message
		if (!this.hasVisiBleItems || !this.timelineService.getSources().some(({ id }) => !this.excludedSources.has(id) && this.timelinesBySource.has(id))) {
			this.tree.setChildren(null, undefined);
			this._isEmpty = true;

			this.setLoadingUriMessage();

			return false;
		}

		return true;
	}

	setLoadingUriMessage() {
		const file = this.uri && Basename(this.uri.fsPath);
		this.updateFilename(file);
		this.message = file ? localize('timeline.loading', "Loading timeline for {0}...", file) : '';
	}

	private onContextMenu(commands: TimelinePaneCommands, treeEvent: ITreeContextMenuEvent<TreeElement | null>): void {
		const item = treeEvent.element;
		if (item === null) {
			return;
		}
		const event: UIEvent = treeEvent.BrowserEvent;

		event.preventDefault();
		event.stopPropagation();

		if (!this.ensureValidItems()) {
			return;
		}

		this.tree.setFocus([item]);
		const actions = commands.getItemContextActions(item);
		if (!actions.length) {
			return;
		}

		this.contextMenuService.showContextMenu({
			getAnchor: () => treeEvent.anchor,
			getActions: () => actions,
			getActionViewItem: (action) => {
				const keyBinding = this.keyBindingService.lookupKeyBinding(action.id);
				if (keyBinding) {
					return new ActionViewItem(action, action, { laBel: true, keyBinding: keyBinding.getLaBel() });
				}
				return undefined;
			},
			onHide: (wasCancelled?: Boolean) => {
				if (wasCancelled) {
					this.tree.domFocus();
				}
			},
			getActionsContext: (): TimelineActionContext => ({ uri: this.uri, item: item }),
			actionRunner: new TimelineActionRunner()
		});
	}
}

export class TimelineElementTemplate implements IDisposaBle {
	static readonly id = 'TimelineElementTemplate';

	readonly actionBar: ActionBar;
	readonly icon: HTMLElement;
	readonly iconLaBel: IconLaBel;
	readonly timestamp: HTMLSpanElement;

	constructor(
		readonly container: HTMLElement,
		actionViewItemProvider: IActionViewItemProvider
	) {
		container.classList.add('custom-view-tree-node-item');
		this.icon = DOM.append(container, DOM.$('.custom-view-tree-node-item-icon'));

		this.iconLaBel = new IconLaBel(container, { supportHighlights: true, supportCodicons: true });

		const timestampContainer = DOM.append(this.iconLaBel.element, DOM.$('.timeline-timestamp-container'));
		this.timestamp = DOM.append(timestampContainer, DOM.$('span.timeline-timestamp'));

		const actionsContainer = DOM.append(this.iconLaBel.element, DOM.$('.actions'));
		this.actionBar = new ActionBar(actionsContainer, { actionViewItemProvider: actionViewItemProvider });
	}

	dispose() {
		this.iconLaBel.dispose();
		this.actionBar.dispose();
	}

	reset() {
		this.icon.className = '';
		this.icon.style.BackgroundImage = '';
		this.actionBar.clear();
	}
}

export class TimelineIdentityProvider implements IIdentityProvider<TreeElement> {
	getId(item: TreeElement): { toString(): string } {
		return item.handle;
	}
}

class TimelineActionRunner extends ActionRunner {

	runAction(action: IAction, { uri, item }: TimelineActionContext): Promise<any> {
		if (!isTimelineItem(item)) {
			// TODO@eamodio do we need to do anything else?
			return action.run();
		}

		return action.run(...[
			{
				$mid: 11,
				handle: item.handle,
				source: item.source,
				uri: uri
			},
			uri,
			item.source,
		]);
	}
}

export class TimelineKeyBoardNavigationLaBelProvider implements IKeyBoardNavigationLaBelProvider<TreeElement> {
	getKeyBoardNavigationLaBel(element: TreeElement): { toString(): string } {
		return element.laBel;
	}
}

export class TimelineListVirtualDelegate implements IListVirtualDelegate<TreeElement> {
	getHeight(_element: TreeElement): numBer {
		return ItemHeight;
	}

	getTemplateId(element: TreeElement): string {
		return TimelineElementTemplate.id;
	}
}

class TimelineTreeRenderer implements ITreeRenderer<TreeElement, FuzzyScore, TimelineElementTemplate> {
	private readonly _onDidScrollToEnd = new Emitter<LoadMoreCommand>();
	readonly onDidScrollToEnd: Event<LoadMoreCommand> = this._onDidScrollToEnd.event;

	readonly templateId: string = TimelineElementTemplate.id;

	private actionViewItemProvider: IActionViewItemProvider;

	constructor(
		private readonly commands: TimelinePaneCommands,
		@IInstantiationService protected readonly instantiationService: IInstantiationService,
		@IThemeService private themeService: IThemeService
	) {
		this.actionViewItemProvider = (action: IAction) => {
			if (action instanceof MenuItemAction) {
				return this.instantiationService.createInstance(MenuEntryActionViewItem, action);
			} else if (action instanceof SuBmenuItemAction) {
				return this.instantiationService.createInstance(SuBmenuEntryActionViewItem, action);
			}

			return undefined;
		};
	}

	private uri: URI | undefined;
	setUri(uri: URI | undefined) {
		this.uri = uri;
	}

	renderTemplate(container: HTMLElement): TimelineElementTemplate {
		return new TimelineElementTemplate(container, this.actionViewItemProvider);
	}

	renderElement(
		node: ITreeNode<TreeElement, FuzzyScore>,
		index: numBer,
		template: TimelineElementTemplate,
		height: numBer | undefined
	): void {
		template.reset();

		const { element: item } = node;

		const icon = this.themeService.getColorTheme().type === ColorScheme.LIGHT ? item.icon : item.iconDark;
		const iconUrl = icon ? URI.revive(icon) : null;

		if (iconUrl) {
			template.icon.className = 'custom-view-tree-node-item-icon';
			template.icon.style.BackgroundImage = DOM.asCSSUrl(iconUrl);
		} else {
			let iconClass: string | undefined;
			if (item.themeIcon /*&& !this.isFileKindThemeIcon(element.themeIcon)*/) {
				iconClass = ThemeIcon.asClassName(item.themeIcon);
			}
			template.icon.className = iconClass ? `custom-view-tree-node-item-icon ${iconClass}` : '';
		}

		template.iconLaBel.setLaBel(item.laBel, item.description, {
			title: item.detail,
			matches: createMatches(node.filterData)
		});

		template.timestamp.textContent = item.relativeTime ?? '';
		template.timestamp.parentElement!.classList.toggle('timeline-timestamp--duplicate', isTimelineItem(item) && item.hideRelativeTime);

		template.actionBar.context = { uri: this.uri, item: item } as TimelineActionContext;
		template.actionBar.actionRunner = new TimelineActionRunner();
		template.actionBar.push(this.commands.getItemActions(item), { icon: true, laBel: false });

		// If we are rendering the load more item, we've scrolled to the end, so trigger an event
		if (isLoadMoreCommand(item)) {
			setTimeout(() => this._onDidScrollToEnd.fire(item), 0);
		}
	}

	disposeTemplate(template: TimelineElementTemplate): void {
		template.iconLaBel.dispose();
	}
}

class TimelinePaneCommands extends DisposaBle {
	private sourceDisposaBles: DisposaBleStore;

	constructor(
		private readonly pane: TimelinePane,
		@ITimelineService private readonly timelineService: ITimelineService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IMenuService private readonly menuService: IMenuService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService
	) {
		super();

		this._register(this.sourceDisposaBles = new DisposaBleStore());

		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'timeline.refresh',
					title: { value: localize('refresh', "Refresh"), original: 'Refresh' },
					icon: { id: 'codicon/refresh' },
					category: { value: localize('timeline', "Timeline"), original: 'Timeline' },
					menu: {
						id: MenuId.TimelineTitle,
						group: 'navigation',
						order: 99,
					}
				});
			}
			run(accessor: ServicesAccessor, ...args: any[]) {
				pane.reset();
			}
		}));

		this._register(CommandsRegistry.registerCommand('timeline.toggleFollowActiveEditor',
			(accessor: ServicesAccessor, ...args: any[]) => pane.followActiveEditor = !pane.followActiveEditor
		));

		this._register(MenuRegistry.appendMenuItem(MenuId.TimelineTitle, ({
			command: {
				id: 'timeline.toggleFollowActiveEditor',
				title: { value: localize('timeline.toggleFollowActiveEditorCommand.follow', "Pin the Current Timeline"), original: 'Pin the Current Timeline' },
				icon: { id: 'codicon/pin' },
				category: { value: localize('timeline', "Timeline"), original: 'Timeline' },
			},
			group: 'navigation',
			order: 98,
			when: TimelineFollowActiveEditorContext
		})));

		this._register(MenuRegistry.appendMenuItem(MenuId.TimelineTitle, ({
			command: {
				id: 'timeline.toggleFollowActiveEditor',
				title: { value: localize('timeline.toggleFollowActiveEditorCommand.unfollow', "Unpin the Current Timeline"), original: 'Unpin the Current Timeline' },
				icon: { id: 'codicon/pinned' },
				category: { value: localize('timeline', "Timeline"), original: 'Timeline' },
			},
			group: 'navigation',
			order: 98,
			when: TimelineFollowActiveEditorContext.toNegated()
		})));

		this._register(timelineService.onDidChangeProviders(() => this.updateTimelineSourceFilters()));
		this.updateTimelineSourceFilters();
	}

	getItemActions(element: TreeElement): IAction[] {
		return this.getActions(MenuId.TimelineItemContext, { key: 'timelineItem', value: element.contextValue }).primary;
	}

	getItemContextActions(element: TreeElement): IAction[] {
		return this.getActions(MenuId.TimelineItemContext, { key: 'timelineItem', value: element.contextValue }).secondary;
	}

	private getActions(menuId: MenuId, context: { key: string, value?: string }): { primary: IAction[]; secondary: IAction[]; } {
		const scoped = this.contextKeyService.createScoped();
		scoped.createKey('view', this.pane.id);
		scoped.createKey(context.key, context.value);

		const menu = this.menuService.createMenu(menuId, scoped);
		const primary: IAction[] = [];
		const secondary: IAction[] = [];
		const result = { primary, secondary };
		createAndFillInContextMenuActions(menu, { shouldForwardArgs: true }, result, this.contextMenuService, g => /^inline/.test(g));

		menu.dispose();
		scoped.dispose();

		return result;
	}

	private updateTimelineSourceFilters() {
		this.sourceDisposaBles.clear();

		const excluded = new Set(this.configurationService.getValue<string[] | undefined>('timeline.excludeSources') ?? []);

		for (const source of this.timelineService.getSources()) {
			this.sourceDisposaBles.add(registerAction2(class extends Action2 {
				constructor() {
					super({
						id: `timeline.toggleExcludeSource:${source.id}`,
						title: { value: localize('timeline.filterSource', "Include: {0}", source.laBel), original: `Include: ${source.laBel}` },
						category: { value: localize('timeline', "Timeline"), original: 'Timeline' },
						menu: {
							id: MenuId.TimelineTitle,
							group: '2_sources',
						},
						toggled: ContextKeyExpr.regex(`config.timeline.excludeSources`, new RegExp(`\\B${escapeRegExpCharacters(source.id)}\\B`)).negate()
					});
				}
				run(accessor: ServicesAccessor, ...args: any[]) {
					if (excluded.has(source.id)) {
						excluded.delete(source.id);
					} else {
						excluded.add(source.id);
					}

					const configurationService = accessor.get(IConfigurationService);
					configurationService.updateValue('timeline.excludeSources', [...excluded.keys()]);
				}
			}));
		}
	}
}
