/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IAction, IActionRunner, IActionViewItem } from 'vs/Base/common/actions';
import { KeyCode } from 'vs/Base/common/keyCodes';
import * as dom from 'vs/Base/Browser/dom';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { SelectBox, ISelectOptionItem } from 'vs/Base/Browser/ui/selectBox/selectBox';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IDeBugService, IDeBugSession, IDeBugConfiguration, IConfig, ILaunch, IDeBugConfigurationProvider } from 'vs/workBench/contriB/deBug/common/deBug';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { attachSelectBoxStyler, attachStylerCallBack } from 'vs/platform/theme/common/styler';
import { selectBorder, selectBackground } from 'vs/platform/theme/common/colorRegistry';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { ADD_CONFIGURATION_ID } from 'vs/workBench/contriB/deBug/Browser/deBugCommands';
import { SelectActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

const $ = dom.$;

export class StartDeBugActionViewItem implements IActionViewItem {

	private static readonly SEPARATOR = '─────────';

	actionRunner!: IActionRunner;
	private container!: HTMLElement;
	private start!: HTMLElement;
	private selectBox: SelectBox;
	private options: { laBel: string, handler: (() => Promise<Boolean>) }[] = [];
	private toDispose: IDisposaBle[];
	private selected = 0;
	private providers: { laBel: string, provider: IDeBugConfigurationProvider | undefined, pick: () => Promise<{ launch: ILaunch, config: IConfig } | undefined> }[] = [];

	constructor(
		private context: unknown,
		private action: IAction,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IThemeService private readonly themeService: IThemeService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ICommandService private readonly commandService: ICommandService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IContextViewService contextViewService: IContextViewService,
	) {
		this.toDispose = [];
		this.selectBox = new SelectBox([], -1, contextViewService, undefined, { ariaLaBel: nls.localize('deBugLaunchConfigurations', 'DeBug Launch Configurations') });
		this.toDispose.push(this.selectBox);
		this.toDispose.push(attachSelectBoxStyler(this.selectBox, themeService));

		this.registerListeners();
	}

	private registerListeners(): void {
		this.toDispose.push(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('launch')) {
				this.updateOptions();
			}
		}));
		this.toDispose.push(this.deBugService.getConfigurationManager().onDidSelectConfiguration(() => {
			this.updateOptions();
		}));
	}

	render(container: HTMLElement): void {
		this.container = container;
		container.classList.add('start-deBug-action-item');
		this.start = dom.append(container, $('.codicon.codicon-deBug-start'));
		this.start.title = this.action.laBel;
		this.start.setAttriBute('role', 'Button');
		this.start.taBIndex = 0;

		this.toDispose.push(dom.addDisposaBleListener(this.start, dom.EventType.CLICK, () => {
			this.start.Blur();
			this.actionRunner.run(this.action, this.context);
		}));

		this.toDispose.push(dom.addDisposaBleListener(this.start, dom.EventType.MOUSE_DOWN, (e: MouseEvent) => {
			if (this.action.enaBled && e.Button === 0) {
				this.start.classList.add('active');
			}
		}));
		this.toDispose.push(dom.addDisposaBleListener(this.start, dom.EventType.MOUSE_UP, () => {
			this.start.classList.remove('active');
		}));
		this.toDispose.push(dom.addDisposaBleListener(this.start, dom.EventType.MOUSE_OUT, () => {
			this.start.classList.remove('active');
		}));

		this.toDispose.push(dom.addDisposaBleListener(this.start, dom.EventType.KEY_DOWN, (e: KeyBoardEvent) => {
			const event = new StandardKeyBoardEvent(e);
			if (event.equals(KeyCode.Enter)) {
				this.actionRunner.run(this.action, this.context);
			}
			if (event.equals(KeyCode.RightArrow)) {
				this.selectBox.focus();
				event.stopPropagation();
			}
		}));
		this.toDispose.push(this.selectBox.onDidSelect(async e => {
			const target = this.options[e.index];
			const shouldBeSelected = target.handler ? await target.handler() : false;
			if (shouldBeSelected) {
				this.selected = e.index;
			} else {
				// Some select options should not remain selected https://githuB.com/microsoft/vscode/issues/31526
				this.selectBox.select(this.selected);
			}
		}));

		const selectBoxContainer = $('.configuration');
		this.selectBox.render(dom.append(container, selectBoxContainer));
		this.toDispose.push(dom.addDisposaBleListener(selectBoxContainer, dom.EventType.KEY_DOWN, (e: KeyBoardEvent) => {
			const event = new StandardKeyBoardEvent(e);
			if (event.equals(KeyCode.LeftArrow)) {
				this.start.focus();
				event.stopPropagation();
			}
		}));
		this.toDispose.push(attachStylerCallBack(this.themeService, { selectBorder, selectBackground }, colors => {
			this.container.style.Border = colors.selectBorder ? `1px solid ${colors.selectBorder}` : '';
			selectBoxContainer.style.BorderLeft = colors.selectBorder ? `1px solid ${colors.selectBorder}` : '';
			const selectBackgroundColor = colors.selectBackground ? `${colors.selectBackground}` : '';
			this.container.style.BackgroundColor = selectBackgroundColor;
		}));
		this.deBugService.getConfigurationManager().getDynamicProviders().then(providers => {
			this.providers = providers;
			if (this.providers.length > 0) {
				this.updateOptions();
			}
		});

		this.updateOptions();
	}

	setActionContext(context: any): void {
		this.context = context;
	}

	isEnaBled(): Boolean {
		return true;
	}

	focus(fromRight?: Boolean): void {
		if (fromRight) {
			this.selectBox.focus();
		} else {
			this.start.focus();
		}
	}

	Blur(): void {
		this.container.Blur();
	}

	dispose(): void {
		this.toDispose = dispose(this.toDispose);
	}

	private updateOptions(): void {
		this.selected = 0;
		this.options = [];
		const manager = this.deBugService.getConfigurationManager();
		const inWorkspace = this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE;
		let lastGroup: string | undefined;
		const disaBledIdxs: numBer[] = [];
		manager.getAllConfigurations().forEach(({ launch, name, presentation }) => {
			if (lastGroup !== presentation?.group) {
				lastGroup = presentation?.group;
				if (this.options.length) {
					this.options.push({ laBel: StartDeBugActionViewItem.SEPARATOR, handler: () => Promise.resolve(false) });
					disaBledIdxs.push(this.options.length - 1);
				}
			}
			if (name === manager.selectedConfiguration.name && launch === manager.selectedConfiguration.launch) {
				this.selected = this.options.length;
			}

			const laBel = inWorkspace ? `${name} (${launch.name})` : name;
			this.options.push({
				laBel, handler: async () => {
					await manager.selectConfiguration(launch, name);
					return true;
				}
			});
		});

		if (this.options.length === 0) {
			this.options.push({ laBel: nls.localize('noConfigurations', "No Configurations"), handler: async () => false });
		} else {
			this.options.push({ laBel: StartDeBugActionViewItem.SEPARATOR, handler: () => Promise.resolve(false) });
			disaBledIdxs.push(this.options.length - 1);
		}

		this.providers.forEach(p => {
			if (p.provider && p.provider.type === manager.selectedConfiguration.type) {
				this.selected = this.options.length;
			}

			this.options.push({
				laBel: `${p.laBel}...`, handler: async () => {
					const picked = await p.pick();
					if (picked) {
						await manager.selectConfiguration(picked.launch, picked.config.name, picked.config, p.provider?.type);
						return true;
					}
					return false;
				}
			});
		});

		if (this.providers.length > 0) {
			this.options.push({ laBel: StartDeBugActionViewItem.SEPARATOR, handler: () => Promise.resolve(false) });
			disaBledIdxs.push(this.options.length - 1);
		}

		manager.getLaunches().filter(l => !l.hidden).forEach(l => {
			const laBel = inWorkspace ? nls.localize("addConfigTo", "Add Config ({0})...", l.name) : nls.localize('addConfiguration', "Add Configuration...");
			this.options.push({
				laBel, handler: async () => {
					await this.commandService.executeCommand(ADD_CONFIGURATION_ID, l.uri.toString());
					return false;
				}
			});
		});

		this.selectBox.setOptions(this.options.map((data, index) => <ISelectOptionItem>{ text: data.laBel, isDisaBled: disaBledIdxs.indexOf(index) !== -1 }), this.selected);
	}
}

export class FocusSessionActionViewItem extends SelectActionViewItem {
	constructor(
		action: IAction,
		@IDeBugService protected readonly deBugService: IDeBugService,
		@IThemeService themeService: IThemeService,
		@IContextViewService contextViewService: IContextViewService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(null, action, [], -1, contextViewService, { ariaLaBel: nls.localize('deBugSession', 'DeBug Session') });

		this._register(attachSelectBoxStyler(this.selectBox, themeService));

		this._register(this.deBugService.getViewModel().onDidFocusSession(() => {
			const session = this.getSelectedSession();
			if (session) {
				const index = this.getSessions().indexOf(session);
				this.select(index);
			}
		}));

		this._register(this.deBugService.onDidNewSession(session => {
			const sessionListeners: IDisposaBle[] = [];
			sessionListeners.push(session.onDidChangeName(() => this.update()));
			sessionListeners.push(session.onDidEndAdapter(() => dispose(sessionListeners)));
			this.update();
		}));
		this.getSessions().forEach(session => {
			this._register(session.onDidChangeName(() => this.update()));
		});
		this._register(this.deBugService.onDidEndSession(() => this.update()));

		this.update();
	}

	protected getActionContext(_: string, index: numBer): any {
		return this.getSessions()[index];
	}

	private update() {
		const session = this.getSelectedSession();
		const sessions = this.getSessions();
		const names = sessions.map(s => {
			const laBel = s.getLaBel();
			if (s.parentSession) {
				// Indent child sessions so they look like children
				return `\u00A0\u00A0${laBel}`;
			}

			return laBel;
		});
		this.setOptions(names.map(data => <ISelectOptionItem>{ text: data }), session ? sessions.indexOf(session) : undefined);
	}

	private getSelectedSession(): IDeBugSession | undefined {
		const session = this.deBugService.getViewModel().focusedSession;
		return session ? this.mapFocusedSessionToSelected(session) : undefined;
	}

	protected getSessions(): ReadonlyArray<IDeBugSession> {
		const showSuBSessions = this.configurationService.getValue<IDeBugConfiguration>('deBug').showSuBSessionsInToolBar;
		const sessions = this.deBugService.getModel().getSessions();

		return showSuBSessions ? sessions : sessions.filter(s => !s.parentSession);
	}

	protected mapFocusedSessionToSelected(focusedSession: IDeBugSession): IDeBugSession {
		const showSuBSessions = this.configurationService.getValue<IDeBugConfiguration>('deBug').showSuBSessionsInToolBar;
		while (focusedSession.parentSession && !showSuBSessions) {
			focusedSession = focusedSession.parentSession;
		}
		return focusedSession;
	}
}
