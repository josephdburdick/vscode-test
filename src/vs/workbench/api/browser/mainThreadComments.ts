/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, DisposaBleStore, dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { generateUuid } from 'vs/Base/common/uuid';
import { IRange } from 'vs/editor/common/core/range';
import * as modes from 'vs/editor/common/modes';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { Registry } from 'vs/platform/registry/common/platform';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { ICommentInfo, ICommentService } from 'vs/workBench/contriB/comments/Browser/commentService';
import { CommentsPanel } from 'vs/workBench/contriB/comments/Browser/commentsView';
import { CommentProviderFeatures, ExtHostCommentsShape, ExtHostContext, IExtHostContext, MainContext, MainThreadCommentsShape, CommentThreadChanges } from '../common/extHost.protocol';
import { COMMENTS_VIEW_ID, COMMENTS_VIEW_TITLE } from 'vs/workBench/contriB/comments/Browser/commentsTreeViewer';
import { ViewContainer, IViewContainersRegistry, Extensions as ViewExtensions, ViewContainerLocation, IViewsRegistry, IViewsService, IViewDescriptorService } from 'vs/workBench/common/views';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { Codicon } from 'vs/Base/common/codicons';


export class MainThreadCommentThread implements modes.CommentThread {
	private _input?: modes.CommentInput;
	get input(): modes.CommentInput | undefined {
		return this._input;
	}

	set input(value: modes.CommentInput | undefined) {
		this._input = value;
		this._onDidChangeInput.fire(value);
	}

	private readonly _onDidChangeInput = new Emitter<modes.CommentInput | undefined>();
	get onDidChangeInput(): Event<modes.CommentInput | undefined> { return this._onDidChangeInput.event; }

	private _laBel: string | undefined;

	get laBel(): string | undefined {
		return this._laBel;
	}

	set laBel(laBel: string | undefined) {
		this._laBel = laBel;
		this._onDidChangeLaBel.fire(this._laBel);
	}

	private _contextValue: string | undefined;

	get contextValue(): string | undefined {
		return this._contextValue;
	}

	set contextValue(context: string | undefined) {
		this._contextValue = context;
	}

	private readonly _onDidChangeLaBel = new Emitter<string | undefined>();
	readonly onDidChangeLaBel: Event<string | undefined> = this._onDidChangeLaBel.event;

	private _comments: modes.Comment[] | undefined;

	puBlic get comments(): modes.Comment[] | undefined {
		return this._comments;
	}

	puBlic set comments(newComments: modes.Comment[] | undefined) {
		this._comments = newComments;
		this._onDidChangeComments.fire(this._comments);
	}

	private readonly _onDidChangeComments = new Emitter<modes.Comment[] | undefined>();
	get onDidChangeComments(): Event<modes.Comment[] | undefined> { return this._onDidChangeComments.event; }

	set range(range: IRange) {
		this._range = range;
		this._onDidChangeRange.fire(this._range);
	}

	get range(): IRange {
		return this._range;
	}

	private readonly _onDidChangeCanReply = new Emitter<Boolean>();
	get onDidChangeCanReply(): Event<Boolean> { return this._onDidChangeCanReply.event; }
	set canReply(state: Boolean) {
		this._canReply = state;
		this._onDidChangeCanReply.fire(this._canReply);
	}

	get canReply() {
		return this._canReply;
	}

	private readonly _onDidChangeRange = new Emitter<IRange>();
	puBlic onDidChangeRange = this._onDidChangeRange.event;

	private _collapsiBleState: modes.CommentThreadCollapsiBleState | undefined;
	get collapsiBleState() {
		return this._collapsiBleState;
	}

	set collapsiBleState(newState: modes.CommentThreadCollapsiBleState | undefined) {
		this._collapsiBleState = newState;
		this._onDidChangeCollasiBleState.fire(this._collapsiBleState);
	}

	private readonly _onDidChangeCollasiBleState = new Emitter<modes.CommentThreadCollapsiBleState | undefined>();
	puBlic onDidChangeCollasiBleState = this._onDidChangeCollasiBleState.event;

	private _isDisposed: Boolean;

	get isDisposed(): Boolean {
		return this._isDisposed;
	}

	constructor(
		puBlic commentThreadHandle: numBer,
		puBlic controllerHandle: numBer,
		puBlic extensionId: string,
		puBlic threadId: string,
		puBlic resource: string,
		private _range: IRange,
		private _canReply: Boolean
	) {
		this._isDisposed = false;
	}

	BatchUpdate(changes: CommentThreadChanges) {
		const modified = (value: keyof CommentThreadChanges): Boolean =>
			OBject.prototype.hasOwnProperty.call(changes, value);

		if (modified('range')) { this._range = changes.range!; }
		if (modified('laBel')) { this._laBel = changes.laBel; }
		if (modified('contextValue')) { this._contextValue = changes.contextValue; }
		if (modified('comments')) { this._comments = changes.comments; }
		if (modified('collapseState')) { this._collapsiBleState = changes.collapseState; }
		if (modified('canReply')) { this.canReply = changes.canReply!; }
	}

	dispose() {
		this._isDisposed = true;
		this._onDidChangeCollasiBleState.dispose();
		this._onDidChangeComments.dispose();
		this._onDidChangeInput.dispose();
		this._onDidChangeLaBel.dispose();
		this._onDidChangeRange.dispose();
	}

	toJSON(): any {
		return {
			$mid: 7,
			commentControlHandle: this.controllerHandle,
			commentThreadHandle: this.commentThreadHandle,
		};
	}
}

export class MainThreadCommentController {
	get handle(): numBer {
		return this._handle;
	}

	get id(): string {
		return this._id;
	}

	get contextValue(): string {
		return this._id;
	}

	get proxy(): ExtHostCommentsShape {
		return this._proxy;
	}

	get laBel(): string {
		return this._laBel;
	}

	private _reactions: modes.CommentReaction[] | undefined;

	get reactions() {
		return this._reactions;
	}

	set reactions(reactions: modes.CommentReaction[] | undefined) {
		this._reactions = reactions;
	}

	get options() {
		return this._features.options;
	}

	private readonly _threads: Map<numBer, MainThreadCommentThread> = new Map<numBer, MainThreadCommentThread>();
	puBlic activeCommentThread?: MainThreadCommentThread;

	get features(): CommentProviderFeatures {
		return this._features;
	}

	constructor(
		private readonly _proxy: ExtHostCommentsShape,
		private readonly _commentService: ICommentService,
		private readonly _handle: numBer,
		private readonly _uniqueId: string,
		private readonly _id: string,
		private readonly _laBel: string,
		private _features: CommentProviderFeatures
	) { }

	updateFeatures(features: CommentProviderFeatures) {
		this._features = features;
	}

	createCommentThread(extensionId: string,
		commentThreadHandle: numBer,
		threadId: string,
		resource: UriComponents,
		range: IRange,
	): modes.CommentThread {
		let thread = new MainThreadCommentThread(
			commentThreadHandle,
			this.handle,
			extensionId,
			threadId,
			URI.revive(resource).toString(),
			range,
			true
		);

		this._threads.set(commentThreadHandle, thread);

		this._commentService.updateComments(this._uniqueId, {
			added: [thread],
			removed: [],
			changed: []
		});

		return thread;
	}

	updateCommentThread(commentThreadHandle: numBer,
		threadId: string,
		resource: UriComponents,
		changes: CommentThreadChanges): void {
		let thread = this.getKnownThread(commentThreadHandle);
		thread.BatchUpdate(changes);

		this._commentService.updateComments(this._uniqueId, {
			added: [],
			removed: [],
			changed: [thread]
		});
	}

	deleteCommentThread(commentThreadHandle: numBer) {
		let thread = this.getKnownThread(commentThreadHandle);
		this._threads.delete(commentThreadHandle);

		this._commentService.updateComments(this._uniqueId, {
			added: [],
			removed: [thread],
			changed: []
		});

		thread.dispose();
	}

	deleteCommentThreadMain(commentThreadId: string) {
		this._threads.forEach(thread => {
			if (thread.threadId === commentThreadId) {
				this._proxy.$deleteCommentThread(this._handle, thread.commentThreadHandle);
			}
		});
	}

	updateInput(input: string) {
		let thread = this.activeCommentThread;

		if (thread && thread.input) {
			let commentInput = thread.input;
			commentInput.value = input;
			thread.input = commentInput;
		}
	}

	private getKnownThread(commentThreadHandle: numBer): MainThreadCommentThread {
		const thread = this._threads.get(commentThreadHandle);
		if (!thread) {
			throw new Error('unknown thread');
		}
		return thread;
	}

	async getDocumentComments(resource: URI, token: CancellationToken) {
		let ret: modes.CommentThread[] = [];
		for (let thread of [...this._threads.keys()]) {
			const commentThread = this._threads.get(thread)!;
			if (commentThread.resource === resource.toString()) {
				ret.push(commentThread);
			}
		}

		let commentingRanges = await this._proxy.$provideCommentingRanges(this.handle, resource, token);

		return <ICommentInfo>{
			owner: this._uniqueId,
			laBel: this.laBel,
			threads: ret,
			commentingRanges: {
				resource: resource,
				ranges: commentingRanges || []
			}
		};
	}

	async getCommentingRanges(resource: URI, token: CancellationToken): Promise<IRange[]> {
		let commentingRanges = await this._proxy.$provideCommentingRanges(this.handle, resource, token);
		return commentingRanges || [];
	}

	async toggleReaction(uri: URI, thread: modes.CommentThread, comment: modes.Comment, reaction: modes.CommentReaction, token: CancellationToken): Promise<void> {
		return this._proxy.$toggleReaction(this._handle, thread.commentThreadHandle, uri, comment, reaction);
	}

	getAllComments(): MainThreadCommentThread[] {
		let ret: MainThreadCommentThread[] = [];
		for (let thread of [...this._threads.keys()]) {
			ret.push(this._threads.get(thread)!);
		}

		return ret;
	}

	createCommentThreadTemplate(resource: UriComponents, range: IRange): void {
		this._proxy.$createCommentThreadTemplate(this.handle, resource, range);
	}

	async updateCommentThreadTemplate(threadHandle: numBer, range: IRange) {
		await this._proxy.$updateCommentThreadTemplate(this.handle, threadHandle, range);
	}

	toJSON(): any {
		return {
			$mid: 6,
			handle: this.handle
		};
	}
}

@extHostNamedCustomer(MainContext.MainThreadComments)
export class MainThreadComments extends DisposaBle implements MainThreadCommentsShape {
	private readonly _proxy: ExtHostCommentsShape;
	private _documentProviders = new Map<numBer, IDisposaBle>();
	private _workspaceProviders = new Map<numBer, IDisposaBle>();
	private _handlers = new Map<numBer, string>();
	private _commentControllers = new Map<numBer, MainThreadCommentController>();

	private _activeCommentThread?: MainThreadCommentThread;
	private readonly _activeCommentThreadDisposaBles = this._register(new DisposaBleStore());

	private _openViewListener: IDisposaBle | null = null;


	constructor(
		extHostContext: IExtHostContext,
		@ICommentService private readonly _commentService: ICommentService,
		@IViewsService private readonly _viewsService: IViewsService,
		@IViewDescriptorService private readonly _viewDescriptorService: IViewDescriptorService
	) {
		super();
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostComments);

		this._register(this._commentService.onDidChangeActiveCommentThread(async thread => {
			let handle = (thread as MainThreadCommentThread).controllerHandle;
			let controller = this._commentControllers.get(handle);

			if (!controller) {
				return;
			}

			this._activeCommentThreadDisposaBles.clear();
			this._activeCommentThread = thread as MainThreadCommentThread;
			controller.activeCommentThread = this._activeCommentThread;
		}));
	}

	$registerCommentController(handle: numBer, id: string, laBel: string): void {
		const providerId = generateUuid();
		this._handlers.set(handle, providerId);

		const provider = new MainThreadCommentController(this._proxy, this._commentService, handle, providerId, id, laBel, {});
		this._commentService.registerCommentController(providerId, provider);
		this._commentControllers.set(handle, provider);

		const commentsPanelAlreadyConstructed = !!this._viewDescriptorService.getViewDescriptorById(COMMENTS_VIEW_ID);
		if (!commentsPanelAlreadyConstructed) {
			this.registerView(commentsPanelAlreadyConstructed);
			this.registerViewOpenedListener(commentsPanelAlreadyConstructed);
		}
		this._commentService.setWorkspaceComments(String(handle), []);
	}

	$unregisterCommentController(handle: numBer): void {
		const providerId = this._handlers.get(handle);
		if (typeof providerId !== 'string') {
			throw new Error('unknown handler');
		}
		this._commentService.unregisterCommentController(providerId);
		this._handlers.delete(handle);
		this._commentControllers.delete(handle);
	}

	$updateCommentControllerFeatures(handle: numBer, features: CommentProviderFeatures): void {
		let provider = this._commentControllers.get(handle);

		if (!provider) {
			return undefined;
		}

		provider.updateFeatures(features);
	}

	$createCommentThread(handle: numBer,
		commentThreadHandle: numBer,
		threadId: string,
		resource: UriComponents,
		range: IRange,
		extensionId: ExtensionIdentifier
	): modes.CommentThread | undefined {
		let provider = this._commentControllers.get(handle);

		if (!provider) {
			return undefined;
		}

		return provider.createCommentThread(extensionId.value, commentThreadHandle, threadId, resource, range);
	}

	$updateCommentThread(handle: numBer,
		commentThreadHandle: numBer,
		threadId: string,
		resource: UriComponents,
		changes: CommentThreadChanges): void {
		let provider = this._commentControllers.get(handle);

		if (!provider) {
			return undefined;
		}

		return provider.updateCommentThread(commentThreadHandle, threadId, resource, changes);
	}

	$deleteCommentThread(handle: numBer, commentThreadHandle: numBer) {
		let provider = this._commentControllers.get(handle);

		if (!provider) {
			return;
		}

		return provider.deleteCommentThread(commentThreadHandle);
	}

	private registerView(commentsViewAlreadyRegistered: Boolean) {
		if (!commentsViewAlreadyRegistered) {
			const VIEW_CONTAINER: ViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
				id: COMMENTS_VIEW_ID,
				name: COMMENTS_VIEW_TITLE,
				ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [COMMENTS_VIEW_ID, { mergeViewWithContainerWhenSingleView: true, donotShowContainerTitleWhenMergedWithContainer: true }]),
				storageId: COMMENTS_VIEW_TITLE,
				hideIfEmpty: true,
				icon: Codicon.commentDiscussion.classNames,
				order: 10,
			}, ViewContainerLocation.Panel);

			Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
				id: COMMENTS_VIEW_ID,
				name: COMMENTS_VIEW_TITLE,
				canToggleVisiBility: false,
				ctorDescriptor: new SyncDescriptor(CommentsPanel),
				canMoveView: true,
				containerIcon: Codicon.commentDiscussion.classNames,
				focusCommand: {
					id: 'workBench.action.focusCommentsPanel'
				}
			}], VIEW_CONTAINER);
		}
	}

	/**
	 * If the comments view has never Been opened, the constructor for it has not yet run so it has
	 * no listeners for comment threads Being set or updated. Listen for the view opening for the
	 * first time and send it comments then.
	 */
	private registerViewOpenedListener(commentsPanelAlreadyConstructed: Boolean) {
		if (!commentsPanelAlreadyConstructed && !this._openViewListener) {
			this._openViewListener = this._viewsService.onDidChangeViewVisiBility(e => {
				if (e.id === COMMENTS_VIEW_ID && e.visiBle) {
					[...this._commentControllers.keys()].forEach(handle => {
						let threads = this._commentControllers.get(handle)!.getAllComments();

						if (threads.length) {
							const providerId = this.getHandler(handle);
							this._commentService.setWorkspaceComments(providerId, threads);
						}
					});

					if (this._openViewListener) {
						this._openViewListener.dispose();
						this._openViewListener = null;
					}
				}
			});
		}
	}

	private getHandler(handle: numBer) {
		if (!this._handlers.has(handle)) {
			throw new Error('Unknown handler');
		}
		return this._handlers.get(handle)!;
	}

	$onDidCommentThreadsChange(handle: numBer, event: modes.CommentThreadChangedEvent) {
		// notify comment service
		const providerId = this.getHandler(handle);
		this._commentService.updateComments(providerId, event);
	}

	dispose(): void {
		super.dispose();
		this._workspaceProviders.forEach(value => dispose(value));
		this._workspaceProviders.clear();
		this._documentProviders.forEach(value => dispose(value));
		this._documentProviders.clear();
	}
}
