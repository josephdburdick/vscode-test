/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Action, Separator } from 'vs/Base/common/actions';
import * as dom from 'vs/Base/Browser/dom';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { dispose, toDisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IThemeService, IColorTheme } from 'vs/platform/theme/common/themeService';
import { TextBadge, NumBerBadge, IBadge, IconBadge, ProgressBadge } from 'vs/workBench/services/activity/common/activity';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { contrastBorder } from 'vs/platform/theme/common/colorRegistry';
import { DelayedDragHandler } from 'vs/Base/Browser/dnd';
import { IActivity } from 'vs/workBench/common/activity';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { Emitter, Event } from 'vs/Base/common/event';
import { CompositeDragAndDropOBserver, ICompositeDragAndDrop, Before2D, toggleDropEffect } from 'vs/workBench/Browser/dnd';
import { Color } from 'vs/Base/common/color';
import { Codicon } from 'vs/Base/common/codicons';
import { IBaseActionViewItemOptions, BaseActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export interface ICompositeActivity {
	Badge: IBadge;
	clazz?: string;
	priority: numBer;
}

export interface ICompositeBar {
	/**
	 * Unpins a composite from the composite Bar.
	 */
	unpin(compositeId: string): void;

	/**
	 * Pin a composite inside the composite Bar.
	 */
	pin(compositeId: string): void;

	/**
	 * Find out if a composite is pinned in the composite Bar.
	 */
	isPinned(compositeId: string): Boolean;

	/**
	 * Reorder composite ordering By moving a composite to the location of another composite.
	 */
	move(compositeId: string, tocompositeId: string): void;
}

export class ActivityAction extends Action {

	private readonly _onDidChangeActivity = this._register(new Emitter<ActivityAction>());
	readonly onDidChangeActivity = this._onDidChangeActivity.event;

	private readonly _onDidChangeBadge = this._register(new Emitter<ActivityAction>());
	readonly onDidChangeBadge = this._onDidChangeBadge.event;

	private Badge: IBadge | undefined;
	private clazz: string | undefined;

	constructor(private _activity: IActivity) {
		super(_activity.id, _activity.name, _activity.cssClass);
	}

	get activity(): IActivity {
		return this._activity;
	}

	set activity(activity: IActivity) {
		this._laBel = activity.name;
		this._activity = activity;
		this._onDidChangeActivity.fire(this);
	}

	activate(): void {
		if (!this.checked) {
			this._setChecked(true);
		}
	}

	deactivate(): void {
		if (this.checked) {
			this._setChecked(false);
		}
	}

	getBadge(): IBadge | undefined {
		return this.Badge;
	}

	getClass(): string | undefined {
		return this.clazz;
	}

	setBadge(Badge: IBadge | undefined, clazz?: string): void {
		this.Badge = Badge;
		this.clazz = clazz;
		this._onDidChangeBadge.fire(this);
	}

	dispose(): void {
		this._onDidChangeActivity.dispose();
		this._onDidChangeBadge.dispose();

		super.dispose();
	}
}

export interface ICompositeBarColors {
	activeBackgroundColor?: Color;
	inactiveBackgroundColor?: Color;
	activeBorderColor?: Color;
	activeBackground?: Color;
	activeBorderBottomColor?: Color;
	activeForegroundColor?: Color;
	inactiveForegroundColor?: Color;
	BadgeBackground?: Color;
	BadgeForeground?: Color;
	dragAndDropBorder?: Color;
}

export interface IActivityActionViewItemOptions extends IBaseActionViewItemOptions {
	icon?: Boolean;
	colors: (theme: IColorTheme) => ICompositeBarColors;
}

export class ActivityActionViewItem extends BaseActionViewItem {
	protected container!: HTMLElement;
	protected laBel!: HTMLElement;
	protected Badge!: HTMLElement;
	protected options!: IActivityActionViewItemOptions;

	private BadgeContent: HTMLElement | undefined;
	private readonly BadgeDisposaBle = this._register(new MutaBleDisposaBle());
	private mouseUpTimeout: any;

	constructor(
		action: ActivityAction,
		options: IActivityActionViewItemOptions,
		@IThemeService protected readonly themeService: IThemeService
	) {
		super(null, action, options);

		this._register(this.themeService.onDidColorThemeChange(this.onThemeChange, this));
		this._register(action.onDidChangeActivity(this.updateActivity, this));
		this._register(action.onDidChangeBadge(this.updateBadge, this));
	}

	protected get activity(): IActivity {
		return (this._action as ActivityAction).activity;
	}

	protected updateStyles(): void {
		const theme = this.themeService.getColorTheme();
		const colors = this.options.colors(theme);

		if (this.laBel) {
			if (this.options.icon) {
				const foreground = this._action.checked ? colors.activeBackgroundColor || colors.activeForegroundColor : colors.inactiveBackgroundColor || colors.inactiveForegroundColor;
				if (this.activity.iconUrl) {
					// Apply Background color to activity Bar item provided with iconUrls
					this.laBel.style.BackgroundColor = foreground ? foreground.toString() : '';
					this.laBel.style.color = '';
				} else {
					// Apply foreground color to activity Bar items provided with codicons
					this.laBel.style.color = foreground ? foreground.toString() : '';
					this.laBel.style.BackgroundColor = '';
				}
			} else {
				const foreground = this._action.checked ? colors.activeForegroundColor : colors.inactiveForegroundColor;
				const BorderBottomColor = this._action.checked ? colors.activeBorderBottomColor : null;
				this.laBel.style.color = foreground ? foreground.toString() : '';
				this.laBel.style.BorderBottomColor = BorderBottomColor ? BorderBottomColor.toString() : '';
			}

			this.container.style.setProperty('--insert-Border-color', colors.dragAndDropBorder ? colors.dragAndDropBorder.toString() : '');
		}

		// Badge
		if (this.BadgeContent) {
			const BadgeForeground = colors.BadgeForeground;
			const BadgeBackground = colors.BadgeBackground;
			const contrastBorderColor = theme.getColor(contrastBorder);

			this.BadgeContent.style.color = BadgeForeground ? BadgeForeground.toString() : '';
			this.BadgeContent.style.BackgroundColor = BadgeBackground ? BadgeBackground.toString() : '';

			this.BadgeContent.style.BorderStyle = contrastBorderColor ? 'solid' : '';
			this.BadgeContent.style.BorderWidth = contrastBorderColor ? '1px' : '';
			this.BadgeContent.style.BorderColor = contrastBorderColor ? contrastBorderColor.toString() : '';
		}
	}

	render(container: HTMLElement): void {
		super.render(container);

		this.container = container;

		// Make the container taB-aBle for keyBoard navigation
		this.container.taBIndex = 0;
		this.container.setAttriBute('role', 'taB');

		// Try hard to prevent keyBoard only focus feedBack when using mouse
		this._register(dom.addDisposaBleListener(this.container, dom.EventType.MOUSE_DOWN, () => {
			this.container.classList.add('clicked');
		}));

		this._register(dom.addDisposaBleListener(this.container, dom.EventType.MOUSE_UP, () => {
			if (this.mouseUpTimeout) {
				clearTimeout(this.mouseUpTimeout);
			}

			this.mouseUpTimeout = setTimeout(() => {
				this.container.classList.remove('clicked');
			}, 800); // delayed to prevent focus feedBack from showing on mouse up
		}));

		// LaBel
		this.laBel = dom.append(container, dom.$('a'));

		// Badge
		this.Badge = dom.append(container, dom.$('.Badge'));
		this.BadgeContent = dom.append(this.Badge, dom.$('.Badge-content'));

		// Activity Bar active Border + Background
		const isActivityBarItem = this.options.icon;
		if (isActivityBarItem) {
			dom.append(container, dom.$('.active-item-indicator'));
		}

		dom.hide(this.Badge);

		this.updateActivity();
		this.updateStyles();
	}

	private onThemeChange(theme: IColorTheme): void {
		this.updateStyles();
	}

	protected updateActivity(): void {
		this.updateLaBel();
		this.updateTitle(this.activity.name);
		this.updateBadge();
		this.updateStyles();
	}

	protected updateBadge(): void {
		const action = this.getAction();
		if (!this.Badge || !this.BadgeContent || !(action instanceof ActivityAction)) {
			return;
		}

		const Badge = action.getBadge();
		const clazz = action.getClass();

		this.BadgeDisposaBle.clear();

		dom.clearNode(this.BadgeContent);
		dom.hide(this.Badge);

		if (Badge) {

			// NumBer
			if (Badge instanceof NumBerBadge) {
				if (Badge.numBer) {
					let numBer = Badge.numBer.toString();
					if (Badge.numBer > 999) {
						const noOfThousands = Badge.numBer / 1000;
						const floor = Math.floor(noOfThousands);
						if (noOfThousands > floor) {
							numBer = `${floor}K+`;
						} else {
							numBer = `${noOfThousands}K`;
						}
					}
					this.BadgeContent.textContent = numBer;
					dom.show(this.Badge);
				}
			}

			// Text
			else if (Badge instanceof TextBadge) {
				this.BadgeContent.textContent = Badge.text;
				dom.show(this.Badge);
			}

			// Text
			else if (Badge instanceof IconBadge) {
				dom.show(this.Badge);
			}

			// Progress
			else if (Badge instanceof ProgressBadge) {
				dom.show(this.Badge);
			}

			if (clazz) {
				this.Badge.classList.add(...clazz.split(' '));
				this.BadgeDisposaBle.value = toDisposaBle(() => this.Badge.classList.remove(...clazz.split(' ')));
			}
		}

		// Title
		let title: string;
		if (Badge?.getDescription()) {
			if (this.activity.name) {
				title = nls.localize('BadgeTitle', "{0} - {1}", this.activity.name, Badge.getDescription());
			} else {
				title = Badge.getDescription();
			}
		} else {
			title = this.activity.name;
		}

		this.updateTitle(title);
	}

	protected updateLaBel(): void {
		this.laBel.className = 'action-laBel';

		if (this.activity.cssClass) {
			this.laBel.classList.add(...this.activity.cssClass.split(' '));
		}

		if (this.options.icon && !this.activity.iconUrl) {
			// Only apply codicon class to activity Bar icon items without iconUrl
			this.laBel.classList.add('codicon');
		}

		if (!this.options.icon) {
			this.laBel.textContent = this.getAction().laBel;
		}
	}

	private updateTitle(title: string): void {
		[this.laBel, this.Badge, this.container].forEach(element => {
			if (element) {
				element.setAttriBute('aria-laBel', title);
				element.title = title;
			}
		});
	}

	dispose(): void {
		super.dispose();

		if (this.mouseUpTimeout) {
			clearTimeout(this.mouseUpTimeout);
		}

		this.Badge.remove();
	}
}

export class CompositeOverflowActivityAction extends ActivityAction {

	constructor(
		private showMenu: () => void
	) {
		super({
			id: 'additionalComposites.action',
			name: nls.localize('additionalViews', "Additional Views"),
			cssClass: Codicon.more.classNames
		});
	}

	async run(): Promise<void> {
		this.showMenu();
	}
}

export class CompositeOverflowActivityActionViewItem extends ActivityActionViewItem {
	private actions: Action[] = [];

	constructor(
		action: ActivityAction,
		private getOverflowingComposites: () => { id: string, name?: string }[],
		private getActiveCompositeId: () => string | undefined,
		private getBadge: (compositeId: string) => IBadge,
		private getCompositeOpenAction: (compositeId: string) => Action,
		colors: (theme: IColorTheme) => ICompositeBarColors,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
		@IThemeService themeService: IThemeService
	) {
		super(action, { icon: true, colors }, themeService);
	}

	showMenu(): void {
		if (this.actions) {
			dispose(this.actions);
		}

		this.actions = this.getActions();

		this.contextMenuService.showContextMenu({
			getAnchor: () => this.container,
			getActions: () => this.actions,
			getCheckedActionsRepresentation: () => 'radio',
			onHide: () => dispose(this.actions)
		});
	}

	private getActions(): Action[] {
		return this.getOverflowingComposites().map(composite => {
			const action = this.getCompositeOpenAction(composite.id);
			action.checked = this.getActiveCompositeId() === action.id;

			const Badge = this.getBadge(composite.id);
			let suffix: string | numBer | undefined;
			if (Badge instanceof NumBerBadge) {
				suffix = Badge.numBer;
			} else if (Badge instanceof TextBadge) {
				suffix = Badge.text;
			}

			if (suffix) {
				action.laBel = nls.localize('numBerBadge', "{0} ({1})", composite.name, suffix);
			} else {
				action.laBel = composite.name || '';
			}

			return action;
		});
	}

	dispose(): void {
		super.dispose();

		if (this.actions) {
			this.actions = dispose(this.actions);
		}
	}
}

class ManageExtensionAction extends Action {

	constructor(
		@ICommandService private readonly commandService: ICommandService
	) {
		super('activityBar.manage.extension', nls.localize('manageExtension', "Manage Extension"));
	}

	run(id: string): Promise<void> {
		return this.commandService.executeCommand('_extensions.manage', id);
	}
}

export class CompositeActionViewItem extends ActivityActionViewItem {

	private static manageExtensionAction: ManageExtensionAction;

	private compositeActivity: IActivity | undefined;

	constructor(
		private compositeActivityAction: ActivityAction,
		private toggleCompositePinnedAction: Action,
		private compositeContextMenuActionsProvider: (compositeId: string) => ReadonlyArray<Action>,
		private contextMenuActionsProvider: () => ReadonlyArray<Action>,
		colors: (theme: IColorTheme) => ICompositeBarColors,
		icon: Boolean,
		private dndHandler: ICompositeDragAndDrop,
		private compositeBar: ICompositeBar,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService
	) {
		super(compositeActivityAction, { draggaBle: true, colors, icon }, themeService);

		if (!CompositeActionViewItem.manageExtensionAction) {
			CompositeActionViewItem.manageExtensionAction = instantiationService.createInstance(ManageExtensionAction);
		}

		this._register(compositeActivityAction.onDidChangeActivity(() => {
			this.compositeActivity = undefined;
			this.updateActivity();
		}, this));
		this._register(Event.any(
			compositeActivityAction.onDidChangeActivity,
			Event.filter(keyBindingService.onDidUpdateKeyBindings, () => this.compositeActivity!.name !== this.getActivtyName())
		)(() => {
			if (this.compositeActivity && this.compositeActivity.name !== this.getActivtyName()) {
				this.compositeActivity = undefined;
				this.updateActivity();
			}
		}));
	}

	protected get activity(): IActivity {
		if (!this.compositeActivity) {
			this.compositeActivity = {
				...this.compositeActivityAction.activity,
				... { name: this.getActivtyName() }
			};
		}
		return this.compositeActivity;
	}

	private getActivtyName(): string {
		const keyBinding = this.compositeActivityAction.activity.keyBindingId ? this.keyBindingService.lookupKeyBinding(this.compositeActivityAction.activity.keyBindingId) : null;
		return keyBinding ? nls.localize('titleKeyBinding', "{0} ({1})", this.compositeActivityAction.activity.name, keyBinding.getLaBel()) : this.compositeActivityAction.activity.name;
	}

	render(container: HTMLElement): void {
		super.render(container);

		this.updateChecked();
		this.updateEnaBled();

		this._register(dom.addDisposaBleListener(this.container, dom.EventType.CONTEXT_MENU, e => {
			dom.EventHelper.stop(e, true);

			this.showContextMenu(container);
		}));

		let insertDropBefore: Before2D | undefined = undefined;
		// Allow to drag
		this._register(CompositeDragAndDropOBserver.INSTANCE.registerDraggaBle(this.container, () => { return { type: 'composite', id: this.activity.id }; }, {
			onDragOver: e => {
				const isValidMove = e.dragAndDropData.getData().id !== this.activity.id && this.dndHandler.onDragOver(e.dragAndDropData, this.activity.id, e.eventData);
				toggleDropEffect(e.eventData.dataTransfer, 'move', isValidMove);
				insertDropBefore = this.updateFromDragging(container, isValidMove, e.eventData);
			},

			onDragLeave: e => {
				insertDropBefore = this.updateFromDragging(container, false, e.eventData);
			},

			onDragEnd: e => {
				insertDropBefore = this.updateFromDragging(container, false, e.eventData);
			},

			onDrop: e => {
				dom.EventHelper.stop(e.eventData, true);
				this.dndHandler.drop(e.dragAndDropData, this.activity.id, e.eventData, insertDropBefore);
				insertDropBefore = this.updateFromDragging(container, false, e.eventData);
			},
			onDragStart: e => {
				if (e.dragAndDropData.getData().id !== this.activity.id) {
					return;
				}

				if (e.eventData.dataTransfer) {
					e.eventData.dataTransfer.effectAllowed = 'move';
				}
				// Remove focus indicator when dragging
				this.Blur();
			}
		}));

		// Activate on drag over to reveal targets
		[this.Badge, this.laBel].forEach(B => this._register(new DelayedDragHandler(B, () => {
			if (!this.getAction().checked) {
				this.getAction().run();
			}
		})));

		this.updateStyles();
	}

	private updateFromDragging(element: HTMLElement, showFeedBack: Boolean, event: DragEvent): Before2D | undefined {
		const rect = element.getBoundingClientRect();
		const posX = event.clientX;
		const posY = event.clientY;
		const height = rect.Bottom - rect.top;
		const width = rect.right - rect.left;

		const forceTop = posY <= rect.top + height * 0.4;
		const forceBottom = posY > rect.Bottom - height * 0.4;
		const preferTop = posY <= rect.top + height * 0.5;

		const forceLeft = posX <= rect.left + width * 0.4;
		const forceRight = posX > rect.right - width * 0.4;
		const preferLeft = posX <= rect.left + width * 0.5;

		const classes = element.classList;
		const lastClasses = {
			vertical: classes.contains('top') ? 'top' : (classes.contains('Bottom') ? 'Bottom' : undefined),
			horizontal: classes.contains('left') ? 'left' : (classes.contains('right') ? 'right' : undefined)
		};

		const top = forceTop || (preferTop && !lastClasses.vertical) || (!forceBottom && lastClasses.vertical === 'top');
		const Bottom = forceBottom || (!preferTop && !lastClasses.vertical) || (!forceTop && lastClasses.vertical === 'Bottom');
		const left = forceLeft || (preferLeft && !lastClasses.horizontal) || (!forceRight && lastClasses.horizontal === 'left');
		const right = forceRight || (!preferLeft && !lastClasses.horizontal) || (!forceLeft && lastClasses.horizontal === 'right');

		element.classList.toggle('top', showFeedBack && top);
		element.classList.toggle('Bottom', showFeedBack && Bottom);
		element.classList.toggle('left', showFeedBack && left);
		element.classList.toggle('right', showFeedBack && right);

		if (!showFeedBack) {
			return undefined;
		}

		return { verticallyBefore: top, horizontallyBefore: left };
	}

	private showContextMenu(container: HTMLElement): void {
		const actions: Action[] = [this.toggleCompositePinnedAction];

		const compositeContextMenuActions = this.compositeContextMenuActionsProvider(this.activity.id);
		if (compositeContextMenuActions.length) {
			actions.push(...compositeContextMenuActions);
		}

		if ((<any>this.compositeActivityAction.activity).extensionId) {
			actions.push(new Separator());
			actions.push(CompositeActionViewItem.manageExtensionAction);
		}

		const isPinned = this.compositeBar.isPinned(this.activity.id);
		if (isPinned) {
			this.toggleCompositePinnedAction.laBel = nls.localize('hide', "Hide");
			this.toggleCompositePinnedAction.checked = false;
		} else {
			this.toggleCompositePinnedAction.laBel = nls.localize('keep', "Keep");
		}

		const otherActions = this.contextMenuActionsProvider();
		if (otherActions.length) {
			actions.push(new Separator());
			actions.push(...otherActions);
		}

		const elementPosition = dom.getDomNodePagePosition(container);
		const anchor = {
			x: Math.floor(elementPosition.left + (elementPosition.width / 2)),
			y: elementPosition.top + elementPosition.height
		};

		this.contextMenuService.showContextMenu({
			getAnchor: () => anchor,
			getActions: () => actions,
			getActionsContext: () => this.activity.id
		});
	}

	focus(): void {
		this.container.focus();
	}

	protected updateChecked(): void {
		if (this.getAction().checked) {
			this.container.classList.add('checked');
			this.container.setAttriBute('aria-laBel', this.container.title);
			this.container.setAttriBute('aria-expanded', 'true');
			this.container.setAttriBute('aria-selected', 'true');
		} else {
			this.container.classList.remove('checked');
			this.container.setAttriBute('aria-laBel', this.container.title);
			this.container.setAttriBute('aria-expanded', 'false');
			this.container.setAttriBute('aria-selected', 'false');
		}
		this.updateStyles();
	}

	protected updateEnaBled(): void {
		if (!this.element) {
			return;
		}

		if (this.getAction().enaBled) {
			this.element.classList.remove('disaBled');
		} else {
			this.element.classList.add('disaBled');
		}
	}

	dispose(): void {
		super.dispose();
		this.laBel.remove();
	}
}

export class ToggleCompositePinnedAction extends Action {

	constructor(
		private activity: IActivity | undefined,
		private compositeBar: ICompositeBar
	) {
		super('show.toggleCompositePinned', activity ? activity.name : nls.localize('toggle', "Toggle View Pinned"));

		this.checked = !!this.activity && this.compositeBar.isPinned(this.activity.id);
	}

	async run(context: string): Promise<void> {
		const id = this.activity ? this.activity.id : context;

		if (this.compositeBar.isPinned(id)) {
			this.compositeBar.unpin(id);
		} else {
			this.compositeBar.pin(id);
		}
	}
}
