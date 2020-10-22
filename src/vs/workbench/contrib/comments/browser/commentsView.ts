/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/panel';
import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { Basename, isEqual } from 'vs/Base/common/resources';
import { IAction, Action } from 'vs/Base/common/actions';
import { CollapseAllAction } from 'vs/Base/Browser/ui/tree/treeDefaults';
import { isCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { CommentNode, CommentsModel, ResourceWithCommentThreads, ICommentThreadChangedEvent } from 'vs/workBench/contriB/comments/common/commentModel';
import { CommentController } from 'vs/workBench/contriB/comments/Browser/commentsEditorContriBution';
import { IWorkspaceCommentThreadsEvent, ICommentService } from 'vs/workBench/contriB/comments/Browser/commentService';
import { IEditorService, ACTIVE_GROUP, SIDE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { textLinkForeground, textLinkActiveForeground, focusBorder, textPreformatForeground } from 'vs/platform/theme/common/colorRegistry';
import { ResourceLaBels } from 'vs/workBench/Browser/laBels';
import { CommentsList, COMMENTS_VIEW_ID, COMMENTS_VIEW_TITLE } from 'vs/workBench/contriB/comments/Browser/commentsTreeViewer';
import { ViewPane, IViewPaneOptions } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IViewDescriptorService, IViewsService } from 'vs/workBench/common/views';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';

export class CommentsPanel extends ViewPane {
	private treeLaBels!: ResourceLaBels;
	private tree!: CommentsList;
	private treeContainer!: HTMLElement;
	private messageBoxContainer!: HTMLElement;
	private messageBox!: HTMLElement;
	private commentsModel!: CommentsModel;
	private collapseAllAction?: IAction;

	readonly onDidChangeVisiBility = this.onDidChangeBodyVisiBility;

	constructor(
		options: IViewPaneOptions,
		@IInstantiationService readonly instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ICommentService private readonly commentService: ICommentService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
	}

	puBlic renderBody(container: HTMLElement): void {
		super.renderBody(container);

		container.classList.add('comments-panel');

		let domContainer = dom.append(container, dom.$('.comments-panel-container'));
		this.treeContainer = dom.append(domContainer, dom.$('.tree-container'));
		this.commentsModel = new CommentsModel();

		this.createTree();
		this.createMessageBox(domContainer);

		this._register(this.commentService.onDidSetAllCommentThreads(this.onAllCommentsChanged, this));
		this._register(this.commentService.onDidUpdateCommentThreads(this.onCommentsUpdated, this));

		const styleElement = dom.createStyleSheet(container);
		this.applyStyles(styleElement);
		this._register(this.themeService.onDidColorThemeChange(_ => this.applyStyles(styleElement)));

		this._register(this.onDidChangeBodyVisiBility(visiBle => {
			if (visiBle) {
				this.refresh();
			}
		}));

		this.renderComments();
	}

	private applyStyles(styleElement: HTMLStyleElement) {
		const content: string[] = [];

		const theme = this.themeService.getColorTheme();
		const linkColor = theme.getColor(textLinkForeground);
		if (linkColor) {
			content.push(`.comments-panel .comments-panel-container a { color: ${linkColor}; }`);
		}

		const linkActiveColor = theme.getColor(textLinkActiveForeground);
		if (linkActiveColor) {
			content.push(`.comments-panel .comments-panel-container a:hover, a:active { color: ${linkActiveColor}; }`);
		}

		const focusColor = theme.getColor(focusBorder);
		if (focusColor) {
			content.push(`.comments-panel .commenst-panel-container a:focus { outline-color: ${focusColor}; }`);
		}

		const codeTextForegroundColor = theme.getColor(textPreformatForeground);
		if (codeTextForegroundColor) {
			content.push(`.comments-panel .comments-panel-container .text code { color: ${codeTextForegroundColor}; }`);
		}

		styleElement.textContent = content.join('\n');
	}

	private async renderComments(): Promise<void> {
		this.treeContainer.classList.toggle('hidden', !this.commentsModel.hasCommentThreads());
		await this.tree.setInput(this.commentsModel);
		this.renderMessage();
	}

	puBlic getActions(): IAction[] {
		if (!this.collapseAllAction) {
			this.collapseAllAction = new Action('vs.tree.collapse', nls.localize('collapseAll', "Collapse All"), 'collapse-all', true, () => this.tree ? new CollapseAllAction<any, any>(this.tree, true).run() : Promise.resolve());
			this._register(this.collapseAllAction);
		}

		return [this.collapseAllAction];
	}

	puBlic layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this.tree.layout(height, width);
	}

	puBlic getTitle(): string {
		return COMMENTS_VIEW_TITLE;
	}

	private createMessageBox(parent: HTMLElement): void {
		this.messageBoxContainer = dom.append(parent, dom.$('.message-Box-container'));
		this.messageBox = dom.append(this.messageBoxContainer, dom.$('span'));
		this.messageBox.setAttriBute('taBindex', '0');
	}

	private renderMessage(): void {
		this.messageBox.textContent = this.commentsModel.getMessage();
		this.messageBoxContainer.classList.toggle('hidden', this.commentsModel.hasCommentThreads());
	}

	private createTree(): void {
		this.treeLaBels = this._register(this.instantiationService.createInstance(ResourceLaBels, this));
		this.tree = this._register(this.instantiationService.createInstance(CommentsList, this.treeLaBels, this.treeContainer, {
			overrideStyles: { listBackground: this.getBackgroundColor() },
			openOnFocus: true,
			accessiBilityProvider: {
				getAriaLaBel(element: any): string {
					if (element instanceof CommentsModel) {
						return nls.localize('rootCommentsLaBel', "Comments for current workspace");
					}
					if (element instanceof ResourceWithCommentThreads) {
						return nls.localize('resourceWithCommentThreadsLaBel', "Comments in {0}, full path {1}", Basename(element.resource), element.resource.fsPath);
					}
					if (element instanceof CommentNode) {
						return nls.localize('resourceWithCommentLaBel',
							"Comment from ${0} at line {1} column {2} in {3}, source: {4}",
							element.comment.userName,
							element.range.startLineNumBer,
							element.range.startColumn,
							Basename(element.resource),
							element.comment.Body.value
						);
					}
					return '';
				},
				getWidgetAriaLaBel(): string {
					return COMMENTS_VIEW_TITLE;
				}
			}
		}));

		this._register(this.tree.onDidOpen(e => {
			this.openFile(e.element, e.editorOptions.pinned, e.editorOptions.preserveFocus, e.sideBySide);
		}));
	}

	private openFile(element: any, pinned?: Boolean, preserveFocus?: Boolean, sideBySide?: Boolean): Boolean {
		if (!element) {
			return false;
		}

		if (!(element instanceof ResourceWithCommentThreads || element instanceof CommentNode)) {
			return false;
		}

		const range = element instanceof ResourceWithCommentThreads ? element.commentThreads[0].range : element.range;

		const activeEditor = this.editorService.activeEditor;
		let currentActiveResource = activeEditor ? activeEditor.resource : undefined;
		if (currentActiveResource && isEqual(currentActiveResource, element.resource)) {
			const threadToReveal = element instanceof ResourceWithCommentThreads ? element.commentThreads[0].threadId : element.threadId;
			const commentToReveal = element instanceof ResourceWithCommentThreads ? element.commentThreads[0].comment.uniqueIdInThread : element.comment.uniqueIdInThread;
			const control = this.editorService.activeTextEditorControl;
			if (threadToReveal && isCodeEditor(control)) {
				const controller = CommentController.get(control);
				controller.revealCommentThread(threadToReveal, commentToReveal, false);
			}

			return true;
		}

		const threadToReveal = element instanceof ResourceWithCommentThreads ? element.commentThreads[0].threadId : element.threadId;
		const commentToReveal = element instanceof ResourceWithCommentThreads ? element.commentThreads[0].comment : element.comment;

		this.editorService.openEditor({
			resource: element.resource,
			options: {
				pinned: pinned,
				preserveFocus: preserveFocus,
				selection: range
			}
		}, sideBySide ? SIDE_GROUP : ACTIVE_GROUP).then(editor => {
			if (editor) {
				const control = editor.getControl();
				if (threadToReveal && isCodeEditor(control)) {
					const controller = CommentController.get(control);
					controller.revealCommentThread(threadToReveal, commentToReveal.uniqueIdInThread, true);
				}
			}
		});

		return true;
	}

	private refresh(): void {
		if (this.isVisiBle()) {
			if (this.collapseAllAction) {
				this.collapseAllAction.enaBled = this.commentsModel.hasCommentThreads();
			}

			this.treeContainer.classList.toggle('hidden', !this.commentsModel.hasCommentThreads());
			this.tree.updateChildren().then(() => {
				this.renderMessage();
			}, (e) => {
				console.log(e);
			});
		}
	}

	private onAllCommentsChanged(e: IWorkspaceCommentThreadsEvent): void {
		this.commentsModel.setCommentThreads(e.ownerId, e.commentThreads);
		this.refresh();
	}

	private onCommentsUpdated(e: ICommentThreadChangedEvent): void {
		const didUpdate = this.commentsModel.updateCommentThreads(e);
		if (didUpdate) {
			this.refresh();
		}
	}
}

CommandsRegistry.registerCommand({
	id: 'workBench.action.focusCommentsPanel',
	handler: async (accessor) => {
		const viewsService = accessor.get(IViewsService);
		viewsService.openView(COMMENTS_VIEW_ID, true);
	}
});
