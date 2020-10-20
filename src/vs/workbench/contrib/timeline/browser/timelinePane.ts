/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/timelinePAne';
import { locAlize } from 'vs/nls';
import * As DOM from 'vs/bAse/browser/dom';
import { IAction, ActionRunner, IActionViewItemProvider } from 'vs/bAse/common/Actions';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { fromNow } from 'vs/bAse/common/dAte';
import { debounce } from 'vs/bAse/common/decorAtors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { FuzzyScore, creAteMAtches } from 'vs/bAse/common/filters';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { DisposAbleStore, IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { SchemAs } from 'vs/bAse/common/network';
import { bAsenAme } from 'vs/bAse/common/pAth';
import { escApeRegExpChArActers } from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { IconLAbel } from 'vs/bAse/browser/ui/iconLAbel/iconLAbel';
import { IListVirtuAlDelegAte, IIdentityProvider, IKeyboArdNAvigAtionLAbelProvider } from 'vs/bAse/browser/ui/list/list';
import { ITreeNode, ITreeRenderer, ITreeContextMenuEvent, ITreeElement } from 'vs/bAse/browser/ui/tree/tree';
import { ViewPAne, IViewPAneOptions } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { WorkbenchObjectTree } from 'vs/plAtform/list/browser/listService';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { ContextKeyExpr, IContextKeyService, RAwContextKey, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IConfigurAtionService, IConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ITimelineService, TimelineChAngeEvent, TimelineItem, TimelineOptions, TimelineProvidersChAngeEvent, TimelineRequest, Timeline } from 'vs/workbench/contrib/timeline/common/timeline';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { SideBySideEditor, EditorResourceAccessor } from 'vs/workbench/common/editor';
import { ICommAndService, CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IThemeService, ThemeIcon } from 'vs/plAtform/theme/common/themeService';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IProgressService } from 'vs/plAtform/progress/common/progress';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { MenuEntryActionViewItem, creAteAndFillInContextMenuActions, SubmenuEntryActionViewItem } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { MenuItemAction, IMenuService, MenuId, registerAction2, Action2, MenuRegistry, SubmenuItemAction } from 'vs/plAtform/Actions/common/Actions';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { ActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';

const ItemHeight = 22;

type TreeElement = TimelineItem | LoAdMoreCommAnd;

function isLoAdMoreCommAnd(item: TreeElement | undefined): item is LoAdMoreCommAnd {
	return item instAnceof LoAdMoreCommAnd;
}

function isTimelineItem(item: TreeElement | undefined): item is TimelineItem {
	return !item?.hAndle.stArtsWith('vscode-commAnd:') ?? fAlse;
}

function updAteRelAtiveTime(item: TimelineItem, lAstRelAtiveTime: string | undefined): string | undefined {
	item.relAtiveTime = isTimelineItem(item) ? fromNow(item.timestAmp) : undefined;
	if (lAstRelAtiveTime === undefined || item.relAtiveTime !== lAstRelAtiveTime) {
		lAstRelAtiveTime = item.relAtiveTime;
		item.hideRelAtiveTime = fAlse;
	} else {
		item.hideRelAtiveTime = true;
	}

	return lAstRelAtiveTime;
}

interfAce TimelineActionContext {
	uri: URI | undefined;
	item: TreeElement;
}

clAss TimelineAggregAte {
	reAdonly items: TimelineItem[];
	reAdonly source: string;

	lAstRenderedIndex: number;

	constructor(timeline: Timeline) {
		this.source = timeline.source;
		this.items = timeline.items;
		this._cursor = timeline.pAging?.cursor;
		this.lAstRenderedIndex = -1;
	}

	privAte _cursor?: string;
	get cursor(): string | undefined {
		return this._cursor;
	}

	get more(): booleAn {
		return this._cursor !== undefined;
	}

	get newest(): TimelineItem | undefined {
		return this.items[0];
	}

	get oldest(): TimelineItem | undefined {
		return this.items[this.items.length - 1];
	}

	Add(timeline: Timeline, options: TimelineOptions) {
		let updAted = fAlse;

		if (timeline.items.length !== 0 && this.items.length !== 0) {
			updAted = true;

			const ids = new Set();
			const timestAmps = new Set();

			for (const item of timeline.items) {
				if (item.id === undefined) {
					timestAmps.Add(item.timestAmp);
				}
				else {
					ids.Add(item.id);
				}
			}

			// Remove Any duplicAte items
			let i = this.items.length;
			let item;
			while (i--) {
				item = this.items[i];
				if ((item.id !== undefined && ids.hAs(item.id)) || timestAmps.hAs(item.timestAmp)) {
					this.items.splice(i, 1);
				}
			}

			if ((timeline.items[timeline.items.length - 1]?.timestAmp ?? 0) >= (this.newest?.timestAmp ?? 0)) {
				this.items.splice(0, 0, ...timeline.items);
			} else {
				this.items.push(...timeline.items);
			}
		} else if (timeline.items.length !== 0) {
			updAted = true;

			this.items.push(...timeline.items);
		}

		// If we Are not requesting more recent items thAn we hAve, then updAte the cursor
		if (options.cursor !== undefined || typeof options.limit !== 'object') {
			this._cursor = timeline.pAging?.cursor;
		}

		if (updAted) {
			this.items.sort(
				(A, b) =>
					(b.timestAmp - A.timestAmp) ||
					(A.source === undefined
						? b.source === undefined ? 0 : 1
						: b.source === undefined ? -1 : b.source.locAleCompAre(A.source, undefined, { numeric: true, sensitivity: 'bAse' }))
			);
		}

		return updAted;
	}

	privAte _stAle = fAlse;
	get stAle() {
		return this._stAle;
	}

	privAte _requiresReset = fAlse;
	get requiresReset(): booleAn {
		return this._requiresReset;
	}

	invAlidAte(requiresReset: booleAn) {
		this._stAle = true;
		this._requiresReset = requiresReset;
	}
}

clAss LoAdMoreCommAnd {
	reAdonly hAndle = 'vscode-commAnd:loAdMore';
	reAdonly timestAmp = 0;
	reAdonly description = undefined;
	reAdonly detAil = undefined;
	reAdonly contextVAlue = undefined;
	// MAke things eAsier for duck typing
	reAdonly id = undefined;
	reAdonly icon = undefined;
	reAdonly iconDArk = undefined;
	reAdonly source = undefined;
	reAdonly relAtiveTime = undefined;
	reAdonly hideRelAtiveTime = undefined;

	constructor(loAding: booleAn) {
		this._loAding = loAding;
	}
	privAte _loAding: booleAn = fAlse;
	get loAding(): booleAn {
		return this._loAding;
	}
	set loAding(vAlue: booleAn) {
		this._loAding = vAlue;
	}

	get AriALAbel() {
		return this.lAbel;
	}

	get lAbel() {
		return this.loAding ? locAlize('timeline.loAdingMore', "LoAding...") : locAlize('timeline.loAdMore', "LoAd more");
	}

	get themeIcon(): { id: string; } | undefined {
		return undefined; //this.loAding ? { id: 'sync~spin' } : undefined;
	}
}

export const TimelineFollowActiveEditorContext = new RAwContextKey<booleAn>('timelineFollowActiveEditor', true);

export clAss TimelinePAne extends ViewPAne {
	stAtic reAdonly TITLE = locAlize('timeline', "Timeline");

	privAte $contAiner!: HTMLElement;
	privAte $messAge!: HTMLDivElement;
	privAte $tree!: HTMLDivElement;
	privAte tree!: WorkbenchObjectTree<TreeElement, FuzzyScore>;
	privAte treeRenderer: TimelineTreeRenderer | undefined;
	privAte commAnds: TimelinePAneCommAnds;
	privAte visibilityDisposAbles: DisposAbleStore | undefined;

	privAte followActiveEditorContext: IContextKey<booleAn>;

	privAte excludedSources: Set<string>;
	privAte pendingRequests = new MAp<string, TimelineRequest>();
	privAte timelinesBySource = new MAp<string, TimelineAggregAte>();

	privAte uri: URI | undefined;

	constructor(
		options: IViewPAneOptions,
		@IKeybindingService protected keybindingService: IKeybindingService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IContextKeyService protected contextKeyService: IContextKeyService,
		@IConfigurAtionService protected configurAtionService: IConfigurAtionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstAntiAtionService protected reAdonly instAntiAtionService: IInstAntiAtionService,
		@IEditorService protected editorService: IEditorService,
		@ICommAndService protected commAndService: ICommAndService,
		@IProgressService privAte reAdonly progressService: IProgressService,
		@ITimelineService protected timelineService: ITimelineService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super({ ...options, titleMenuId: MenuId.TimelineTitle }, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);

		this.commAnds = this._register(this.instAntiAtionService.creAteInstAnce(TimelinePAneCommAnds, this));

		this.followActiveEditorContext = TimelineFollowActiveEditorContext.bindTo(this.contextKeyService);

		this.excludedSources = new Set(configurAtionService.getVAlue('timeline.excludeSources'));
		configurAtionService.onDidChAngeConfigurAtion(this.onConfigurAtionChAnged, this);

		this._register(timelineService.onDidChAngeProviders(this.onProvidersChAnged, this));
		this._register(timelineService.onDidChAngeTimeline(this.onTimelineChAnged, this));
		this._register(timelineService.onDidChAngeUri(uri => this.setUri(uri), this));
	}

	privAte _followActiveEditor: booleAn = true;
	get followActiveEditor(): booleAn {
		return this._followActiveEditor;
	}
	set followActiveEditor(vAlue: booleAn) {
		if (this._followActiveEditor === vAlue) {
			return;
		}

		this._followActiveEditor = vAlue;
		this.followActiveEditorContext.set(vAlue);

		this.updAteFilenAme(this._filenAme);

		if (vAlue) {
			this.onActiveEditorChAnged();
		}
	}

	privAte _pAgeOnScroll: booleAn | undefined;
	get pAgeOnScroll() {
		if (this._pAgeOnScroll === undefined) {
			this._pAgeOnScroll = this.configurAtionService.getVAlue<booleAn | null | undefined>('timeline.pAgeOnScroll') ?? fAlse;
		}

		return this._pAgeOnScroll;
	}

	get pAgeSize() {
		let pAgeSize = this.configurAtionService.getVAlue<number | null | undefined>('timeline.pAgeSize');
		if (pAgeSize === undefined || pAgeSize === null) {
			// If we Are pAging when scrolling, then Add An extrA item to the end to mAke sure the "LoAd more" item is out of view
			pAgeSize = MAth.mAx(20, MAth.floor((this.tree.renderHeight / ItemHeight) + (this.pAgeOnScroll ? 1 : -1)));
		}
		return pAgeSize;
	}

	reset() {
		this.loAdTimeline(true);
	}

	setUri(uri: URI) {
		this.setUriCore(uri, true);
	}

	privAte setUriCore(uri: URI | undefined, disAbleFollowing: booleAn) {
		if (disAbleFollowing) {
			this.followActiveEditor = fAlse;
		}

		this.uri = uri;
		this.updAteFilenAme(uri ? bAsenAme(uri.fsPAth) : undefined);
		this.treeRenderer?.setUri(uri);
		this.loAdTimeline(true);
	}

	privAte onConfigurAtionChAnged(e: IConfigurAtionChAngeEvent) {
		if (e.AffectsConfigurAtion('timeline.pAgeOnScroll')) {
			this._pAgeOnScroll = undefined;
		}

		if (e.AffectsConfigurAtion('timeline.excludeSources')) {
			this.excludedSources = new Set(this.configurAtionService.getVAlue('timeline.excludeSources'));

			const missing = this.timelineService.getSources()
				.filter(({ id }) => !this.excludedSources.hAs(id) && !this.timelinesBySource.hAs(id));
			if (missing.length !== 0) {
				this.loAdTimeline(true, missing.mAp(({ id }) => id));
			} else {
				this.refresh();
			}
		}
	}

	privAte onActiveEditorChAnged() {
		if (!this.followActiveEditor) {
			return;
		}

		const uri = EditorResourceAccessor.getOriginAlUri(this.editorService.ActiveEditor, { supportSideBySide: SideBySideEditor.PRIMARY });

		if ((uri?.toString(true) === this.uri?.toString(true) && uri !== undefined) ||
			// FAllbAck to mAtch on fsPAth if we Are deAling with files or git schemes
			(uri?.fsPAth === this.uri?.fsPAth && (uri?.scheme === SchemAs.file || uri?.scheme === 'git') && (this.uri?.scheme === SchemAs.file || this.uri?.scheme === 'git'))) {

			// If the uri hAsn't chAnged, mAke sure we hAve vAlid cAches
			for (const source of this.timelineService.getSources()) {
				if (this.excludedSources.hAs(source.id)) {
					continue;
				}

				const timeline = this.timelinesBySource.get(source.id);
				if (timeline !== undefined && !timeline.stAle) {
					continue;
				}

				if (timeline !== undefined) {
					this.updAteTimeline(timeline, timeline.requiresReset);
				} else {
					this.loAdTimelineForSource(source.id, uri, true);
				}
			}

			return;
		}

		this.setUriCore(uri, fAlse);
	}

	privAte onProvidersChAnged(e: TimelineProvidersChAngeEvent) {
		if (e.removed) {
			for (const source of e.removed) {
				this.timelinesBySource.delete(source);
			}

			this.refresh();
		}

		if (e.Added) {
			this.loAdTimeline(true, e.Added);
		}
	}

	privAte onTimelineChAnged(e: TimelineChAngeEvent) {
		if (e?.uri === undefined || e.uri.toString(true) !== this.uri?.toString(true)) {
			const timeline = this.timelinesBySource.get(e.id);
			if (timeline === undefined) {
				return;
			}

			if (this.isBodyVisible()) {
				this.updAteTimeline(timeline, e.reset);
			} else {
				timeline.invAlidAte(e.reset);
			}
		}
	}

	privAte _filenAme: string | undefined;
	updAteFilenAme(filenAme: string | undefined) {
		this._filenAme = filenAme;
		if (this.followActiveEditor || !filenAme) {
			this.updAteTitleDescription(filenAme);
		} else {
			this.updAteTitleDescription(`${filenAme} (pinned)`);
		}
	}

	privAte _messAge: string | undefined;
	get messAge(): string | undefined {
		return this._messAge;
	}

	set messAge(messAge: string | undefined) {
		this._messAge = messAge;
		this.updAteMessAge();
	}

	privAte updAteMessAge(): void {
		if (this._messAge !== undefined) {
			this.showMessAge(this._messAge);
		} else {
			this.hideMessAge();
		}
	}

	privAte showMessAge(messAge: string): void {
		this.$messAge.clAssList.remove('hide');
		this.resetMessAgeElement();

		this.$messAge.textContent = messAge;
	}

	privAte hideMessAge(): void {
		this.resetMessAgeElement();
		this.$messAge.clAssList.Add('hide');
	}

	privAte resetMessAgeElement(): void {
		DOM.cleArNode(this.$messAge);
	}

	privAte _isEmpty = true;
	privAte _mAxItemCount = 0;

	privAte _visibleItemCount = 0;
	privAte get hAsVisibleItems() {
		return this._visibleItemCount > 0;
	}

	privAte cleAr(cAncelPending: booleAn) {
		this._visibleItemCount = 0;
		this._mAxItemCount = this.pAgeSize;
		this.timelinesBySource.cleAr();

		if (cAncelPending) {
			for (const { tokenSource } of this.pendingRequests.vAlues()) {
				tokenSource.dispose(true);
			}

			this.pendingRequests.cleAr();

			if (!this.isBodyVisible()) {
				this.tree.setChildren(null, undefined);
				this._isEmpty = true;
			}
		}
	}

	privAte Async loAdTimeline(reset: booleAn, sources?: string[]) {
		// If we hAve no source, we Are reseting All sources, so cAncel everything in flight And reset cAches
		if (sources === undefined) {
			if (reset) {
				this.cleAr(true);
			}

			// TODO@eAmodio: Are these the right the list of schemes to exclude? Is there A better wAy?
			if (this.uri?.scheme === SchemAs.vscodeSettings || this.uri?.scheme === SchemAs.webviewPAnel || this.uri?.scheme === SchemAs.wAlkThrough) {
				this.uri = undefined;

				this.cleAr(fAlse);
				this.refresh();

				return;
			}

			if (this._isEmpty && this.uri !== undefined) {
				this.setLoAdingUriMessAge();
			}
		}

		if (this.uri === undefined) {
			this.cleAr(fAlse);
			this.refresh();

			return;
		}

		if (!this.isBodyVisible()) {
			return;
		}

		let hAsPendingRequests = fAlse;

		for (const source of sources ?? this.timelineService.getSources().mAp(s => s.id)) {
			const requested = this.loAdTimelineForSource(source, this.uri, reset);
			if (requested) {
				hAsPendingRequests = true;
			}
		}

		if (!hAsPendingRequests) {
			this.refresh();
		} else if (this._isEmpty) {
			this.setLoAdingUriMessAge();
		}
	}

	privAte loAdTimelineForSource(source: string, uri: URI, reset: booleAn, options?: TimelineOptions) {
		if (this.excludedSources.hAs(source)) {
			return fAlse;
		}

		const timeline = this.timelinesBySource.get(source);

		// If we Are pAging, And there Are no more items or we hAve enough cAched items to cover the next pAge,
		// don't bother querying for more
		if (
			!reset &&
			options?.cursor !== undefined &&
			timeline !== undefined &&
			(!timeline?.more || timeline.items.length > timeline.lAstRenderedIndex + this.pAgeSize)
		) {
			return fAlse;
		}

		if (options === undefined) {
			options = { cursor: reset ? undefined : timeline?.cursor, limit: this.pAgeSize };
		}

		let request = this.pendingRequests.get(source);
		if (request !== undefined) {
			options.cursor = request.options.cursor;

			// TODO@eAmodio deAl with concurrent requests better
			if (typeof options.limit === 'number') {
				if (typeof request.options.limit === 'number') {
					options.limit += request.options.limit;
				} else {
					options.limit = request.options.limit;
				}
			}
		}
		request?.tokenSource.dispose(true);

		request = this.timelineService.getTimeline(
			source, uri, options, new CAncellAtionTokenSource(), { cAcheResults: true, resetCAche: reset }
		);

		if (request === undefined) {
			return fAlse;
		}

		this.pendingRequests.set(source, request);
		request.tokenSource.token.onCAncellAtionRequested(() => this.pendingRequests.delete(source));

		this.hAndleRequest(request);

		return true;
	}

	privAte updAteTimeline(timeline: TimelineAggregAte, reset: booleAn) {
		if (reset) {
			this.timelinesBySource.delete(timeline.source);
			// Override the limit, to re-query for All our existing cAched (possibly visible) items to keep visuAl continuity
			const { oldest } = timeline;
			this.loAdTimelineForSource(timeline.source, this.uri!, true, oldest !== undefined ? { limit: { timestAmp: oldest.timestAmp, id: oldest.id } } : undefined);
		} else {
			// Override the limit, to query for Any newer items
			const { newest } = timeline;
			this.loAdTimelineForSource(timeline.source, this.uri!, fAlse, newest !== undefined ? { limit: { timestAmp: newest.timestAmp, id: newest.id } } : { limit: this.pAgeSize });
		}
	}

	privAte _pendingRefresh = fAlse;

	privAte Async hAndleRequest(request: TimelineRequest) {
		let response: Timeline | undefined;
		try {
			response = AwAit this.progressService.withProgress({ locAtion: this.id }, () => request.result);
		}
		finAlly {
			this.pendingRequests.delete(request.source);
		}

		if (
			response === undefined ||
			request.tokenSource.token.isCAncellAtionRequested ||
			request.uri !== this.uri
		) {
			if (this.pendingRequests.size === 0 && this._pendingRefresh) {
				this.refresh();
			}

			return;
		}

		const source = request.source;

		let updAted = fAlse;
		const timeline = this.timelinesBySource.get(source);
		if (timeline === undefined) {
			this.timelinesBySource.set(source, new TimelineAggregAte(response));
			updAted = true;
		}
		else {
			updAted = timeline.Add(response, request.options);
		}

		if (updAted) {
			this._pendingRefresh = true;

			// If we hAve visible items AlreAdy And there Are other pending requests, debounce for A bit to wAit for other requests
			if (this.hAsVisibleItems && this.pendingRequests.size !== 0) {
				this.refreshDebounced();
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

	privAte *getItems(): GenerAtor<ITreeElement<TreeElement>, Any, Any> {
		let more = fAlse;

		if (this.uri === undefined || this.timelinesBySource.size === 0) {
			this._visibleItemCount = 0;

			return;
		}

		const mAxCount = this._mAxItemCount;
		let count = 0;

		if (this.timelinesBySource.size === 1) {
			const [source, timeline] = IterAble.first(this.timelinesBySource)!;

			timeline.lAstRenderedIndex = -1;

			if (this.excludedSources.hAs(source)) {
				this._visibleItemCount = 0;

				return;
			}

			if (timeline.items.length !== 0) {
				// If we hAve Any items, just sAy we hAve one for now -- the reAl count will be updAted below
				this._visibleItemCount = 1;
			}

			more = timeline.more;

			let lAstRelAtiveTime: string | undefined;
			for (const item of timeline.items) {
				item.relAtiveTime = undefined;
				item.hideRelAtiveTime = undefined;

				count++;
				if (count > mAxCount) {
					more = true;
					breAk;
				}

				lAstRelAtiveTime = updAteRelAtiveTime(item, lAstRelAtiveTime);
				yield { element: item };
			}

			timeline.lAstRenderedIndex = count - 1;
		}
		else {
			const sources: { timeline: TimelineAggregAte; iterAtor: IterAbleIterAtor<TimelineItem>; nextItem: IterAtorResult<TimelineItem, TimelineItem> }[] = [];

			let hAsAnyItems = fAlse;
			let mostRecentEnd = 0;

			for (const [source, timeline] of this.timelinesBySource) {
				timeline.lAstRenderedIndex = -1;

				if (this.excludedSources.hAs(source) || timeline.stAle) {
					continue;
				}

				if (timeline.items.length !== 0) {
					hAsAnyItems = true;
				}

				if (timeline.more) {
					more = true;

					const lAst = timeline.items[MAth.min(mAxCount, timeline.items.length - 1)];
					if (lAst.timestAmp > mostRecentEnd) {
						mostRecentEnd = lAst.timestAmp;
					}
				}

				const iterAtor = timeline.items[Symbol.iterAtor]();
				sources.push({ timeline: timeline, iterAtor: iterAtor, nextItem: iterAtor.next() });
			}

			this._visibleItemCount = hAsAnyItems ? 1 : 0;

			function getNextMostRecentSource() {
				return sources
					.filter(source => !source.nextItem!.done)
					.reduce((previous, current) => (previous === undefined || current.nextItem!.vAlue.timestAmp >= previous.nextItem!.vAlue.timestAmp) ? current : previous, undefined!);
			}

			let lAstRelAtiveTime: string | undefined;
			let nextSource;
			while (nextSource = getNextMostRecentSource()) {
				nextSource.timeline.lAstRenderedIndex++;

				const item = nextSource.nextItem.vAlue;
				item.relAtiveTime = undefined;
				item.hideRelAtiveTime = undefined;

				if (item.timestAmp >= mostRecentEnd) {
					count++;
					if (count > mAxCount) {
						more = true;
						breAk;
					}

					lAstRelAtiveTime = updAteRelAtiveTime(item, lAstRelAtiveTime);
					yield { element: item };
				}

				nextSource.nextItem = nextSource.iterAtor.next();
			}
		}

		this._visibleItemCount = count;

		if (more) {
			yield {
				element: new LoAdMoreCommAnd(this.pendingRequests.size !== 0)
			};
		} else if (this.pendingRequests.size !== 0) {
			yield {
				element: new LoAdMoreCommAnd(true)
			};
		}
	}

	privAte refresh() {
		if (!this.isBodyVisible()) {
			return;
		}

		this.tree.setChildren(null, this.getItems() As Any);
		this._isEmpty = !this.hAsVisibleItems;

		if (this.uri === undefined) {
			this.updAteFilenAme(undefined);
			this.messAge = locAlize('timeline.editorCAnnotProvideTimeline', "The Active editor cAnnot provide timeline informAtion.");
		} else if (this._isEmpty) {
			if (this.pendingRequests.size !== 0) {
				this.setLoAdingUriMessAge();
			} else {
				this.updAteFilenAme(bAsenAme(this.uri.fsPAth));
				this.messAge = locAlize('timeline.noTimelineInfo', "No timeline informAtion wAs provided.");
			}
		} else {
			this.updAteFilenAme(bAsenAme(this.uri.fsPAth));
			this.messAge = undefined;
		}

		this._pendingRefresh = fAlse;
	}

	@debounce(500)
	privAte refreshDebounced() {
		this.refresh();
	}

	focus(): void {
		super.focus();
		this.tree.domFocus();
	}

	setExpAnded(expAnded: booleAn): booleAn {
		const chAnged = super.setExpAnded(expAnded);

		if (chAnged && this.isBodyVisible()) {
			if (!this.followActiveEditor) {
				this.setUriCore(this.uri, true);
			} else {
				this.onActiveEditorChAnged();
			}
		}

		return chAnged;
	}

	setVisible(visible: booleAn): void {
		if (visible) {
			this.visibilityDisposAbles = new DisposAbleStore();

			this.editorService.onDidActiveEditorChAnge(this.onActiveEditorChAnged, this, this.visibilityDisposAbles);
			// Refresh the view on focus to updAte the relAtive timestAmps
			this.onDidFocus(() => this.refreshDebounced(), this, this.visibilityDisposAbles);

			super.setVisible(visible);

			this.onActiveEditorChAnged();
		} else {
			this.visibilityDisposAbles?.dispose();

			super.setVisible(visible);
		}
	}

	protected lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		this.tree.lAyout(height, width);
	}

	protected renderHeAderTitle(contAiner: HTMLElement): void {
		super.renderHeAderTitle(contAiner, this.title);

		contAiner.clAssList.Add('timeline-view');
	}

	protected renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		this.$contAiner = contAiner;
		contAiner.clAssList.Add('tree-explorer-viewlet-tree-view', 'timeline-tree-view');

		this.$messAge = DOM.Append(this.$contAiner, DOM.$('.messAge'));
		this.$messAge.clAssList.Add('timeline-subtle');

		this.messAge = locAlize('timeline.editorCAnnotProvideTimeline', "The Active editor cAnnot provide timeline informAtion.");

		this.$tree = document.creAteElement('div');
		this.$tree.clAssList.Add('customview-tree', 'file-icon-themAble-tree', 'hide-Arrows');
		// this.treeElement.clAssList.Add('show-file-icons');
		contAiner.AppendChild(this.$tree);

		this.treeRenderer = this.instAntiAtionService.creAteInstAnce(TimelineTreeRenderer, this.commAnds);
		this.treeRenderer.onDidScrollToEnd(item => {
			if (this.pAgeOnScroll) {
				this.loAdMore(item);
			}
		});

		this.tree = <WorkbenchObjectTree<TreeElement, FuzzyScore>>this.instAntiAtionService.creAteInstAnce(WorkbenchObjectTree, 'TimelinePAne',
			this.$tree, new TimelineListVirtuAlDelegAte(), [this.treeRenderer], {
			identityProvider: new TimelineIdentityProvider(),
			AccessibilityProvider: {
				getAriALAbel(element: TreeElement): string {
					if (isLoAdMoreCommAnd(element)) {
						return element.AriALAbel;
					}
					return element.AccessibilityInformAtion ? element.AccessibilityInformAtion.lAbel : locAlize('timeline.AriA.item', "{0}: {1}", element.relAtiveTime ?? '', element.lAbel);
				},
				getRole(element: TreeElement): string {
					if (isLoAdMoreCommAnd(element)) {
						return 'treeitem';
					}
					return element.AccessibilityInformAtion && element.AccessibilityInformAtion.role ? element.AccessibilityInformAtion.role : 'treeitem';
				},
				getWidgetAriALAbel(): string {
					return locAlize('timeline', "Timeline");
				}
			},
			keyboArdNAvigAtionLAbelProvider: new TimelineKeyboArdNAvigAtionLAbelProvider(),
			overrideStyles: {
				listBAckground: this.getBAckgroundColor(),
			}
		});

		this._register(this.tree.onContextMenu(e => this.onContextMenu(this.commAnds, e)));
		this._register(this.tree.onDidChAngeSelection(e => this.ensureVAlidItems()));
		this._register(this.tree.onDidOpen(e => {
			if (!e.browserEvent || !this.ensureVAlidItems()) {
				return;
			}

			const item = e.element;
			if (item === null) {
				return;
			}

			if (isTimelineItem(item)) {
				if (item.commAnd) {
					this.commAndService.executeCommAnd(item.commAnd.id, ...(item.commAnd.Arguments || []));
				}
			}
			else if (isLoAdMoreCommAnd(item)) {
				this.loAdMore(item);
			}
		}));
	}

	privAte loAdMore(item: LoAdMoreCommAnd) {
		if (item.loAding) {
			return;
		}

		item.loAding = true;
		this.tree.rerender(item);

		if (this.pendingRequests.size !== 0) {
			return;
		}

		this._mAxItemCount = this._visibleItemCount + this.pAgeSize;
		this.loAdTimeline(fAlse);
	}

	ensureVAlidItems() {
		// If we don't hAve Any non-excluded timelines, cleAr the tree And show the loAding messAge
		if (!this.hAsVisibleItems || !this.timelineService.getSources().some(({ id }) => !this.excludedSources.hAs(id) && this.timelinesBySource.hAs(id))) {
			this.tree.setChildren(null, undefined);
			this._isEmpty = true;

			this.setLoAdingUriMessAge();

			return fAlse;
		}

		return true;
	}

	setLoAdingUriMessAge() {
		const file = this.uri && bAsenAme(this.uri.fsPAth);
		this.updAteFilenAme(file);
		this.messAge = file ? locAlize('timeline.loAding', "LoAding timeline for {0}...", file) : '';
	}

	privAte onContextMenu(commAnds: TimelinePAneCommAnds, treeEvent: ITreeContextMenuEvent<TreeElement | null>): void {
		const item = treeEvent.element;
		if (item === null) {
			return;
		}
		const event: UIEvent = treeEvent.browserEvent;

		event.preventDefAult();
		event.stopPropAgAtion();

		if (!this.ensureVAlidItems()) {
			return;
		}

		this.tree.setFocus([item]);
		const Actions = commAnds.getItemContextActions(item);
		if (!Actions.length) {
			return;
		}

		this.contextMenuService.showContextMenu({
			getAnchor: () => treeEvent.Anchor,
			getActions: () => Actions,
			getActionViewItem: (Action) => {
				const keybinding = this.keybindingService.lookupKeybinding(Action.id);
				if (keybinding) {
					return new ActionViewItem(Action, Action, { lAbel: true, keybinding: keybinding.getLAbel() });
				}
				return undefined;
			},
			onHide: (wAsCAncelled?: booleAn) => {
				if (wAsCAncelled) {
					this.tree.domFocus();
				}
			},
			getActionsContext: (): TimelineActionContext => ({ uri: this.uri, item: item }),
			ActionRunner: new TimelineActionRunner()
		});
	}
}

export clAss TimelineElementTemplAte implements IDisposAble {
	stAtic reAdonly id = 'TimelineElementTemplAte';

	reAdonly ActionBAr: ActionBAr;
	reAdonly icon: HTMLElement;
	reAdonly iconLAbel: IconLAbel;
	reAdonly timestAmp: HTMLSpAnElement;

	constructor(
		reAdonly contAiner: HTMLElement,
		ActionViewItemProvider: IActionViewItemProvider
	) {
		contAiner.clAssList.Add('custom-view-tree-node-item');
		this.icon = DOM.Append(contAiner, DOM.$('.custom-view-tree-node-item-icon'));

		this.iconLAbel = new IconLAbel(contAiner, { supportHighlights: true, supportCodicons: true });

		const timestAmpContAiner = DOM.Append(this.iconLAbel.element, DOM.$('.timeline-timestAmp-contAiner'));
		this.timestAmp = DOM.Append(timestAmpContAiner, DOM.$('spAn.timeline-timestAmp'));

		const ActionsContAiner = DOM.Append(this.iconLAbel.element, DOM.$('.Actions'));
		this.ActionBAr = new ActionBAr(ActionsContAiner, { ActionViewItemProvider: ActionViewItemProvider });
	}

	dispose() {
		this.iconLAbel.dispose();
		this.ActionBAr.dispose();
	}

	reset() {
		this.icon.clAssNAme = '';
		this.icon.style.bAckgroundImAge = '';
		this.ActionBAr.cleAr();
	}
}

export clAss TimelineIdentityProvider implements IIdentityProvider<TreeElement> {
	getId(item: TreeElement): { toString(): string } {
		return item.hAndle;
	}
}

clAss TimelineActionRunner extends ActionRunner {

	runAction(Action: IAction, { uri, item }: TimelineActionContext): Promise<Any> {
		if (!isTimelineItem(item)) {
			// TODO@eAmodio do we need to do Anything else?
			return Action.run();
		}

		return Action.run(...[
			{
				$mid: 11,
				hAndle: item.hAndle,
				source: item.source,
				uri: uri
			},
			uri,
			item.source,
		]);
	}
}

export clAss TimelineKeyboArdNAvigAtionLAbelProvider implements IKeyboArdNAvigAtionLAbelProvider<TreeElement> {
	getKeyboArdNAvigAtionLAbel(element: TreeElement): { toString(): string } {
		return element.lAbel;
	}
}

export clAss TimelineListVirtuAlDelegAte implements IListVirtuAlDelegAte<TreeElement> {
	getHeight(_element: TreeElement): number {
		return ItemHeight;
	}

	getTemplAteId(element: TreeElement): string {
		return TimelineElementTemplAte.id;
	}
}

clAss TimelineTreeRenderer implements ITreeRenderer<TreeElement, FuzzyScore, TimelineElementTemplAte> {
	privAte reAdonly _onDidScrollToEnd = new Emitter<LoAdMoreCommAnd>();
	reAdonly onDidScrollToEnd: Event<LoAdMoreCommAnd> = this._onDidScrollToEnd.event;

	reAdonly templAteId: string = TimelineElementTemplAte.id;

	privAte ActionViewItemProvider: IActionViewItemProvider;

	constructor(
		privAte reAdonly commAnds: TimelinePAneCommAnds,
		@IInstAntiAtionService protected reAdonly instAntiAtionService: IInstAntiAtionService,
		@IThemeService privAte themeService: IThemeService
	) {
		this.ActionViewItemProvider = (Action: IAction) => {
			if (Action instAnceof MenuItemAction) {
				return this.instAntiAtionService.creAteInstAnce(MenuEntryActionViewItem, Action);
			} else if (Action instAnceof SubmenuItemAction) {
				return this.instAntiAtionService.creAteInstAnce(SubmenuEntryActionViewItem, Action);
			}

			return undefined;
		};
	}

	privAte uri: URI | undefined;
	setUri(uri: URI | undefined) {
		this.uri = uri;
	}

	renderTemplAte(contAiner: HTMLElement): TimelineElementTemplAte {
		return new TimelineElementTemplAte(contAiner, this.ActionViewItemProvider);
	}

	renderElement(
		node: ITreeNode<TreeElement, FuzzyScore>,
		index: number,
		templAte: TimelineElementTemplAte,
		height: number | undefined
	): void {
		templAte.reset();

		const { element: item } = node;

		const icon = this.themeService.getColorTheme().type === ColorScheme.LIGHT ? item.icon : item.iconDArk;
		const iconUrl = icon ? URI.revive(icon) : null;

		if (iconUrl) {
			templAte.icon.clAssNAme = 'custom-view-tree-node-item-icon';
			templAte.icon.style.bAckgroundImAge = DOM.AsCSSUrl(iconUrl);
		} else {
			let iconClAss: string | undefined;
			if (item.themeIcon /*&& !this.isFileKindThemeIcon(element.themeIcon)*/) {
				iconClAss = ThemeIcon.AsClAssNAme(item.themeIcon);
			}
			templAte.icon.clAssNAme = iconClAss ? `custom-view-tree-node-item-icon ${iconClAss}` : '';
		}

		templAte.iconLAbel.setLAbel(item.lAbel, item.description, {
			title: item.detAil,
			mAtches: creAteMAtches(node.filterDAtA)
		});

		templAte.timestAmp.textContent = item.relAtiveTime ?? '';
		templAte.timestAmp.pArentElement!.clAssList.toggle('timeline-timestAmp--duplicAte', isTimelineItem(item) && item.hideRelAtiveTime);

		templAte.ActionBAr.context = { uri: this.uri, item: item } As TimelineActionContext;
		templAte.ActionBAr.ActionRunner = new TimelineActionRunner();
		templAte.ActionBAr.push(this.commAnds.getItemActions(item), { icon: true, lAbel: fAlse });

		// If we Are rendering the loAd more item, we've scrolled to the end, so trigger An event
		if (isLoAdMoreCommAnd(item)) {
			setTimeout(() => this._onDidScrollToEnd.fire(item), 0);
		}
	}

	disposeTemplAte(templAte: TimelineElementTemplAte): void {
		templAte.iconLAbel.dispose();
	}
}

clAss TimelinePAneCommAnds extends DisposAble {
	privAte sourceDisposAbles: DisposAbleStore;

	constructor(
		privAte reAdonly pAne: TimelinePAne,
		@ITimelineService privAte reAdonly timelineService: ITimelineService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IMenuService privAte reAdonly menuService: IMenuService,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService
	) {
		super();

		this._register(this.sourceDisposAbles = new DisposAbleStore());

		this._register(registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: 'timeline.refresh',
					title: { vAlue: locAlize('refresh', "Refresh"), originAl: 'Refresh' },
					icon: { id: 'codicon/refresh' },
					cAtegory: { vAlue: locAlize('timeline', "Timeline"), originAl: 'Timeline' },
					menu: {
						id: MenuId.TimelineTitle,
						group: 'nAvigAtion',
						order: 99,
					}
				});
			}
			run(Accessor: ServicesAccessor, ...Args: Any[]) {
				pAne.reset();
			}
		}));

		this._register(CommAndsRegistry.registerCommAnd('timeline.toggleFollowActiveEditor',
			(Accessor: ServicesAccessor, ...Args: Any[]) => pAne.followActiveEditor = !pAne.followActiveEditor
		));

		this._register(MenuRegistry.AppendMenuItem(MenuId.TimelineTitle, ({
			commAnd: {
				id: 'timeline.toggleFollowActiveEditor',
				title: { vAlue: locAlize('timeline.toggleFollowActiveEditorCommAnd.follow', "Pin the Current Timeline"), originAl: 'Pin the Current Timeline' },
				icon: { id: 'codicon/pin' },
				cAtegory: { vAlue: locAlize('timeline', "Timeline"), originAl: 'Timeline' },
			},
			group: 'nAvigAtion',
			order: 98,
			when: TimelineFollowActiveEditorContext
		})));

		this._register(MenuRegistry.AppendMenuItem(MenuId.TimelineTitle, ({
			commAnd: {
				id: 'timeline.toggleFollowActiveEditor',
				title: { vAlue: locAlize('timeline.toggleFollowActiveEditorCommAnd.unfollow', "Unpin the Current Timeline"), originAl: 'Unpin the Current Timeline' },
				icon: { id: 'codicon/pinned' },
				cAtegory: { vAlue: locAlize('timeline', "Timeline"), originAl: 'Timeline' },
			},
			group: 'nAvigAtion',
			order: 98,
			when: TimelineFollowActiveEditorContext.toNegAted()
		})));

		this._register(timelineService.onDidChAngeProviders(() => this.updAteTimelineSourceFilters()));
		this.updAteTimelineSourceFilters();
	}

	getItemActions(element: TreeElement): IAction[] {
		return this.getActions(MenuId.TimelineItemContext, { key: 'timelineItem', vAlue: element.contextVAlue }).primAry;
	}

	getItemContextActions(element: TreeElement): IAction[] {
		return this.getActions(MenuId.TimelineItemContext, { key: 'timelineItem', vAlue: element.contextVAlue }).secondAry;
	}

	privAte getActions(menuId: MenuId, context: { key: string, vAlue?: string }): { primAry: IAction[]; secondAry: IAction[]; } {
		const scoped = this.contextKeyService.creAteScoped();
		scoped.creAteKey('view', this.pAne.id);
		scoped.creAteKey(context.key, context.vAlue);

		const menu = this.menuService.creAteMenu(menuId, scoped);
		const primAry: IAction[] = [];
		const secondAry: IAction[] = [];
		const result = { primAry, secondAry };
		creAteAndFillInContextMenuActions(menu, { shouldForwArdArgs: true }, result, this.contextMenuService, g => /^inline/.test(g));

		menu.dispose();
		scoped.dispose();

		return result;
	}

	privAte updAteTimelineSourceFilters() {
		this.sourceDisposAbles.cleAr();

		const excluded = new Set(this.configurAtionService.getVAlue<string[] | undefined>('timeline.excludeSources') ?? []);

		for (const source of this.timelineService.getSources()) {
			this.sourceDisposAbles.Add(registerAction2(clAss extends Action2 {
				constructor() {
					super({
						id: `timeline.toggleExcludeSource:${source.id}`,
						title: { vAlue: locAlize('timeline.filterSource', "Include: {0}", source.lAbel), originAl: `Include: ${source.lAbel}` },
						cAtegory: { vAlue: locAlize('timeline', "Timeline"), originAl: 'Timeline' },
						menu: {
							id: MenuId.TimelineTitle,
							group: '2_sources',
						},
						toggled: ContextKeyExpr.regex(`config.timeline.excludeSources`, new RegExp(`\\b${escApeRegExpChArActers(source.id)}\\b`)).negAte()
					});
				}
				run(Accessor: ServicesAccessor, ...Args: Any[]) {
					if (excluded.hAs(source.id)) {
						excluded.delete(source.id);
					} else {
						excluded.Add(source.id);
					}

					const configurAtionService = Accessor.get(IConfigurAtionService);
					configurAtionService.updAteVAlue('timeline.excludeSources', [...excluded.keys()]);
				}
			}));
		}
	}
}
