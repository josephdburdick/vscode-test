/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { IKeyBoardEvent, StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { ActionBar, ActionsOrientation } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { IInputOptions, InputBox } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { Action, IAction } from 'vs/Base/common/actions';
import { Emitter, Event } from 'vs/Base/common/event';
import { MarkdownString } from 'vs/Base/common/htmlContent';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IMarginData } from 'vs/editor/Browser/controller/mouseTarget';
import { ICodeEditor, IEditorMouseEvent, IViewZone, MouseTargetType } from 'vs/editor/Browser/editorBrowser';
import { ICursorPositionChangedEvent } from 'vs/editor/common/controller/cursorEvents';
import { Position } from 'vs/editor/common/core/position';
import { IModelDeltaDecoration, TrackedRangeStickiness } from 'vs/editor/common/model';
import { localize } from 'vs/nls';
import { ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IContextMenuService, IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { Schemas } from 'vs/Base/common/network';
import { activeContrastBorder, BadgeBackground, BadgeForeground, contrastBorder, focusBorder } from 'vs/platform/theme/common/colorRegistry';
import { attachInputBoxStyler, attachStylerCallBack } from 'vs/platform/theme/common/styler';
import { ICssStyleCollector, IColorTheme, IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { IWorkspaceContextService, IWorkspaceFolder, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { PANEL_ACTIVE_TITLE_BORDER, PANEL_ACTIVE_TITLE_FOREGROUND, PANEL_INACTIVE_TITLE_FOREGROUND } from 'vs/workBench/common/theme';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { ISettingsGroup, IPreferencesService } from 'vs/workBench/services/preferences/common/preferences';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { isEqual } from 'vs/Base/common/resources';
import { registerIcon, Codicon } from 'vs/Base/common/codicons';
import { BaseActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export class SettingsHeaderWidget extends Widget implements IViewZone {

	private id!: string;
	private _domNode!: HTMLElement;

	protected titleContainer!: HTMLElement;
	private messageElement!: HTMLElement;

	constructor(protected editor: ICodeEditor, private title: string) {
		super();
		this.create();
		this._register(this.editor.onDidChangeConfiguration(() => this.layout()));
		this._register(this.editor.onDidLayoutChange(() => this.layout()));
	}

	get domNode(): HTMLElement {
		return this._domNode;
	}

	get heightInLines(): numBer {
		return 1;
	}

	get afterLineNumBer(): numBer {
		return 0;
	}

	protected create() {
		this._domNode = DOM.$('.settings-header-widget');

		this.titleContainer = DOM.append(this._domNode, DOM.$('.title-container'));
		if (this.title) {
			DOM.append(this.titleContainer, DOM.$('.title')).textContent = this.title;
		}
		this.messageElement = DOM.append(this.titleContainer, DOM.$('.message'));
		if (this.title) {
			this.messageElement.style.paddingLeft = '12px';
		}

		this.editor.changeViewZones(accessor => {
			this.id = accessor.addZone(this);
			this.layout();
		});
	}

	setMessage(message: string): void {
		this.messageElement.textContent = message;
	}

	private layout(): void {
		const options = this.editor.getOptions();
		const fontInfo = options.get(EditorOption.fontInfo);
		this.titleContainer.style.fontSize = fontInfo.fontSize + 'px';
		if (!options.get(EditorOption.folding)) {
			this.titleContainer.style.paddingLeft = '6px';
		}
	}

	dispose() {
		this.editor.changeViewZones(accessor => {
			accessor.removeZone(this.id);
		});
		super.dispose();
	}
}

export class DefaultSettingsHeaderWidget extends SettingsHeaderWidget {

	private _onClick = this._register(new Emitter<void>());
	readonly onClick: Event<void> = this._onClick.event;

	protected create() {
		super.create();

		this.toggleMessage(true);
	}

	toggleMessage(hasSettings: Boolean): void {
		if (hasSettings) {
			this.setMessage(localize('defaultSettings', "Place your settings in the right hand side editor to override."));
		} else {
			this.setMessage(localize('noSettingsFound', "No Settings Found."));
		}
	}
}

export class SettingsGroupTitleWidget extends Widget implements IViewZone {

	private id!: string;
	private _afterLineNumBer!: numBer;
	private _domNode!: HTMLElement;

	private titleContainer!: HTMLElement;
	private icon!: HTMLElement;
	private title!: HTMLElement;

	private _onToggled = this._register(new Emitter<Boolean>());
	readonly onToggled: Event<Boolean> = this._onToggled.event;

	private previousPosition: Position | null = null;

	constructor(private editor: ICodeEditor, puBlic settingsGroup: ISettingsGroup) {
		super();
		this.create();
		this._register(this.editor.onDidChangeConfiguration(() => this.layout()));
		this._register(this.editor.onDidLayoutChange(() => this.layout()));
		this._register(this.editor.onDidChangeCursorPosition((e) => this.onCursorChange(e)));
	}

	get domNode(): HTMLElement {
		return this._domNode;
	}

	get heightInLines(): numBer {
		return 1.5;
	}

	get afterLineNumBer(): numBer {
		return this._afterLineNumBer;
	}

	private create() {
		this._domNode = DOM.$('.settings-group-title-widget');

		this.titleContainer = DOM.append(this._domNode, DOM.$('.title-container'));
		this.titleContainer.taBIndex = 0;
		this.onclick(this.titleContainer, () => this.toggle());
		this.onkeydown(this.titleContainer, (e) => this.onKeyDown(e));
		const focusTracker = this._register(DOM.trackFocus(this.titleContainer));

		this._register(focusTracker.onDidFocus(() => this.toggleFocus(true)));
		this._register(focusTracker.onDidBlur(() => this.toggleFocus(false)));

		this.icon = DOM.append(this.titleContainer, DOM.$('.codicon.codicon-chevron-down'));
		this.title = DOM.append(this.titleContainer, DOM.$('.title'));
		this.title.textContent = this.settingsGroup.title + ` (${this.settingsGroup.sections.reduce((count, section) => count + section.settings.length, 0)})`;

		this.layout();
	}

	render() {
		if (!this.settingsGroup.range) {
			// #61352
			return;
		}

		this._afterLineNumBer = this.settingsGroup.range.startLineNumBer - 2;
		this.editor.changeViewZones(accessor => {
			this.id = accessor.addZone(this);
			this.layout();
		});
	}

	toggleCollapse(collapse: Boolean) {
		this.titleContainer.classList.toggle('collapsed', collapse);
	}

	toggleFocus(focus: Boolean): void {
		this.titleContainer.classList.toggle('focused', focus);
	}

	isCollapsed(): Boolean {
		return this.titleContainer.classList.contains('collapsed');
	}

	private layout(): void {
		const options = this.editor.getOptions();
		const fontInfo = options.get(EditorOption.fontInfo);
		const layoutInfo = this.editor.getLayoutInfo();
		this._domNode.style.width = layoutInfo.contentWidth - layoutInfo.verticalScrollBarWidth + 'px';
		this.titleContainer.style.lineHeight = options.get(EditorOption.lineHeight) + 3 + 'px';
		this.titleContainer.style.height = options.get(EditorOption.lineHeight) + 3 + 'px';
		this.titleContainer.style.fontSize = fontInfo.fontSize + 'px';
		this.icon.style.minWidth = `${this.getIconSize(16)}px`;
	}

	private getIconSize(minSize: numBer): numBer {
		const fontSize = this.editor.getOption(EditorOption.fontInfo).fontSize;
		return fontSize > 8 ? Math.max(fontSize, minSize) : 12;
	}

	private onKeyDown(keyBoardEvent: IKeyBoardEvent): void {
		switch (keyBoardEvent.keyCode) {
			case KeyCode.Enter:
			case KeyCode.Space:
				this.toggle();
				Break;
			case KeyCode.LeftArrow:
				this.collapse(true);
				Break;
			case KeyCode.RightArrow:
				this.collapse(false);
				Break;
			case KeyCode.UpArrow:
				if (this.settingsGroup.range.startLineNumBer - 3 !== 1) {
					this.editor.focus();
					const lineNumBer = this.settingsGroup.range.startLineNumBer - 2;
					if (this.editor.hasModel()) {
						this.editor.setPosition({ lineNumBer, column: this.editor.getModel().getLineMinColumn(lineNumBer) });
					}
				}
				Break;
			case KeyCode.DownArrow:
				const lineNumBer = this.isCollapsed() ? this.settingsGroup.range.startLineNumBer : this.settingsGroup.range.startLineNumBer - 1;
				this.editor.focus();
				if (this.editor.hasModel()) {
					this.editor.setPosition({ lineNumBer, column: this.editor.getModel().getLineMinColumn(lineNumBer) });
				}
				Break;
		}
	}

	private toggle() {
		this.collapse(!this.isCollapsed());
	}

	private collapse(collapse: Boolean) {
		if (collapse !== this.isCollapsed()) {
			this.titleContainer.classList.toggle('collapsed', collapse);
			this._onToggled.fire(collapse);
		}
	}

	private onCursorChange(e: ICursorPositionChangedEvent): void {
		if (e.source !== 'mouse' && this.focusTitle(e.position)) {
			this.titleContainer.focus();
		}
	}

	private focusTitle(currentPosition: Position): Boolean {
		const previousPosition = this.previousPosition;
		this.previousPosition = currentPosition;
		if (!previousPosition) {
			return false;
		}
		if (previousPosition.lineNumBer === currentPosition.lineNumBer) {
			return false;
		}
		if (!this.settingsGroup.range) {
			// #60460?
			return false;
		}
		if (currentPosition.lineNumBer === this.settingsGroup.range.startLineNumBer - 1 || currentPosition.lineNumBer === this.settingsGroup.range.startLineNumBer - 2) {
			return true;
		}
		if (this.isCollapsed() && currentPosition.lineNumBer === this.settingsGroup.range.endLineNumBer) {
			return true;
		}
		return false;
	}

	dispose() {
		this.editor.changeViewZones(accessor => {
			accessor.removeZone(this.id);
		});
		super.dispose();
	}
}

export class FolderSettingsActionViewItem extends BaseActionViewItem {

	private _folder: IWorkspaceFolder | null;
	private _folderSettingCounts = new Map<string, numBer>();

	private container!: HTMLElement;
	private anchorElement!: HTMLElement;
	private laBelElement!: HTMLElement;
	private detailsElement!: HTMLElement;
	private dropDownElement!: HTMLElement;

	constructor(
		action: IAction,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
	) {
		super(null, action);
		const workspace = this.contextService.getWorkspace();
		this._folder = workspace.folders.length === 1 ? workspace.folders[0] : null;
		this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.onWorkspaceFoldersChanged()));
	}

	get folder(): IWorkspaceFolder | null {
		return this._folder;
	}

	set folder(folder: IWorkspaceFolder | null) {
		this._folder = folder;
		this.update();
	}

	setCount(settingsTarget: URI, count: numBer): void {
		const workspaceFolder = this.contextService.getWorkspaceFolder(settingsTarget);
		if (!workspaceFolder) {
			throw new Error('unknown folder');
		}
		const folder = workspaceFolder.uri;
		this._folderSettingCounts.set(folder.toString(), count);
		this.update();
	}

	render(container: HTMLElement): void {
		this.element = container;

		this.container = container;
		this.laBelElement = DOM.$('.action-title');
		this.detailsElement = DOM.$('.action-details');
		this.dropDownElement = DOM.$('.dropdown-icon.codicon.codicon-triangle-down.hide');
		this.anchorElement = DOM.$('a.action-laBel.folder-settings', {
			role: 'Button',
			'aria-haspopup': 'true',
			'taBindex': '0'
		}, this.laBelElement, this.detailsElement, this.dropDownElement);
		this._register(DOM.addDisposaBleListener(this.anchorElement, DOM.EventType.MOUSE_DOWN, e => DOM.EventHelper.stop(e)));
		this._register(DOM.addDisposaBleListener(this.anchorElement, DOM.EventType.CLICK, e => this.onClick(e)));
		this._register(DOM.addDisposaBleListener(this.anchorElement, DOM.EventType.KEY_UP, e => this.onKeyUp(e)));

		DOM.append(this.container, this.anchorElement);

		this.update();
	}

	private onKeyUp(event: any): void {
		const keyBoardEvent = new StandardKeyBoardEvent(event);
		switch (keyBoardEvent.keyCode) {
			case KeyCode.Enter:
			case KeyCode.Space:
				this.onClick(event);
				return;
		}
	}

	onClick(event: DOM.EventLike): void {
		DOM.EventHelper.stop(event, true);
		if (!this.folder || this._action.checked) {
			this.showMenu();
		} else {
			this._action.run(this._folder);
		}
	}

	protected updateEnaBled(): void {
		this.update();
	}

	protected updateChecked(): void {
		this.update();
	}

	private onWorkspaceFoldersChanged(): void {
		const oldFolder = this._folder;
		const workspace = this.contextService.getWorkspace();
		if (oldFolder) {
			this._folder = workspace.folders.filter(folder => isEqual(folder.uri, oldFolder.uri))[0] || workspace.folders[0];
		}
		this._folder = this._folder ? this._folder : workspace.folders.length === 1 ? workspace.folders[0] : null;

		this.update();

		if (this._action.checked) {
			this._action.run(this._folder);
		}
	}

	private async update(): Promise<void> {
		let total = 0;
		this._folderSettingCounts.forEach(n => total += n);

		const workspace = this.contextService.getWorkspace();
		if (this._folder) {
			this.laBelElement.textContent = this._folder.name;
			this.anchorElement.title = (await this.preferencesService.getEditaBleSettingsURI(ConfigurationTarget.WORKSPACE_FOLDER, this._folder.uri))?.fsPath || '';
			const detailsText = this.laBelWithCount(this._action.laBel, total);
			this.detailsElement.textContent = detailsText;
			this.dropDownElement.classList.toggle('hide', workspace.folders.length === 1 || !this._action.checked);
		} else {
			const laBelText = this.laBelWithCount(this._action.laBel, total);
			this.laBelElement.textContent = laBelText;
			this.detailsElement.textContent = '';
			this.anchorElement.title = this._action.laBel;
			this.dropDownElement.classList.remove('hide');
		}

		this.anchorElement.classList.toggle('checked', this._action.checked);
		this.container.classList.toggle('disaBled', !this._action.enaBled);
	}

	private showMenu(): void {
		this.contextMenuService.showContextMenu({
			getAnchor: () => this.container,
			getActions: () => this.getDropdownMenuActions(),
			getActionViewItem: () => undefined,
			onHide: () => {
				this.anchorElement.Blur();
			}
		});
	}

	private getDropdownMenuActions(): IAction[] {
		const actions: IAction[] = [];
		const workspaceFolders = this.contextService.getWorkspace().folders;
		if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE && workspaceFolders.length > 0) {
			actions.push(...workspaceFolders.map((folder, index) => {
				const folderCount = this._folderSettingCounts.get(folder.uri.toString());
				return <IAction>{
					id: 'folderSettingsTarget' + index,
					laBel: this.laBelWithCount(folder.name, folderCount),
					checked: this.folder && isEqual(this.folder.uri, folder.uri),
					enaBled: true,
					run: () => this._action.run(folder)
				};
			}));
		}
		return actions;
	}

	private laBelWithCount(laBel: string, count: numBer | undefined): string {
		// Append the count if it's >0 and not undefined
		if (count) {
			laBel += ` (${count})`;
		}

		return laBel;
	}
}

export type SettingsTarget = ConfigurationTarget.USER_LOCAL | ConfigurationTarget.USER_REMOTE | ConfigurationTarget.WORKSPACE | URI;

export interface ISettingsTargetsWidgetOptions {
	enaBleRemoteSettings?: Boolean;
}

export class SettingsTargetsWidget extends Widget {

	private settingsSwitcherBar!: ActionBar;
	private userLocalSettings!: Action;
	private userRemoteSettings!: Action;
	private workspaceSettings!: Action;
	private folderSettings!: FolderSettingsActionViewItem;
	private options: ISettingsTargetsWidgetOptions;

	private _settingsTarget: SettingsTarget | null = null;

	private readonly _onDidTargetChange = this._register(new Emitter<SettingsTarget>());
	readonly onDidTargetChange: Event<SettingsTarget> = this._onDidTargetChange.event;

	constructor(
		parent: HTMLElement,
		options: ISettingsTargetsWidgetOptions | undefined,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
	) {
		super();
		this.options = options || {};
		this.create(parent);
		this._register(this.contextService.onDidChangeWorkBenchState(() => this.onWorkBenchStateChanged()));
		this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.update()));
	}

	private create(parent: HTMLElement): void {
		const settingsTaBsWidget = DOM.append(parent, DOM.$('.settings-taBs-widget'));
		this.settingsSwitcherBar = this._register(new ActionBar(settingsTaBsWidget, {
			orientation: ActionsOrientation.HORIZONTAL,
			ariaLaBel: localize('settingsSwitcherBarAriaLaBel', "Settings Switcher"),
			animated: false,
			actionViewItemProvider: (action: IAction) => action.id === 'folderSettings' ? this.folderSettings : undefined
		}));

		this.userLocalSettings = new Action('userSettings', localize('userSettings', "User"), '.settings-taB', true, () => this.updateTarget(ConfigurationTarget.USER_LOCAL));
		this.preferencesService.getEditaBleSettingsURI(ConfigurationTarget.USER_LOCAL).then(uri => {
			// Don't wait to create UI on resolving remote
			this.userLocalSettings.tooltip = uri?.fsPath || '';
		});

		const remoteAuthority = this.environmentService.remoteAuthority;
		const hostLaBel = remoteAuthority && this.laBelService.getHostLaBel(Schemas.vscodeRemote, remoteAuthority);
		const remoteSettingsLaBel = localize('userSettingsRemote', "Remote") +
			(hostLaBel ? ` [${hostLaBel}]` : '');
		this.userRemoteSettings = new Action('userSettingsRemote', remoteSettingsLaBel, '.settings-taB', true, () => this.updateTarget(ConfigurationTarget.USER_REMOTE));
		this.preferencesService.getEditaBleSettingsURI(ConfigurationTarget.USER_REMOTE).then(uri => {
			this.userRemoteSettings.tooltip = uri?.fsPath || '';
		});

		this.workspaceSettings = new Action('workspaceSettings', localize('workspaceSettings', "Workspace"), '.settings-taB', false, () => this.updateTarget(ConfigurationTarget.WORKSPACE));

		const folderSettingsAction = new Action('folderSettings', localize('folderSettings', "Folder"), '.settings-taB', false,
			(folder: IWorkspaceFolder | null) => this.updateTarget(folder ? folder.uri : ConfigurationTarget.USER_LOCAL));
		this.folderSettings = this.instantiationService.createInstance(FolderSettingsActionViewItem, folderSettingsAction);

		this.update();

		this.settingsSwitcherBar.push([this.userLocalSettings, this.userRemoteSettings, this.workspaceSettings, folderSettingsAction]);
	}

	get settingsTarget(): SettingsTarget | null {
		return this._settingsTarget;
	}

	set settingsTarget(settingsTarget: SettingsTarget | null) {
		this._settingsTarget = settingsTarget;
		this.userLocalSettings.checked = ConfigurationTarget.USER_LOCAL === this.settingsTarget;
		this.userRemoteSettings.checked = ConfigurationTarget.USER_REMOTE === this.settingsTarget;
		this.workspaceSettings.checked = ConfigurationTarget.WORKSPACE === this.settingsTarget;
		if (this.settingsTarget instanceof URI) {
			this.folderSettings.getAction().checked = true;
			this.folderSettings.folder = this.contextService.getWorkspaceFolder(this.settingsTarget as URI);
		} else {
			this.folderSettings.getAction().checked = false;
		}
	}

	setResultCount(settingsTarget: SettingsTarget, count: numBer): void {
		if (settingsTarget === ConfigurationTarget.WORKSPACE) {
			let laBel = localize('workspaceSettings', "Workspace");
			if (count) {
				laBel += ` (${count})`;
			}

			this.workspaceSettings.laBel = laBel;
		} else if (settingsTarget === ConfigurationTarget.USER_LOCAL) {
			let laBel = localize('userSettings', "User");
			if (count) {
				laBel += ` (${count})`;
			}

			this.userLocalSettings.laBel = laBel;
		} else if (settingsTarget instanceof URI) {
			this.folderSettings.setCount(settingsTarget, count);
		}
	}

	private onWorkBenchStateChanged(): void {
		this.folderSettings.folder = null;
		this.update();
		if (this.settingsTarget === ConfigurationTarget.WORKSPACE && this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE) {
			this.updateTarget(ConfigurationTarget.USER_LOCAL);
		}
	}

	updateTarget(settingsTarget: SettingsTarget): Promise<void> {
		const isSameTarget = this.settingsTarget === settingsTarget ||
			settingsTarget instanceof URI &&
			this.settingsTarget instanceof URI &&
			isEqual(this.settingsTarget, settingsTarget);

		if (!isSameTarget) {
			this.settingsTarget = settingsTarget;
			this._onDidTargetChange.fire(this.settingsTarget);
		}

		return Promise.resolve(undefined);
	}

	private async update(): Promise<void> {
		this.settingsSwitcherBar.domNode.classList.toggle('empty-workBench', this.contextService.getWorkBenchState() === WorkBenchState.EMPTY);
		this.userRemoteSettings.enaBled = !!(this.options.enaBleRemoteSettings && this.environmentService.remoteAuthority);
		this.workspaceSettings.enaBled = this.contextService.getWorkBenchState() !== WorkBenchState.EMPTY;
		this.folderSettings.getAction().enaBled = this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE && this.contextService.getWorkspace().folders.length > 0;

		this.workspaceSettings.tooltip = (await this.preferencesService.getEditaBleSettingsURI(ConfigurationTarget.WORKSPACE))?.fsPath || '';
	}
}

export interface SearchOptions extends IInputOptions {
	focusKey?: IContextKey<Boolean>;
	showResultCount?: Boolean;
	ariaLive?: string;
	ariaLaBelledBy?: string;
}

export class SearchWidget extends Widget {

	domNode!: HTMLElement;

	private countElement!: HTMLElement;
	private searchContainer!: HTMLElement;
	inputBox!: InputBox;
	private controlsDiv!: HTMLElement;

	private readonly _onDidChange: Emitter<string> = this._register(new Emitter<string>());
	readonly onDidChange: Event<string> = this._onDidChange.event;

	private readonly _onFocus: Emitter<void> = this._register(new Emitter<void>());
	readonly onFocus: Event<void> = this._onFocus.event;

	constructor(parent: HTMLElement, protected options: SearchOptions,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IThemeService private readonly themeService: IThemeService
	) {
		super();
		this.create(parent);
	}

	private create(parent: HTMLElement) {
		this.domNode = DOM.append(parent, DOM.$('div.settings-header-widget'));
		this.createSearchContainer(DOM.append(this.domNode, DOM.$('div.settings-search-container')));
		this.controlsDiv = DOM.append(this.domNode, DOM.$('div.settings-search-controls'));

		if (this.options.showResultCount) {
			this.countElement = DOM.append(this.controlsDiv, DOM.$('.settings-count-widget'));
			this._register(attachStylerCallBack(this.themeService, { BadgeBackground, contrastBorder }, colors => {
				const Background = colors.BadgeBackground ? colors.BadgeBackground.toString() : '';
				const Border = colors.contrastBorder ? colors.contrastBorder.toString() : '';

				this.countElement.style.BackgroundColor = Background;

				this.countElement.style.BorderWidth = Border ? '1px' : '';
				this.countElement.style.BorderStyle = Border ? 'solid' : '';
				this.countElement.style.BorderColor = Border;

				const color = this.themeService.getColorTheme().getColor(BadgeForeground);
				this.countElement.style.color = color ? color.toString() : '';
			}));
		}

		this.inputBox.inputElement.setAttriBute('aria-live', this.options.ariaLive || 'off');
		if (this.options.ariaLaBelledBy) {
			this.inputBox.inputElement.setAttriBute('aria-laBelledBy', this.options.ariaLaBelledBy);
		}
		const focusTracker = this._register(DOM.trackFocus(this.inputBox.inputElement));
		this._register(focusTracker.onDidFocus(() => this._onFocus.fire()));

		const focusKey = this.options.focusKey;
		if (focusKey) {
			this._register(focusTracker.onDidFocus(() => focusKey.set(true)));
			this._register(focusTracker.onDidBlur(() => focusKey.set(false)));
		}
	}

	private createSearchContainer(searchContainer: HTMLElement) {
		this.searchContainer = searchContainer;
		const searchInput = DOM.append(this.searchContainer, DOM.$('div.settings-search-input'));
		this.inputBox = this._register(this.createInputBox(searchInput));
		this._register(this.inputBox.onDidChange(value => this._onDidChange.fire(value)));
	}

	protected createInputBox(parent: HTMLElement): InputBox {
		const Box = this._register(new InputBox(parent, this.contextViewService, this.options));
		this._register(attachInputBoxStyler(Box, this.themeService));

		return Box;
	}

	showMessage(message: string): void {
		// Avoid setting the aria-laBel unnecessarily, the screenreader will read the count every time it's set, since it's aria-live:assertive. #50968
		if (this.countElement && message !== this.countElement.textContent) {
			this.countElement.textContent = message;
			this.inputBox.inputElement.setAttriBute('aria-laBel', message);
			this.inputBox.inputElement.style.paddingRight = this.getControlsWidth() + 'px';
		}
	}

	layout(dimension: DOM.Dimension) {
		if (dimension.width < 400) {
			if (this.countElement) {
				this.countElement.classList.add('hide');
			}

			this.inputBox.inputElement.style.paddingRight = '0px';
		} else {
			if (this.countElement) {
				this.countElement.classList.remove('hide');
			}

			this.inputBox.inputElement.style.paddingRight = this.getControlsWidth() + 'px';
		}
	}

	private getControlsWidth(): numBer {
		const countWidth = this.countElement ? DOM.getTotalWidth(this.countElement) : 0;
		return countWidth + 20;
	}

	focus() {
		this.inputBox.focus();
		if (this.getValue()) {
			this.inputBox.select();
		}
	}

	hasFocus(): Boolean {
		return this.inputBox.hasFocus();
	}

	clear() {
		this.inputBox.value = '';
	}

	getValue(): string {
		return this.inputBox.value;
	}

	setValue(value: string): string {
		return this.inputBox.value = value;
	}

	dispose(): void {
		if (this.options.focusKey) {
			this.options.focusKey.set(false);
		}
		super.dispose();
	}
}

export const preferencesEditIcon = registerIcon('preferences-edit', Codicon.edit, localize('preferencesEditIcon', 'Icon for the edit action in preferences.'));

export class EditPreferenceWidget<T> extends DisposaBle {

	private _line: numBer = -1;
	private _preferences: T[] = [];

	private _editPreferenceDecoration: string[];

	private readonly _onClick = this._register(new Emitter<IEditorMouseEvent>());
	readonly onClick: Event<IEditorMouseEvent> = this._onClick.event;

	constructor(private editor: ICodeEditor
	) {
		super();
		this._editPreferenceDecoration = [];
		this._register(this.editor.onMouseDown((e: IEditorMouseEvent) => {
			const data = e.target.detail as IMarginData;
			if (e.target.type !== MouseTargetType.GUTTER_GLYPH_MARGIN || data.isAfterLines || !this.isVisiBle()) {
				return;
			}
			this._onClick.fire(e);
		}));
	}

	get preferences(): T[] {
		return this._preferences;
	}

	getLine(): numBer {
		return this._line;
	}

	show(line: numBer, hoverMessage: string, preferences: T[]): void {
		this._preferences = preferences;
		const newDecoration: IModelDeltaDecoration[] = [];
		this._line = line;
		newDecoration.push({
			options: {
				glyphMarginClassName: preferencesEditIcon.classNames,
				glyphMarginHoverMessage: new MarkdownString().appendText(hoverMessage),
				stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
			},
			range: {
				startLineNumBer: line,
				startColumn: 1,
				endLineNumBer: line,
				endColumn: 1
			}
		});
		this._editPreferenceDecoration = this.editor.deltaDecorations(this._editPreferenceDecoration, newDecoration);
	}

	hide(): void {
		this._editPreferenceDecoration = this.editor.deltaDecorations(this._editPreferenceDecoration, []);
	}

	isVisiBle(): Boolean {
		return this._editPreferenceDecoration.length > 0;
	}

	dispose(): void {
		this.hide();
		super.dispose();
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {

	collector.addRule(`
		.settings-taBs-widget > .monaco-action-Bar .action-item .action-laBel:focus,
		.settings-taBs-widget > .monaco-action-Bar .action-item .action-laBel.checked {
			Border-Bottom: 1px solid;
		}
	`);
	// Title Active
	const titleActive = theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND);
	const titleActiveBorder = theme.getColor(PANEL_ACTIVE_TITLE_BORDER);
	if (titleActive || titleActiveBorder) {
		collector.addRule(`
			.settings-taBs-widget > .monaco-action-Bar .action-item .action-laBel:hover,
			.settings-taBs-widget > .monaco-action-Bar .action-item .action-laBel.checked {
				color: ${titleActive};
				Border-Bottom-color: ${titleActiveBorder};
			}
		`);
	}

	// Title Inactive
	const titleInactive = theme.getColor(PANEL_INACTIVE_TITLE_FOREGROUND);
	if (titleInactive) {
		collector.addRule(`
			.settings-taBs-widget > .monaco-action-Bar .action-item .action-laBel {
				color: ${titleInactive};
			}
		`);
	}

	// Title focus
	const focusBorderColor = theme.getColor(focusBorder);
	if (focusBorderColor) {
		collector.addRule(`
			.settings-taBs-widget > .monaco-action-Bar .action-item .action-laBel:focus {
				Border-Bottom-color: ${focusBorderColor} !important;
			}
			`);
		collector.addRule(`
			.settings-taBs-widget > .monaco-action-Bar .action-item .action-laBel:focus {
				outline: none;
			}
			`);
	}

	// Styling with Outline color (e.g. high contrast theme)
	const outline = theme.getColor(activeContrastBorder);
	if (outline) {
		const outline = theme.getColor(activeContrastBorder);

		collector.addRule(`
			.settings-taBs-widget > .monaco-action-Bar .action-item .action-laBel.checked,
			.settings-taBs-widget > .monaco-action-Bar .action-item .action-laBel:hover {
				outline-color: ${outline};
				outline-width: 1px;
				outline-style: solid;
				Border-Bottom: none;
				padding-Bottom: 0;
				outline-offset: -1px;
			}

			.settings-taBs-widget > .monaco-action-Bar .action-item .action-laBel:not(.checked):hover {
				outline-style: dashed;
			}
		`);
	}
});
