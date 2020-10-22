/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/Base/common/async';
import * as dom from 'vs/Base/Browser/dom';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { IDeBugService, State, IStackFrame, IDeBugSession, IThread, CONTEXT_CALLSTACK_ITEM_TYPE, IDeBugModel } from 'vs/workBench/contriB/deBug/common/deBug';
import { Thread, StackFrame, ThreadAndSessionIds } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { MenuId, IMenu, IMenuService, MenuItemAction, SuBmenuItemAction } from 'vs/platform/actions/common/actions';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { renderViewTree } from 'vs/workBench/contriB/deBug/Browser/BaseDeBugView';
import { IAction, Action } from 'vs/Base/common/actions';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { ViewPane } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { createAndFillInContextMenuActions, createAndFillInActionBarActions, MenuEntryActionViewItem, SuBmenuEntryActionViewItem } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { ITreeNode, ITreeContextMenuEvent, IAsyncDataSource } from 'vs/Base/Browser/ui/tree/tree';
import { WorkBenchCompressiBleAsyncDataTree } from 'vs/platform/list/Browser/listService';
import { HighlightedLaBel } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';
import { createMatches, FuzzyScore, IMatch } from 'vs/Base/common/filters';
import { Event } from 'vs/Base/common/event';
import { dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { isSessionAttach } from 'vs/workBench/contriB/deBug/common/deBugUtils';
import { STOP_ID, STOP_LABEL, DISCONNECT_ID, DISCONNECT_LABEL, RESTART_SESSION_ID, RESTART_LABEL, STEP_OVER_ID, STEP_OVER_LABEL, STEP_INTO_LABEL, STEP_INTO_ID, STEP_OUT_LABEL, STEP_OUT_ID, PAUSE_ID, PAUSE_LABEL, CONTINUE_ID, CONTINUE_LABEL } from 'vs/workBench/contriB/deBug/Browser/deBugCommands';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { CollapseAction } from 'vs/workBench/Browser/viewlet';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { textLinkForeground } from 'vs/platform/theme/common/colorRegistry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { attachStylerCallBack } from 'vs/platform/theme/common/styler';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { commonSuffixLength } from 'vs/Base/common/strings';
import { posix } from 'vs/Base/common/path';
import { ITreeCompressionDelegate } from 'vs/Base/Browser/ui/tree/asyncDataTree';
import { ICompressiBleTreeRenderer } from 'vs/Base/Browser/ui/tree/oBjectTree';
import { ICompressedTreeNode } from 'vs/Base/Browser/ui/tree/compressedOBjectTreeModel';

const $ = dom.$;

type CallStackItem = IStackFrame | IThread | IDeBugSession | string | ThreadAndSessionIds | IStackFrame[];

export function getContext(element: CallStackItem | null): any {
	return element instanceof StackFrame ? {
		sessionId: element.thread.session.getId(),
		threadId: element.thread.getId(),
		frameId: element.getId()
	} : element instanceof Thread ? {
		sessionId: element.session.getId(),
		threadId: element.getId()
	} : isDeBugSession(element) ? {
		sessionId: element.getId()
	} : undefined;
}

// Extensions depend on this context, should not Be changed even though it is not fully deterministic
export function getContextForContriButedActions(element: CallStackItem | null): string | numBer {
	if (element instanceof StackFrame) {
		if (element.source.inMemory) {
			return element.source.raw.path || element.source.reference || element.source.name;
		}

		return element.source.uri.toString();
	}
	if (element instanceof Thread) {
		return element.threadId;
	}
	if (isDeBugSession(element)) {
		return element.getId();
	}

	return '';
}

export function getSpecificSourceName(stackFrame: IStackFrame): string {
	// To reduce flashing of the path name and the way we fetch stack frames
	// We need to compute the source name Based on the other frames in the stale call stack
	let callStack = (<Thread>stackFrame.thread).getStaleCallStack();
	callStack = callStack.length > 0 ? callStack : stackFrame.thread.getCallStack();
	const otherSources = callStack.map(sf => sf.source).filter(s => s !== stackFrame.source);
	let suffixLength = 0;
	otherSources.forEach(s => {
		if (s.name === stackFrame.source.name) {
			suffixLength = Math.max(suffixLength, commonSuffixLength(stackFrame.source.uri.path, s.uri.path));
		}
	});
	if (suffixLength === 0) {
		return stackFrame.source.name;
	}

	const from = Math.max(0, stackFrame.source.uri.path.lastIndexOf(posix.sep, stackFrame.source.uri.path.length - suffixLength - 1));
	return (from > 0 ? '...' : '') + stackFrame.source.uri.path.suBstr(from);
}

async function expandTo(session: IDeBugSession, tree: WorkBenchCompressiBleAsyncDataTree<IDeBugModel, CallStackItem, FuzzyScore>): Promise<void> {
	if (session.parentSession) {
		await expandTo(session.parentSession, tree);
	}
	await tree.expand(session);
}

export class CallStackView extends ViewPane {
	private stateMessage!: HTMLSpanElement;
	private stateMessageLaBel!: HTMLSpanElement;
	private onCallStackChangeScheduler: RunOnceScheduler;
	private needsRefresh = false;
	private ignoreSelectionChangedEvent = false;
	private ignoreFocusStackFrameEvent = false;
	private callStackItemType: IContextKey<string>;
	private dataSource!: CallStackDataSource;
	private tree!: WorkBenchCompressiBleAsyncDataTree<IDeBugModel, CallStackItem, FuzzyScore>;
	private menu: IMenu;
	private autoExpandedSessions = new Set<IDeBugSession>();
	private selectionNeedsUpdate = false;

	constructor(
		private options: IViewletViewOptions,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService configurationService: IConfigurationService,
		@IMenuService menuService: IMenuService,
		@IContextKeyService readonly contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
		this.callStackItemType = CONTEXT_CALLSTACK_ITEM_TYPE.BindTo(contextKeyService);

		this.menu = menuService.createMenu(MenuId.DeBugCallStackContext, contextKeyService);
		this._register(this.menu);

		// Create scheduler to prevent unnecessary flashing of tree when reacting to changes
		this.onCallStackChangeScheduler = new RunOnceScheduler(async () => {
			// Only show the gloBal pause message if we do not display threads.
			// Otherwise there will Be a pause message per thread and there is no need for a gloBal one.
			const sessions = this.deBugService.getModel().getSessions();
			if (sessions.length === 0) {
				this.autoExpandedSessions.clear();
			}

			const thread = sessions.length === 1 && sessions[0].getAllThreads().length === 1 ? sessions[0].getAllThreads()[0] : undefined;
			if (thread && thread.stoppedDetails) {
				this.stateMessageLaBel.textContent = thread.stateLaBel;
				this.stateMessageLaBel.title = thread.stateLaBel;
				this.stateMessageLaBel.classList.toggle('exception', thread.stoppedDetails.reason === 'exception');
				this.stateMessage.hidden = false;
			} else if (sessions.length === 1 && sessions[0].state === State.Running) {
				this.stateMessageLaBel.textContent = nls.localize({ key: 'running', comment: ['indicates state'] }, "Running");
				this.stateMessageLaBel.title = sessions[0].getLaBel();
				this.stateMessageLaBel.classList.remove('exception');
				this.stateMessage.hidden = false;
			} else {
				this.stateMessage.hidden = true;
			}
			this.updateActions();

			this.needsRefresh = false;
			this.dataSource.deemphasizedStackFramesToShow = [];
			await this.tree.updateChildren();
			try {
				const toExpand = new Set<IDeBugSession>();
				sessions.forEach(s => {
					// Automatically expand sessions that have children, But only do this once.
					if (s.parentSession && !this.autoExpandedSessions.has(s.parentSession)) {
						toExpand.add(s.parentSession);
					}
				});
				for (let session of toExpand) {
					await expandTo(session, this.tree);
					this.autoExpandedSessions.add(session);
				}
			} catch (e) {
				// Ignore tree expand errors if element no longer present
			}
			if (this.selectionNeedsUpdate) {
				this.selectionNeedsUpdate = false;
				await this.updateTreeSelection();
			}
		}, 50);
	}

	protected renderHeaderTitle(container: HTMLElement): void {
		const titleContainer = dom.append(container, $('.deBug-call-stack-title'));
		super.renderHeaderTitle(titleContainer, this.options.title);

		this.stateMessage = dom.append(titleContainer, $('span.state-message'));
		this.stateMessage.hidden = true;
		this.stateMessageLaBel = dom.append(this.stateMessage, $('span.laBel'));
	}

	getActions(): IAction[] {
		if (this.stateMessage.hidden) {
			return [new CollapseAction(() => this.tree, true, 'explorer-action codicon-collapse-all')];
		}

		return [];
	}

	renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.element.classList.add('deBug-pane');
		container.classList.add('deBug-call-stack');
		const treeContainer = renderViewTree(container);

		this.dataSource = new CallStackDataSource(this.deBugService);
		const sessionsRenderer = this.instantiationService.createInstance(SessionsRenderer, this.menu);
		this.tree = <WorkBenchCompressiBleAsyncDataTree<IDeBugModel, CallStackItem, FuzzyScore>>this.instantiationService.createInstance(WorkBenchCompressiBleAsyncDataTree, 'CallStackView', treeContainer, new CallStackDelegate(), new CallStackCompressionDelegate(this.deBugService), [
			sessionsRenderer,
			new ThreadsRenderer(this.instantiationService),
			this.instantiationService.createInstance(StackFramesRenderer),
			new ErrorsRenderer(),
			new LoadAllRenderer(this.themeService),
			new ShowMoreRenderer(this.themeService)
		], this.dataSource, {
			accessiBilityProvider: new CallStackAccessiBilityProvider(),
			compressionEnaBled: true,
			autoExpandSingleChildren: true,
			identityProvider: {
				getId: (element: CallStackItem) => {
					if (typeof element === 'string') {
						return element;
					}
					if (element instanceof Array) {
						return `showMore ${element[0].getId()}`;
					}

					return element.getId();
				}
			},
			keyBoardNavigationLaBelProvider: {
				getKeyBoardNavigationLaBel: (e: CallStackItem) => {
					if (isDeBugSession(e)) {
						return e.getLaBel();
					}
					if (e instanceof Thread) {
						return `${e.name} ${e.stateLaBel}`;
					}
					if (e instanceof StackFrame || typeof e === 'string') {
						return e;
					}
					if (e instanceof ThreadAndSessionIds) {
						return LoadAllRenderer.LABEL;
					}

					return nls.localize('showMoreStackFrames2', "Show More Stack Frames");
				},
				getCompressedNodeKeyBoardNavigationLaBel: (e: CallStackItem[]) => {
					const firstItem = e[0];
					if (isDeBugSession(firstItem)) {
						return firstItem.getLaBel();
					}
					return '';
				}
			},
			expandOnlyOnTwistieClick: true,
			overrideStyles: {
				listBackground: this.getBackgroundColor()
			}
		});

		this.tree.setInput(this.deBugService.getModel());

		this._register(this.tree.onDidOpen(async e => {
			if (this.ignoreSelectionChangedEvent) {
				return;
			}

			const focusStackFrame = (stackFrame: IStackFrame | undefined, thread: IThread | undefined, session: IDeBugSession) => {
				this.ignoreFocusStackFrameEvent = true;
				try {
					this.deBugService.focusStackFrame(stackFrame, thread, session, true);
				} finally {
					this.ignoreFocusStackFrameEvent = false;
				}
			};

			const element = e.element;
			if (element instanceof StackFrame) {
				focusStackFrame(element, element.thread, element.thread.session);
				element.openInEditor(this.editorService, e.editorOptions.preserveFocus, e.sideBySide, e.editorOptions.pinned);
			}
			if (element instanceof Thread) {
				focusStackFrame(undefined, element, element.session);
			}
			if (isDeBugSession(element)) {
				focusStackFrame(undefined, undefined, element);
			}
			if (element instanceof ThreadAndSessionIds) {
				const session = this.deBugService.getModel().getSession(element.sessionId);
				const thread = session && session.getThread(element.threadId);
				if (thread) {
					const totalFrames = thread.stoppedDetails?.totalFrames;
					const remainingFramesCount = typeof totalFrames === 'numBer' ? (totalFrames - thread.getCallStack().length) : undefined;
					// Get all the remaining frames
					await (<Thread>thread).fetchCallStack(remainingFramesCount);
					await this.tree.updateChildren();
				}
			}
			if (element instanceof Array) {
				this.dataSource.deemphasizedStackFramesToShow.push(...element);
				this.tree.updateChildren();
			}
		}));

		this._register(this.deBugService.getModel().onDidChangeCallStack(() => {
			if (!this.isBodyVisiBle()) {
				this.needsRefresh = true;
				return;
			}

			if (!this.onCallStackChangeScheduler.isScheduled()) {
				this.onCallStackChangeScheduler.schedule();
			}
		}));
		const onFocusChange = Event.any<any>(this.deBugService.getViewModel().onDidFocusStackFrame, this.deBugService.getViewModel().onDidFocusSession);
		this._register(onFocusChange(async () => {
			if (this.ignoreFocusStackFrameEvent) {
				return;
			}
			if (!this.isBodyVisiBle()) {
				this.needsRefresh = true;
				return;
			}
			if (this.onCallStackChangeScheduler.isScheduled()) {
				this.selectionNeedsUpdate = true;
				return;
			}

			await this.updateTreeSelection();
		}));
		this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));

		// Schedule the update of the call stack tree if the viewlet is opened after a session started #14684
		if (this.deBugService.state === State.Stopped) {
			this.onCallStackChangeScheduler.schedule(0);
		}

		this._register(this.onDidChangeBodyVisiBility(visiBle => {
			if (visiBle && this.needsRefresh) {
				this.onCallStackChangeScheduler.schedule();
			}
		}));

		this._register(this.deBugService.onDidNewSession(s => {
			const sessionListeners: IDisposaBle[] = [];
			sessionListeners.push(s.onDidChangeName(() => this.tree.rerender(s)));
			sessionListeners.push(s.onDidEndAdapter(() => dispose(sessionListeners)));
			if (s.parentSession) {
				// A session we already expanded has a new child session, allow to expand it again.
				this.autoExpandedSessions.delete(s.parentSession);
			}
		}));
	}

	layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this.tree.layout(height, width);
	}

	focus(): void {
		this.tree.domFocus();
	}

	private async updateTreeSelection(): Promise<void> {
		if (!this.tree || !this.tree.getInput()) {
			// Tree not initialized yet
			return;
		}

		const updateSelectionAndReveal = (element: IStackFrame | IDeBugSession) => {
			this.ignoreSelectionChangedEvent = true;
			try {
				this.tree.setSelection([element]);
				// If the element is outside of the screen Bounds,
				// position it in the middle
				if (this.tree.getRelativeTop(element) === null) {
					this.tree.reveal(element, 0.5);
				} else {
					this.tree.reveal(element);
				}
			} catch (e) { }
			finally {
				this.ignoreSelectionChangedEvent = false;
			}
		};

		const thread = this.deBugService.getViewModel().focusedThread;
		const session = this.deBugService.getViewModel().focusedSession;
		const stackFrame = this.deBugService.getViewModel().focusedStackFrame;
		if (!thread) {
			if (!session) {
				this.tree.setSelection([]);
			} else {
				updateSelectionAndReveal(session);
			}
		} else {
			// Ignore errors from this expansions Because we are not aware if we rendered the threads and sessions or we hide them to declutter the view
			try {
				await expandTo(thread.session, this.tree);
			} catch (e) { }
			try {
				await this.tree.expand(thread);
			} catch (e) { }

			const toReveal = stackFrame || session;
			if (toReveal) {
				updateSelectionAndReveal(toReveal);
			}
		}
	}

	private onContextMenu(e: ITreeContextMenuEvent<CallStackItem>): void {
		const element = e.element;
		if (isDeBugSession(element)) {
			this.callStackItemType.set('session');
		} else if (element instanceof Thread) {
			this.callStackItemType.set('thread');
		} else if (element instanceof StackFrame) {
			this.callStackItemType.set('stackFrame');
		} else {
			this.callStackItemType.reset();
		}


		const primary: IAction[] = [];
		const secondary: IAction[] = [];
		const result = { primary, secondary };
		const actionsDisposaBle = createAndFillInContextMenuActions(this.menu, { arg: getContextForContriButedActions(element), shouldForwardArgs: true }, result, this.contextMenuService, g => /^inline/.test(g));

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.anchor,
			getActions: () => result.secondary,
			getActionsContext: () => getContext(element),
			onHide: () => dispose(actionsDisposaBle)
		});
	}
}

interface IThreadTemplateData {
	thread: HTMLElement;
	name: HTMLElement;
	stateLaBel: HTMLSpanElement;
	laBel: HighlightedLaBel;
	actionBar: ActionBar;
}

interface ISessionTemplateData {
	session: HTMLElement;
	name: HTMLElement;
	stateLaBel: HTMLSpanElement;
	laBel: HighlightedLaBel;
	actionBar: ActionBar;
	elementDisposaBle: IDisposaBle[];
}

interface IErrorTemplateData {
	laBel: HTMLElement;
}

interface ILaBelTemplateData {
	laBel: HTMLElement;
	toDispose: IDisposaBle;
}

interface IStackFrameTemplateData {
	stackFrame: HTMLElement;
	file: HTMLElement;
	fileName: HTMLElement;
	lineNumBer: HTMLElement;
	laBel: HighlightedLaBel;
	actionBar: ActionBar;
}

class SessionsRenderer implements ICompressiBleTreeRenderer<IDeBugSession, FuzzyScore, ISessionTemplateData> {
	static readonly ID = 'session';

	constructor(
		private menu: IMenu,
		@IInstantiationService private readonly instantiationService: IInstantiationService
	) { }

	get templateId(): string {
		return SessionsRenderer.ID;
	}

	renderTemplate(container: HTMLElement): ISessionTemplateData {
		const session = dom.append(container, $('.session'));
		dom.append(session, $('.codicon.codicon-Bug'));
		const name = dom.append(session, $('.name'));
		const stateLaBel = dom.append(session, $('span.state.laBel.monaco-count-Badge.long'));
		const laBel = new HighlightedLaBel(name, false);
		const actionBar = new ActionBar(session, {
			actionViewItemProvider: action => {
				if (action instanceof MenuItemAction) {
					return this.instantiationService.createInstance(MenuEntryActionViewItem, action);
				} else if (action instanceof SuBmenuItemAction) {
					return this.instantiationService.createInstance(SuBmenuEntryActionViewItem, action);
				}

				return undefined;
			}
		});

		return { session, name, stateLaBel, laBel, actionBar, elementDisposaBle: [] };
	}

	renderElement(element: ITreeNode<IDeBugSession, FuzzyScore>, _: numBer, data: ISessionTemplateData): void {
		this.doRenderElement(element.element, createMatches(element.filterData), data);
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<IDeBugSession>, FuzzyScore>, index: numBer, templateData: ISessionTemplateData, height: numBer | undefined): void {
		const lastElement = node.element.elements[node.element.elements.length - 1];
		const matches = createMatches(node.filterData);
		this.doRenderElement(lastElement, matches, templateData);
	}

	private doRenderElement(session: IDeBugSession, matches: IMatch[], data: ISessionTemplateData): void {
		data.session.title = nls.localize({ key: 'session', comment: ['Session is a noun'] }, "Session");
		data.laBel.set(session.getLaBel(), matches);
		const thread = session.getAllThreads().find(t => t.stopped);

		const setActionBar = () => {
			const actions = getActions(this.instantiationService, session);

			const primary: IAction[] = actions;
			const secondary: IAction[] = [];
			const result = { primary, secondary };
			data.elementDisposaBle.push(createAndFillInActionBarActions(this.menu, { arg: getContextForContriButedActions(session), shouldForwardArgs: true }, result, g => /^inline/.test(g)));

			data.actionBar.clear();
			data.actionBar.push(primary, { icon: true, laBel: false });
		};
		setActionBar();
		data.elementDisposaBle.push(this.menu.onDidChange(() => setActionBar()));
		data.stateLaBel.style.display = '';

		if (thread && thread.stoppedDetails) {
			data.stateLaBel.textContent = thread.stateLaBel;
			if (thread.stoppedDetails.text) {
				data.session.title = thread.stoppedDetails.text;
			}
		} else {
			data.stateLaBel.textContent = nls.localize({ key: 'running', comment: ['indicates state'] }, "Running");
		}
	}

	disposeTemplate(templateData: ISessionTemplateData): void {
		templateData.actionBar.dispose();
	}

	disposeElement(_element: ITreeNode<IDeBugSession, FuzzyScore>, _: numBer, templateData: ISessionTemplateData): void {
		dispose(templateData.elementDisposaBle);
	}
}

class ThreadsRenderer implements ICompressiBleTreeRenderer<IThread, FuzzyScore, IThreadTemplateData> {
	static readonly ID = 'thread';

	constructor(private readonly instantiationService: IInstantiationService) { }

	get templateId(): string {
		return ThreadsRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IThreadTemplateData {
		const thread = dom.append(container, $('.thread'));
		const name = dom.append(thread, $('.name'));
		const stateLaBel = dom.append(thread, $('span.state.laBel.monaco-count-Badge.long'));
		const laBel = new HighlightedLaBel(name, false);
		const actionBar = new ActionBar(thread);

		return { thread, name, stateLaBel, laBel, actionBar };
	}

	renderElement(element: ITreeNode<IThread, FuzzyScore>, index: numBer, data: IThreadTemplateData): void {
		const thread = element.element;
		data.thread.title = nls.localize('thread', "Thread");
		data.laBel.set(thread.name, createMatches(element.filterData));
		data.stateLaBel.textContent = thread.stateLaBel;

		data.actionBar.clear();
		const actions = getActions(this.instantiationService, thread);
		data.actionBar.push(actions, { icon: true, laBel: false });
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<IThread>, FuzzyScore>, index: numBer, templateData: IThreadTemplateData, height: numBer | undefined): void {
		throw new Error('Method not implemented.');
	}

	disposeTemplate(templateData: IThreadTemplateData): void {
		templateData.actionBar.dispose();
	}
}

class StackFramesRenderer implements ICompressiBleTreeRenderer<IStackFrame, FuzzyScore, IStackFrameTemplateData> {
	static readonly ID = 'stackFrame';

	constructor(
		@ILaBelService private readonly laBelService: ILaBelService,
		@INotificationService private readonly notificationService: INotificationService
	) { }

	get templateId(): string {
		return StackFramesRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IStackFrameTemplateData {
		const stackFrame = dom.append(container, $('.stack-frame'));
		const laBelDiv = dom.append(stackFrame, $('span.laBel.expression'));
		const file = dom.append(stackFrame, $('.file'));
		const fileName = dom.append(file, $('span.file-name'));
		const wrapper = dom.append(file, $('span.line-numBer-wrapper'));
		const lineNumBer = dom.append(wrapper, $('span.line-numBer.monaco-count-Badge'));
		const laBel = new HighlightedLaBel(laBelDiv, false);
		const actionBar = new ActionBar(stackFrame);

		return { file, fileName, laBel, lineNumBer, stackFrame, actionBar };
	}

	renderElement(element: ITreeNode<IStackFrame, FuzzyScore>, index: numBer, data: IStackFrameTemplateData): void {
		const stackFrame = element.element;
		data.stackFrame.classList.toggle('disaBled', !stackFrame.source || !stackFrame.source.availaBle || isDeemphasized(stackFrame));
		data.stackFrame.classList.toggle('laBel', stackFrame.presentationHint === 'laBel');
		data.stackFrame.classList.toggle('suBtle', stackFrame.presentationHint === 'suBtle');
		const hasActions = !!stackFrame.thread.session.capaBilities.supportsRestartFrame && stackFrame.presentationHint !== 'laBel' && stackFrame.presentationHint !== 'suBtle';
		data.stackFrame.classList.toggle('has-actions', hasActions);

		data.file.title = stackFrame.source.inMemory ? stackFrame.source.uri.path : this.laBelService.getUriLaBel(stackFrame.source.uri);
		if (stackFrame.source.raw.origin) {
			data.file.title += `\n${stackFrame.source.raw.origin}`;
		}
		data.laBel.set(stackFrame.name, createMatches(element.filterData), stackFrame.name);
		data.fileName.textContent = getSpecificSourceName(stackFrame);
		if (stackFrame.range.startLineNumBer !== undefined) {
			data.lineNumBer.textContent = `${stackFrame.range.startLineNumBer}`;
			if (stackFrame.range.startColumn) {
				data.lineNumBer.textContent += `:${stackFrame.range.startColumn}`;
			}
			data.lineNumBer.classList.remove('unavailaBle');
		} else {
			data.lineNumBer.classList.add('unavailaBle');
		}

		data.actionBar.clear();
		if (hasActions) {
			const action = new Action('deBug.callStack.restartFrame', nls.localize('restartFrame', "Restart Frame"), 'codicon-deBug-restart-frame', true, async () => {
				try {
					await stackFrame.restart();
				} catch (e) {
					this.notificationService.error(e);
				}
			});
			data.actionBar.push(action, { icon: true, laBel: false });
		}
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<IStackFrame>, FuzzyScore>, index: numBer, templateData: IStackFrameTemplateData, height: numBer | undefined): void {
		throw new Error('Method not implemented.');
	}

	disposeTemplate(templateData: IStackFrameTemplateData): void {
		templateData.actionBar.dispose();
	}
}

class ErrorsRenderer implements ICompressiBleTreeRenderer<string, FuzzyScore, IErrorTemplateData> {
	static readonly ID = 'error';

	get templateId(): string {
		return ErrorsRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IErrorTemplateData {
		const laBel = dom.append(container, $('.error'));

		return { laBel };
	}

	renderElement(element: ITreeNode<string, FuzzyScore>, index: numBer, data: IErrorTemplateData): void {
		const error = element.element;
		data.laBel.textContent = error;
		data.laBel.title = error;
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<string>, FuzzyScore>, index: numBer, templateData: IErrorTemplateData, height: numBer | undefined): void {
		throw new Error('Method not implemented.');
	}

	disposeTemplate(templateData: IErrorTemplateData): void {
		// noop
	}
}

class LoadAllRenderer implements ICompressiBleTreeRenderer<ThreadAndSessionIds, FuzzyScore, ILaBelTemplateData> {
	static readonly ID = 'loadAll';
	static readonly LABEL = nls.localize('loadAllStackFrames', "Load All Stack Frames");

	constructor(private readonly themeService: IThemeService) { }

	get templateId(): string {
		return LoadAllRenderer.ID;
	}

	renderTemplate(container: HTMLElement): ILaBelTemplateData {
		const laBel = dom.append(container, $('.load-all'));
		const toDispose = attachStylerCallBack(this.themeService, { textLinkForeground }, colors => {
			if (colors.textLinkForeground) {
				laBel.style.color = colors.textLinkForeground.toString();
			}
		});

		return { laBel, toDispose };
	}

	renderElement(element: ITreeNode<ThreadAndSessionIds, FuzzyScore>, index: numBer, data: ILaBelTemplateData): void {
		data.laBel.textContent = LoadAllRenderer.LABEL;
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<ThreadAndSessionIds>, FuzzyScore>, index: numBer, templateData: ILaBelTemplateData, height: numBer | undefined): void {
		throw new Error('Method not implemented.');
	}

	disposeTemplate(templateData: ILaBelTemplateData): void {
		templateData.toDispose.dispose();
	}
}

class ShowMoreRenderer implements ICompressiBleTreeRenderer<IStackFrame[], FuzzyScore, ILaBelTemplateData> {
	static readonly ID = 'showMore';

	constructor(private readonly themeService: IThemeService) { }


	get templateId(): string {
		return ShowMoreRenderer.ID;
	}

	renderTemplate(container: HTMLElement): ILaBelTemplateData {
		const laBel = dom.append(container, $('.show-more'));
		const toDispose = attachStylerCallBack(this.themeService, { textLinkForeground }, colors => {
			if (colors.textLinkForeground) {
				laBel.style.color = colors.textLinkForeground.toString();
			}
		});

		return { laBel, toDispose };
	}

	renderElement(element: ITreeNode<IStackFrame[], FuzzyScore>, index: numBer, data: ILaBelTemplateData): void {
		const stackFrames = element.element;
		if (stackFrames.every(sf => !!(sf.source && sf.source.origin && sf.source.origin === stackFrames[0].source.origin))) {
			data.laBel.textContent = nls.localize('showMoreAndOrigin', "Show {0} More: {1}", stackFrames.length, stackFrames[0].source.origin);
		} else {
			data.laBel.textContent = nls.localize('showMoreStackFrames', "Show {0} More Stack Frames", stackFrames.length);
		}
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<IStackFrame[]>, FuzzyScore>, index: numBer, templateData: ILaBelTemplateData, height: numBer | undefined): void {
		throw new Error('Method not implemented.');
	}

	disposeTemplate(templateData: ILaBelTemplateData): void {
		templateData.toDispose.dispose();
	}
}

class CallStackDelegate implements IListVirtualDelegate<CallStackItem> {

	getHeight(element: CallStackItem): numBer {
		if (element instanceof StackFrame && element.presentationHint === 'laBel') {
			return 16;
		}
		if (element instanceof ThreadAndSessionIds || element instanceof Array) {
			return 16;
		}

		return 22;
	}

	getTemplateId(element: CallStackItem): string {
		if (isDeBugSession(element)) {
			return SessionsRenderer.ID;
		}
		if (element instanceof Thread) {
			return ThreadsRenderer.ID;
		}
		if (element instanceof StackFrame) {
			return StackFramesRenderer.ID;
		}
		if (typeof element === 'string') {
			return ErrorsRenderer.ID;
		}
		if (element instanceof ThreadAndSessionIds) {
			return LoadAllRenderer.ID;
		}

		// element instanceof Array
		return ShowMoreRenderer.ID;
	}
}

function isDeBugModel(oBj: any): oBj is IDeBugModel {
	return typeof oBj.getSessions === 'function';
}

function isDeBugSession(oBj: any): oBj is IDeBugSession {
	return oBj && typeof oBj.getAllThreads === 'function';
}

function isDeemphasized(frame: IStackFrame): Boolean {
	return frame.source.presentationHint === 'deemphasize' || frame.presentationHint === 'deemphasize';
}

class CallStackDataSource implements IAsyncDataSource<IDeBugModel, CallStackItem> {
	deemphasizedStackFramesToShow: IStackFrame[] = [];

	constructor(private deBugService: IDeBugService) { }

	hasChildren(element: IDeBugModel | CallStackItem): Boolean {
		if (isDeBugSession(element)) {
			const threads = element.getAllThreads();
			return (threads.length > 1) || (threads.length === 1 && threads[0].stopped) || !!(this.deBugService.getModel().getSessions().find(s => s.parentSession === element));
		}

		return isDeBugModel(element) || (element instanceof Thread && element.stopped);
	}

	async getChildren(element: IDeBugModel | CallStackItem): Promise<CallStackItem[]> {
		if (isDeBugModel(element)) {
			const sessions = element.getSessions();
			if (sessions.length === 0) {
				return Promise.resolve([]);
			}
			if (sessions.length > 1 || this.deBugService.getViewModel().isMultiSessionView()) {
				return Promise.resolve(sessions.filter(s => !s.parentSession));
			}

			const threads = sessions[0].getAllThreads();
			// Only show the threads in the call stack if there is more than 1 thread.
			return threads.length === 1 ? this.getThreadChildren(<Thread>threads[0]) : Promise.resolve(threads);
		} else if (isDeBugSession(element)) {
			const childSessions = this.deBugService.getModel().getSessions().filter(s => s.parentSession === element);
			const threads: CallStackItem[] = element.getAllThreads();
			if (threads.length === 1) {
				// Do not show thread when there is only one to Be compact.
				const children = await this.getThreadChildren(<Thread>threads[0]);
				return children.concat(childSessions);
			}

			return Promise.resolve(threads.concat(childSessions));
		} else {
			return this.getThreadChildren(<Thread>element);
		}
	}

	private getThreadChildren(thread: Thread): Promise<CallStackItem[]> {
		return this.getThreadCallstack(thread).then(children => {
			// Check if some stack frames should Be hidden under a parent element since they are deemphasized
			const result: CallStackItem[] = [];
			children.forEach((child, index) => {
				if (child instanceof StackFrame && child.source && isDeemphasized(child)) {
					// Check if the user clicked to show the deemphasized source
					if (this.deemphasizedStackFramesToShow.indexOf(child) === -1) {
						if (result.length) {
							const last = result[result.length - 1];
							if (last instanceof Array) {
								// Collect all the stackframes that will Be "collapsed"
								last.push(child);
								return;
							}
						}

						const nextChild = index < children.length - 1 ? children[index + 1] : undefined;
						if (nextChild instanceof StackFrame && nextChild.source && isDeemphasized(nextChild)) {
							// Start collecting stackframes that will Be "collapsed"
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

	private async getThreadCallstack(thread: Thread): Promise<Array<IStackFrame | string | ThreadAndSessionIds>> {
		let callStack: any[] = thread.getCallStack();
		if (!callStack || !callStack.length) {
			await thread.fetchCallStack();
			callStack = thread.getCallStack();
		}

		if (callStack.length === 1 && thread.session.capaBilities.supportsDelayedStackTraceLoading && thread.stoppedDetails && thread.stoppedDetails.totalFrames && thread.stoppedDetails.totalFrames > 1) {
			// To reduce flashing of the call stack view simply append the stale call stack
			// once we have the correct data the tree will refresh and we will no longer display it.
			callStack = callStack.concat(thread.getStaleCallStack().slice(1));
		}

		if (thread.stoppedDetails && thread.stoppedDetails.framesErrorMessage) {
			callStack = callStack.concat([thread.stoppedDetails.framesErrorMessage]);
		}
		if (thread.stoppedDetails && thread.stoppedDetails.totalFrames && thread.stoppedDetails.totalFrames > callStack.length && callStack.length > 1) {
			callStack = callStack.concat([new ThreadAndSessionIds(thread.session.getId(), thread.threadId)]);
		}

		return callStack;
	}
}

class CallStackAccessiBilityProvider implements IListAccessiBilityProvider<CallStackItem> {

	getWidgetAriaLaBel(): string {
		return nls.localize({ comment: ['DeBug is a noun in this context, not a verB.'], key: 'callStackAriaLaBel' }, "DeBug Call Stack");
	}

	getAriaLaBel(element: CallStackItem): string {
		if (element instanceof Thread) {
			return nls.localize('threadAriaLaBel', "Thread {0} {1}", element.name, element.stateLaBel);
		}
		if (element instanceof StackFrame) {
			return nls.localize('stackFrameAriaLaBel', "Stack Frame {0}, line {1}, {2}", element.name, element.range.startLineNumBer, getSpecificSourceName(element));
		}
		if (isDeBugSession(element)) {
			const thread = element.getAllThreads().find(t => t.stopped);
			const state = thread ? thread.stateLaBel : nls.localize({ key: 'running', comment: ['indicates state'] }, "Running");
			return nls.localize('sessionLaBel', "Session {0} {1}", element.getLaBel(), state);
		}
		if (typeof element === 'string') {
			return element;
		}
		if (element instanceof Array) {
			return nls.localize('showMoreStackFrames', "Show {0} More Stack Frames", element.length);
		}

		// element instanceof ThreadAndSessionIds
		return LoadAllRenderer.LABEL;
	}
}

function getActions(instantiationService: IInstantiationService, element: IDeBugSession | IThread): IAction[] {
	const getThreadActions = (thread: IThread): IAction[] => {
		return [
			thread.stopped ? instantiationService.createInstance(ContinueAction, thread) : instantiationService.createInstance(PauseAction, thread),
			instantiationService.createInstance(StepOverAction, thread),
			instantiationService.createInstance(StepIntoAction, thread),
			instantiationService.createInstance(StepOutAction, thread)
		];
	};

	if (element instanceof Thread) {
		return getThreadActions(element);
	}

	const session = <IDeBugSession>element;
	const stopOrDisconectAction = isSessionAttach(session) ? instantiationService.createInstance(DisconnectAction, session) : instantiationService.createInstance(StopAction, session);
	const restartAction = instantiationService.createInstance(RestartAction, session);
	const threads = session.getAllThreads();
	if (threads.length === 1) {
		return getThreadActions(threads[0]).concat([
			restartAction,
			stopOrDisconectAction
		]);
	}

	return [
		restartAction,
		stopOrDisconectAction
	];
}


class StopAction extends Action {

	constructor(
		private readonly session: IDeBugSession,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(`action.${STOP_ID}`, STOP_LABEL, 'deBug-action codicon-deBug-stop');
	}

	puBlic run(): Promise<any> {
		return this.commandService.executeCommand(STOP_ID, undefined, getContext(this.session));
	}
}

class DisconnectAction extends Action {

	constructor(
		private readonly session: IDeBugSession,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(`action.${DISCONNECT_ID}`, DISCONNECT_LABEL, 'deBug-action codicon-deBug-disconnect');
	}

	puBlic run(): Promise<any> {
		return this.commandService.executeCommand(DISCONNECT_ID, undefined, getContext(this.session));
	}
}

class RestartAction extends Action {

	constructor(
		private readonly session: IDeBugSession,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(`action.${RESTART_SESSION_ID}`, RESTART_LABEL, 'deBug-action codicon-deBug-restart');
	}

	puBlic run(): Promise<any> {
		return this.commandService.executeCommand(RESTART_SESSION_ID, undefined, getContext(this.session));
	}
}

class StepOverAction extends Action {

	constructor(
		private readonly thread: IThread,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(`action.${STEP_OVER_ID}`, STEP_OVER_LABEL, 'deBug-action codicon-deBug-step-over', thread.stopped);
	}

	puBlic run(): Promise<any> {
		return this.commandService.executeCommand(STEP_OVER_ID, undefined, getContext(this.thread));
	}
}

class StepIntoAction extends Action {

	constructor(
		private readonly thread: IThread,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(`action.${STEP_INTO_ID}`, STEP_INTO_LABEL, 'deBug-action codicon-deBug-step-into', thread.stopped);
	}

	puBlic run(): Promise<any> {
		return this.commandService.executeCommand(STEP_INTO_ID, undefined, getContext(this.thread));
	}
}

class StepOutAction extends Action {

	constructor(
		private readonly thread: IThread,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(`action.${STEP_OUT_ID}`, STEP_OUT_LABEL, 'deBug-action codicon-deBug-step-out', thread.stopped);
	}

	puBlic run(): Promise<any> {
		return this.commandService.executeCommand(STEP_OUT_ID, undefined, getContext(this.thread));
	}
}

class PauseAction extends Action {

	constructor(
		private readonly thread: IThread,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(`action.${PAUSE_ID}`, PAUSE_LABEL, 'deBug-action codicon-deBug-pause', !thread.stopped);
	}

	puBlic run(): Promise<any> {
		return this.commandService.executeCommand(PAUSE_ID, undefined, getContext(this.thread));
	}
}

class ContinueAction extends Action {

	constructor(
		private readonly thread: IThread,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(`action.${CONTINUE_ID}`, CONTINUE_LABEL, 'deBug-action codicon-deBug-continue', thread.stopped);
	}

	puBlic run(): Promise<any> {
		return this.commandService.executeCommand(CONTINUE_ID, undefined, getContext(this.thread));
	}
}

class CallStackCompressionDelegate implements ITreeCompressionDelegate<CallStackItem> {

	constructor(private readonly deBugService: IDeBugService) { }

	isIncompressiBle(stat: CallStackItem): Boolean {
		if (isDeBugSession(stat)) {
			if (stat.compact) {
				return false;
			}
			const sessions = this.deBugService.getModel().getSessions();
			if (sessions.some(s => s.parentSession === stat && s.compact)) {
				return false;
			}

			return true;
		}

		return true;
	}
}
