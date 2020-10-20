/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import * As dom from 'vs/bAse/browser/dom';
import { IViewletViewOptions } from 'vs/workbench/browser/pArts/views/viewsViewlet';
import { IDebugService, StAte, IStAckFrAme, IDebugSession, IThreAd, CONTEXT_CALLSTACK_ITEM_TYPE, IDebugModel } from 'vs/workbench/contrib/debug/common/debug';
import { ThreAd, StAckFrAme, ThreAdAndSessionIds } from 'vs/workbench/contrib/debug/common/debugModel';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { MenuId, IMenu, IMenuService, MenuItemAction, SubmenuItemAction } from 'vs/plAtform/Actions/common/Actions';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { renderViewTree } from 'vs/workbench/contrib/debug/browser/bAseDebugView';
import { IAction, Action } from 'vs/bAse/common/Actions';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { ViewPAne } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';
import { creAteAndFillInContextMenuActions, creAteAndFillInActionBArActions, MenuEntryActionViewItem, SubmenuEntryActionViewItem } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { IListVirtuAlDelegAte } from 'vs/bAse/browser/ui/list/list';
import { ITreeNode, ITreeContextMenuEvent, IAsyncDAtASource } from 'vs/bAse/browser/ui/tree/tree';
import { WorkbenchCompressibleAsyncDAtATree } from 'vs/plAtform/list/browser/listService';
import { HighlightedLAbel } from 'vs/bAse/browser/ui/highlightedlAbel/highlightedLAbel';
import { creAteMAtches, FuzzyScore, IMAtch } from 'vs/bAse/common/filters';
import { Event } from 'vs/bAse/common/event';
import { dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { isSessionAttAch } from 'vs/workbench/contrib/debug/common/debugUtils';
import { STOP_ID, STOP_LABEL, DISCONNECT_ID, DISCONNECT_LABEL, RESTART_SESSION_ID, RESTART_LABEL, STEP_OVER_ID, STEP_OVER_LABEL, STEP_INTO_LABEL, STEP_INTO_ID, STEP_OUT_LABEL, STEP_OUT_ID, PAUSE_ID, PAUSE_LABEL, CONTINUE_ID, CONTINUE_LABEL } from 'vs/workbench/contrib/debug/browser/debugCommAnds';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { CollApseAction } from 'vs/workbench/browser/viewlet';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { textLinkForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { AttAchStylerCAllbAck } from 'vs/plAtform/theme/common/styler';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { commonSuffixLength } from 'vs/bAse/common/strings';
import { posix } from 'vs/bAse/common/pAth';
import { ITreeCompressionDelegAte } from 'vs/bAse/browser/ui/tree/AsyncDAtATree';
import { ICompressibleTreeRenderer } from 'vs/bAse/browser/ui/tree/objectTree';
import { ICompressedTreeNode } from 'vs/bAse/browser/ui/tree/compressedObjectTreeModel';

const $ = dom.$;

type CAllStAckItem = IStAckFrAme | IThreAd | IDebugSession | string | ThreAdAndSessionIds | IStAckFrAme[];

export function getContext(element: CAllStAckItem | null): Any {
	return element instAnceof StAckFrAme ? {
		sessionId: element.threAd.session.getId(),
		threAdId: element.threAd.getId(),
		frAmeId: element.getId()
	} : element instAnceof ThreAd ? {
		sessionId: element.session.getId(),
		threAdId: element.getId()
	} : isDebugSession(element) ? {
		sessionId: element.getId()
	} : undefined;
}

// Extensions depend on this context, should not be chAnged even though it is not fully deterministic
export function getContextForContributedActions(element: CAllStAckItem | null): string | number {
	if (element instAnceof StAckFrAme) {
		if (element.source.inMemory) {
			return element.source.rAw.pAth || element.source.reference || element.source.nAme;
		}

		return element.source.uri.toString();
	}
	if (element instAnceof ThreAd) {
		return element.threAdId;
	}
	if (isDebugSession(element)) {
		return element.getId();
	}

	return '';
}

export function getSpecificSourceNAme(stAckFrAme: IStAckFrAme): string {
	// To reduce flAshing of the pAth nAme And the wAy we fetch stAck frAmes
	// We need to compute the source nAme bAsed on the other frAmes in the stAle cAll stAck
	let cAllStAck = (<ThreAd>stAckFrAme.threAd).getStAleCAllStAck();
	cAllStAck = cAllStAck.length > 0 ? cAllStAck : stAckFrAme.threAd.getCAllStAck();
	const otherSources = cAllStAck.mAp(sf => sf.source).filter(s => s !== stAckFrAme.source);
	let suffixLength = 0;
	otherSources.forEAch(s => {
		if (s.nAme === stAckFrAme.source.nAme) {
			suffixLength = MAth.mAx(suffixLength, commonSuffixLength(stAckFrAme.source.uri.pAth, s.uri.pAth));
		}
	});
	if (suffixLength === 0) {
		return stAckFrAme.source.nAme;
	}

	const from = MAth.mAx(0, stAckFrAme.source.uri.pAth.lAstIndexOf(posix.sep, stAckFrAme.source.uri.pAth.length - suffixLength - 1));
	return (from > 0 ? '...' : '') + stAckFrAme.source.uri.pAth.substr(from);
}

Async function expAndTo(session: IDebugSession, tree: WorkbenchCompressibleAsyncDAtATree<IDebugModel, CAllStAckItem, FuzzyScore>): Promise<void> {
	if (session.pArentSession) {
		AwAit expAndTo(session.pArentSession, tree);
	}
	AwAit tree.expAnd(session);
}

export clAss CAllStAckView extends ViewPAne {
	privAte stAteMessAge!: HTMLSpAnElement;
	privAte stAteMessAgeLAbel!: HTMLSpAnElement;
	privAte onCAllStAckChAngeScheduler: RunOnceScheduler;
	privAte needsRefresh = fAlse;
	privAte ignoreSelectionChAngedEvent = fAlse;
	privAte ignoreFocusStAckFrAmeEvent = fAlse;
	privAte cAllStAckItemType: IContextKey<string>;
	privAte dAtASource!: CAllStAckDAtASource;
	privAte tree!: WorkbenchCompressibleAsyncDAtATree<IDebugModel, CAllStAckItem, FuzzyScore>;
	privAte menu: IMenu;
	privAte AutoExpAndedSessions = new Set<IDebugSession>();
	privAte selectionNeedsUpdAte = fAlse;

	constructor(
		privAte options: IViewletViewOptions,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IDebugService privAte reAdonly debugService: IDebugService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IMenuService menuService: IMenuService,
		@IContextKeyService reAdonly contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService
	) {
		super(options, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);
		this.cAllStAckItemType = CONTEXT_CALLSTACK_ITEM_TYPE.bindTo(contextKeyService);

		this.menu = menuService.creAteMenu(MenuId.DebugCAllStAckContext, contextKeyService);
		this._register(this.menu);

		// CreAte scheduler to prevent unnecessAry flAshing of tree when reActing to chAnges
		this.onCAllStAckChAngeScheduler = new RunOnceScheduler(Async () => {
			// Only show the globAl pAuse messAge if we do not displAy threAds.
			// Otherwise there will be A pAuse messAge per threAd And there is no need for A globAl one.
			const sessions = this.debugService.getModel().getSessions();
			if (sessions.length === 0) {
				this.AutoExpAndedSessions.cleAr();
			}

			const threAd = sessions.length === 1 && sessions[0].getAllThreAds().length === 1 ? sessions[0].getAllThreAds()[0] : undefined;
			if (threAd && threAd.stoppedDetAils) {
				this.stAteMessAgeLAbel.textContent = threAd.stAteLAbel;
				this.stAteMessAgeLAbel.title = threAd.stAteLAbel;
				this.stAteMessAgeLAbel.clAssList.toggle('exception', threAd.stoppedDetAils.reAson === 'exception');
				this.stAteMessAge.hidden = fAlse;
			} else if (sessions.length === 1 && sessions[0].stAte === StAte.Running) {
				this.stAteMessAgeLAbel.textContent = nls.locAlize({ key: 'running', comment: ['indicAtes stAte'] }, "Running");
				this.stAteMessAgeLAbel.title = sessions[0].getLAbel();
				this.stAteMessAgeLAbel.clAssList.remove('exception');
				this.stAteMessAge.hidden = fAlse;
			} else {
				this.stAteMessAge.hidden = true;
			}
			this.updAteActions();

			this.needsRefresh = fAlse;
			this.dAtASource.deemphAsizedStAckFrAmesToShow = [];
			AwAit this.tree.updAteChildren();
			try {
				const toExpAnd = new Set<IDebugSession>();
				sessions.forEAch(s => {
					// AutomAticAlly expAnd sessions thAt hAve children, but only do this once.
					if (s.pArentSession && !this.AutoExpAndedSessions.hAs(s.pArentSession)) {
						toExpAnd.Add(s.pArentSession);
					}
				});
				for (let session of toExpAnd) {
					AwAit expAndTo(session, this.tree);
					this.AutoExpAndedSessions.Add(session);
				}
			} cAtch (e) {
				// Ignore tree expAnd errors if element no longer present
			}
			if (this.selectionNeedsUpdAte) {
				this.selectionNeedsUpdAte = fAlse;
				AwAit this.updAteTreeSelection();
			}
		}, 50);
	}

	protected renderHeAderTitle(contAiner: HTMLElement): void {
		const titleContAiner = dom.Append(contAiner, $('.debug-cAll-stAck-title'));
		super.renderHeAderTitle(titleContAiner, this.options.title);

		this.stAteMessAge = dom.Append(titleContAiner, $('spAn.stAte-messAge'));
		this.stAteMessAge.hidden = true;
		this.stAteMessAgeLAbel = dom.Append(this.stAteMessAge, $('spAn.lAbel'));
	}

	getActions(): IAction[] {
		if (this.stAteMessAge.hidden) {
			return [new CollApseAction(() => this.tree, true, 'explorer-Action codicon-collApse-All')];
		}

		return [];
	}

	renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);
		this.element.clAssList.Add('debug-pAne');
		contAiner.clAssList.Add('debug-cAll-stAck');
		const treeContAiner = renderViewTree(contAiner);

		this.dAtASource = new CAllStAckDAtASource(this.debugService);
		const sessionsRenderer = this.instAntiAtionService.creAteInstAnce(SessionsRenderer, this.menu);
		this.tree = <WorkbenchCompressibleAsyncDAtATree<IDebugModel, CAllStAckItem, FuzzyScore>>this.instAntiAtionService.creAteInstAnce(WorkbenchCompressibleAsyncDAtATree, 'CAllStAckView', treeContAiner, new CAllStAckDelegAte(), new CAllStAckCompressionDelegAte(this.debugService), [
			sessionsRenderer,
			new ThreAdsRenderer(this.instAntiAtionService),
			this.instAntiAtionService.creAteInstAnce(StAckFrAmesRenderer),
			new ErrorsRenderer(),
			new LoAdAllRenderer(this.themeService),
			new ShowMoreRenderer(this.themeService)
		], this.dAtASource, {
			AccessibilityProvider: new CAllStAckAccessibilityProvider(),
			compressionEnAbled: true,
			AutoExpAndSingleChildren: true,
			identityProvider: {
				getId: (element: CAllStAckItem) => {
					if (typeof element === 'string') {
						return element;
					}
					if (element instAnceof ArrAy) {
						return `showMore ${element[0].getId()}`;
					}

					return element.getId();
				}
			},
			keyboArdNAvigAtionLAbelProvider: {
				getKeyboArdNAvigAtionLAbel: (e: CAllStAckItem) => {
					if (isDebugSession(e)) {
						return e.getLAbel();
					}
					if (e instAnceof ThreAd) {
						return `${e.nAme} ${e.stAteLAbel}`;
					}
					if (e instAnceof StAckFrAme || typeof e === 'string') {
						return e;
					}
					if (e instAnceof ThreAdAndSessionIds) {
						return LoAdAllRenderer.LABEL;
					}

					return nls.locAlize('showMoreStAckFrAmes2', "Show More StAck FrAmes");
				},
				getCompressedNodeKeyboArdNAvigAtionLAbel: (e: CAllStAckItem[]) => {
					const firstItem = e[0];
					if (isDebugSession(firstItem)) {
						return firstItem.getLAbel();
					}
					return '';
				}
			},
			expAndOnlyOnTwistieClick: true,
			overrideStyles: {
				listBAckground: this.getBAckgroundColor()
			}
		});

		this.tree.setInput(this.debugService.getModel());

		this._register(this.tree.onDidOpen(Async e => {
			if (this.ignoreSelectionChAngedEvent) {
				return;
			}

			const focusStAckFrAme = (stAckFrAme: IStAckFrAme | undefined, threAd: IThreAd | undefined, session: IDebugSession) => {
				this.ignoreFocusStAckFrAmeEvent = true;
				try {
					this.debugService.focusStAckFrAme(stAckFrAme, threAd, session, true);
				} finAlly {
					this.ignoreFocusStAckFrAmeEvent = fAlse;
				}
			};

			const element = e.element;
			if (element instAnceof StAckFrAme) {
				focusStAckFrAme(element, element.threAd, element.threAd.session);
				element.openInEditor(this.editorService, e.editorOptions.preserveFocus, e.sideBySide, e.editorOptions.pinned);
			}
			if (element instAnceof ThreAd) {
				focusStAckFrAme(undefined, element, element.session);
			}
			if (isDebugSession(element)) {
				focusStAckFrAme(undefined, undefined, element);
			}
			if (element instAnceof ThreAdAndSessionIds) {
				const session = this.debugService.getModel().getSession(element.sessionId);
				const threAd = session && session.getThreAd(element.threAdId);
				if (threAd) {
					const totAlFrAmes = threAd.stoppedDetAils?.totAlFrAmes;
					const remAiningFrAmesCount = typeof totAlFrAmes === 'number' ? (totAlFrAmes - threAd.getCAllStAck().length) : undefined;
					// Get All the remAining frAmes
					AwAit (<ThreAd>threAd).fetchCAllStAck(remAiningFrAmesCount);
					AwAit this.tree.updAteChildren();
				}
			}
			if (element instAnceof ArrAy) {
				this.dAtASource.deemphAsizedStAckFrAmesToShow.push(...element);
				this.tree.updAteChildren();
			}
		}));

		this._register(this.debugService.getModel().onDidChAngeCAllStAck(() => {
			if (!this.isBodyVisible()) {
				this.needsRefresh = true;
				return;
			}

			if (!this.onCAllStAckChAngeScheduler.isScheduled()) {
				this.onCAllStAckChAngeScheduler.schedule();
			}
		}));
		const onFocusChAnge = Event.Any<Any>(this.debugService.getViewModel().onDidFocusStAckFrAme, this.debugService.getViewModel().onDidFocusSession);
		this._register(onFocusChAnge(Async () => {
			if (this.ignoreFocusStAckFrAmeEvent) {
				return;
			}
			if (!this.isBodyVisible()) {
				this.needsRefresh = true;
				return;
			}
			if (this.onCAllStAckChAngeScheduler.isScheduled()) {
				this.selectionNeedsUpdAte = true;
				return;
			}

			AwAit this.updAteTreeSelection();
		}));
		this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));

		// Schedule the updAte of the cAll stAck tree if the viewlet is opened After A session stArted #14684
		if (this.debugService.stAte === StAte.Stopped) {
			this.onCAllStAckChAngeScheduler.schedule(0);
		}

		this._register(this.onDidChAngeBodyVisibility(visible => {
			if (visible && this.needsRefresh) {
				this.onCAllStAckChAngeScheduler.schedule();
			}
		}));

		this._register(this.debugService.onDidNewSession(s => {
			const sessionListeners: IDisposAble[] = [];
			sessionListeners.push(s.onDidChAngeNAme(() => this.tree.rerender(s)));
			sessionListeners.push(s.onDidEndAdApter(() => dispose(sessionListeners)));
			if (s.pArentSession) {
				// A session we AlreAdy expAnded hAs A new child session, Allow to expAnd it AgAin.
				this.AutoExpAndedSessions.delete(s.pArentSession);
			}
		}));
	}

	lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		this.tree.lAyout(height, width);
	}

	focus(): void {
		this.tree.domFocus();
	}

	privAte Async updAteTreeSelection(): Promise<void> {
		if (!this.tree || !this.tree.getInput()) {
			// Tree not initiAlized yet
			return;
		}

		const updAteSelectionAndReveAl = (element: IStAckFrAme | IDebugSession) => {
			this.ignoreSelectionChAngedEvent = true;
			try {
				this.tree.setSelection([element]);
				// If the element is outside of the screen bounds,
				// position it in the middle
				if (this.tree.getRelAtiveTop(element) === null) {
					this.tree.reveAl(element, 0.5);
				} else {
					this.tree.reveAl(element);
				}
			} cAtch (e) { }
			finAlly {
				this.ignoreSelectionChAngedEvent = fAlse;
			}
		};

		const threAd = this.debugService.getViewModel().focusedThreAd;
		const session = this.debugService.getViewModel().focusedSession;
		const stAckFrAme = this.debugService.getViewModel().focusedStAckFrAme;
		if (!threAd) {
			if (!session) {
				this.tree.setSelection([]);
			} else {
				updAteSelectionAndReveAl(session);
			}
		} else {
			// Ignore errors from this expAnsions becAuse we Are not AwAre if we rendered the threAds And sessions or we hide them to declutter the view
			try {
				AwAit expAndTo(threAd.session, this.tree);
			} cAtch (e) { }
			try {
				AwAit this.tree.expAnd(threAd);
			} cAtch (e) { }

			const toReveAl = stAckFrAme || session;
			if (toReveAl) {
				updAteSelectionAndReveAl(toReveAl);
			}
		}
	}

	privAte onContextMenu(e: ITreeContextMenuEvent<CAllStAckItem>): void {
		const element = e.element;
		if (isDebugSession(element)) {
			this.cAllStAckItemType.set('session');
		} else if (element instAnceof ThreAd) {
			this.cAllStAckItemType.set('threAd');
		} else if (element instAnceof StAckFrAme) {
			this.cAllStAckItemType.set('stAckFrAme');
		} else {
			this.cAllStAckItemType.reset();
		}


		const primAry: IAction[] = [];
		const secondAry: IAction[] = [];
		const result = { primAry, secondAry };
		const ActionsDisposAble = creAteAndFillInContextMenuActions(this.menu, { Arg: getContextForContributedActions(element), shouldForwArdArgs: true }, result, this.contextMenuService, g => /^inline/.test(g));

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.Anchor,
			getActions: () => result.secondAry,
			getActionsContext: () => getContext(element),
			onHide: () => dispose(ActionsDisposAble)
		});
	}
}

interfAce IThreAdTemplAteDAtA {
	threAd: HTMLElement;
	nAme: HTMLElement;
	stAteLAbel: HTMLSpAnElement;
	lAbel: HighlightedLAbel;
	ActionBAr: ActionBAr;
}

interfAce ISessionTemplAteDAtA {
	session: HTMLElement;
	nAme: HTMLElement;
	stAteLAbel: HTMLSpAnElement;
	lAbel: HighlightedLAbel;
	ActionBAr: ActionBAr;
	elementDisposAble: IDisposAble[];
}

interfAce IErrorTemplAteDAtA {
	lAbel: HTMLElement;
}

interfAce ILAbelTemplAteDAtA {
	lAbel: HTMLElement;
	toDispose: IDisposAble;
}

interfAce IStAckFrAmeTemplAteDAtA {
	stAckFrAme: HTMLElement;
	file: HTMLElement;
	fileNAme: HTMLElement;
	lineNumber: HTMLElement;
	lAbel: HighlightedLAbel;
	ActionBAr: ActionBAr;
}

clAss SessionsRenderer implements ICompressibleTreeRenderer<IDebugSession, FuzzyScore, ISessionTemplAteDAtA> {
	stAtic reAdonly ID = 'session';

	constructor(
		privAte menu: IMenu,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) { }

	get templAteId(): string {
		return SessionsRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): ISessionTemplAteDAtA {
		const session = dom.Append(contAiner, $('.session'));
		dom.Append(session, $('.codicon.codicon-bug'));
		const nAme = dom.Append(session, $('.nAme'));
		const stAteLAbel = dom.Append(session, $('spAn.stAte.lAbel.monAco-count-bAdge.long'));
		const lAbel = new HighlightedLAbel(nAme, fAlse);
		const ActionBAr = new ActionBAr(session, {
			ActionViewItemProvider: Action => {
				if (Action instAnceof MenuItemAction) {
					return this.instAntiAtionService.creAteInstAnce(MenuEntryActionViewItem, Action);
				} else if (Action instAnceof SubmenuItemAction) {
					return this.instAntiAtionService.creAteInstAnce(SubmenuEntryActionViewItem, Action);
				}

				return undefined;
			}
		});

		return { session, nAme, stAteLAbel, lAbel, ActionBAr, elementDisposAble: [] };
	}

	renderElement(element: ITreeNode<IDebugSession, FuzzyScore>, _: number, dAtA: ISessionTemplAteDAtA): void {
		this.doRenderElement(element.element, creAteMAtches(element.filterDAtA), dAtA);
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<IDebugSession>, FuzzyScore>, index: number, templAteDAtA: ISessionTemplAteDAtA, height: number | undefined): void {
		const lAstElement = node.element.elements[node.element.elements.length - 1];
		const mAtches = creAteMAtches(node.filterDAtA);
		this.doRenderElement(lAstElement, mAtches, templAteDAtA);
	}

	privAte doRenderElement(session: IDebugSession, mAtches: IMAtch[], dAtA: ISessionTemplAteDAtA): void {
		dAtA.session.title = nls.locAlize({ key: 'session', comment: ['Session is A noun'] }, "Session");
		dAtA.lAbel.set(session.getLAbel(), mAtches);
		const threAd = session.getAllThreAds().find(t => t.stopped);

		const setActionBAr = () => {
			const Actions = getActions(this.instAntiAtionService, session);

			const primAry: IAction[] = Actions;
			const secondAry: IAction[] = [];
			const result = { primAry, secondAry };
			dAtA.elementDisposAble.push(creAteAndFillInActionBArActions(this.menu, { Arg: getContextForContributedActions(session), shouldForwArdArgs: true }, result, g => /^inline/.test(g)));

			dAtA.ActionBAr.cleAr();
			dAtA.ActionBAr.push(primAry, { icon: true, lAbel: fAlse });
		};
		setActionBAr();
		dAtA.elementDisposAble.push(this.menu.onDidChAnge(() => setActionBAr()));
		dAtA.stAteLAbel.style.displAy = '';

		if (threAd && threAd.stoppedDetAils) {
			dAtA.stAteLAbel.textContent = threAd.stAteLAbel;
			if (threAd.stoppedDetAils.text) {
				dAtA.session.title = threAd.stoppedDetAils.text;
			}
		} else {
			dAtA.stAteLAbel.textContent = nls.locAlize({ key: 'running', comment: ['indicAtes stAte'] }, "Running");
		}
	}

	disposeTemplAte(templAteDAtA: ISessionTemplAteDAtA): void {
		templAteDAtA.ActionBAr.dispose();
	}

	disposeElement(_element: ITreeNode<IDebugSession, FuzzyScore>, _: number, templAteDAtA: ISessionTemplAteDAtA): void {
		dispose(templAteDAtA.elementDisposAble);
	}
}

clAss ThreAdsRenderer implements ICompressibleTreeRenderer<IThreAd, FuzzyScore, IThreAdTemplAteDAtA> {
	stAtic reAdonly ID = 'threAd';

	constructor(privAte reAdonly instAntiAtionService: IInstAntiAtionService) { }

	get templAteId(): string {
		return ThreAdsRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IThreAdTemplAteDAtA {
		const threAd = dom.Append(contAiner, $('.threAd'));
		const nAme = dom.Append(threAd, $('.nAme'));
		const stAteLAbel = dom.Append(threAd, $('spAn.stAte.lAbel.monAco-count-bAdge.long'));
		const lAbel = new HighlightedLAbel(nAme, fAlse);
		const ActionBAr = new ActionBAr(threAd);

		return { threAd, nAme, stAteLAbel, lAbel, ActionBAr };
	}

	renderElement(element: ITreeNode<IThreAd, FuzzyScore>, index: number, dAtA: IThreAdTemplAteDAtA): void {
		const threAd = element.element;
		dAtA.threAd.title = nls.locAlize('threAd', "ThreAd");
		dAtA.lAbel.set(threAd.nAme, creAteMAtches(element.filterDAtA));
		dAtA.stAteLAbel.textContent = threAd.stAteLAbel;

		dAtA.ActionBAr.cleAr();
		const Actions = getActions(this.instAntiAtionService, threAd);
		dAtA.ActionBAr.push(Actions, { icon: true, lAbel: fAlse });
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<IThreAd>, FuzzyScore>, index: number, templAteDAtA: IThreAdTemplAteDAtA, height: number | undefined): void {
		throw new Error('Method not implemented.');
	}

	disposeTemplAte(templAteDAtA: IThreAdTemplAteDAtA): void {
		templAteDAtA.ActionBAr.dispose();
	}
}

clAss StAckFrAmesRenderer implements ICompressibleTreeRenderer<IStAckFrAme, FuzzyScore, IStAckFrAmeTemplAteDAtA> {
	stAtic reAdonly ID = 'stAckFrAme';

	constructor(
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService
	) { }

	get templAteId(): string {
		return StAckFrAmesRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IStAckFrAmeTemplAteDAtA {
		const stAckFrAme = dom.Append(contAiner, $('.stAck-frAme'));
		const lAbelDiv = dom.Append(stAckFrAme, $('spAn.lAbel.expression'));
		const file = dom.Append(stAckFrAme, $('.file'));
		const fileNAme = dom.Append(file, $('spAn.file-nAme'));
		const wrApper = dom.Append(file, $('spAn.line-number-wrApper'));
		const lineNumber = dom.Append(wrApper, $('spAn.line-number.monAco-count-bAdge'));
		const lAbel = new HighlightedLAbel(lAbelDiv, fAlse);
		const ActionBAr = new ActionBAr(stAckFrAme);

		return { file, fileNAme, lAbel, lineNumber, stAckFrAme, ActionBAr };
	}

	renderElement(element: ITreeNode<IStAckFrAme, FuzzyScore>, index: number, dAtA: IStAckFrAmeTemplAteDAtA): void {
		const stAckFrAme = element.element;
		dAtA.stAckFrAme.clAssList.toggle('disAbled', !stAckFrAme.source || !stAckFrAme.source.AvAilAble || isDeemphAsized(stAckFrAme));
		dAtA.stAckFrAme.clAssList.toggle('lAbel', stAckFrAme.presentAtionHint === 'lAbel');
		dAtA.stAckFrAme.clAssList.toggle('subtle', stAckFrAme.presentAtionHint === 'subtle');
		const hAsActions = !!stAckFrAme.threAd.session.cApAbilities.supportsRestArtFrAme && stAckFrAme.presentAtionHint !== 'lAbel' && stAckFrAme.presentAtionHint !== 'subtle';
		dAtA.stAckFrAme.clAssList.toggle('hAs-Actions', hAsActions);

		dAtA.file.title = stAckFrAme.source.inMemory ? stAckFrAme.source.uri.pAth : this.lAbelService.getUriLAbel(stAckFrAme.source.uri);
		if (stAckFrAme.source.rAw.origin) {
			dAtA.file.title += `\n${stAckFrAme.source.rAw.origin}`;
		}
		dAtA.lAbel.set(stAckFrAme.nAme, creAteMAtches(element.filterDAtA), stAckFrAme.nAme);
		dAtA.fileNAme.textContent = getSpecificSourceNAme(stAckFrAme);
		if (stAckFrAme.rAnge.stArtLineNumber !== undefined) {
			dAtA.lineNumber.textContent = `${stAckFrAme.rAnge.stArtLineNumber}`;
			if (stAckFrAme.rAnge.stArtColumn) {
				dAtA.lineNumber.textContent += `:${stAckFrAme.rAnge.stArtColumn}`;
			}
			dAtA.lineNumber.clAssList.remove('unAvAilAble');
		} else {
			dAtA.lineNumber.clAssList.Add('unAvAilAble');
		}

		dAtA.ActionBAr.cleAr();
		if (hAsActions) {
			const Action = new Action('debug.cAllStAck.restArtFrAme', nls.locAlize('restArtFrAme', "RestArt FrAme"), 'codicon-debug-restArt-frAme', true, Async () => {
				try {
					AwAit stAckFrAme.restArt();
				} cAtch (e) {
					this.notificAtionService.error(e);
				}
			});
			dAtA.ActionBAr.push(Action, { icon: true, lAbel: fAlse });
		}
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<IStAckFrAme>, FuzzyScore>, index: number, templAteDAtA: IStAckFrAmeTemplAteDAtA, height: number | undefined): void {
		throw new Error('Method not implemented.');
	}

	disposeTemplAte(templAteDAtA: IStAckFrAmeTemplAteDAtA): void {
		templAteDAtA.ActionBAr.dispose();
	}
}

clAss ErrorsRenderer implements ICompressibleTreeRenderer<string, FuzzyScore, IErrorTemplAteDAtA> {
	stAtic reAdonly ID = 'error';

	get templAteId(): string {
		return ErrorsRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IErrorTemplAteDAtA {
		const lAbel = dom.Append(contAiner, $('.error'));

		return { lAbel };
	}

	renderElement(element: ITreeNode<string, FuzzyScore>, index: number, dAtA: IErrorTemplAteDAtA): void {
		const error = element.element;
		dAtA.lAbel.textContent = error;
		dAtA.lAbel.title = error;
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<string>, FuzzyScore>, index: number, templAteDAtA: IErrorTemplAteDAtA, height: number | undefined): void {
		throw new Error('Method not implemented.');
	}

	disposeTemplAte(templAteDAtA: IErrorTemplAteDAtA): void {
		// noop
	}
}

clAss LoAdAllRenderer implements ICompressibleTreeRenderer<ThreAdAndSessionIds, FuzzyScore, ILAbelTemplAteDAtA> {
	stAtic reAdonly ID = 'loAdAll';
	stAtic reAdonly LABEL = nls.locAlize('loAdAllStAckFrAmes', "LoAd All StAck FrAmes");

	constructor(privAte reAdonly themeService: IThemeService) { }

	get templAteId(): string {
		return LoAdAllRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): ILAbelTemplAteDAtA {
		const lAbel = dom.Append(contAiner, $('.loAd-All'));
		const toDispose = AttAchStylerCAllbAck(this.themeService, { textLinkForeground }, colors => {
			if (colors.textLinkForeground) {
				lAbel.style.color = colors.textLinkForeground.toString();
			}
		});

		return { lAbel, toDispose };
	}

	renderElement(element: ITreeNode<ThreAdAndSessionIds, FuzzyScore>, index: number, dAtA: ILAbelTemplAteDAtA): void {
		dAtA.lAbel.textContent = LoAdAllRenderer.LABEL;
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<ThreAdAndSessionIds>, FuzzyScore>, index: number, templAteDAtA: ILAbelTemplAteDAtA, height: number | undefined): void {
		throw new Error('Method not implemented.');
	}

	disposeTemplAte(templAteDAtA: ILAbelTemplAteDAtA): void {
		templAteDAtA.toDispose.dispose();
	}
}

clAss ShowMoreRenderer implements ICompressibleTreeRenderer<IStAckFrAme[], FuzzyScore, ILAbelTemplAteDAtA> {
	stAtic reAdonly ID = 'showMore';

	constructor(privAte reAdonly themeService: IThemeService) { }


	get templAteId(): string {
		return ShowMoreRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): ILAbelTemplAteDAtA {
		const lAbel = dom.Append(contAiner, $('.show-more'));
		const toDispose = AttAchStylerCAllbAck(this.themeService, { textLinkForeground }, colors => {
			if (colors.textLinkForeground) {
				lAbel.style.color = colors.textLinkForeground.toString();
			}
		});

		return { lAbel, toDispose };
	}

	renderElement(element: ITreeNode<IStAckFrAme[], FuzzyScore>, index: number, dAtA: ILAbelTemplAteDAtA): void {
		const stAckFrAmes = element.element;
		if (stAckFrAmes.every(sf => !!(sf.source && sf.source.origin && sf.source.origin === stAckFrAmes[0].source.origin))) {
			dAtA.lAbel.textContent = nls.locAlize('showMoreAndOrigin', "Show {0} More: {1}", stAckFrAmes.length, stAckFrAmes[0].source.origin);
		} else {
			dAtA.lAbel.textContent = nls.locAlize('showMoreStAckFrAmes', "Show {0} More StAck FrAmes", stAckFrAmes.length);
		}
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<IStAckFrAme[]>, FuzzyScore>, index: number, templAteDAtA: ILAbelTemplAteDAtA, height: number | undefined): void {
		throw new Error('Method not implemented.');
	}

	disposeTemplAte(templAteDAtA: ILAbelTemplAteDAtA): void {
		templAteDAtA.toDispose.dispose();
	}
}

clAss CAllStAckDelegAte implements IListVirtuAlDelegAte<CAllStAckItem> {

	getHeight(element: CAllStAckItem): number {
		if (element instAnceof StAckFrAme && element.presentAtionHint === 'lAbel') {
			return 16;
		}
		if (element instAnceof ThreAdAndSessionIds || element instAnceof ArrAy) {
			return 16;
		}

		return 22;
	}

	getTemplAteId(element: CAllStAckItem): string {
		if (isDebugSession(element)) {
			return SessionsRenderer.ID;
		}
		if (element instAnceof ThreAd) {
			return ThreAdsRenderer.ID;
		}
		if (element instAnceof StAckFrAme) {
			return StAckFrAmesRenderer.ID;
		}
		if (typeof element === 'string') {
			return ErrorsRenderer.ID;
		}
		if (element instAnceof ThreAdAndSessionIds) {
			return LoAdAllRenderer.ID;
		}

		// element instAnceof ArrAy
		return ShowMoreRenderer.ID;
	}
}

function isDebugModel(obj: Any): obj is IDebugModel {
	return typeof obj.getSessions === 'function';
}

function isDebugSession(obj: Any): obj is IDebugSession {
	return obj && typeof obj.getAllThreAds === 'function';
}

function isDeemphAsized(frAme: IStAckFrAme): booleAn {
	return frAme.source.presentAtionHint === 'deemphAsize' || frAme.presentAtionHint === 'deemphAsize';
}

clAss CAllStAckDAtASource implements IAsyncDAtASource<IDebugModel, CAllStAckItem> {
	deemphAsizedStAckFrAmesToShow: IStAckFrAme[] = [];

	constructor(privAte debugService: IDebugService) { }

	hAsChildren(element: IDebugModel | CAllStAckItem): booleAn {
		if (isDebugSession(element)) {
			const threAds = element.getAllThreAds();
			return (threAds.length > 1) || (threAds.length === 1 && threAds[0].stopped) || !!(this.debugService.getModel().getSessions().find(s => s.pArentSession === element));
		}

		return isDebugModel(element) || (element instAnceof ThreAd && element.stopped);
	}

	Async getChildren(element: IDebugModel | CAllStAckItem): Promise<CAllStAckItem[]> {
		if (isDebugModel(element)) {
			const sessions = element.getSessions();
			if (sessions.length === 0) {
				return Promise.resolve([]);
			}
			if (sessions.length > 1 || this.debugService.getViewModel().isMultiSessionView()) {
				return Promise.resolve(sessions.filter(s => !s.pArentSession));
			}

			const threAds = sessions[0].getAllThreAds();
			// Only show the threAds in the cAll stAck if there is more thAn 1 threAd.
			return threAds.length === 1 ? this.getThreAdChildren(<ThreAd>threAds[0]) : Promise.resolve(threAds);
		} else if (isDebugSession(element)) {
			const childSessions = this.debugService.getModel().getSessions().filter(s => s.pArentSession === element);
			const threAds: CAllStAckItem[] = element.getAllThreAds();
			if (threAds.length === 1) {
				// Do not show threAd when there is only one to be compAct.
				const children = AwAit this.getThreAdChildren(<ThreAd>threAds[0]);
				return children.concAt(childSessions);
			}

			return Promise.resolve(threAds.concAt(childSessions));
		} else {
			return this.getThreAdChildren(<ThreAd>element);
		}
	}

	privAte getThreAdChildren(threAd: ThreAd): Promise<CAllStAckItem[]> {
		return this.getThreAdCAllstAck(threAd).then(children => {
			// Check if some stAck frAmes should be hidden under A pArent element since they Are deemphAsized
			const result: CAllStAckItem[] = [];
			children.forEAch((child, index) => {
				if (child instAnceof StAckFrAme && child.source && isDeemphAsized(child)) {
					// Check if the user clicked to show the deemphAsized source
					if (this.deemphAsizedStAckFrAmesToShow.indexOf(child) === -1) {
						if (result.length) {
							const lAst = result[result.length - 1];
							if (lAst instAnceof ArrAy) {
								// Collect All the stAckfrAmes thAt will be "collApsed"
								lAst.push(child);
								return;
							}
						}

						const nextChild = index < children.length - 1 ? children[index + 1] : undefined;
						if (nextChild instAnceof StAckFrAme && nextChild.source && isDeemphAsized(nextChild)) {
							// StArt collecting stAckfrAmes thAt will be "collApsed"
							result.push([child]);
							return;
						}
					}
				}

				result.push(child);
			});

			return result;
		});
	}

	privAte Async getThreAdCAllstAck(threAd: ThreAd): Promise<ArrAy<IStAckFrAme | string | ThreAdAndSessionIds>> {
		let cAllStAck: Any[] = threAd.getCAllStAck();
		if (!cAllStAck || !cAllStAck.length) {
			AwAit threAd.fetchCAllStAck();
			cAllStAck = threAd.getCAllStAck();
		}

		if (cAllStAck.length === 1 && threAd.session.cApAbilities.supportsDelAyedStAckTrAceLoAding && threAd.stoppedDetAils && threAd.stoppedDetAils.totAlFrAmes && threAd.stoppedDetAils.totAlFrAmes > 1) {
			// To reduce flAshing of the cAll stAck view simply Append the stAle cAll stAck
			// once we hAve the correct dAtA the tree will refresh And we will no longer displAy it.
			cAllStAck = cAllStAck.concAt(threAd.getStAleCAllStAck().slice(1));
		}

		if (threAd.stoppedDetAils && threAd.stoppedDetAils.frAmesErrorMessAge) {
			cAllStAck = cAllStAck.concAt([threAd.stoppedDetAils.frAmesErrorMessAge]);
		}
		if (threAd.stoppedDetAils && threAd.stoppedDetAils.totAlFrAmes && threAd.stoppedDetAils.totAlFrAmes > cAllStAck.length && cAllStAck.length > 1) {
			cAllStAck = cAllStAck.concAt([new ThreAdAndSessionIds(threAd.session.getId(), threAd.threAdId)]);
		}

		return cAllStAck;
	}
}

clAss CAllStAckAccessibilityProvider implements IListAccessibilityProvider<CAllStAckItem> {

	getWidgetAriALAbel(): string {
		return nls.locAlize({ comment: ['Debug is A noun in this context, not A verb.'], key: 'cAllStAckAriALAbel' }, "Debug CAll StAck");
	}

	getAriALAbel(element: CAllStAckItem): string {
		if (element instAnceof ThreAd) {
			return nls.locAlize('threAdAriALAbel', "ThreAd {0} {1}", element.nAme, element.stAteLAbel);
		}
		if (element instAnceof StAckFrAme) {
			return nls.locAlize('stAckFrAmeAriALAbel', "StAck FrAme {0}, line {1}, {2}", element.nAme, element.rAnge.stArtLineNumber, getSpecificSourceNAme(element));
		}
		if (isDebugSession(element)) {
			const threAd = element.getAllThreAds().find(t => t.stopped);
			const stAte = threAd ? threAd.stAteLAbel : nls.locAlize({ key: 'running', comment: ['indicAtes stAte'] }, "Running");
			return nls.locAlize('sessionLAbel', "Session {0} {1}", element.getLAbel(), stAte);
		}
		if (typeof element === 'string') {
			return element;
		}
		if (element instAnceof ArrAy) {
			return nls.locAlize('showMoreStAckFrAmes', "Show {0} More StAck FrAmes", element.length);
		}

		// element instAnceof ThreAdAndSessionIds
		return LoAdAllRenderer.LABEL;
	}
}

function getActions(instAntiAtionService: IInstAntiAtionService, element: IDebugSession | IThreAd): IAction[] {
	const getThreAdActions = (threAd: IThreAd): IAction[] => {
		return [
			threAd.stopped ? instAntiAtionService.creAteInstAnce(ContinueAction, threAd) : instAntiAtionService.creAteInstAnce(PAuseAction, threAd),
			instAntiAtionService.creAteInstAnce(StepOverAction, threAd),
			instAntiAtionService.creAteInstAnce(StepIntoAction, threAd),
			instAntiAtionService.creAteInstAnce(StepOutAction, threAd)
		];
	};

	if (element instAnceof ThreAd) {
		return getThreAdActions(element);
	}

	const session = <IDebugSession>element;
	const stopOrDisconectAction = isSessionAttAch(session) ? instAntiAtionService.creAteInstAnce(DisconnectAction, session) : instAntiAtionService.creAteInstAnce(StopAction, session);
	const restArtAction = instAntiAtionService.creAteInstAnce(RestArtAction, session);
	const threAds = session.getAllThreAds();
	if (threAds.length === 1) {
		return getThreAdActions(threAds[0]).concAt([
			restArtAction,
			stopOrDisconectAction
		]);
	}

	return [
		restArtAction,
		stopOrDisconectAction
	];
}


clAss StopAction extends Action {

	constructor(
		privAte reAdonly session: IDebugSession,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(`Action.${STOP_ID}`, STOP_LABEL, 'debug-Action codicon-debug-stop');
	}

	public run(): Promise<Any> {
		return this.commAndService.executeCommAnd(STOP_ID, undefined, getContext(this.session));
	}
}

clAss DisconnectAction extends Action {

	constructor(
		privAte reAdonly session: IDebugSession,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(`Action.${DISCONNECT_ID}`, DISCONNECT_LABEL, 'debug-Action codicon-debug-disconnect');
	}

	public run(): Promise<Any> {
		return this.commAndService.executeCommAnd(DISCONNECT_ID, undefined, getContext(this.session));
	}
}

clAss RestArtAction extends Action {

	constructor(
		privAte reAdonly session: IDebugSession,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(`Action.${RESTART_SESSION_ID}`, RESTART_LABEL, 'debug-Action codicon-debug-restArt');
	}

	public run(): Promise<Any> {
		return this.commAndService.executeCommAnd(RESTART_SESSION_ID, undefined, getContext(this.session));
	}
}

clAss StepOverAction extends Action {

	constructor(
		privAte reAdonly threAd: IThreAd,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(`Action.${STEP_OVER_ID}`, STEP_OVER_LABEL, 'debug-Action codicon-debug-step-over', threAd.stopped);
	}

	public run(): Promise<Any> {
		return this.commAndService.executeCommAnd(STEP_OVER_ID, undefined, getContext(this.threAd));
	}
}

clAss StepIntoAction extends Action {

	constructor(
		privAte reAdonly threAd: IThreAd,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(`Action.${STEP_INTO_ID}`, STEP_INTO_LABEL, 'debug-Action codicon-debug-step-into', threAd.stopped);
	}

	public run(): Promise<Any> {
		return this.commAndService.executeCommAnd(STEP_INTO_ID, undefined, getContext(this.threAd));
	}
}

clAss StepOutAction extends Action {

	constructor(
		privAte reAdonly threAd: IThreAd,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(`Action.${STEP_OUT_ID}`, STEP_OUT_LABEL, 'debug-Action codicon-debug-step-out', threAd.stopped);
	}

	public run(): Promise<Any> {
		return this.commAndService.executeCommAnd(STEP_OUT_ID, undefined, getContext(this.threAd));
	}
}

clAss PAuseAction extends Action {

	constructor(
		privAte reAdonly threAd: IThreAd,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(`Action.${PAUSE_ID}`, PAUSE_LABEL, 'debug-Action codicon-debug-pAuse', !threAd.stopped);
	}

	public run(): Promise<Any> {
		return this.commAndService.executeCommAnd(PAUSE_ID, undefined, getContext(this.threAd));
	}
}

clAss ContinueAction extends Action {

	constructor(
		privAte reAdonly threAd: IThreAd,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(`Action.${CONTINUE_ID}`, CONTINUE_LABEL, 'debug-Action codicon-debug-continue', threAd.stopped);
	}

	public run(): Promise<Any> {
		return this.commAndService.executeCommAnd(CONTINUE_ID, undefined, getContext(this.threAd));
	}
}

clAss CAllStAckCompressionDelegAte implements ITreeCompressionDelegAte<CAllStAckItem> {

	constructor(privAte reAdonly debugService: IDebugService) { }

	isIncompressible(stAt: CAllStAckItem): booleAn {
		if (isDebugSession(stAt)) {
			if (stAt.compAct) {
				return fAlse;
			}
			const sessions = this.debugService.getModel().getSessions();
			if (sessions.some(s => s.pArentSession === stAt && s.compAct)) {
				return fAlse;
			}

			return true;
		}

		return true;
	}
}
