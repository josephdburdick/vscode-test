/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { IKeyboArdEvent, StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { ActionBAr, ActionsOrientAtion } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { IInputOptions, InputBox } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { Action, IAction } from 'vs/bAse/common/Actions';
import { Emitter, Event } from 'vs/bAse/common/event';
import { MArkdownString } from 'vs/bAse/common/htmlContent';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IMArginDAtA } from 'vs/editor/browser/controller/mouseTArget';
import { ICodeEditor, IEditorMouseEvent, IViewZone, MouseTArgetType } from 'vs/editor/browser/editorBrowser';
import { ICursorPositionChAngedEvent } from 'vs/editor/common/controller/cursorEvents';
import { Position } from 'vs/editor/common/core/position';
import { IModelDeltADecorAtion, TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { locAlize } from 'vs/nls';
import { ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextMenuService, IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { SchemAs } from 'vs/bAse/common/network';
import { ActiveContrAstBorder, bAdgeBAckground, bAdgeForeground, contrAstBorder, focusBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { AttAchInputBoxStyler, AttAchStylerCAllbAck } from 'vs/plAtform/theme/common/styler';
import { ICssStyleCollector, IColorTheme, IThemeService, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { IWorkspAceContextService, IWorkspAceFolder, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { PANEL_ACTIVE_TITLE_BORDER, PANEL_ACTIVE_TITLE_FOREGROUND, PANEL_INACTIVE_TITLE_FOREGROUND } from 'vs/workbench/common/theme';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { ISettingsGroup, IPreferencesService } from 'vs/workbench/services/preferences/common/preferences';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { isEquAl } from 'vs/bAse/common/resources';
import { registerIcon, Codicon } from 'vs/bAse/common/codicons';
import { BAseActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';

export clAss SettingsHeAderWidget extends Widget implements IViewZone {

	privAte id!: string;
	privAte _domNode!: HTMLElement;

	protected titleContAiner!: HTMLElement;
	privAte messAgeElement!: HTMLElement;

	constructor(protected editor: ICodeEditor, privAte title: string) {
		super();
		this.creAte();
		this._register(this.editor.onDidChAngeConfigurAtion(() => this.lAyout()));
		this._register(this.editor.onDidLAyoutChAnge(() => this.lAyout()));
	}

	get domNode(): HTMLElement {
		return this._domNode;
	}

	get heightInLines(): number {
		return 1;
	}

	get AfterLineNumber(): number {
		return 0;
	}

	protected creAte() {
		this._domNode = DOM.$('.settings-heAder-widget');

		this.titleContAiner = DOM.Append(this._domNode, DOM.$('.title-contAiner'));
		if (this.title) {
			DOM.Append(this.titleContAiner, DOM.$('.title')).textContent = this.title;
		}
		this.messAgeElement = DOM.Append(this.titleContAiner, DOM.$('.messAge'));
		if (this.title) {
			this.messAgeElement.style.pAddingLeft = '12px';
		}

		this.editor.chAngeViewZones(Accessor => {
			this.id = Accessor.AddZone(this);
			this.lAyout();
		});
	}

	setMessAge(messAge: string): void {
		this.messAgeElement.textContent = messAge;
	}

	privAte lAyout(): void {
		const options = this.editor.getOptions();
		const fontInfo = options.get(EditorOption.fontInfo);
		this.titleContAiner.style.fontSize = fontInfo.fontSize + 'px';
		if (!options.get(EditorOption.folding)) {
			this.titleContAiner.style.pAddingLeft = '6px';
		}
	}

	dispose() {
		this.editor.chAngeViewZones(Accessor => {
			Accessor.removeZone(this.id);
		});
		super.dispose();
	}
}

export clAss DefAultSettingsHeAderWidget extends SettingsHeAderWidget {

	privAte _onClick = this._register(new Emitter<void>());
	reAdonly onClick: Event<void> = this._onClick.event;

	protected creAte() {
		super.creAte();

		this.toggleMessAge(true);
	}

	toggleMessAge(hAsSettings: booleAn): void {
		if (hAsSettings) {
			this.setMessAge(locAlize('defAultSettings', "PlAce your settings in the right hAnd side editor to override."));
		} else {
			this.setMessAge(locAlize('noSettingsFound', "No Settings Found."));
		}
	}
}

export clAss SettingsGroupTitleWidget extends Widget implements IViewZone {

	privAte id!: string;
	privAte _AfterLineNumber!: number;
	privAte _domNode!: HTMLElement;

	privAte titleContAiner!: HTMLElement;
	privAte icon!: HTMLElement;
	privAte title!: HTMLElement;

	privAte _onToggled = this._register(new Emitter<booleAn>());
	reAdonly onToggled: Event<booleAn> = this._onToggled.event;

	privAte previousPosition: Position | null = null;

	constructor(privAte editor: ICodeEditor, public settingsGroup: ISettingsGroup) {
		super();
		this.creAte();
		this._register(this.editor.onDidChAngeConfigurAtion(() => this.lAyout()));
		this._register(this.editor.onDidLAyoutChAnge(() => this.lAyout()));
		this._register(this.editor.onDidChAngeCursorPosition((e) => this.onCursorChAnge(e)));
	}

	get domNode(): HTMLElement {
		return this._domNode;
	}

	get heightInLines(): number {
		return 1.5;
	}

	get AfterLineNumber(): number {
		return this._AfterLineNumber;
	}

	privAte creAte() {
		this._domNode = DOM.$('.settings-group-title-widget');

		this.titleContAiner = DOM.Append(this._domNode, DOM.$('.title-contAiner'));
		this.titleContAiner.tAbIndex = 0;
		this.onclick(this.titleContAiner, () => this.toggle());
		this.onkeydown(this.titleContAiner, (e) => this.onKeyDown(e));
		const focusTrAcker = this._register(DOM.trAckFocus(this.titleContAiner));

		this._register(focusTrAcker.onDidFocus(() => this.toggleFocus(true)));
		this._register(focusTrAcker.onDidBlur(() => this.toggleFocus(fAlse)));

		this.icon = DOM.Append(this.titleContAiner, DOM.$('.codicon.codicon-chevron-down'));
		this.title = DOM.Append(this.titleContAiner, DOM.$('.title'));
		this.title.textContent = this.settingsGroup.title + ` (${this.settingsGroup.sections.reduce((count, section) => count + section.settings.length, 0)})`;

		this.lAyout();
	}

	render() {
		if (!this.settingsGroup.rAnge) {
			// #61352
			return;
		}

		this._AfterLineNumber = this.settingsGroup.rAnge.stArtLineNumber - 2;
		this.editor.chAngeViewZones(Accessor => {
			this.id = Accessor.AddZone(this);
			this.lAyout();
		});
	}

	toggleCollApse(collApse: booleAn) {
		this.titleContAiner.clAssList.toggle('collApsed', collApse);
	}

	toggleFocus(focus: booleAn): void {
		this.titleContAiner.clAssList.toggle('focused', focus);
	}

	isCollApsed(): booleAn {
		return this.titleContAiner.clAssList.contAins('collApsed');
	}

	privAte lAyout(): void {
		const options = this.editor.getOptions();
		const fontInfo = options.get(EditorOption.fontInfo);
		const lAyoutInfo = this.editor.getLAyoutInfo();
		this._domNode.style.width = lAyoutInfo.contentWidth - lAyoutInfo.verticAlScrollbArWidth + 'px';
		this.titleContAiner.style.lineHeight = options.get(EditorOption.lineHeight) + 3 + 'px';
		this.titleContAiner.style.height = options.get(EditorOption.lineHeight) + 3 + 'px';
		this.titleContAiner.style.fontSize = fontInfo.fontSize + 'px';
		this.icon.style.minWidth = `${this.getIconSize(16)}px`;
	}

	privAte getIconSize(minSize: number): number {
		const fontSize = this.editor.getOption(EditorOption.fontInfo).fontSize;
		return fontSize > 8 ? MAth.mAx(fontSize, minSize) : 12;
	}

	privAte onKeyDown(keyboArdEvent: IKeyboArdEvent): void {
		switch (keyboArdEvent.keyCode) {
			cAse KeyCode.Enter:
			cAse KeyCode.SpAce:
				this.toggle();
				breAk;
			cAse KeyCode.LeftArrow:
				this.collApse(true);
				breAk;
			cAse KeyCode.RightArrow:
				this.collApse(fAlse);
				breAk;
			cAse KeyCode.UpArrow:
				if (this.settingsGroup.rAnge.stArtLineNumber - 3 !== 1) {
					this.editor.focus();
					const lineNumber = this.settingsGroup.rAnge.stArtLineNumber - 2;
					if (this.editor.hAsModel()) {
						this.editor.setPosition({ lineNumber, column: this.editor.getModel().getLineMinColumn(lineNumber) });
					}
				}
				breAk;
			cAse KeyCode.DownArrow:
				const lineNumber = this.isCollApsed() ? this.settingsGroup.rAnge.stArtLineNumber : this.settingsGroup.rAnge.stArtLineNumber - 1;
				this.editor.focus();
				if (this.editor.hAsModel()) {
					this.editor.setPosition({ lineNumber, column: this.editor.getModel().getLineMinColumn(lineNumber) });
				}
				breAk;
		}
	}

	privAte toggle() {
		this.collApse(!this.isCollApsed());
	}

	privAte collApse(collApse: booleAn) {
		if (collApse !== this.isCollApsed()) {
			this.titleContAiner.clAssList.toggle('collApsed', collApse);
			this._onToggled.fire(collApse);
		}
	}

	privAte onCursorChAnge(e: ICursorPositionChAngedEvent): void {
		if (e.source !== 'mouse' && this.focusTitle(e.position)) {
			this.titleContAiner.focus();
		}
	}

	privAte focusTitle(currentPosition: Position): booleAn {
		const previousPosition = this.previousPosition;
		this.previousPosition = currentPosition;
		if (!previousPosition) {
			return fAlse;
		}
		if (previousPosition.lineNumber === currentPosition.lineNumber) {
			return fAlse;
		}
		if (!this.settingsGroup.rAnge) {
			// #60460?
			return fAlse;
		}
		if (currentPosition.lineNumber === this.settingsGroup.rAnge.stArtLineNumber - 1 || currentPosition.lineNumber === this.settingsGroup.rAnge.stArtLineNumber - 2) {
			return true;
		}
		if (this.isCollApsed() && currentPosition.lineNumber === this.settingsGroup.rAnge.endLineNumber) {
			return true;
		}
		return fAlse;
	}

	dispose() {
		this.editor.chAngeViewZones(Accessor => {
			Accessor.removeZone(this.id);
		});
		super.dispose();
	}
}

export clAss FolderSettingsActionViewItem extends BAseActionViewItem {

	privAte _folder: IWorkspAceFolder | null;
	privAte _folderSettingCounts = new MAp<string, number>();

	privAte contAiner!: HTMLElement;
	privAte AnchorElement!: HTMLElement;
	privAte lAbelElement!: HTMLElement;
	privAte detAilsElement!: HTMLElement;
	privAte dropDownElement!: HTMLElement;

	constructor(
		Action: IAction,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService,
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService,
	) {
		super(null, Action);
		const workspAce = this.contextService.getWorkspAce();
		this._folder = workspAce.folders.length === 1 ? workspAce.folders[0] : null;
		this._register(this.contextService.onDidChAngeWorkspAceFolders(() => this.onWorkspAceFoldersChAnged()));
	}

	get folder(): IWorkspAceFolder | null {
		return this._folder;
	}

	set folder(folder: IWorkspAceFolder | null) {
		this._folder = folder;
		this.updAte();
	}

	setCount(settingsTArget: URI, count: number): void {
		const workspAceFolder = this.contextService.getWorkspAceFolder(settingsTArget);
		if (!workspAceFolder) {
			throw new Error('unknown folder');
		}
		const folder = workspAceFolder.uri;
		this._folderSettingCounts.set(folder.toString(), count);
		this.updAte();
	}

	render(contAiner: HTMLElement): void {
		this.element = contAiner;

		this.contAiner = contAiner;
		this.lAbelElement = DOM.$('.Action-title');
		this.detAilsElement = DOM.$('.Action-detAils');
		this.dropDownElement = DOM.$('.dropdown-icon.codicon.codicon-triAngle-down.hide');
		this.AnchorElement = DOM.$('A.Action-lAbel.folder-settings', {
			role: 'button',
			'AriA-hAspopup': 'true',
			'tAbindex': '0'
		}, this.lAbelElement, this.detAilsElement, this.dropDownElement);
		this._register(DOM.AddDisposAbleListener(this.AnchorElement, DOM.EventType.MOUSE_DOWN, e => DOM.EventHelper.stop(e)));
		this._register(DOM.AddDisposAbleListener(this.AnchorElement, DOM.EventType.CLICK, e => this.onClick(e)));
		this._register(DOM.AddDisposAbleListener(this.AnchorElement, DOM.EventType.KEY_UP, e => this.onKeyUp(e)));

		DOM.Append(this.contAiner, this.AnchorElement);

		this.updAte();
	}

	privAte onKeyUp(event: Any): void {
		const keyboArdEvent = new StAndArdKeyboArdEvent(event);
		switch (keyboArdEvent.keyCode) {
			cAse KeyCode.Enter:
			cAse KeyCode.SpAce:
				this.onClick(event);
				return;
		}
	}

	onClick(event: DOM.EventLike): void {
		DOM.EventHelper.stop(event, true);
		if (!this.folder || this._Action.checked) {
			this.showMenu();
		} else {
			this._Action.run(this._folder);
		}
	}

	protected updAteEnAbled(): void {
		this.updAte();
	}

	protected updAteChecked(): void {
		this.updAte();
	}

	privAte onWorkspAceFoldersChAnged(): void {
		const oldFolder = this._folder;
		const workspAce = this.contextService.getWorkspAce();
		if (oldFolder) {
			this._folder = workspAce.folders.filter(folder => isEquAl(folder.uri, oldFolder.uri))[0] || workspAce.folders[0];
		}
		this._folder = this._folder ? this._folder : workspAce.folders.length === 1 ? workspAce.folders[0] : null;

		this.updAte();

		if (this._Action.checked) {
			this._Action.run(this._folder);
		}
	}

	privAte Async updAte(): Promise<void> {
		let totAl = 0;
		this._folderSettingCounts.forEAch(n => totAl += n);

		const workspAce = this.contextService.getWorkspAce();
		if (this._folder) {
			this.lAbelElement.textContent = this._folder.nAme;
			this.AnchorElement.title = (AwAit this.preferencesService.getEditAbleSettingsURI(ConfigurAtionTArget.WORKSPACE_FOLDER, this._folder.uri))?.fsPAth || '';
			const detAilsText = this.lAbelWithCount(this._Action.lAbel, totAl);
			this.detAilsElement.textContent = detAilsText;
			this.dropDownElement.clAssList.toggle('hide', workspAce.folders.length === 1 || !this._Action.checked);
		} else {
			const lAbelText = this.lAbelWithCount(this._Action.lAbel, totAl);
			this.lAbelElement.textContent = lAbelText;
			this.detAilsElement.textContent = '';
			this.AnchorElement.title = this._Action.lAbel;
			this.dropDownElement.clAssList.remove('hide');
		}

		this.AnchorElement.clAssList.toggle('checked', this._Action.checked);
		this.contAiner.clAssList.toggle('disAbled', !this._Action.enAbled);
	}

	privAte showMenu(): void {
		this.contextMenuService.showContextMenu({
			getAnchor: () => this.contAiner,
			getActions: () => this.getDropdownMenuActions(),
			getActionViewItem: () => undefined,
			onHide: () => {
				this.AnchorElement.blur();
			}
		});
	}

	privAte getDropdownMenuActions(): IAction[] {
		const Actions: IAction[] = [];
		const workspAceFolders = this.contextService.getWorkspAce().folders;
		if (this.contextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE && workspAceFolders.length > 0) {
			Actions.push(...workspAceFolders.mAp((folder, index) => {
				const folderCount = this._folderSettingCounts.get(folder.uri.toString());
				return <IAction>{
					id: 'folderSettingsTArget' + index,
					lAbel: this.lAbelWithCount(folder.nAme, folderCount),
					checked: this.folder && isEquAl(this.folder.uri, folder.uri),
					enAbled: true,
					run: () => this._Action.run(folder)
				};
			}));
		}
		return Actions;
	}

	privAte lAbelWithCount(lAbel: string, count: number | undefined): string {
		// Append the count if it's >0 And not undefined
		if (count) {
			lAbel += ` (${count})`;
		}

		return lAbel;
	}
}

export type SettingsTArget = ConfigurAtionTArget.USER_LOCAL | ConfigurAtionTArget.USER_REMOTE | ConfigurAtionTArget.WORKSPACE | URI;

export interfAce ISettingsTArgetsWidgetOptions {
	enAbleRemoteSettings?: booleAn;
}

export clAss SettingsTArgetsWidget extends Widget {

	privAte settingsSwitcherBAr!: ActionBAr;
	privAte userLocAlSettings!: Action;
	privAte userRemoteSettings!: Action;
	privAte workspAceSettings!: Action;
	privAte folderSettings!: FolderSettingsActionViewItem;
	privAte options: ISettingsTArgetsWidgetOptions;

	privAte _settingsTArget: SettingsTArget | null = null;

	privAte reAdonly _onDidTArgetChAnge = this._register(new Emitter<SettingsTArget>());
	reAdonly onDidTArgetChAnge: Event<SettingsTArget> = this._onDidTArgetChAnge.event;

	constructor(
		pArent: HTMLElement,
		options: ISettingsTArgetsWidgetOptions | undefined,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService,
	) {
		super();
		this.options = options || {};
		this.creAte(pArent);
		this._register(this.contextService.onDidChAngeWorkbenchStAte(() => this.onWorkbenchStAteChAnged()));
		this._register(this.contextService.onDidChAngeWorkspAceFolders(() => this.updAte()));
	}

	privAte creAte(pArent: HTMLElement): void {
		const settingsTAbsWidget = DOM.Append(pArent, DOM.$('.settings-tAbs-widget'));
		this.settingsSwitcherBAr = this._register(new ActionBAr(settingsTAbsWidget, {
			orientAtion: ActionsOrientAtion.HORIZONTAL,
			AriALAbel: locAlize('settingsSwitcherBArAriALAbel', "Settings Switcher"),
			AnimAted: fAlse,
			ActionViewItemProvider: (Action: IAction) => Action.id === 'folderSettings' ? this.folderSettings : undefined
		}));

		this.userLocAlSettings = new Action('userSettings', locAlize('userSettings', "User"), '.settings-tAb', true, () => this.updAteTArget(ConfigurAtionTArget.USER_LOCAL));
		this.preferencesService.getEditAbleSettingsURI(ConfigurAtionTArget.USER_LOCAL).then(uri => {
			// Don't wAit to creAte UI on resolving remote
			this.userLocAlSettings.tooltip = uri?.fsPAth || '';
		});

		const remoteAuthority = this.environmentService.remoteAuthority;
		const hostLAbel = remoteAuthority && this.lAbelService.getHostLAbel(SchemAs.vscodeRemote, remoteAuthority);
		const remoteSettingsLAbel = locAlize('userSettingsRemote', "Remote") +
			(hostLAbel ? ` [${hostLAbel}]` : '');
		this.userRemoteSettings = new Action('userSettingsRemote', remoteSettingsLAbel, '.settings-tAb', true, () => this.updAteTArget(ConfigurAtionTArget.USER_REMOTE));
		this.preferencesService.getEditAbleSettingsURI(ConfigurAtionTArget.USER_REMOTE).then(uri => {
			this.userRemoteSettings.tooltip = uri?.fsPAth || '';
		});

		this.workspAceSettings = new Action('workspAceSettings', locAlize('workspAceSettings', "WorkspAce"), '.settings-tAb', fAlse, () => this.updAteTArget(ConfigurAtionTArget.WORKSPACE));

		const folderSettingsAction = new Action('folderSettings', locAlize('folderSettings', "Folder"), '.settings-tAb', fAlse,
			(folder: IWorkspAceFolder | null) => this.updAteTArget(folder ? folder.uri : ConfigurAtionTArget.USER_LOCAL));
		this.folderSettings = this.instAntiAtionService.creAteInstAnce(FolderSettingsActionViewItem, folderSettingsAction);

		this.updAte();

		this.settingsSwitcherBAr.push([this.userLocAlSettings, this.userRemoteSettings, this.workspAceSettings, folderSettingsAction]);
	}

	get settingsTArget(): SettingsTArget | null {
		return this._settingsTArget;
	}

	set settingsTArget(settingsTArget: SettingsTArget | null) {
		this._settingsTArget = settingsTArget;
		this.userLocAlSettings.checked = ConfigurAtionTArget.USER_LOCAL === this.settingsTArget;
		this.userRemoteSettings.checked = ConfigurAtionTArget.USER_REMOTE === this.settingsTArget;
		this.workspAceSettings.checked = ConfigurAtionTArget.WORKSPACE === this.settingsTArget;
		if (this.settingsTArget instAnceof URI) {
			this.folderSettings.getAction().checked = true;
			this.folderSettings.folder = this.contextService.getWorkspAceFolder(this.settingsTArget As URI);
		} else {
			this.folderSettings.getAction().checked = fAlse;
		}
	}

	setResultCount(settingsTArget: SettingsTArget, count: number): void {
		if (settingsTArget === ConfigurAtionTArget.WORKSPACE) {
			let lAbel = locAlize('workspAceSettings', "WorkspAce");
			if (count) {
				lAbel += ` (${count})`;
			}

			this.workspAceSettings.lAbel = lAbel;
		} else if (settingsTArget === ConfigurAtionTArget.USER_LOCAL) {
			let lAbel = locAlize('userSettings', "User");
			if (count) {
				lAbel += ` (${count})`;
			}

			this.userLocAlSettings.lAbel = lAbel;
		} else if (settingsTArget instAnceof URI) {
			this.folderSettings.setCount(settingsTArget, count);
		}
	}

	privAte onWorkbenchStAteChAnged(): void {
		this.folderSettings.folder = null;
		this.updAte();
		if (this.settingsTArget === ConfigurAtionTArget.WORKSPACE && this.contextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE) {
			this.updAteTArget(ConfigurAtionTArget.USER_LOCAL);
		}
	}

	updAteTArget(settingsTArget: SettingsTArget): Promise<void> {
		const isSAmeTArget = this.settingsTArget === settingsTArget ||
			settingsTArget instAnceof URI &&
			this.settingsTArget instAnceof URI &&
			isEquAl(this.settingsTArget, settingsTArget);

		if (!isSAmeTArget) {
			this.settingsTArget = settingsTArget;
			this._onDidTArgetChAnge.fire(this.settingsTArget);
		}

		return Promise.resolve(undefined);
	}

	privAte Async updAte(): Promise<void> {
		this.settingsSwitcherBAr.domNode.clAssList.toggle('empty-workbench', this.contextService.getWorkbenchStAte() === WorkbenchStAte.EMPTY);
		this.userRemoteSettings.enAbled = !!(this.options.enAbleRemoteSettings && this.environmentService.remoteAuthority);
		this.workspAceSettings.enAbled = this.contextService.getWorkbenchStAte() !== WorkbenchStAte.EMPTY;
		this.folderSettings.getAction().enAbled = this.contextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE && this.contextService.getWorkspAce().folders.length > 0;

		this.workspAceSettings.tooltip = (AwAit this.preferencesService.getEditAbleSettingsURI(ConfigurAtionTArget.WORKSPACE))?.fsPAth || '';
	}
}

export interfAce SeArchOptions extends IInputOptions {
	focusKey?: IContextKey<booleAn>;
	showResultCount?: booleAn;
	AriALive?: string;
	AriALAbelledBy?: string;
}

export clAss SeArchWidget extends Widget {

	domNode!: HTMLElement;

	privAte countElement!: HTMLElement;
	privAte seArchContAiner!: HTMLElement;
	inputBox!: InputBox;
	privAte controlsDiv!: HTMLElement;

	privAte reAdonly _onDidChAnge: Emitter<string> = this._register(new Emitter<string>());
	reAdonly onDidChAnge: Event<string> = this._onDidChAnge.event;

	privAte reAdonly _onFocus: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onFocus: Event<void> = this._onFocus.event;

	constructor(pArent: HTMLElement, protected options: SeArchOptions,
		@IContextViewService privAte reAdonly contextViewService: IContextViewService,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
		@IThemeService privAte reAdonly themeService: IThemeService
	) {
		super();
		this.creAte(pArent);
	}

	privAte creAte(pArent: HTMLElement) {
		this.domNode = DOM.Append(pArent, DOM.$('div.settings-heAder-widget'));
		this.creAteSeArchContAiner(DOM.Append(this.domNode, DOM.$('div.settings-seArch-contAiner')));
		this.controlsDiv = DOM.Append(this.domNode, DOM.$('div.settings-seArch-controls'));

		if (this.options.showResultCount) {
			this.countElement = DOM.Append(this.controlsDiv, DOM.$('.settings-count-widget'));
			this._register(AttAchStylerCAllbAck(this.themeService, { bAdgeBAckground, contrAstBorder }, colors => {
				const bAckground = colors.bAdgeBAckground ? colors.bAdgeBAckground.toString() : '';
				const border = colors.contrAstBorder ? colors.contrAstBorder.toString() : '';

				this.countElement.style.bAckgroundColor = bAckground;

				this.countElement.style.borderWidth = border ? '1px' : '';
				this.countElement.style.borderStyle = border ? 'solid' : '';
				this.countElement.style.borderColor = border;

				const color = this.themeService.getColorTheme().getColor(bAdgeForeground);
				this.countElement.style.color = color ? color.toString() : '';
			}));
		}

		this.inputBox.inputElement.setAttribute('AriA-live', this.options.AriALive || 'off');
		if (this.options.AriALAbelledBy) {
			this.inputBox.inputElement.setAttribute('AriA-lAbelledBy', this.options.AriALAbelledBy);
		}
		const focusTrAcker = this._register(DOM.trAckFocus(this.inputBox.inputElement));
		this._register(focusTrAcker.onDidFocus(() => this._onFocus.fire()));

		const focusKey = this.options.focusKey;
		if (focusKey) {
			this._register(focusTrAcker.onDidFocus(() => focusKey.set(true)));
			this._register(focusTrAcker.onDidBlur(() => focusKey.set(fAlse)));
		}
	}

	privAte creAteSeArchContAiner(seArchContAiner: HTMLElement) {
		this.seArchContAiner = seArchContAiner;
		const seArchInput = DOM.Append(this.seArchContAiner, DOM.$('div.settings-seArch-input'));
		this.inputBox = this._register(this.creAteInputBox(seArchInput));
		this._register(this.inputBox.onDidChAnge(vAlue => this._onDidChAnge.fire(vAlue)));
	}

	protected creAteInputBox(pArent: HTMLElement): InputBox {
		const box = this._register(new InputBox(pArent, this.contextViewService, this.options));
		this._register(AttAchInputBoxStyler(box, this.themeService));

		return box;
	}

	showMessAge(messAge: string): void {
		// Avoid setting the AriA-lAbel unnecessArily, the screenreAder will reAd the count every time it's set, since it's AriA-live:Assertive. #50968
		if (this.countElement && messAge !== this.countElement.textContent) {
			this.countElement.textContent = messAge;
			this.inputBox.inputElement.setAttribute('AriA-lAbel', messAge);
			this.inputBox.inputElement.style.pAddingRight = this.getControlsWidth() + 'px';
		}
	}

	lAyout(dimension: DOM.Dimension) {
		if (dimension.width < 400) {
			if (this.countElement) {
				this.countElement.clAssList.Add('hide');
			}

			this.inputBox.inputElement.style.pAddingRight = '0px';
		} else {
			if (this.countElement) {
				this.countElement.clAssList.remove('hide');
			}

			this.inputBox.inputElement.style.pAddingRight = this.getControlsWidth() + 'px';
		}
	}

	privAte getControlsWidth(): number {
		const countWidth = this.countElement ? DOM.getTotAlWidth(this.countElement) : 0;
		return countWidth + 20;
	}

	focus() {
		this.inputBox.focus();
		if (this.getVAlue()) {
			this.inputBox.select();
		}
	}

	hAsFocus(): booleAn {
		return this.inputBox.hAsFocus();
	}

	cleAr() {
		this.inputBox.vAlue = '';
	}

	getVAlue(): string {
		return this.inputBox.vAlue;
	}

	setVAlue(vAlue: string): string {
		return this.inputBox.vAlue = vAlue;
	}

	dispose(): void {
		if (this.options.focusKey) {
			this.options.focusKey.set(fAlse);
		}
		super.dispose();
	}
}

export const preferencesEditIcon = registerIcon('preferences-edit', Codicon.edit, locAlize('preferencesEditIcon', 'Icon for the edit Action in preferences.'));

export clAss EditPreferenceWidget<T> extends DisposAble {

	privAte _line: number = -1;
	privAte _preferences: T[] = [];

	privAte _editPreferenceDecorAtion: string[];

	privAte reAdonly _onClick = this._register(new Emitter<IEditorMouseEvent>());
	reAdonly onClick: Event<IEditorMouseEvent> = this._onClick.event;

	constructor(privAte editor: ICodeEditor
	) {
		super();
		this._editPreferenceDecorAtion = [];
		this._register(this.editor.onMouseDown((e: IEditorMouseEvent) => {
			const dAtA = e.tArget.detAil As IMArginDAtA;
			if (e.tArget.type !== MouseTArgetType.GUTTER_GLYPH_MARGIN || dAtA.isAfterLines || !this.isVisible()) {
				return;
			}
			this._onClick.fire(e);
		}));
	}

	get preferences(): T[] {
		return this._preferences;
	}

	getLine(): number {
		return this._line;
	}

	show(line: number, hoverMessAge: string, preferences: T[]): void {
		this._preferences = preferences;
		const newDecorAtion: IModelDeltADecorAtion[] = [];
		this._line = line;
		newDecorAtion.push({
			options: {
				glyphMArginClAssNAme: preferencesEditIcon.clAssNAmes,
				glyphMArginHoverMessAge: new MArkdownString().AppendText(hoverMessAge),
				stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
			},
			rAnge: {
				stArtLineNumber: line,
				stArtColumn: 1,
				endLineNumber: line,
				endColumn: 1
			}
		});
		this._editPreferenceDecorAtion = this.editor.deltADecorAtions(this._editPreferenceDecorAtion, newDecorAtion);
	}

	hide(): void {
		this._editPreferenceDecorAtion = this.editor.deltADecorAtions(this._editPreferenceDecorAtion, []);
	}

	isVisible(): booleAn {
		return this._editPreferenceDecorAtion.length > 0;
	}

	dispose(): void {
		this.hide();
		super.dispose();
	}
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {

	collector.AddRule(`
		.settings-tAbs-widget > .monAco-Action-bAr .Action-item .Action-lAbel:focus,
		.settings-tAbs-widget > .monAco-Action-bAr .Action-item .Action-lAbel.checked {
			border-bottom: 1px solid;
		}
	`);
	// Title Active
	const titleActive = theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND);
	const titleActiveBorder = theme.getColor(PANEL_ACTIVE_TITLE_BORDER);
	if (titleActive || titleActiveBorder) {
		collector.AddRule(`
			.settings-tAbs-widget > .monAco-Action-bAr .Action-item .Action-lAbel:hover,
			.settings-tAbs-widget > .monAco-Action-bAr .Action-item .Action-lAbel.checked {
				color: ${titleActive};
				border-bottom-color: ${titleActiveBorder};
			}
		`);
	}

	// Title InActive
	const titleInActive = theme.getColor(PANEL_INACTIVE_TITLE_FOREGROUND);
	if (titleInActive) {
		collector.AddRule(`
			.settings-tAbs-widget > .monAco-Action-bAr .Action-item .Action-lAbel {
				color: ${titleInActive};
			}
		`);
	}

	// Title focus
	const focusBorderColor = theme.getColor(focusBorder);
	if (focusBorderColor) {
		collector.AddRule(`
			.settings-tAbs-widget > .monAco-Action-bAr .Action-item .Action-lAbel:focus {
				border-bottom-color: ${focusBorderColor} !importAnt;
			}
			`);
		collector.AddRule(`
			.settings-tAbs-widget > .monAco-Action-bAr .Action-item .Action-lAbel:focus {
				outline: none;
			}
			`);
	}

	// Styling with Outline color (e.g. high contrAst theme)
	const outline = theme.getColor(ActiveContrAstBorder);
	if (outline) {
		const outline = theme.getColor(ActiveContrAstBorder);

		collector.AddRule(`
			.settings-tAbs-widget > .monAco-Action-bAr .Action-item .Action-lAbel.checked,
			.settings-tAbs-widget > .monAco-Action-bAr .Action-item .Action-lAbel:hover {
				outline-color: ${outline};
				outline-width: 1px;
				outline-style: solid;
				border-bottom: none;
				pAdding-bottom: 0;
				outline-offset: -1px;
			}

			.settings-tAbs-widget > .monAco-Action-bAr .Action-item .Action-lAbel:not(.checked):hover {
				outline-style: dAshed;
			}
		`);
	}
});
