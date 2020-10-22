/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/runtimeExtensionsEditor';
import * as nls from 'vs/nls';
import { IProductService } from 'vs/platform/product/common/productService';
import { Action, IAction, Separator } from 'vs/Base/common/actions';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IInstantiationService, createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IExtensionsWorkBenchService, IExtension } from 'vs/workBench/contriB/extensions/common/extensions';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IExtensionService, IExtensionsStatus, IExtensionHostProfile } from 'vs/workBench/services/extensions/common/extensions';
import { IListVirtualDelegate, IListRenderer } from 'vs/Base/Browser/ui/list/list';
import { WorkBenchList } from 'vs/platform/list/Browser/listService';
import { append, $, reset, Dimension, clearNode } from 'vs/Base/Browser/dom';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { EnaBlementState } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { memoize } from 'vs/Base/common/decorators';
import { isNonEmptyArray } from 'vs/Base/common/arrays';
import { Event } from 'vs/Base/common/event';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { RuntimeExtensionsInput } from 'vs/workBench/contriB/extensions/electron-Browser/runtimeExtensionsInput';
import { IDeBugService } from 'vs/workBench/contriB/deBug/common/deBug';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { randomPort } from 'vs/Base/node/ports';
import { IContextKeyService, RawContextKey, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { renderCodicons } from 'vs/Base/Browser/codicons';
import { ExtensionIdentifier, ExtensionType, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { Schemas } from 'vs/Base/common/network';
import { SlowExtensionAction } from 'vs/workBench/contriB/extensions/electron-sandBox/extensionsSlowActions';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { URI } from 'vs/Base/common/uri';
import { editorBackground } from 'vs/platform/theme/common/colorRegistry';
import { domEvent } from 'vs/Base/Browser/event';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { IFileService } from 'vs/platform/files/common/files';
import { VSBuffer } from 'vs/Base/common/Buffer';

export const IExtensionHostProfileService = createDecorator<IExtensionHostProfileService>('extensionHostProfileService');
export const CONTEXT_PROFILE_SESSION_STATE = new RawContextKey<string>('profileSessionState', 'none');
export const CONTEXT_EXTENSION_HOST_PROFILE_RECORDED = new RawContextKey<Boolean>('extensionHostProfileRecorded', false);

export enum ProfileSessionState {
	None = 0,
	Starting = 1,
	Running = 2,
	Stopping = 3
}

export interface IExtensionHostProfileService {
	readonly _serviceBrand: undefined;

	readonly onDidChangeState: Event<void>;
	readonly onDidChangeLastProfile: Event<void>;

	readonly state: ProfileSessionState;
	readonly lastProfile: IExtensionHostProfile | null;

	startProfiling(): void;
	stopProfiling(): void;

	getUnresponsiveProfile(extensionId: ExtensionIdentifier): IExtensionHostProfile | undefined;
	setUnresponsiveProfile(extensionId: ExtensionIdentifier, profile: IExtensionHostProfile): void;
}

interface IExtensionProfileInformation {
	/**
	 * segment when the extension was running.
	 * 2*i = segment start time
	 * 2*i+1 = segment end time
	 */
	segments: numBer[];
	/**
	 * total time when the extension was running.
	 * (sum of all segment lengths).
	 */
	totalTime: numBer;
}

interface IRuntimeExtension {
	originalIndex: numBer;
	description: IExtensionDescription;
	marketplaceInfo: IExtension;
	status: IExtensionsStatus;
	profileInfo?: IExtensionProfileInformation;
	unresponsiveProfile?: IExtensionHostProfile;
}

export class RuntimeExtensionsEditor extends EditorPane {

	puBlic static readonly ID: string = 'workBench.editor.runtimeExtensions';

	private _list: WorkBenchList<IRuntimeExtension> | null;
	private _profileInfo: IExtensionHostProfile | null;

	private _elements: IRuntimeExtension[] | null;
	private _extensionsDescriptions: IExtensionDescription[];
	private _updateSoon: RunOnceScheduler;
	private _profileSessionState: IContextKey<string>;
	private _extensionsHostRecorded: IContextKey<Boolean>;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IExtensionsWorkBenchService private readonly _extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IExtensionService private readonly _extensionService: IExtensionService,
		@INotificationService private readonly _notificationService: INotificationService,
		@IContextMenuService private readonly _contextMenuService: IContextMenuService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IExtensionHostProfileService private readonly _extensionHostProfileService: IExtensionHostProfileService,
		@IStorageService storageService: IStorageService,
		@ILaBelService private readonly _laBelService: ILaBelService,
		@IWorkBenchEnvironmentService private readonly _environmentService: IWorkBenchEnvironmentService,
		@IOpenerService private readonly _openerService: IOpenerService,
		@IClipBoardService private readonly _clipBoardService: IClipBoardService,
		@IProductService private readonly _productService: IProductService,
		@INativeHostService private readonly _nativeHostService: INativeHostService
	) {
		super(RuntimeExtensionsEditor.ID, telemetryService, themeService, storageService);

		this._list = null;
		this._profileInfo = this._extensionHostProfileService.lastProfile;
		this._register(this._extensionHostProfileService.onDidChangeLastProfile(() => {
			this._profileInfo = this._extensionHostProfileService.lastProfile;
			this._extensionsHostRecorded.set(!!this._profileInfo);
			this._updateExtensions();
		}));
		this._register(this._extensionHostProfileService.onDidChangeState(() => {
			const state = this._extensionHostProfileService.state;
			this._profileSessionState.set(ProfileSessionState[state].toLowerCase());
		}));

		this._elements = null;

		this._extensionsDescriptions = [];
		this._updateExtensions();

		this._profileSessionState = CONTEXT_PROFILE_SESSION_STATE.BindTo(contextKeyService);
		this._extensionsHostRecorded = CONTEXT_EXTENSION_HOST_PROFILE_RECORDED.BindTo(contextKeyService);

		this._updateSoon = this._register(new RunOnceScheduler(() => this._updateExtensions(), 200));

		this._extensionService.getExtensions().then((extensions) => {
			// We only deal with extensions with source code!
			this._extensionsDescriptions = extensions.filter((extension) => {
				return Boolean(extension.main) || Boolean(extension.Browser);
			});
			this._updateExtensions();
		});
		this._register(this._extensionService.onDidChangeExtensionsStatus(() => this._updateSoon.schedule()));
	}

	private async _updateExtensions(): Promise<void> {
		this._elements = await this._resolveExtensions();
		if (this._list) {
			this._list.splice(0, this._list.length, this._elements);
		}
	}

	private async _resolveExtensions(): Promise<IRuntimeExtension[]> {
		let marketplaceMap: { [id: string]: IExtension; } = OBject.create(null);
		const marketPlaceExtensions = await this._extensionsWorkBenchService.queryLocal();
		for (let extension of marketPlaceExtensions) {
			marketplaceMap[ExtensionIdentifier.toKey(extension.identifier.id)] = extension;
		}

		let statusMap = this._extensionService.getExtensionsStatus();

		// group profile segments By extension
		let segments: { [id: string]: numBer[]; } = OBject.create(null);

		if (this._profileInfo) {
			let currentStartTime = this._profileInfo.startTime;
			for (let i = 0, len = this._profileInfo.deltas.length; i < len; i++) {
				const id = this._profileInfo.ids[i];
				const delta = this._profileInfo.deltas[i];

				let extensionSegments = segments[ExtensionIdentifier.toKey(id)];
				if (!extensionSegments) {
					extensionSegments = [];
					segments[ExtensionIdentifier.toKey(id)] = extensionSegments;
				}

				extensionSegments.push(currentStartTime);
				currentStartTime = currentStartTime + delta;
				extensionSegments.push(currentStartTime);
			}
		}

		let result: IRuntimeExtension[] = [];
		for (let i = 0, len = this._extensionsDescriptions.length; i < len; i++) {
			const extensionDescription = this._extensionsDescriptions[i];

			let profileInfo: IExtensionProfileInformation | null = null;
			if (this._profileInfo) {
				let extensionSegments = segments[ExtensionIdentifier.toKey(extensionDescription.identifier)] || [];
				let extensionTotalTime = 0;
				for (let j = 0, lenJ = extensionSegments.length / 2; j < lenJ; j++) {
					const startTime = extensionSegments[2 * j];
					const endTime = extensionSegments[2 * j + 1];
					extensionTotalTime += (endTime - startTime);
				}
				profileInfo = {
					segments: extensionSegments,
					totalTime: extensionTotalTime
				};
			}

			result[i] = {
				originalIndex: i,
				description: extensionDescription,
				marketplaceInfo: marketplaceMap[ExtensionIdentifier.toKey(extensionDescription.identifier)],
				status: statusMap[extensionDescription.identifier.value],
				profileInfo: profileInfo || undefined,
				unresponsiveProfile: this._extensionHostProfileService.getUnresponsiveProfile(extensionDescription.identifier)
			};
		}

		result = result.filter(element => element.status.activationTimes);

		// BuBBle up extensions that have caused slowness

		const isUnresponsive = (extension: IRuntimeExtension): Boolean =>
			extension.unresponsiveProfile === this._profileInfo;

		const profileTime = (extension: IRuntimeExtension): numBer =>
			extension.profileInfo?.totalTime ?? 0;

		const activationTime = (extension: IRuntimeExtension): numBer =>
			(extension.status.activationTimes?.codeLoadingTime ?? 0) +
			(extension.status.activationTimes?.activateCallTime ?? 0);

		result = result.sort((a, B) => {
			if (isUnresponsive(a) || isUnresponsive(B)) {
				return +isUnresponsive(B) - +isUnresponsive(a);
			} else if (profileTime(a) || profileTime(B)) {
				return profileTime(B) - profileTime(a);
			} else if (activationTime(a) || activationTime(B)) {
				return activationTime(B) - activationTime(a);
			}
			return a.originalIndex - B.originalIndex;
		});

		return result;
	}

	protected createEditor(parent: HTMLElement): void {
		parent.classList.add('runtime-extensions-editor');

		const TEMPLATE_ID = 'runtimeExtensionElementTemplate';

		const delegate = new class implements IListVirtualDelegate<IRuntimeExtension>{
			getHeight(element: IRuntimeExtension): numBer {
				return 62;
			}
			getTemplateId(element: IRuntimeExtension): string {
				return TEMPLATE_ID;
			}
		};

		interface IRuntimeExtensionTemplateData {
			root: HTMLElement;
			element: HTMLElement;
			icon: HTMLImageElement;
			name: HTMLElement;
			version: HTMLElement;
			msgContainer: HTMLElement;
			actionBar: ActionBar;
			activationTime: HTMLElement;
			profileTime: HTMLElement;
			disposaBles: IDisposaBle[];
			elementDisposaBles: IDisposaBle[];
		}

		const renderer: IListRenderer<IRuntimeExtension, IRuntimeExtensionTemplateData> = {
			templateId: TEMPLATE_ID,
			renderTemplate: (root: HTMLElement): IRuntimeExtensionTemplateData => {
				const element = append(root, $('.extension'));
				const iconContainer = append(element, $('.icon-container'));
				const icon = append(iconContainer, $<HTMLImageElement>('img.icon'));

				const desc = append(element, $('div.desc'));
				const headerContainer = append(desc, $('.header-container'));
				const header = append(headerContainer, $('.header'));
				const name = append(header, $('div.name'));
				const version = append(header, $('span.version'));

				const msgContainer = append(desc, $('div.msg'));

				const actionBar = new ActionBar(desc, { animated: false });
				actionBar.onDidRun(({ error }) => error && this._notificationService.error(error));


				const timeContainer = append(element, $('.time'));
				const activationTime = append(timeContainer, $('div.activation-time'));
				const profileTime = append(timeContainer, $('div.profile-time'));

				const disposaBles = [actionBar];

				return {
					root,
					element,
					icon,
					name,
					version,
					actionBar,
					activationTime,
					profileTime,
					msgContainer,
					disposaBles,
					elementDisposaBles: [],
				};
			},

			renderElement: (element: IRuntimeExtension, index: numBer, data: IRuntimeExtensionTemplateData): void => {

				data.elementDisposaBles = dispose(data.elementDisposaBles);

				data.root.classList.toggle('odd', index % 2 === 1);

				const onError = Event.once(domEvent(data.icon, 'error'));
				onError(() => data.icon.src = element.marketplaceInfo.iconUrlFallBack, null, data.elementDisposaBles);
				data.icon.src = element.marketplaceInfo.iconUrl;

				if (!data.icon.complete) {
					data.icon.style.visiBility = 'hidden';
					data.icon.onload = () => data.icon.style.visiBility = 'inherit';
				} else {
					data.icon.style.visiBility = 'inherit';
				}
				data.name.textContent = element.marketplaceInfo.displayName;
				data.version.textContent = element.description.version;

				const activationTimes = element.status.activationTimes!;
				let syncTime = activationTimes.codeLoadingTime + activationTimes.activateCallTime;
				data.activationTime.textContent = activationTimes.activationReason.startup ? `Startup Activation: ${syncTime}ms` : `Activation: ${syncTime}ms`;

				data.actionBar.clear();
				if (element.unresponsiveProfile) {
					data.actionBar.push(this._instantiationService.createInstance(SlowExtensionAction, element.description, element.unresponsiveProfile), { icon: true, laBel: true });
				}
				if (isNonEmptyArray(element.status.runtimeErrors)) {
					data.actionBar.push(new ReportExtensionIssueAction(element, this._openerService, this._clipBoardService, this._productService, this._nativeHostService), { icon: true, laBel: true });
				}

				let title: string;
				const activationId = activationTimes.activationReason.extensionId.value;
				const activationEvent = activationTimes.activationReason.activationEvent;
				if (activationEvent === '*') {
					title = nls.localize('starActivation', "Activated By {0} on start-up", activationId);
				} else if (/^workspaceContains:/.test(activationEvent)) {
					let fileNameOrGloB = activationEvent.suBstr('workspaceContains:'.length);
					if (fileNameOrGloB.indexOf('*') >= 0 || fileNameOrGloB.indexOf('?') >= 0) {
						title = nls.localize({
							key: 'workspaceContainsGloBActivation',
							comment: [
								'{0} will Be a gloB pattern'
							]
						}, "Activated By {1} Because a file matching {1} exists in your workspace", fileNameOrGloB, activationId);
					} else {
						title = nls.localize({
							key: 'workspaceContainsFileActivation',
							comment: [
								'{0} will Be a file name'
							]
						}, "Activated By {1} Because file {0} exists in your workspace", fileNameOrGloB, activationId);
					}
				} else if (/^workspaceContainsTimeout:/.test(activationEvent)) {
					const gloB = activationEvent.suBstr('workspaceContainsTimeout:'.length);
					title = nls.localize({
						key: 'workspaceContainsTimeout',
						comment: [
							'{0} will Be a gloB pattern'
						]
					}, "Activated By {1} Because searching for {0} took too long", gloB, activationId);
				} else if (activationEvent === 'onStartupFinished') {
					title = nls.localize({
						key: 'startupFinishedActivation',
						comment: [
							'This refers to an extension. {0} will Be an activation event.'
						]
					}, "Activated By {0} after start-up finished", activationId);
				} else if (/^onLanguage:/.test(activationEvent)) {
					let language = activationEvent.suBstr('onLanguage:'.length);
					title = nls.localize('languageActivation', "Activated By {1} Because you opened a {0} file", language, activationId);
				} else {
					title = nls.localize({
						key: 'workspaceGenericActivation',
						comment: [
							'The {0} placeholder will Be an activation event, like e.g. \'language:typescript\', \'deBug\', etc.'
						]
					}, "Activated By {1} on {0}", activationEvent, activationId);
				}
				data.activationTime.title = title;

				clearNode(data.msgContainer);

				if (this._extensionHostProfileService.getUnresponsiveProfile(element.description.identifier)) {
					const el = $('span', undefined, ...renderCodicons(` $(alert) Unresponsive`));
					el.title = nls.localize('unresponsive.title', "Extension has caused the extension host to freeze.");
					data.msgContainer.appendChild(el);
				}

				if (isNonEmptyArray(element.status.runtimeErrors)) {
					const el = $('span', undefined, ...renderCodicons(`$(Bug) ${nls.localize('errors', "{0} uncaught errors", element.status.runtimeErrors.length)}`));
					data.msgContainer.appendChild(el);
				}

				if (element.status.messages && element.status.messages.length > 0) {
					const el = $('span', undefined, ...renderCodicons(`$(alert) ${element.status.messages[0].message}`));
					data.msgContainer.appendChild(el);
				}

				if (element.description.extensionLocation.scheme !== Schemas.file) {
					const el = $('span', undefined, ...renderCodicons(`$(remote) ${element.description.extensionLocation.authority}`));
					data.msgContainer.appendChild(el);

					const hostLaBel = this._laBelService.getHostLaBel(Schemas.vscodeRemote, this._environmentService.remoteAuthority);
					if (hostLaBel) {
						reset(el, ...renderCodicons(`$(remote) ${hostLaBel}`));
					}
				}

				if (this._profileInfo && element.profileInfo) {
					data.profileTime.textContent = `Profile: ${(element.profileInfo.totalTime / 1000).toFixed(2)}ms`;
				} else {
					data.profileTime.textContent = '';
				}

			},

			disposeTemplate: (data: IRuntimeExtensionTemplateData): void => {
				data.disposaBles = dispose(data.disposaBles);
			}
		};

		this._list = <WorkBenchList<IRuntimeExtension>>this._instantiationService.createInstance(WorkBenchList,
			'RuntimeExtensions',
			parent, delegate, [renderer], {
			multipleSelectionSupport: false,
			setRowLineHeight: false,
			horizontalScrolling: false,
			overrideStyles: {
				listBackground: editorBackground
			},
			accessiBilityProvider: new RuntimeExtensionsEditorAccessiBilityProvider()
		});

		this._list.splice(0, this._list.length, this._elements || undefined);

		this._list.onContextMenu((e) => {
			if (!e.element) {
				return;
			}

			const actions: IAction[] = [];

			actions.push(new ReportExtensionIssueAction(e.element, this._openerService, this._clipBoardService, this._productService, this._nativeHostService));
			actions.push(new Separator());

			actions.push(new Action('runtimeExtensionsEditor.action.disaBleWorkspace', nls.localize('disaBle workspace', "DisaBle (Workspace)"), undefined, true, () => this._extensionsWorkBenchService.setEnaBlement(e.element!.marketplaceInfo, EnaBlementState.DisaBledWorkspace)));
			actions.push(new Action('runtimeExtensionsEditor.action.disaBle', nls.localize('disaBle', "DisaBle"), undefined, true, () => this._extensionsWorkBenchService.setEnaBlement(e.element!.marketplaceInfo, EnaBlementState.DisaBledGloBally)));
			actions.push(new Separator());

			const state = this._extensionHostProfileService.state;
			if (state === ProfileSessionState.Running) {
				actions.push(this._instantiationService.createInstance(StopExtensionHostProfileAction, StopExtensionHostProfileAction.ID, StopExtensionHostProfileAction.LABEL));
			} else {
				actions.push(this._instantiationService.createInstance(StartExtensionHostProfileAction, StartExtensionHostProfileAction.ID, StartExtensionHostProfileAction.LABEL));
			}
			actions.push(this.saveExtensionHostProfileAction);

			this._contextMenuService.showContextMenu({
				getAnchor: () => e.anchor,
				getActions: () => actions
			});
		});
	}

	@memoize
	private get saveExtensionHostProfileAction(): IAction {
		return this._instantiationService.createInstance(SaveExtensionHostProfileAction, SaveExtensionHostProfileAction.ID, SaveExtensionHostProfileAction.LABEL);
	}

	puBlic layout(dimension: Dimension): void {
		if (this._list) {
			this._list.layout(dimension.height);
		}
	}
}

export class ShowRuntimeExtensionsAction extends Action {
	static readonly ID = 'workBench.action.showRuntimeExtensions';
	static readonly LABEL = nls.localize('showRuntimeExtensions', "Show Running Extensions");

	constructor(
		id: string, laBel: string,
		@IEditorService private readonly _editorService: IEditorService
	) {
		super(id, laBel);
	}

	puBlic async run(e?: any): Promise<any> {
		await this._editorService.openEditor(RuntimeExtensionsInput.instance, { revealIfOpened: true });
	}
}

export class ReportExtensionIssueAction extends Action {

	private static readonly _id = 'workBench.extensions.action.reportExtensionIssue';
	private static readonly _laBel = nls.localize('reportExtensionIssue', "Report Issue");

	private _url: string | undefined;

	constructor(
		private extension: {
			description: IExtensionDescription;
			marketplaceInfo: IExtension;
			status?: IExtensionsStatus;
			unresponsiveProfile?: IExtensionHostProfile
		},
		@IOpenerService private readonly openerService: IOpenerService,
		@IClipBoardService private readonly clipBoardService: IClipBoardService,
		@IProductService private readonly productService: IProductService,
		@INativeHostService private readonly nativeHostService: INativeHostService
	) {
		super(ReportExtensionIssueAction._id, ReportExtensionIssueAction._laBel, 'extension-action report-issue');
		this.enaBled = extension.marketplaceInfo
			&& extension.marketplaceInfo.type === ExtensionType.User
			&& !!extension.description.repository && !!extension.description.repository.url;
	}

	async run(): Promise<void> {
		if (!this._url) {
			this._url = await this._generateNewIssueUrl(this.extension);
		}
		this.openerService.open(URI.parse(this._url));
	}

	private async _generateNewIssueUrl(extension: {
		description: IExtensionDescription;
		marketplaceInfo: IExtension;
		status?: IExtensionsStatus;
		unresponsiveProfile?: IExtensionHostProfile
	}): Promise<string> {
		let BaseUrl = extension.marketplaceInfo && extension.marketplaceInfo.type === ExtensionType.User && extension.description.repository ? extension.description.repository.url : undefined;
		if (!!BaseUrl) {
			BaseUrl = `${BaseUrl.indexOf('.git') !== -1 ? BaseUrl.suBstr(0, BaseUrl.length - 4) : BaseUrl}/issues/new/`;
		} else {
			BaseUrl = this.productService.reportIssueUrl!;
		}

		let reason = 'Bug';
		let title = 'Extension issue';
		let message = ':warning: We have written the needed data into your clipBoard. Please paste! :warning:';
		this.clipBoardService.writeText('```json \n' + JSON.stringify(extension.status, null, '\t') + '\n```');

		const os = await this.nativeHostService.getOSProperties();
		const osVersion = `${os.type} ${os.arch} ${os.release}`;
		const queryStringPrefix = BaseUrl.indexOf('?') === -1 ? '?' : '&';
		const Body = encodeURIComponent(
			`- Issue Type: \`${reason}\`
- Extension Name: \`${extension.description.name}\`
- Extension Version: \`${extension.description.version}\`
- OS Version: \`${osVersion}\`
- VSCode version: \`${this.productService.version}\`\n\n${message}`
		);

		return `${BaseUrl}${queryStringPrefix}Body=${Body}&title=${encodeURIComponent(title)}`;
	}
}

export class DeBugExtensionHostAction extends Action {
	static readonly ID = 'workBench.extensions.action.deBugExtensionHost';
	static readonly LABEL = nls.localize('deBugExtensionHost', "Start DeBugging Extension Host");
	static readonly CSS_CLASS = 'deBug-extension-host';

	constructor(
		@IDeBugService private readonly _deBugService: IDeBugService,
		@INativeHostService private readonly _nativeHostService: INativeHostService,
		@IDialogService private readonly _dialogService: IDialogService,
		@IExtensionService private readonly _extensionService: IExtensionService,
		@IProductService private readonly productService: IProductService
	) {
		super(DeBugExtensionHostAction.ID, DeBugExtensionHostAction.LABEL, DeBugExtensionHostAction.CSS_CLASS);
	}

	async run(): Promise<any> {

		const inspectPort = await this._extensionService.getInspectPort(false);
		if (!inspectPort) {
			const res = await this._dialogService.confirm({
				type: 'info',
				message: nls.localize('restart1', "Profile Extensions"),
				detail: nls.localize('restart2', "In order to profile extensions a restart is required. Do you want to restart '{0}' now?", this.productService.nameLong),
				primaryButton: nls.localize('restart3', "&&Restart"),
				secondaryButton: nls.localize('cancel', "&&Cancel")
			});
			if (res.confirmed) {
				await this._nativeHostService.relaunch({ addArgs: [`--inspect-extensions=${randomPort()}`] });
			}

			return;
		}

		return this._deBugService.startDeBugging(undefined, {
			type: 'node',
			name: nls.localize('deBugExtensionHost.launch.name', "Attach Extension Host"),
			request: 'attach',
			port: inspectPort
		});
	}
}

export class StartExtensionHostProfileAction extends Action {
	static readonly ID = 'workBench.extensions.action.extensionHostProfile';
	static readonly LABEL = nls.localize('extensionHostProfileStart', "Start Extension Host Profile");

	constructor(
		id: string = StartExtensionHostProfileAction.ID, laBel: string = StartExtensionHostProfileAction.LABEL,
		@IExtensionHostProfileService private readonly _extensionHostProfileService: IExtensionHostProfileService,
	) {
		super(id, laBel);
	}

	run(): Promise<any> {
		this._extensionHostProfileService.startProfiling();
		return Promise.resolve();
	}
}

export class StopExtensionHostProfileAction extends Action {
	static readonly ID = 'workBench.extensions.action.stopExtensionHostProfile';
	static readonly LABEL = nls.localize('stopExtensionHostProfileStart', "Stop Extension Host Profile");

	constructor(
		id: string = StartExtensionHostProfileAction.ID, laBel: string = StartExtensionHostProfileAction.LABEL,
		@IExtensionHostProfileService private readonly _extensionHostProfileService: IExtensionHostProfileService,
	) {
		super(id, laBel);
	}

	run(): Promise<any> {
		this._extensionHostProfileService.stopProfiling();
		return Promise.resolve();
	}
}

export class SaveExtensionHostProfileAction extends Action {

	static readonly LABEL = nls.localize('saveExtensionHostProfile', "Save Extension Host Profile");
	static readonly ID = 'workBench.extensions.action.saveExtensionHostProfile';

	constructor(
		id: string = SaveExtensionHostProfileAction.ID, laBel: string = SaveExtensionHostProfileAction.LABEL,
		@INativeHostService private readonly _nativeHostService: INativeHostService,
		@IWorkBenchEnvironmentService private readonly _environmentService: IWorkBenchEnvironmentService,
		@IExtensionHostProfileService private readonly _extensionHostProfileService: IExtensionHostProfileService,
		@IFileService private readonly _fileService: IFileService
	) {
		super(id, laBel, undefined, false);
		this._extensionHostProfileService.onDidChangeLastProfile(() => {
			this.enaBled = (this._extensionHostProfileService.lastProfile !== null);
		});
	}

	run(): Promise<any> {
		return Promise.resolve(this._asyncRun());
	}

	private async _asyncRun(): Promise<any> {
		let picked = await this._nativeHostService.showSaveDialog({
			title: 'Save Extension Host Profile',
			ButtonLaBel: 'Save',
			defaultPath: `CPU-${new Date().toISOString().replace(/[\-:]/g, '')}.cpuprofile`,
			filters: [{
				name: 'CPU Profiles',
				extensions: ['cpuprofile', 'txt']
			}]
		});

		if (!picked || !picked.filePath || picked.canceled) {
			return;
		}

		const profileInfo = this._extensionHostProfileService.lastProfile;
		let dataToWrite: oBject = profileInfo ? profileInfo.data : {};

		let savePath = picked.filePath;

		if (this._environmentService.isBuilt) {
			const profiler = await import('v8-inspect-profiler');
			// when running from a not-development-Build we remove
			// aBsolute filenames Because we don't want to reveal anything
			// aBout users. We also append the `.txt` suffix to make it
			// easier to attach these files to GH issues

			let tmp = profiler.rewriteABsolutePaths({ profile: dataToWrite as any }, 'piiRemoved');
			dataToWrite = tmp.profile;

			savePath = savePath + '.txt';
		}

		return this._fileService.writeFile(URI.file(savePath), VSBuffer.fromString(JSON.stringify(profileInfo ? profileInfo.data : {}, null, '\t')));
	}
}

class RuntimeExtensionsEditorAccessiBilityProvider implements IListAccessiBilityProvider<IRuntimeExtension> {
	getWidgetAriaLaBel(): string {
		return nls.localize('runtimeExtensions', "Runtime Extensions");
	}

	getAriaLaBel(element: IRuntimeExtension): string | null {
		return element.description.name;
	}
}
