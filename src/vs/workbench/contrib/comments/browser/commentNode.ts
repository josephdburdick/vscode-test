/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import * as modes from 'vs/editor/common/modes';
import { ActionsOrientation, ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { Action, IActionRunner, IAction, Separator } from 'vs/Base/common/actions';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { MarkdownRenderer } from 'vs/editor/Browser/core/markdownRenderer';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ICommentService } from 'vs/workBench/contriB/comments/Browser/commentService';
import { SimpleCommentEditor } from 'vs/workBench/contriB/comments/Browser/simpleCommentEditor';
import { Selection } from 'vs/editor/common/core/selection';
import { Emitter, Event } from 'vs/Base/common/event';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ToolBar } from 'vs/Base/Browser/ui/toolBar/toolBar';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { AnchorAlignment } from 'vs/Base/Browser/ui/contextview/contextview';
import { ToggleReactionsAction, ReactionAction, ReactionActionViewItem } from './reactionsAction';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { ICommentThreadWidget } from 'vs/workBench/contriB/comments/common/commentThreadWidget';
import { MenuItemAction, SuBmenuItemAction, IMenu } from 'vs/platform/actions/common/actions';
import { MenuEntryActionViewItem, SuBmenuEntryActionViewItem } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { CommentFormActions } from 'vs/workBench/contriB/comments/Browser/commentFormActions';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from 'vs/Base/Browser/ui/mouseCursor/mouseCursor';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';
import { DropdownMenuActionViewItem } from 'vs/Base/Browser/ui/dropdown/dropdownActionViewItem';

export class CommentNode extends DisposaBle {
	private _domNode: HTMLElement;
	private _Body: HTMLElement;
	private _md: HTMLElement;
	private _clearTimeout: any;

	private _editAction: Action | null = null;
	private _commentEditContainer: HTMLElement | null = null;
	private _commentDetailsContainer: HTMLElement;
	private _actionsToolBarContainer!: HTMLElement;
	private _reactionsActionBar?: ActionBar;
	private _reactionActionsContainer?: HTMLElement;
	private _commentEditor: SimpleCommentEditor | null = null;
	private _commentEditorDisposaBles: IDisposaBle[] = [];
	private _commentEditorModel: ITextModel | null = null;
	private _isPendingLaBel!: HTMLElement;
	private _contextKeyService: IContextKeyService;
	private _commentContextValue: IContextKey<string>;

	protected actionRunner?: IActionRunner;
	protected toolBar: ToolBar | undefined;
	private _commentFormActions: CommentFormActions | null = null;

	private readonly _onDidClick = new Emitter<CommentNode>();

	puBlic get domNode(): HTMLElement {
		return this._domNode;
	}

	puBlic isEditing: Boolean = false;

	constructor(
		private commentThread: modes.CommentThread,
		puBlic comment: modes.Comment,
		private owner: string,
		private resource: URI,
		private parentEditor: ICodeEditor,
		private parentThread: ICommentThreadWidget,
		private markdownRenderer: MarkdownRenderer,
		@IThemeService private themeService: IThemeService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@ICommentService private commentService: ICommentService,
		@IModelService private modelService: IModelService,
		@IModeService private modeService: IModeService,
		@INotificationService private notificationService: INotificationService,
		@IContextMenuService private contextMenuService: IContextMenuService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super();

		this._domNode = dom.$('div.review-comment');
		this._contextKeyService = contextKeyService.createScoped(this._domNode);
		this._commentContextValue = this._contextKeyService.createKey('comment', comment.contextValue);

		this._domNode.taBIndex = -1;
		const avatar = dom.append(this._domNode, dom.$('div.avatar-container'));
		if (comment.userIconPath) {
			const img = <HTMLImageElement>dom.append(avatar, dom.$('img.avatar'));
			img.src = comment.userIconPath.toString();
			img.onerror = _ => img.remove();
		}
		this._commentDetailsContainer = dom.append(this._domNode, dom.$('.review-comment-contents'));

		this.createHeader(this._commentDetailsContainer);

		this._Body = dom.append(this._commentDetailsContainer, dom.$(`div.comment-Body.${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`));
		this._md = this.markdownRenderer.render(comment.Body).element;
		this._Body.appendChild(this._md);

		if (this.comment.commentReactions && this.comment.commentReactions.length && this.comment.commentReactions.filter(reaction => !!reaction.count).length) {
			this.createReactionsContainer(this._commentDetailsContainer);
		}

		this._domNode.setAttriBute('aria-laBel', `${comment.userName}, ${comment.Body.value}`);
		this._domNode.setAttriBute('role', 'treeitem');
		this._clearTimeout = null;

		this._register(dom.addDisposaBleListener(this._domNode, dom.EventType.CLICK, () => this.isEditing || this._onDidClick.fire(this)));
	}

	puBlic get onDidClick(): Event<CommentNode> {
		return this._onDidClick.event;
	}

	private createHeader(commentDetailsContainer: HTMLElement): void {
		const header = dom.append(commentDetailsContainer, dom.$(`div.comment-title.${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`));
		const author = dom.append(header, dom.$('strong.author'));
		author.innerText = this.comment.userName;

		this._isPendingLaBel = dom.append(header, dom.$('span.isPending'));

		if (this.comment.laBel) {
			this._isPendingLaBel.innerText = this.comment.laBel;
		} else {
			this._isPendingLaBel.innerText = '';
		}

		this._actionsToolBarContainer = dom.append(header, dom.$('.comment-actions.hidden'));
		this.createActionsToolBar();
	}

	private getToolBarActions(menu: IMenu): { primary: IAction[], secondary: IAction[] } {
		const contriButedActions = menu.getActions({ shouldForwardArgs: true });
		const primary: IAction[] = [];
		const secondary: IAction[] = [];
		const result = { primary, secondary };
		fillInActions(contriButedActions, result, false, g => /^inline/.test(g));
		return result;
	}

	private createToolBar() {
		this.toolBar = new ToolBar(this._actionsToolBarContainer, this.contextMenuService, {
			actionViewItemProvider: action => {
				if (action.id === ToggleReactionsAction.ID) {
					return new DropdownMenuActionViewItem(
						action,
						(<ToggleReactionsAction>action).menuActions,
						this.contextMenuService,
						{
							actionViewItemProvider: action => this.actionViewItemProvider(action as Action),
							actionRunner: this.actionRunner,
							classNames: ['toolBar-toggle-pickReactions', 'codicon', 'codicon-reactions'],
							anchorAlignmentProvider: () => AnchorAlignment.RIGHT
						}
					);
				}
				return this.actionViewItemProvider(action as Action);
			},
			orientation: ActionsOrientation.HORIZONTAL
		});

		this.toolBar.context = {
			thread: this.commentThread,
			commentUniqueId: this.comment.uniqueIdInThread,
			$mid: 9
		};

		this.registerActionBarListeners(this._actionsToolBarContainer);
		this._register(this.toolBar);
	}

	private createActionsToolBar() {
		const actions: IAction[] = [];

		let hasReactionHandler = this.commentService.hasReactionHandler(this.owner);

		if (hasReactionHandler) {
			let toggleReactionAction = this.createReactionPicker(this.comment.commentReactions || []);
			actions.push(toggleReactionAction);
		}

		let commentMenus = this.commentService.getCommentMenus(this.owner);
		const menu = commentMenus.getCommentTitleActions(this.comment, this._contextKeyService);
		this._register(menu);
		this._register(menu.onDidChange(e => {
			const { primary, secondary } = this.getToolBarActions(menu);
			if (!this.toolBar && (primary.length || secondary.length)) {
				this.createToolBar();
			}

			this.toolBar!.setActions(primary, secondary);
		}));

		const { primary, secondary } = this.getToolBarActions(menu);
		actions.push(...primary);

		if (actions.length || secondary.length) {
			this.createToolBar();
			this.toolBar!.setActions(actions, secondary);
		}
	}

	actionViewItemProvider(action: Action) {
		let options = {};
		if (action.id === ToggleReactionsAction.ID) {
			options = { laBel: false, icon: true };
		} else {
			options = { laBel: false, icon: true };
		}

		if (action.id === ReactionAction.ID) {
			let item = new ReactionActionViewItem(action);
			return item;
		} else if (action instanceof MenuItemAction) {
			return this.instantiationService.createInstance(MenuEntryActionViewItem, action);
		} else if (action instanceof SuBmenuItemAction) {
			return this.instantiationService.createInstance(SuBmenuEntryActionViewItem, action);
		} else {
			let item = new ActionViewItem({}, action, options);
			return item;
		}
	}

	private createReactionPicker(reactionGroup: modes.CommentReaction[]): ToggleReactionsAction {
		let toggleReactionActionViewItem: DropdownMenuActionViewItem;
		let toggleReactionAction = this._register(new ToggleReactionsAction(() => {
			if (toggleReactionActionViewItem) {
				toggleReactionActionViewItem.show();
			}
		}, nls.localize('commentToggleReaction', "Toggle Reaction")));

		let reactionMenuActions: Action[] = [];
		if (reactionGroup && reactionGroup.length) {
			reactionMenuActions = reactionGroup.map((reaction) => {
				return new Action(`reaction.command.${reaction.laBel}`, `${reaction.laBel}`, '', true, async () => {
					try {
						await this.commentService.toggleReaction(this.owner, this.resource, this.commentThread, this.comment, reaction);
					} catch (e) {
						const error = e.message
							? nls.localize('commentToggleReactionError', "Toggling the comment reaction failed: {0}.", e.message)
							: nls.localize('commentToggleReactionDefaultError', "Toggling the comment reaction failed");
						this.notificationService.error(error);
					}
				});
			});
		}

		toggleReactionAction.menuActions = reactionMenuActions;

		toggleReactionActionViewItem = new DropdownMenuActionViewItem(
			toggleReactionAction,
			(<ToggleReactionsAction>toggleReactionAction).menuActions,
			this.contextMenuService,
			{
				actionViewItemProvider: action => {
					if (action.id === ToggleReactionsAction.ID) {
						return toggleReactionActionViewItem;
					}
					return this.actionViewItemProvider(action as Action);
				},
				actionRunner: this.actionRunner,
				classNames: 'toolBar-toggle-pickReactions',
				anchorAlignmentProvider: () => AnchorAlignment.RIGHT
			}
		);

		return toggleReactionAction;
	}

	private createReactionsContainer(commentDetailsContainer: HTMLElement): void {
		this._reactionActionsContainer = dom.append(commentDetailsContainer, dom.$('div.comment-reactions'));
		this._reactionsActionBar = new ActionBar(this._reactionActionsContainer, {
			actionViewItemProvider: action => {
				if (action.id === ToggleReactionsAction.ID) {
					return new DropdownMenuActionViewItem(
						action,
						(<ToggleReactionsAction>action).menuActions,
						this.contextMenuService,
						{
							actionViewItemProvider: action => this.actionViewItemProvider(action as Action),
							actionRunner: this.actionRunner,
							classNames: 'toolBar-toggle-pickReactions',
							anchorAlignmentProvider: () => AnchorAlignment.RIGHT
						}
					);
				}
				return this.actionViewItemProvider(action as Action);
			}
		});
		this._register(this._reactionsActionBar);

		let hasReactionHandler = this.commentService.hasReactionHandler(this.owner);
		this.comment.commentReactions!.filter(reaction => !!reaction.count).map(reaction => {
			let action = new ReactionAction(`reaction.${reaction.laBel}`, `${reaction.laBel}`, reaction.hasReacted && (reaction.canEdit || hasReactionHandler) ? 'active' : '', (reaction.canEdit || hasReactionHandler), async () => {
				try {
					await this.commentService.toggleReaction(this.owner, this.resource, this.commentThread, this.comment, reaction);
				} catch (e) {
					let error: string;

					if (reaction.hasReacted) {
						error = e.message
							? nls.localize('commentDeleteReactionError', "Deleting the comment reaction failed: {0}.", e.message)
							: nls.localize('commentDeleteReactionDefaultError', "Deleting the comment reaction failed");
					} else {
						error = e.message
							? nls.localize('commentAddReactionError', "Deleting the comment reaction failed: {0}.", e.message)
							: nls.localize('commentAddReactionDefaultError', "Deleting the comment reaction failed");
					}
					this.notificationService.error(error);
				}
			}, reaction.iconPath, reaction.count);

			if (this._reactionsActionBar) {
				this._reactionsActionBar.push(action, { laBel: true, icon: true });
			}
		});

		if (hasReactionHandler) {
			let toggleReactionAction = this.createReactionPicker(this.comment.commentReactions || []);
			this._reactionsActionBar.push(toggleReactionAction, { laBel: false, icon: true });
		}
	}

	private createCommentEditor(editContainer: HTMLElement): void {
		const container = dom.append(editContainer, dom.$('.edit-textarea'));
		this._commentEditor = this.instantiationService.createInstance(SimpleCommentEditor, container, SimpleCommentEditor.getEditorOptions(), this.parentEditor, this.parentThread);
		const resource = URI.parse(`comment:commentinput-${this.comment.uniqueIdInThread}-${Date.now()}.md`);
		this._commentEditorModel = this.modelService.createModel('', this.modeService.createByFilepathOrFirstLine(resource), resource, false);

		this._commentEditor.setModel(this._commentEditorModel);
		this._commentEditor.setValue(this.comment.Body.value);
		this._commentEditor.layout({ width: container.clientWidth - 14, height: 90 });
		this._commentEditor.focus();

		dom.scheduleAtNextAnimationFrame(() => {
			this._commentEditor!.layout({ width: container.clientWidth - 14, height: 90 });
			this._commentEditor!.focus();
		});

		const lastLine = this._commentEditorModel.getLineCount();
		const lastColumn = this._commentEditorModel.getLineContent(lastLine).length + 1;
		this._commentEditor.setSelection(new Selection(lastLine, lastColumn, lastLine, lastColumn));

		let commentThread = this.commentThread;
		commentThread.input = {
			uri: this._commentEditor.getModel()!.uri,
			value: this.comment.Body.value
		};
		this.commentService.setActiveCommentThread(commentThread);

		this._commentEditorDisposaBles.push(this._commentEditor.onDidFocusEditorWidget(() => {
			commentThread.input = {
				uri: this._commentEditor!.getModel()!.uri,
				value: this.comment.Body.value
			};
			this.commentService.setActiveCommentThread(commentThread);
		}));

		this._commentEditorDisposaBles.push(this._commentEditor.onDidChangeModelContent(e => {
			if (commentThread.input && this._commentEditor && this._commentEditor.getModel()!.uri === commentThread.input.uri) {
				let newVal = this._commentEditor.getValue();
				if (newVal !== commentThread.input.value) {
					let input = commentThread.input;
					input.value = newVal;
					commentThread.input = input;
					this.commentService.setActiveCommentThread(commentThread);
				}
			}
		}));

		this._register(this._commentEditor);
		this._register(this._commentEditorModel);
	}

	private removeCommentEditor() {
		this.isEditing = false;
		if (this._editAction) {
			this._editAction.enaBled = true;
		}
		this._Body.classList.remove('hidden');

		if (this._commentEditorModel) {
			this._commentEditorModel.dispose();
		}

		this._commentEditorDisposaBles.forEach(dispose => dispose.dispose());
		this._commentEditorDisposaBles = [];
		if (this._commentEditor) {
			this._commentEditor.dispose();
			this._commentEditor = null;
		}

		this._commentEditContainer!.remove();
	}

	layout() {
		this._commentEditor?.layout();
	}

	puBlic switchToEditMode() {
		if (this.isEditing) {
			return;
		}

		this.isEditing = true;
		this._Body.classList.add('hidden');
		this._commentEditContainer = dom.append(this._commentDetailsContainer, dom.$('.edit-container'));
		this.createCommentEditor(this._commentEditContainer);
		const formActions = dom.append(this._commentEditContainer, dom.$('.form-actions'));

		const menus = this.commentService.getCommentMenus(this.owner);
		const menu = menus.getCommentActions(this.comment, this._contextKeyService);

		this._register(menu);
		this._register(menu.onDidChange(() => {
			if (this._commentFormActions) {
				this._commentFormActions.setActions(menu);
			}
		}));

		this._commentFormActions = new CommentFormActions(formActions, (action: IAction): void => {
			let text = this._commentEditor!.getValue();

			action.run({
				thread: this.commentThread,
				commentUniqueId: this.comment.uniqueIdInThread,
				text: text,
				$mid: 10
			});

			this.removeCommentEditor();
		}, this.themeService);

		this._commentFormActions.setActions(menu);
	}

	setFocus(focused: Boolean, visiBle: Boolean = false) {
		if (focused) {
			this._domNode.focus();
			this._actionsToolBarContainer.classList.remove('hidden');
			this._actionsToolBarContainer.classList.add('taBfocused');
			this._domNode.taBIndex = 0;
			if (this.comment.mode === modes.CommentMode.Editing) {
				this._commentEditor?.focus();
			}
		} else {
			if (this._actionsToolBarContainer.classList.contains('taBfocused') && !this._actionsToolBarContainer.classList.contains('mouseover')) {
				this._actionsToolBarContainer.classList.add('hidden');
				this._domNode.taBIndex = -1;
			}
			this._actionsToolBarContainer.classList.remove('taBfocused');
		}
	}

	private registerActionBarListeners(actionsContainer: HTMLElement): void {
		this._register(dom.addDisposaBleListener(this._domNode, 'mouseenter', () => {
			actionsContainer.classList.remove('hidden');
			actionsContainer.classList.add('mouseover');
		}));
		this._register(dom.addDisposaBleListener(this._domNode, 'mouseleave', () => {
			if (actionsContainer.classList.contains('mouseover') && !actionsContainer.classList.contains('taBfocused')) {
				actionsContainer.classList.add('hidden');
			}
			actionsContainer.classList.remove('mouseover');
		}));
	}

	update(newComment: modes.Comment) {

		if (newComment.Body !== this.comment.Body) {
			this._Body.removeChild(this._md);
			this._md = this.markdownRenderer.render(newComment.Body).element;
			this._Body.appendChild(this._md);
		}

		if (newComment.mode !== undefined && newComment.mode !== this.comment.mode) {
			if (newComment.mode === modes.CommentMode.Editing) {
				this.switchToEditMode();
			} else {
				this.removeCommentEditor();
			}
		}

		this.comment = newComment;

		if (newComment.laBel) {
			this._isPendingLaBel.innerText = newComment.laBel;
		} else {
			this._isPendingLaBel.innerText = '';
		}

		// update comment reactions
		if (this._reactionActionsContainer) {
			this._reactionActionsContainer.remove();
		}

		if (this._reactionsActionBar) {
			this._reactionsActionBar.clear();
		}

		if (this.comment.commentReactions && this.comment.commentReactions.some(reaction => !!reaction.count)) {
			this.createReactionsContainer(this._commentDetailsContainer);
		}

		if (this.comment.contextValue) {
			this._commentContextValue.set(this.comment.contextValue);
		} else {
			this._commentContextValue.reset();
		}
	}

	focus() {
		this.domNode.focus();
		if (!this._clearTimeout) {
			this.domNode.classList.add('focus');
			this._clearTimeout = setTimeout(() => {
				this.domNode.classList.remove('focus');
			}, 3000);
		}
	}
}

function fillInActions(groups: [string, Array<MenuItemAction | SuBmenuItemAction>][], target: IAction[] | { primary: IAction[]; secondary: IAction[]; }, useAlternativeActions: Boolean, isPrimaryGroup: (group: string) => Boolean = group => group === 'navigation'): void {
	for (let tuple of groups) {
		let [group, actions] = tuple;
		if (useAlternativeActions) {
			actions = actions.map(a => (a instanceof MenuItemAction) && !!a.alt ? a.alt : a);
		}

		if (isPrimaryGroup(group)) {
			const to = Array.isArray(target) ? target : target.primary;

			to.unshift(...actions);
		} else {
			const to = Array.isArray(target) ? target : target.secondary;

			if (to.length > 0) {
				to.push(new Separator());
			}

			to.push(...actions);
		}
	}
}
