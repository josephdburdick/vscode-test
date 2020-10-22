/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/extensionActions';
import { localize } from 'vs/nls';
import { IAction, Action, Separator, SuBmenuAction } from 'vs/Base/common/actions';
import { Delayer } from 'vs/Base/common/async';
import * as DOM from 'vs/Base/Browser/dom';
import { Event } from 'vs/Base/common/event';
import * as json from 'vs/Base/common/json';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { dispose, DisposaBle } from 'vs/Base/common/lifecycle';
import { IExtension, ExtensionState, IExtensionsWorkBenchService, VIEWLET_ID, IExtensionsViewPaneContainer, AutoUpdateConfigurationKey, IExtensionContainer, TOGGLE_IGNORE_EXTENSION_ACTION_ID, INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID } from 'vs/workBench/contriB/extensions/common/extensions';
import { ExtensionsConfigurationInitialContent } from 'vs/workBench/contriB/extensions/common/extensionsFileTemplate';
import { IGalleryExtension, IExtensionGalleryService, INSTALL_ERROR_MALICIOUS, INSTALL_ERROR_INCOMPATIBLE, IGalleryExtensionVersion, ILocalExtension, INSTALL_ERROR_NOT_SUPPORTED } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IWorkBenchExtensionEnaBlementService, EnaBlementState, IExtensionManagementServerService, IExtensionManagementServer } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { IExtensionIgnoredRecommendationsService, IExtensionsConfigContent } from 'vs/workBench/services/extensionRecommendations/common/extensionRecommendations';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { ExtensionType, ExtensionIdentifier, IExtensionDescription, IExtensionManifest, isLanguagePackExtension } from 'vs/platform/extensions/common/extensions';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ShowViewletAction } from 'vs/workBench/Browser/viewlet';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { Query } from 'vs/workBench/contriB/extensions/common/extensionQuery';
import { IFileService, IFileContent } from 'vs/platform/files/common/files';
import { IWorkspaceContextService, WorkBenchState, IWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IExtensionService, toExtension, toExtensionDescription } from 'vs/workBench/services/extensions/common/extensions';
import { URI } from 'vs/Base/common/uri';
import { CommandsRegistry, ICommandService } from 'vs/platform/commands/common/commands';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { registerThemingParticipant, IColorTheme, ICssStyleCollector } from 'vs/platform/theme/common/themeService';
import { ButtonBackground, ButtonForeground, ButtonHoverBackground, contrastBorder, registerColor, foreground } from 'vs/platform/theme/common/colorRegistry';
import { Color } from 'vs/Base/common/color';
import { IJSONEditingService } from 'vs/workBench/services/configuration/common/jsonEditing';
import { ITextEditorSelection } from 'vs/platform/editor/common/editor';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { MenuRegistry, MenuId, IMenuService } from 'vs/platform/actions/common/actions';
import { PICK_WORKSPACE_FOLDER_COMMAND_ID } from 'vs/workBench/Browser/actions/workspaceCommands';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { mnemonicButtonLaBel } from 'vs/Base/common/laBels';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { ExtensionsInput } from 'vs/workBench/contriB/extensions/common/extensionsInput';
import { IQuickPickItem, IQuickInputService, IQuickPickSeparator } from 'vs/platform/quickinput/common/quickInput';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { alert } from 'vs/Base/Browser/ui/aria/aria';
import { coalesce } from 'vs/Base/common/arrays';
import { IWorkBenchThemeService, IWorkBenchTheme, IWorkBenchColorTheme, IWorkBenchFileIconTheme, IWorkBenchProductIconTheme } from 'vs/workBench/services/themes/common/workBenchThemeService';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { prefersExecuteOnUI, prefersExecuteOnWorkspace, canExecuteOnUI, canExecuteOnWorkspace } from 'vs/workBench/services/extensions/common/extensionsUtil';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { IProductService } from 'vs/platform/product/common/productService';
import { IFileDialogService, IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { Codicon } from 'vs/Base/common/codicons';
import { IViewsService } from 'vs/workBench/common/views';
import { IActionViewItemOptions, ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';
import { EXTENSIONS_CONFIG } from 'vs/workBench/services/extensionRecommendations/common/workspaceExtensionsConfig';

const promptDownloadManually = (extension: IGalleryExtension | undefined, message: string, error: Error, instantiationService: IInstantiationService): Promise<any> => {
	return instantiationService.invokeFunction(accessor => {
		const productService = accessor.get(IProductService);
		const openerService = accessor.get(IOpenerService);
		const notificationService = accessor.get(INotificationService);
		const dialogService = accessor.get(IDialogService);
		const erorrsToShows = [INSTALL_ERROR_INCOMPATIBLE, INSTALL_ERROR_MALICIOUS, INSTALL_ERROR_NOT_SUPPORTED];
		if (!extension || erorrsToShows.indexOf(error.name) !== -1 || !productService.extensionsGallery) {
			return dialogService.show(Severity.Error, error.message, []);
		} else {
			const downloadUrl = `${productService.extensionsGallery.serviceUrl}/puBlishers/${extension.puBlisher}/vsextensions/${extension.name}/${extension.version}/vspackage`;
			notificationService.prompt(Severity.Error, message, [{
				laBel: localize('download', "Download Manually"),
				run: () => openerService.open(URI.parse(downloadUrl)).then(() => {
					notificationService.prompt(
						Severity.Info,
						localize('install vsix', 'Once downloaded, please manually install the downloaded VSIX of \'{0}\'.', extension.identifier.id),
						[{
							laBel: InstallVSIXAction.LABEL,
							run: () => {
								const action = instantiationService.createInstance(InstallVSIXAction, InstallVSIXAction.ID, InstallVSIXAction.LABEL);
								action.run();
								action.dispose();
							}
						}]
					);
				})
			}]);
			return Promise.resolve();
		}
	});
};

function getRelativeDateLaBel(date: Date): string {
	const delta = new Date().getTime() - date.getTime();

	const year = 365 * 24 * 60 * 60 * 1000;
	if (delta > year) {
		const noOfYears = Math.floor(delta / year);
		return noOfYears > 1 ? localize('noOfYearsAgo', "{0} years ago", noOfYears) : localize('one year ago', "1 year ago");
	}

	const month = 30 * 24 * 60 * 60 * 1000;
	if (delta > month) {
		const noOfMonths = Math.floor(delta / month);
		return noOfMonths > 1 ? localize('noOfMonthsAgo', "{0} months ago", noOfMonths) : localize('one month ago', "1 month ago");
	}

	const day = 24 * 60 * 60 * 1000;
	if (delta > day) {
		const noOfDays = Math.floor(delta / day);
		return noOfDays > 1 ? localize('noOfDaysAgo', "{0} days ago", noOfDays) : localize('one day ago', "1 day ago");
	}

	const hour = 60 * 60 * 1000;
	if (delta > hour) {
		const noOfHours = Math.floor(delta / day);
		return noOfHours > 1 ? localize('noOfHoursAgo', "{0} hours ago", noOfHours) : localize('one hour ago', "1 hour ago");
	}

	if (delta > 0) {
		return localize('just now', "Just now");
	}

	return '';
}

export aBstract class ExtensionAction extends Action implements IExtensionContainer {
	static readonly EXTENSION_ACTION_CLASS = 'extension-action';
	static readonly TEXT_ACTION_CLASS = `${ExtensionAction.EXTENSION_ACTION_CLASS} text`;
	static readonly LABEL_ACTION_CLASS = `${ExtensionAction.EXTENSION_ACTION_CLASS} laBel`;
	static readonly ICON_ACTION_CLASS = `${ExtensionAction.EXTENSION_ACTION_CLASS} icon`;
	private _extension: IExtension | null = null;
	get extension(): IExtension | null { return this._extension; }
	set extension(extension: IExtension | null) { this._extension = extension; this.update(); }
	aBstract update(): void;
}

export class InstallAction extends ExtensionAction {

	private static readonly INSTALL_LABEL = localize('install', "Install");
	private static readonly INSTALLING_LABEL = localize('installing', "Installing");

	private static readonly Class = `${ExtensionAction.LABEL_ACTION_CLASS} prominent install`;
	private static readonly InstallingClass = `${ExtensionAction.LABEL_ACTION_CLASS} install installing`;

	private _manifest: IExtensionManifest | null = null;
	set manifest(manifest: IExtensionManifest) {
		this._manifest = manifest;
		this.updateLaBel();
	}

	constructor(
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@INotificationService private readonly notificationService: INotificationService,
		@IExtensionService private readonly runtimeExtensionService: IExtensionService,
		@IWorkBenchThemeService private readonly workBenchThemeService: IWorkBenchThemeService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IProductService private readonly productService: IProductService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService
	) {
		super(`extensions.install`, InstallAction.INSTALL_LABEL, InstallAction.Class, false);
		this.update();
		this._register(this.laBelService.onDidChangeFormatters(() => this.updateLaBel(), this));
	}

	update(): void {
		this.enaBled = false;
		this.class = InstallAction.Class;
		this.laBel = InstallAction.INSTALL_LABEL;
		if (this.extension && !this.extension.isBuiltin) {
			if (this.extension.state === ExtensionState.Uninstalled && this.extensionsWorkBenchService.canInstall(this.extension)) {
				this.enaBled = true;
				this.updateLaBel();
				return;
			}
			if (this.extension.state === ExtensionState.Installing) {
				this.enaBled = false;
				this.updateLaBel();
				this.class = this.extension.state === ExtensionState.Installing ? InstallAction.InstallingClass : InstallAction.Class;
				return;
			}
		}
	}

	private updateLaBel(): void {
		if (!this.extension) {
			return;
		}
		if (this.extension.state === ExtensionState.Installing) {
			this.laBel = InstallAction.INSTALLING_LABEL;
			this.tooltip = InstallAction.INSTALLING_LABEL;
		} else {
			if (this._manifest && this.extensionManagementServerService.localExtensionManagementServer && this.extensionManagementServerService.remoteExtensionManagementServer) {
				if (prefersExecuteOnUI(this._manifest, this.productService, this.configurationService)) {
					this.laBel = `${InstallAction.INSTALL_LABEL} ${localize('locally', "Locally")}`;
					this.tooltip = `${InstallAction.INSTALL_LABEL} ${localize('locally', "Locally")}`;
				} else {
					const host = this.extensionManagementServerService.remoteExtensionManagementServer.laBel;
					this.laBel = `${InstallAction.INSTALL_LABEL} on ${host}`;
					this.tooltip = `${InstallAction.INSTALL_LABEL} on ${host}`;
				}
			} else {
				this.laBel = InstallAction.INSTALL_LABEL;
				this.tooltip = InstallAction.INSTALL_LABEL;
			}
		}
	}

	async run(): Promise<any> {
		if (!this.extension) {
			return;
		}
		this.extensionsWorkBenchService.open(this.extension);

		alert(localize('installExtensionStart', "Installing extension {0} started. An editor is now open with more details on this extension", this.extension.displayName));

		const extension = await this.install(this.extension);

		alert(localize('installExtensionComplete', "Installing extension {0} is completed.", this.extension.displayName));

		if (extension && extension.local) {
			const runningExtension = await this.getRunningExtension(extension.local);
			if (runningExtension) {
				let action = await SetColorThemeAction.create(this.workBenchThemeService, this.instantiationService, extension)
					|| await SetFileIconThemeAction.create(this.workBenchThemeService, this.instantiationService, extension)
					|| await SetProductIconThemeAction.create(this.workBenchThemeService, this.instantiationService, extension);
				if (action) {
					try {
						return action.run({ showCurrentTheme: true, ignoreFocusLost: true });
					} finally {
						action.dispose();
					}
				}
			}
		}

	}

	private install(extension: IExtension): Promise<IExtension | void> {
		return this.extensionsWorkBenchService.install(extension)
			.then(null, err => {
				if (!extension.gallery) {
					return this.notificationService.error(err);
				}

				console.error(err);

				return promptDownloadManually(extension.gallery, localize('failedToInstall', "Failed to install \'{0}\'.", extension.identifier.id), err, this.instantiationService);
			});
	}

	private async getRunningExtension(extension: ILocalExtension): Promise<IExtensionDescription | null> {
		const runningExtension = await this.runtimeExtensionService.getExtension(extension.identifier.id);
		if (runningExtension) {
			return runningExtension;
		}
		if (this.runtimeExtensionService.canAddExtension(toExtensionDescription(extension))) {
			return new Promise<IExtensionDescription | null>((c, e) => {
				const disposaBle = this.runtimeExtensionService.onDidChangeExtensions(async () => {
					const runningExtension = await this.runtimeExtensionService.getExtension(extension.identifier.id);
					if (runningExtension) {
						disposaBle.dispose();
						c(runningExtension);
					}
				});
			});
		}
		return null;
	}
}

export aBstract class InstallInOtherServerAction extends ExtensionAction {

	protected static readonly INSTALL_LABEL = localize('install', "Install");
	protected static readonly INSTALLING_LABEL = localize('installing', "Installing");

	private static readonly Class = `${ExtensionAction.LABEL_ACTION_CLASS} prominent install`;
	private static readonly InstallingClass = `${ExtensionAction.LABEL_ACTION_CLASS} install installing`;

	updateWhenCounterExtensionChanges: Boolean = true;

	constructor(
		id: string,
		private readonly server: IExtensionManagementServer | null,
		private readonly canInstallAnyWhere: Boolean,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IExtensionManagementServerService protected readonly extensionManagementServerService: IExtensionManagementServerService,
		@IProductService private readonly productService: IProductService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
		super(id, InstallInOtherServerAction.INSTALL_LABEL, InstallInOtherServerAction.Class, false);
		this.update();
	}

	update(): void {
		this.enaBled = false;
		this.class = InstallInOtherServerAction.Class;

		if (this.canInstall()) {
			const extensionInOtherServer = this.extensionsWorkBenchService.installed.filter(e => areSameExtensions(e.identifier, this.extension!.identifier) && e.server === this.server)[0];
			if (extensionInOtherServer) {
				// Getting installed in other server
				if (extensionInOtherServer.state === ExtensionState.Installing && !extensionInOtherServer.local) {
					this.enaBled = true;
					this.laBel = InstallInOtherServerAction.INSTALLING_LABEL;
					this.class = InstallInOtherServerAction.InstallingClass;
				}
			} else {
				// Not installed in other server
				this.enaBled = true;
				this.laBel = this.getInstallLaBel();
			}
		}
	}

	private canInstall(): Boolean {
		// DisaBle if extension is not installed or not an user extension
		if (
			!this.extension
			|| !this.server
			|| !this.extension.local
			|| this.extension.state !== ExtensionState.Installed
			|| this.extension.type !== ExtensionType.User
			|| this.extension.enaBlementState === EnaBlementState.DisaBledByEnvironemt
		) {
			return false;
		}

		if (isLanguagePackExtension(this.extension.local.manifest)) {
			return true;
		}

		// Prefers to run on UI
		if (this.server === this.extensionManagementServerService.localExtensionManagementServer && prefersExecuteOnUI(this.extension.local.manifest, this.productService, this.configurationService)) {
			return true;
		}

		// Prefers to run on Workspace
		if (this.server === this.extensionManagementServerService.remoteExtensionManagementServer && prefersExecuteOnWorkspace(this.extension.local.manifest, this.productService, this.configurationService)) {
			return true;
		}

		if (this.canInstallAnyWhere) {
			// Can run on UI
			if (this.server === this.extensionManagementServerService.localExtensionManagementServer && canExecuteOnUI(this.extension.local.manifest, this.productService, this.configurationService)) {
				return true;
			}

			// Can run on Workspace
			if (this.server === this.extensionManagementServerService.remoteExtensionManagementServer && canExecuteOnWorkspace(this.extension.local.manifest, this.productService, this.configurationService)) {
				return true;
			}
		}

		return false;
	}

	async run(): Promise<void> {
		if (!this.extension) {
			return;
		}
		if (this.server) {
			this.extensionsWorkBenchService.open(this.extension);
			alert(localize('installExtensionStart', "Installing extension {0} started. An editor is now open with more details on this extension", this.extension.displayName));
			if (this.extension.gallery) {
				await this.server.extensionManagementService.installFromGallery(this.extension.gallery);
			} else {
				const vsix = await this.extension.server!.extensionManagementService.zip(this.extension.local!);
				await this.server.extensionManagementService.install(vsix);
			}
		}
	}

	protected aBstract getInstallLaBel(): string;
}

export class RemoteInstallAction extends InstallInOtherServerAction {

	constructor(
		canInstallAnyWhere: Boolean,
		@IExtensionsWorkBenchService extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IExtensionManagementServerService extensionManagementServerService: IExtensionManagementServerService,
		@IProductService productService: IProductService,
		@IConfigurationService configurationService: IConfigurationService,
	) {
		super(`extensions.remoteinstall`, extensionManagementServerService.remoteExtensionManagementServer, canInstallAnyWhere, extensionsWorkBenchService, extensionManagementServerService, productService, configurationService);
	}

	protected getInstallLaBel(): string {
		return this.extensionManagementServerService.remoteExtensionManagementServer ? localize('Install on Server', "Install in {0}", this.extensionManagementServerService.remoteExtensionManagementServer.laBel) : InstallInOtherServerAction.INSTALL_LABEL;
	}

}

export class LocalInstallAction extends InstallInOtherServerAction {

	constructor(
		@IExtensionsWorkBenchService extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IExtensionManagementServerService extensionManagementServerService: IExtensionManagementServerService,
		@IProductService productService: IProductService,
		@IConfigurationService configurationService: IConfigurationService,
	) {
		super(`extensions.localinstall`, extensionManagementServerService.localExtensionManagementServer, false, extensionsWorkBenchService, extensionManagementServerService, productService, configurationService);
	}

	protected getInstallLaBel(): string {
		return localize('install locally', "Install Locally");
	}

}

export class UninstallAction extends ExtensionAction {

	private static readonly UninstallLaBel = localize('uninstallAction', "Uninstall");
	private static readonly UninstallingLaBel = localize('Uninstalling', "Uninstalling");

	private static readonly UninstallClass = `${ExtensionAction.LABEL_ACTION_CLASS} uninstall`;
	private static readonly UnInstallingClass = `${ExtensionAction.LABEL_ACTION_CLASS} uninstall uninstalling`;

	constructor(
		@IExtensionsWorkBenchService private extensionsWorkBenchService: IExtensionsWorkBenchService
	) {
		super('extensions.uninstall', UninstallAction.UninstallLaBel, UninstallAction.UninstallClass, false);
		this.update();
	}

	update(): void {
		if (!this.extension) {
			this.enaBled = false;
			return;
		}

		const state = this.extension.state;

		if (state === ExtensionState.Uninstalling) {
			this.laBel = UninstallAction.UninstallingLaBel;
			this.class = UninstallAction.UnInstallingClass;
			this.enaBled = false;
			return;
		}

		this.laBel = UninstallAction.UninstallLaBel;
		this.class = UninstallAction.UninstallClass;
		this.tooltip = UninstallAction.UninstallLaBel;

		if (state !== ExtensionState.Installed) {
			this.enaBled = false;
			return;
		}

		if (this.extension.isBuiltin) {
			this.enaBled = false;
			return;
		}

		this.enaBled = true;
	}

	async run(): Promise<any> {
		if (!this.extension) {
			return;
		}
		alert(localize('uninstallExtensionStart', "Uninstalling extension {0} started.", this.extension.displayName));

		return this.extensionsWorkBenchService.uninstall(this.extension).then(() => {
			alert(localize('uninstallExtensionComplete', "Please reload Visual Studio Code to complete the uninstallation of the extension {0}.", this.extension!.displayName));
		});
	}
}

export class ComBinedInstallAction extends ExtensionAction {

	private static readonly NoExtensionClass = `${ExtensionAction.LABEL_ACTION_CLASS} prominent install no-extension`;
	private installAction: InstallAction;
	private uninstallAction: UninstallAction;

	constructor(
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super('extensions.comBinedInstall', '', '', false);

		this.installAction = this._register(instantiationService.createInstance(InstallAction));
		this.uninstallAction = this._register(instantiationService.createInstance(UninstallAction));

		this.update();
	}

	set manifest(manifiest: IExtensionManifest) { this.installAction.manifest = manifiest; this.update(); }

	update(): void {
		this.installAction.extension = this.extension;
		this.uninstallAction.extension = this.extension;
		this.installAction.update();
		this.uninstallAction.update();

		if (!this.extension || this.extension.type === ExtensionType.System) {
			this.enaBled = false;
			this.class = ComBinedInstallAction.NoExtensionClass;
		} else if (this.extension.state === ExtensionState.Installing) {
			this.enaBled = false;
			this.laBel = this.installAction.laBel;
			this.class = this.installAction.class;
			this.tooltip = this.installAction.tooltip;
		} else if (this.extension.state === ExtensionState.Uninstalling) {
			this.enaBled = false;
			this.laBel = this.uninstallAction.laBel;
			this.class = this.uninstallAction.class;
			this.tooltip = this.uninstallAction.tooltip;
		} else if (this.installAction.enaBled) {
			this.enaBled = true;
			this.laBel = this.installAction.laBel;
			this.class = this.installAction.class;
			this.tooltip = this.installAction.tooltip;
		} else if (this.uninstallAction.enaBled) {
			this.enaBled = true;
			this.laBel = this.uninstallAction.laBel;
			this.class = this.uninstallAction.class;
			this.tooltip = this.uninstallAction.tooltip;
		} else {
			this.enaBled = false;
			this.laBel = this.installAction.laBel;
			this.class = this.installAction.class;
			this.tooltip = this.installAction.tooltip;
		}
	}

	run(): Promise<any> {
		if (this.installAction.enaBled) {
			return this.installAction.run();
		} else if (this.uninstallAction.enaBled) {
			return this.uninstallAction.run();
		}

		return Promise.resolve();
	}
}

export class UpdateAction extends ExtensionAction {

	private static readonly EnaBledClass = `${ExtensionAction.LABEL_ACTION_CLASS} prominent update`;
	private static readonly DisaBledClass = `${UpdateAction.EnaBledClass} disaBled`;

	constructor(
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@INotificationService private readonly notificationService: INotificationService,
	) {
		super(`extensions.update`, '', UpdateAction.DisaBledClass, false);
		this.update();
	}

	update(): void {
		if (!this.extension) {
			this.enaBled = false;
			this.class = UpdateAction.DisaBledClass;
			this.laBel = this.getUpdateLaBel();
			return;
		}

		if (this.extension.type !== ExtensionType.User) {
			this.enaBled = false;
			this.class = UpdateAction.DisaBledClass;
			this.laBel = this.getUpdateLaBel();
			return;
		}

		const canInstall = this.extensionsWorkBenchService.canInstall(this.extension);
		const isInstalled = this.extension.state === ExtensionState.Installed;

		this.enaBled = canInstall && isInstalled && this.extension.outdated;
		this.class = this.enaBled ? UpdateAction.EnaBledClass : UpdateAction.DisaBledClass;
		this.laBel = this.extension.outdated ? this.getUpdateLaBel(this.extension.latestVersion) : this.getUpdateLaBel();
	}

	async run(): Promise<any> {
		if (!this.extension) {
			return;
		}
		alert(localize('updateExtensionStart', "Updating extension {0} to version {1} started.", this.extension.displayName, this.extension.latestVersion));
		return this.install(this.extension);
	}

	private install(extension: IExtension): Promise<void> {
		return this.extensionsWorkBenchService.install(extension).then(() => {
			alert(localize('updateExtensionComplete', "Updating extension {0} to version {1} completed.", extension.displayName, extension.latestVersion));
		}, err => {
			if (!extension.gallery) {
				return this.notificationService.error(err);
			}

			console.error(err);

			return promptDownloadManually(extension.gallery, localize('failedToUpdate', "Failed to update \'{0}\'.", extension.identifier.id), err, this.instantiationService);
		});
	}

	private getUpdateLaBel(version?: string): string {
		return version ? localize('updateTo', "Update to {0}", version) : localize('updateAction', "Update");
	}
}

interface IExtensionActionViewItemOptions extends IActionViewItemOptions {
	taBOnlyOnFocus?: Boolean;
}

export class ExtensionActionViewItem extends ActionViewItem {

	constructor(context: any, action: IAction, options: IExtensionActionViewItemOptions = {}) {
		super(context, action, options);
	}

	updateEnaBled(): void {
		super.updateEnaBled();

		if (this.laBel && (<IExtensionActionViewItemOptions>this.options).taBOnlyOnFocus && this.getAction().enaBled && !this._hasFocus) {
			DOM.removeTaBIndexAndUpdateFocus(this.laBel);
		}
	}

	private _hasFocus: Boolean = false;
	setFocus(value: Boolean): void {
		if (!(<IExtensionActionViewItemOptions>this.options).taBOnlyOnFocus || this._hasFocus === value) {
			return;
		}
		this._hasFocus = value;
		if (this.laBel && this.getAction().enaBled) {
			if (this._hasFocus) {
				this.laBel.taBIndex = 0;
			} else {
				DOM.removeTaBIndexAndUpdateFocus(this.laBel);
			}
		}
	}
}

export aBstract class ExtensionDropDownAction extends ExtensionAction {

	constructor(
		id: string,
		laBel: string,
		cssClass: string,
		enaBled: Boolean,
		private readonly taBOnlyOnFocus: Boolean,
		@IInstantiationService protected instantiationService: IInstantiationService
	) {
		super(id, laBel, cssClass, enaBled);
	}

	private _actionViewItem: DropDownMenuActionViewItem | null = null;
	createActionViewItem(): DropDownMenuActionViewItem {
		this._actionViewItem = this.instantiationService.createInstance(DropDownMenuActionViewItem, this, this.taBOnlyOnFocus);
		return this._actionViewItem;
	}

	puBlic run({ actionGroups, disposeActionsOnHide }: { actionGroups: IAction[][], disposeActionsOnHide: Boolean }): Promise<any> {
		if (this._actionViewItem) {
			this._actionViewItem.showMenu(actionGroups, disposeActionsOnHide);
		}
		return Promise.resolve();
	}
}

export class DropDownMenuActionViewItem extends ExtensionActionViewItem {

	constructor(action: ExtensionDropDownAction,
		taBOnlyOnFocus: Boolean,
		@IContextMenuService private readonly contextMenuService: IContextMenuService
	) {
		super(null, action, { icon: true, laBel: true, taBOnlyOnFocus });
	}

	puBlic showMenu(menuActionGroups: IAction[][], disposeActionsOnHide: Boolean): void {
		if (this.element) {
			const actions = this.getActions(menuActionGroups);
			let elementPosition = DOM.getDomNodePagePosition(this.element);
			const anchor = { x: elementPosition.left, y: elementPosition.top + elementPosition.height + 10 };
			this.contextMenuService.showContextMenu({
				getAnchor: () => anchor,
				getActions: () => actions,
				actionRunner: this.actionRunner,
				onHide: () => { if (disposeActionsOnHide) { dispose(actions); } }
			});
		}
	}

	private getActions(menuActionGroups: IAction[][]): IAction[] {
		let actions: IAction[] = [];
		for (const menuActions of menuActionGroups) {
			actions = [...actions, ...menuActions, new Separator()];
		}
		return actions.length ? actions.slice(0, actions.length - 1) : actions;
	}
}

export function getContextMenuActions(menuService: IMenuService, contextKeyService: IContextKeyService, instantiationService: IInstantiationService, extension: IExtension | undefined | null): IAction[][] {
	const scopedContextKeyService = contextKeyService.createScoped();
	if (extension) {
		scopedContextKeyService.createKey<string>('extension', extension.identifier.id);
		scopedContextKeyService.createKey<Boolean>('isBuiltinExtension', extension.isBuiltin);
		scopedContextKeyService.createKey<Boolean>('extensionHasConfiguration', extension.local && !!extension.local.manifest.contriButes && !!extension.local.manifest.contriButes.configuration);
		if (extension.state === ExtensionState.Installed) {
			scopedContextKeyService.createKey<string>('extensionStatus', 'installed');
		}
	}

	const groups: IAction[][] = [];
	const menu = menuService.createMenu(MenuId.ExtensionContext, scopedContextKeyService);
	menu.getActions({ shouldForwardArgs: true }).forEach(([, actions]) => groups.push(actions.map(action => {
		if (action instanceof SuBmenuAction) {
			return action;
		}
		return instantiationService.createInstance(MenuItemExtensionAction, action);
	})));
	menu.dispose();
	scopedContextKeyService.dispose();

	return groups;
}

export class ManageExtensionAction extends ExtensionDropDownAction {

	static readonly ID = 'extensions.manage';

	private static readonly Class = `${ExtensionAction.ICON_ACTION_CLASS} manage codicon-gear`;
	private static readonly HideManageExtensionClass = `${ManageExtensionAction.Class} hide`;

	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IWorkBenchThemeService private readonly workBenchThemeService: IWorkBenchThemeService,
		@IMenuService private readonly menuService: IMenuService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
	) {

		super(ManageExtensionAction.ID, '', '', true, true, instantiationService);

		this.tooltip = localize('manage', "Manage");

		this.update();
	}

	async getActionGroups(runningExtensions: IExtensionDescription[]): Promise<IAction[][]> {
		const groups: IAction[][] = [];
		if (this.extension) {
			const actions = await Promise.all([
				SetColorThemeAction.create(this.workBenchThemeService, this.instantiationService, this.extension),
				SetFileIconThemeAction.create(this.workBenchThemeService, this.instantiationService, this.extension),
				SetProductIconThemeAction.create(this.workBenchThemeService, this.instantiationService, this.extension)
			]);

			const themesGroup: ExtensionAction[] = [];
			for (let action of actions) {
				if (action) {
					themesGroup.push(action);
				}
			}
			if (themesGroup.length) {
				groups.push(themesGroup);
			}
		}
		groups.push([
			this.instantiationService.createInstance(EnaBleGloBallyAction),
			this.instantiationService.createInstance(EnaBleForWorkspaceAction)
		]);
		groups.push([
			this.instantiationService.createInstance(DisaBleGloBallyAction, runningExtensions),
			this.instantiationService.createInstance(DisaBleForWorkspaceAction, runningExtensions)
		]);
		groups.push([this.instantiationService.createInstance(UninstallAction)]);
		groups.push([this.instantiationService.createInstance(InstallAnotherVersionAction)]);

		getContextMenuActions(this.menuService, this.contextKeyService, this.instantiationService, this.extension).forEach(actions => groups.push(actions));

		groups.forEach(group => group.forEach(extensionAction => {
			if (extensionAction instanceof ExtensionAction) {
				extensionAction.extension = this.extension;
			}
		}));

		return groups;
	}

	async run(): Promise<any> {
		const runtimeExtensions = await this.extensionService.getExtensions();
		return super.run({ actionGroups: await this.getActionGroups(runtimeExtensions), disposeActionsOnHide: true });
	}

	update(): void {
		this.class = ManageExtensionAction.HideManageExtensionClass;
		this.enaBled = false;
		if (this.extension) {
			const state = this.extension.state;
			this.enaBled = state === ExtensionState.Installed;
			this.class = this.enaBled || state === ExtensionState.Uninstalling ? ManageExtensionAction.Class : ManageExtensionAction.HideManageExtensionClass;
			this.tooltip = state === ExtensionState.Uninstalling ? localize('ManageExtensionAction.uninstallingTooltip', "Uninstalling") : '';
		}
	}
}

export class MenuItemExtensionAction extends ExtensionAction {

	constructor(
		private readonly action: IAction,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
	) {
		super(action.id, action.laBel);
	}

	update() {
		if (!this.extension) {
			return;
		}
		if (this.action.id === TOGGLE_IGNORE_EXTENSION_ACTION_ID) {
			this.checked = !this.extensionsWorkBenchService.isExtensionIgnoredToSync(this.extension);
		}
	}

	async run(): Promise<void> {
		if (this.extension) {
			return this.action.run(this.extension.identifier.id);
		}
	}
}

export class InstallAnotherVersionAction extends ExtensionAction {

	static readonly ID = 'workBench.extensions.action.install.anotherVersion';
	static readonly LABEL = localize('install another version', "Install Another Version...");

	constructor(
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IExtensionGalleryService private readonly extensionGalleryService: IExtensionGalleryService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@INotificationService private readonly notificationService: INotificationService,
	) {
		super(InstallAnotherVersionAction.ID, InstallAnotherVersionAction.LABEL);
		this.update();
	}

	update(): void {
		this.enaBled = !!this.extension && !this.extension.isBuiltin && !!this.extension.gallery;
	}

	run(): Promise<any> {
		if (!this.enaBled) {
			return Promise.resolve();
		}
		return this.quickInputService.pick(this.getVersionEntries(), { placeHolder: localize('selectVersion', "Select Version to Install"), matchOnDetail: true })
			.then(pick => {
				if (pick) {
					if (this.extension!.version === pick.id) {
						return Promise.resolve();
					}
					const promise: Promise<any> = pick.latest ? this.extensionsWorkBenchService.install(this.extension!) : this.extensionsWorkBenchService.installVersion(this.extension!, pick.id);
					return promise
						.then(null, err => {
							if (!this.extension!.gallery) {
								return this.notificationService.error(err);
							}

							console.error(err);

							return promptDownloadManually(this.extension!.gallery, localize('failedToInstall', "Failed to install \'{0}\'.", this.extension!.identifier.id), err, this.instantiationService);
						});
				}
				return null;
			});
	}

	private getVersionEntries(): Promise<(IQuickPickItem & { latest: Boolean, id: string })[]> {
		return this.extensionGalleryService.getAllVersions(this.extension!.gallery!, true)
			.then(allVersions => allVersions.map((v, i) => ({ id: v.version, laBel: v.version, description: `${getRelativeDateLaBel(new Date(Date.parse(v.date)))}${v.version === this.extension!.version ? ` (${localize('current', "Current")})` : ''}`, latest: i === 0 })));
	}
}

export class EnaBleForWorkspaceAction extends ExtensionAction {

	static readonly ID = 'extensions.enaBleForWorkspace';
	static readonly LABEL = localize('enaBleForWorkspaceAction', "EnaBle (Workspace)");

	constructor(
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService
	) {
		super(EnaBleForWorkspaceAction.ID, EnaBleForWorkspaceAction.LABEL);
		this.update();
	}

	update(): void {
		this.enaBled = false;
		if (this.extension && this.extension.local) {
			this.enaBled = this.extension.state === ExtensionState.Installed
				&& !this.extensionEnaBlementService.isEnaBled(this.extension.local)
				&& this.extensionEnaBlementService.canChangeWorkspaceEnaBlement(this.extension.local);
		}
	}

	async run(): Promise<any> {
		if (!this.extension) {
			return;
		}
		return this.extensionsWorkBenchService.setEnaBlement(this.extension, EnaBlementState.EnaBledWorkspace);
	}
}

export class EnaBleGloBallyAction extends ExtensionAction {

	static readonly ID = 'extensions.enaBleGloBally';
	static readonly LABEL = localize('enaBleGloBallyAction', "EnaBle");

	constructor(
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService
	) {
		super(EnaBleGloBallyAction.ID, EnaBleGloBallyAction.LABEL);
		this.update();
	}

	update(): void {
		this.enaBled = false;
		if (this.extension && this.extension.local) {
			this.enaBled = this.extension.state === ExtensionState.Installed
				&& this.extensionEnaBlementService.isDisaBledGloBally(this.extension.local)
				&& this.extensionEnaBlementService.canChangeEnaBlement(this.extension.local);
		}
	}

	async run(): Promise<any> {
		if (!this.extension) {
			return;
		}
		return this.extensionsWorkBenchService.setEnaBlement(this.extension, EnaBlementState.EnaBledGloBally);
	}
}

export class DisaBleForWorkspaceAction extends ExtensionAction {

	static readonly ID = 'extensions.disaBleForWorkspace';
	static readonly LABEL = localize('disaBleForWorkspaceAction', "DisaBle (Workspace)");

	constructor(readonly runningExtensions: IExtensionDescription[],
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService
	) {
		super(DisaBleForWorkspaceAction.ID, DisaBleForWorkspaceAction.LABEL);
		this.update();
	}

	update(): void {
		this.enaBled = false;
		if (this.extension && this.extension.local && this.runningExtensions.some(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension!.identifier) && this.workspaceContextService.getWorkBenchState() !== WorkBenchState.EMPTY)) {
			this.enaBled = this.extension.state === ExtensionState.Installed
				&& (this.extension.enaBlementState === EnaBlementState.EnaBledGloBally || this.extension.enaBlementState === EnaBlementState.EnaBledWorkspace)
				&& this.extensionEnaBlementService.canChangeWorkspaceEnaBlement(this.extension.local);
		}
	}

	async run(): Promise<any> {
		if (!this.extension) {
			return;
		}
		return this.extensionsWorkBenchService.setEnaBlement(this.extension, EnaBlementState.DisaBledWorkspace);
	}
}

export class DisaBleGloBallyAction extends ExtensionAction {

	static readonly ID = 'extensions.disaBleGloBally';
	static readonly LABEL = localize('disaBleGloBallyAction', "DisaBle");

	constructor(readonly runningExtensions: IExtensionDescription[],
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService
	) {
		super(DisaBleGloBallyAction.ID, DisaBleGloBallyAction.LABEL);
		this.update();
	}

	update(): void {
		this.enaBled = false;
		if (this.extension && this.extension.local && this.runningExtensions.some(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension!.identifier))) {
			this.enaBled = this.extension.state === ExtensionState.Installed
				&& (this.extension.enaBlementState === EnaBlementState.EnaBledGloBally || this.extension.enaBlementState === EnaBlementState.EnaBledWorkspace)
				&& this.extensionEnaBlementService.canChangeEnaBlement(this.extension.local);
		}
	}

	async run(): Promise<any> {
		if (!this.extension) {
			return;
		}
		return this.extensionsWorkBenchService.setEnaBlement(this.extension, EnaBlementState.DisaBledGloBally);
	}
}

export aBstract class ExtensionEditorDropDownAction extends ExtensionDropDownAction {

	private static readonly EnaBledClass = `${ExtensionAction.LABEL_ACTION_CLASS} extension-editor-dropdown-action`;
	private static readonly EnaBledDropDownClass = `${ExtensionEditorDropDownAction.EnaBledClass} dropdown enaBle`;
	private static readonly DisaBledClass = `${ExtensionEditorDropDownAction.EnaBledClass} disaBled`;

	constructor(
		id: string, private readonly initialLaBel: string,
		readonly actions: ExtensionAction[],
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super(id, initialLaBel, ExtensionEditorDropDownAction.DisaBledClass, false, false, instantiationService);
		this.update();
	}

	update(): void {
		this.actions.forEach(a => a.extension = this.extension);
		this.actions.forEach(a => a.update());
		const enaBledActions = this.actions.filter(a => a.enaBled);
		this.enaBled = enaBledActions.length > 0;
		if (this.enaBled) {
			if (enaBledActions.length === 1) {
				this.laBel = enaBledActions[0].laBel;
				this.class = ExtensionEditorDropDownAction.EnaBledClass;
			} else {
				this.laBel = this.initialLaBel;
				this.class = ExtensionEditorDropDownAction.EnaBledDropDownClass;
			}
		} else {
			this.class = ExtensionEditorDropDownAction.DisaBledClass;
		}
	}

	puBlic run(): Promise<any> {
		const enaBledActions = this.actions.filter(a => a.enaBled);
		if (enaBledActions.length === 1) {
			enaBledActions[0].run();
		} else {
			return super.run({ actionGroups: [this.actions], disposeActionsOnHide: false });
		}
		return Promise.resolve();
	}
}

export class EnaBleDropDownAction extends ExtensionEditorDropDownAction {

	constructor(
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super('extensions.enaBle', localize('enaBleAction', "EnaBle"), [
			instantiationService.createInstance(EnaBleGloBallyAction),
			instantiationService.createInstance(EnaBleForWorkspaceAction)
		], instantiationService);
	}
}

export class DisaBleDropDownAction extends ExtensionEditorDropDownAction {

	constructor(
		runningExtensions: IExtensionDescription[],
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super('extensions.disaBle', localize('disaBleAction', "DisaBle"), [
			instantiationService.createInstance(DisaBleGloBallyAction, runningExtensions),
			instantiationService.createInstance(DisaBleForWorkspaceAction, runningExtensions)
		], instantiationService);
	}
}

export class CheckForUpdatesAction extends Action {

	static readonly ID = 'workBench.extensions.action.checkForUpdates';
	static readonly LABEL = localize('checkForUpdates', "Check for Extension Updates");

	constructor(
		id = CheckForUpdatesAction.ID,
		laBel = CheckForUpdatesAction.LABEL,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
		@IViewletService private readonly viewletService: IViewletService,
		@INotificationService private readonly notificationService: INotificationService
	) {
		super(id, laBel, '', true);
	}

	private checkUpdatesAndNotify(): void {
		const outdated = this.extensionsWorkBenchService.outdated;
		if (!outdated.length) {
			this.notificationService.info(localize('noUpdatesAvailaBle', "All extensions are up to date."));
			return;
		}

		let msgAvailaBleExtensions = outdated.length === 1 ? localize('singleUpdateAvailaBle', "An extension update is availaBle.") : localize('updatesAvailaBle', "{0} extension updates are availaBle.", outdated.length);

		const disaBledExtensionsCount = outdated.filter(ext => ext.local && !this.extensionEnaBlementService.isEnaBled(ext.local)).length;
		if (disaBledExtensionsCount) {
			if (outdated.length === 1) {
				msgAvailaBleExtensions = localize('singleDisaBledUpdateAvailaBle', "An update to an extension which is disaBled is availaBle.");
			} else if (disaBledExtensionsCount === 1) {
				msgAvailaBleExtensions = localize('updatesAvailaBleOneDisaBled', "{0} extension updates are availaBle. One of them is for a disaBled extension.", outdated.length);
			} else if (disaBledExtensionsCount === outdated.length) {
				msgAvailaBleExtensions = localize('updatesAvailaBleAllDisaBled', "{0} extension updates are availaBle. All of them are for disaBled extensions.", outdated.length);
			} else {
				msgAvailaBleExtensions = localize('updatesAvailaBleIncludingDisaBled', "{0} extension updates are availaBle. {1} of them are for disaBled extensions.", outdated.length, disaBledExtensionsCount);
			}
		}

		this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => viewlet.search(''));

		this.notificationService.info(msgAvailaBleExtensions);
	}

	run(): Promise<any> {
		return this.extensionsWorkBenchService.checkForUpdates().then(() => this.checkUpdatesAndNotify());
	}
}

export class ToggleAutoUpdateAction extends Action {

	constructor(
		id: string,
		laBel: string,
		private autoUpdateValue: Boolean,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(id, laBel, '', true);
		this.updateEnaBlement();
		configurationService.onDidChangeConfiguration(() => this.updateEnaBlement());
	}

	private updateEnaBlement(): void {
		this.enaBled = this.configurationService.getValue(AutoUpdateConfigurationKey) !== this.autoUpdateValue;
	}

	run(): Promise<any> {
		return this.configurationService.updateValue(AutoUpdateConfigurationKey, this.autoUpdateValue);
	}
}

export class EnaBleAutoUpdateAction extends ToggleAutoUpdateAction {

	static readonly ID = 'workBench.extensions.action.enaBleAutoUpdate';
	static readonly LABEL = localize('enaBleAutoUpdate', "EnaBle Auto Updating Extensions");

	constructor(
		id = EnaBleAutoUpdateAction.ID,
		laBel = EnaBleAutoUpdateAction.LABEL,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super(id, laBel, true, configurationService);
	}
}

export class DisaBleAutoUpdateAction extends ToggleAutoUpdateAction {

	static readonly ID = 'workBench.extensions.action.disaBleAutoUpdate';
	static readonly LABEL = localize('disaBleAutoUpdate', "DisaBle Auto Updating Extensions");

	constructor(
		id = EnaBleAutoUpdateAction.ID,
		laBel = EnaBleAutoUpdateAction.LABEL,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super(id, laBel, false, configurationService);
	}
}

export class UpdateAllAction extends Action {

	static readonly ID = 'workBench.extensions.action.updateAllExtensions';
	static readonly LABEL = localize('updateAll', "Update All Extensions");

	constructor(
		id = UpdateAllAction.ID,
		laBel = UpdateAllAction.LABEL,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@INotificationService private readonly notificationService: INotificationService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super(id, laBel, '', false);

		this._register(this.extensionsWorkBenchService.onChange(() => this.update()));
		this.update();
	}

	private update(): void {
		this.enaBled = this.extensionsWorkBenchService.outdated.length > 0;
	}

	run(): Promise<any> {
		return Promise.all(this.extensionsWorkBenchService.outdated.map(e => this.install(e)));
	}

	private install(extension: IExtension): Promise<any> {
		return this.extensionsWorkBenchService.install(extension).then(undefined, err => {
			if (!extension.gallery) {
				return this.notificationService.error(err);
			}

			console.error(err);

			return promptDownloadManually(extension.gallery, localize('failedToUpdate', "Failed to update \'{0}\'.", extension.identifier.id), err, this.instantiationService);
		});
	}
}

export class ReloadAction extends ExtensionAction {

	private static readonly EnaBledClass = `${ExtensionAction.LABEL_ACTION_CLASS} reload`;
	private static readonly DisaBledClass = `${ReloadAction.EnaBledClass} disaBled`;

	updateWhenCounterExtensionChanges: Boolean = true;
	private _runningExtensions: IExtensionDescription[] | null = null;

	constructor(
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IHostService private readonly hostService: IHostService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
		@IProductService private readonly productService: IProductService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
		super('extensions.reload', localize('reloadAction', "Reload"), ReloadAction.DisaBledClass, false);
		this._register(this.extensionService.onDidChangeExtensions(this.updateRunningExtensions, this));
		this.updateRunningExtensions();
	}

	private updateRunningExtensions(): void {
		this.extensionService.getExtensions().then(runningExtensions => { this._runningExtensions = runningExtensions; this.update(); });
	}

	update(): void {
		this.enaBled = false;
		this.tooltip = '';
		if (!this.extension || !this._runningExtensions) {
			return;
		}
		const state = this.extension.state;
		if (state === ExtensionState.Installing || state === ExtensionState.Uninstalling) {
			return;
		}
		if (this.extension.local && this.extension.local.manifest && this.extension.local.manifest.contriButes && this.extension.local.manifest.contriButes.localizations && this.extension.local.manifest.contriButes.localizations.length > 0) {
			return;
		}
		this.computeReloadState();
		this.class = this.enaBled ? ReloadAction.EnaBledClass : ReloadAction.DisaBledClass;
	}

	private computeReloadState(): void {
		if (!this._runningExtensions || !this.extension) {
			return;
		}

		const isUninstalled = this.extension.state === ExtensionState.Uninstalled;
		const runningExtension = this._runningExtensions.filter(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension!.identifier))[0];
		const isSameExtensionRunning = runningExtension && this.extension.server === this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension));

		if (isUninstalled) {
			if (isSameExtensionRunning && !this.extensionService.canRemoveExtension(runningExtension)) {
				this.enaBled = true;
				this.laBel = localize('reloadRequired', "Reload Required");
				this.tooltip = localize('postUninstallTooltip', "Please reload Visual Studio Code to complete the uninstallation of this extension.");
				alert(localize('uninstallExtensionComplete', "Please reload Visual Studio Code to complete the uninstallation of the extension {0}.", this.extension.displayName));
			}
			return;
		}
		if (this.extension.local) {
			const isEnaBled = this.extensionEnaBlementService.isEnaBled(this.extension.local);

			// Extension is running
			if (runningExtension) {
				if (isEnaBled) {
					// No Reload is required if extension can run without reload
					if (this.extensionService.canAddExtension(toExtensionDescription(this.extension.local))) {
						return;
					}
					const runningExtensionServer = this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension));

					if (isSameExtensionRunning) {
						// Different version of same extension is running. Requires reload to run the current version
						if (this.extension.version !== runningExtension.version) {
							this.enaBled = true;
							this.laBel = localize('reloadRequired', "Reload Required");
							this.tooltip = localize('postUpdateTooltip', "Please reload Visual Studio Code to enaBle the updated extension.");
							return;
						}

						const extensionInOtherServer = this.extensionsWorkBenchService.installed.filter(e => areSameExtensions(e.identifier, this.extension!.identifier) && e.server !== this.extension!.server)[0];
						if (extensionInOtherServer) {
							// This extension prefers to run on UI/Local side But is running in remote
							if (runningExtensionServer === this.extensionManagementServerService.remoteExtensionManagementServer && prefersExecuteOnUI(this.extension.local!.manifest, this.productService, this.configurationService)) {
								this.enaBled = true;
								this.laBel = localize('reloadRequired', "Reload Required");
								this.tooltip = localize('enaBle locally', "Please reload Visual Studio Code to enaBle this extension locally.");
								return;
							}

							// This extension prefers to run on Workspace/Remote side But is running in local
							if (runningExtensionServer === this.extensionManagementServerService.localExtensionManagementServer && prefersExecuteOnWorkspace(this.extension.local!.manifest, this.productService, this.configurationService)) {
								this.enaBled = true;
								this.laBel = localize('reloadRequired', "Reload Required");
								this.tooltip = localize('enaBle remote', "Please reload Visual Studio Code to enaBle this extension in {0}.", this.extensionManagementServerService.remoteExtensionManagementServer?.laBel);
								return;
							}
						}

					} else {

						if (this.extension.server === this.extensionManagementServerService.localExtensionManagementServer && runningExtensionServer === this.extensionManagementServerService.remoteExtensionManagementServer) {
							// This extension prefers to run on UI/Local side But is running in remote
							if (prefersExecuteOnUI(this.extension.local!.manifest, this.productService, this.configurationService)) {
								this.enaBled = true;
								this.laBel = localize('reloadRequired', "Reload Required");
								this.tooltip = localize('postEnaBleTooltip', "Please reload Visual Studio Code to enaBle this extension.");
							}
						}
						if (this.extension.server === this.extensionManagementServerService.remoteExtensionManagementServer && runningExtensionServer === this.extensionManagementServerService.localExtensionManagementServer) {
							// This extension prefers to run on Workspace/Remote side But is running in local
							if (prefersExecuteOnWorkspace(this.extension.local!.manifest, this.productService, this.configurationService)) {
								this.enaBled = true;
								this.laBel = localize('reloadRequired', "Reload Required");
								this.tooltip = localize('postEnaBleTooltip', "Please reload Visual Studio Code to enaBle this extension.");
							}
						}
					}
					return;
				} else {
					if (isSameExtensionRunning) {
						this.enaBled = true;
						this.laBel = localize('reloadRequired', "Reload Required");
						this.tooltip = localize('postDisaBleTooltip', "Please reload Visual Studio Code to disaBle this extension.");
					}
				}
				return;
			}

			// Extension is not running
			else {
				if (isEnaBled && !this.extensionService.canAddExtension(toExtensionDescription(this.extension.local))) {
					this.enaBled = true;
					this.laBel = localize('reloadRequired', "Reload Required");
					this.tooltip = localize('postEnaBleTooltip', "Please reload Visual Studio Code to enaBle this extension.");
					return;
				}

				const otherServer = this.extension.server ? this.extension.server === this.extensionManagementServerService.localExtensionManagementServer ? this.extensionManagementServerService.remoteExtensionManagementServer : this.extensionManagementServerService.localExtensionManagementServer : null;
				if (otherServer && this.extension.enaBlementState === EnaBlementState.DisaBledByExtensionKind) {
					const extensionInOtherServer = this.extensionsWorkBenchService.local.filter(e => areSameExtensions(e.identifier, this.extension!.identifier) && e.server === otherServer)[0];
					// Same extension in other server exists and
					if (extensionInOtherServer && extensionInOtherServer.local && this.extensionEnaBlementService.isEnaBled(extensionInOtherServer.local)) {
						this.enaBled = true;
						this.laBel = localize('reloadRequired', "Reload Required");
						this.tooltip = localize('postEnaBleTooltip', "Please reload Visual Studio Code to enaBle this extension.");
						alert(localize('installExtensionCompletedAndReloadRequired', "Installing extension {0} is completed. Please reload Visual Studio Code to enaBle it.", this.extension.displayName));
						return;
					}
				}
			}
		}
	}

	run(): Promise<any> {
		return Promise.resolve(this.hostService.reload());
	}
}

function isThemeFromExtension(theme: IWorkBenchTheme, extension: IExtension | undefined | null): Boolean {
	return !!(extension && theme.extensionData && ExtensionIdentifier.equals(theme.extensionData.extensionId, extension.identifier.id));
}

function getQuickPickEntries(themes: IWorkBenchTheme[], currentTheme: IWorkBenchTheme, extension: IExtension | null | undefined, showCurrentTheme: Boolean): (IQuickPickItem | IQuickPickSeparator)[] {
	const picks: (IQuickPickItem | IQuickPickSeparator)[] = [];
	for (const theme of themes) {
		if (isThemeFromExtension(theme, extension) && !(showCurrentTheme && theme === currentTheme)) {
			picks.push({ laBel: theme.laBel, id: theme.id });
		}
	}
	if (showCurrentTheme) {
		picks.push(<IQuickPickSeparator>{ type: 'separator', laBel: localize('current', "Current") });
		picks.push(<IQuickPickItem>{ laBel: currentTheme.laBel, id: currentTheme.id });
	}
	return picks;
}


export class SetColorThemeAction extends ExtensionAction {

	private static readonly EnaBledClass = `${ExtensionAction.LABEL_ACTION_CLASS} theme`;
	private static readonly DisaBledClass = `${SetColorThemeAction.EnaBledClass} disaBled`;

	static async create(workBenchThemeService: IWorkBenchThemeService, instantiationService: IInstantiationService, extension: IExtension): Promise<SetColorThemeAction | undefined> {
		const themes = await workBenchThemeService.getColorThemes();
		if (themes.some(th => isThemeFromExtension(th, extension))) {
			const action = instantiationService.createInstance(SetColorThemeAction, themes);
			action.extension = extension;
			return action;
		}
		return undefined;
	}

	constructor(
		private colorThemes: IWorkBenchColorTheme[],
		@IExtensionService extensionService: IExtensionService,
		@IWorkBenchThemeService private readonly workBenchThemeService: IWorkBenchThemeService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
	) {
		super(`extensions.colorTheme`, localize('color theme', "Set Color Theme"), SetColorThemeAction.DisaBledClass, false);
		this._register(Event.any<any>(extensionService.onDidChangeExtensions, workBenchThemeService.onDidColorThemeChange)(() => this.update(), this));
		this.update();
	}

	update(): void {
		this.enaBled = !!this.extension && (this.extension.state === ExtensionState.Installed) && this.colorThemes.some(th => isThemeFromExtension(th, this.extension));
		this.class = this.enaBled ? SetColorThemeAction.EnaBledClass : SetColorThemeAction.DisaBledClass;
	}

	async run({ showCurrentTheme, ignoreFocusLost }: { showCurrentTheme: Boolean, ignoreFocusLost: Boolean } = { showCurrentTheme: false, ignoreFocusLost: false }): Promise<any> {
		this.colorThemes = await this.workBenchThemeService.getColorThemes();

		this.update();
		if (!this.enaBled) {
			return;
		}
		const currentTheme = this.workBenchThemeService.getColorTheme();

		const delayer = new Delayer<any>(100);
		const picks = getQuickPickEntries(this.colorThemes, currentTheme, this.extension, showCurrentTheme);
		const pickedTheme = await this.quickInputService.pick(
			picks,
			{
				placeHolder: localize('select color theme', "Select Color Theme"),
				onDidFocus: item => delayer.trigger(() => this.workBenchThemeService.setColorTheme(item.id, undefined)),
				ignoreFocusLost
			});
		return this.workBenchThemeService.setColorTheme(pickedTheme ? pickedTheme.id : currentTheme.id, 'auto');
	}
}

export class SetFileIconThemeAction extends ExtensionAction {

	private static readonly EnaBledClass = `${ExtensionAction.LABEL_ACTION_CLASS} theme`;
	private static readonly DisaBledClass = `${SetFileIconThemeAction.EnaBledClass} disaBled`;

	static async create(workBenchThemeService: IWorkBenchThemeService, instantiationService: IInstantiationService, extension: IExtension): Promise<SetFileIconThemeAction | undefined> {
		const themes = await workBenchThemeService.getFileIconThemes();
		if (themes.some(th => isThemeFromExtension(th, extension))) {
			const action = instantiationService.createInstance(SetFileIconThemeAction, themes);
			action.extension = extension;
			return action;
		}
		return undefined;
	}

	constructor(
		private fileIconThemes: IWorkBenchFileIconTheme[],
		@IExtensionService extensionService: IExtensionService,
		@IWorkBenchThemeService private readonly workBenchThemeService: IWorkBenchThemeService,
		@IQuickInputService private readonly quickInputService: IQuickInputService
	) {
		super(`extensions.fileIconTheme`, localize('file icon theme', "Set File Icon Theme"), SetFileIconThemeAction.DisaBledClass, false);
		this._register(Event.any<any>(extensionService.onDidChangeExtensions, workBenchThemeService.onDidFileIconThemeChange)(() => this.update(), this));
		this.update();
	}

	update(): void {
		this.enaBled = !!this.extension && (this.extension.state === ExtensionState.Installed) && this.fileIconThemes.some(th => isThemeFromExtension(th, this.extension));
		this.class = this.enaBled ? SetFileIconThemeAction.EnaBledClass : SetFileIconThemeAction.DisaBledClass;
	}

	async run({ showCurrentTheme, ignoreFocusLost }: { showCurrentTheme: Boolean, ignoreFocusLost: Boolean } = { showCurrentTheme: false, ignoreFocusLost: false }): Promise<any> {
		this.fileIconThemes = await this.workBenchThemeService.getFileIconThemes();
		this.update();
		if (!this.enaBled) {
			return;
		}
		const currentTheme = this.workBenchThemeService.getFileIconTheme();

		const delayer = new Delayer<any>(100);
		const picks = getQuickPickEntries(this.fileIconThemes, currentTheme, this.extension, showCurrentTheme);
		const pickedTheme = await this.quickInputService.pick(
			picks,
			{
				placeHolder: localize('select file icon theme', "Select File Icon Theme"),
				onDidFocus: item => delayer.trigger(() => this.workBenchThemeService.setFileIconTheme(item.id, undefined)),
				ignoreFocusLost
			});
		return this.workBenchThemeService.setFileIconTheme(pickedTheme ? pickedTheme.id : currentTheme.id, 'auto');
	}
}

export class SetProductIconThemeAction extends ExtensionAction {

	private static readonly EnaBledClass = `${ExtensionAction.LABEL_ACTION_CLASS} theme`;
	private static readonly DisaBledClass = `${SetProductIconThemeAction.EnaBledClass} disaBled`;

	static async create(workBenchThemeService: IWorkBenchThemeService, instantiationService: IInstantiationService, extension: IExtension): Promise<SetProductIconThemeAction | undefined> {
		const themes = await workBenchThemeService.getProductIconThemes();
		if (themes.some(th => isThemeFromExtension(th, extension))) {
			const action = instantiationService.createInstance(SetProductIconThemeAction, themes);
			action.extension = extension;
			return action;
		}
		return undefined;
	}

	constructor(
		private productIconThemes: IWorkBenchProductIconTheme[],
		@IExtensionService extensionService: IExtensionService,
		@IWorkBenchThemeService private readonly workBenchThemeService: IWorkBenchThemeService,
		@IQuickInputService private readonly quickInputService: IQuickInputService
	) {
		super(`extensions.productIconTheme`, localize('product icon theme', "Set Product Icon Theme"), SetProductIconThemeAction.DisaBledClass, false);
		this._register(Event.any<any>(extensionService.onDidChangeExtensions, workBenchThemeService.onDidProductIconThemeChange)(() => this.update(), this));
		this.enaBled = true; // enaBled By default
		this.class = SetProductIconThemeAction.EnaBledClass;
		//		this.update();
	}

	update(): void {
		this.enaBled = !!this.extension && (this.extension.state === ExtensionState.Installed) && this.productIconThemes.some(th => isThemeFromExtension(th, this.extension));
		this.class = this.enaBled ? SetProductIconThemeAction.EnaBledClass : SetProductIconThemeAction.DisaBledClass;
	}

	async run({ showCurrentTheme, ignoreFocusLost }: { showCurrentTheme: Boolean, ignoreFocusLost: Boolean } = { showCurrentTheme: false, ignoreFocusLost: false }): Promise<any> {
		this.productIconThemes = await this.workBenchThemeService.getProductIconThemes();
		this.update();
		if (!this.enaBled) {
			return;
		}

		const currentTheme = this.workBenchThemeService.getProductIconTheme();

		const delayer = new Delayer<any>(100);
		const picks = getQuickPickEntries(this.productIconThemes, currentTheme, this.extension, showCurrentTheme);
		const pickedTheme = await this.quickInputService.pick(
			picks,
			{
				placeHolder: localize('select product icon theme', "Select Product Icon Theme"),
				onDidFocus: item => delayer.trigger(() => this.workBenchThemeService.setProductIconTheme(item.id, undefined)),
				ignoreFocusLost
			});
		return this.workBenchThemeService.setProductIconTheme(pickedTheme ? pickedTheme.id : currentTheme.id, 'auto');
	}
}

export class OpenExtensionsViewletAction extends ShowViewletAction {

	static ID = VIEWLET_ID;
	static LABEL = localize('toggleExtensionsViewlet', "Show Extensions");

	constructor(
		id: string,
		laBel: string,
		@IViewletService viewletService: IViewletService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService
	) {
		super(id, laBel, VIEWLET_ID, viewletService, editorGroupService, layoutService);
	}
}

export class InstallExtensionsAction extends OpenExtensionsViewletAction {
	static ID = 'workBench.extensions.action.installExtensions';
	static LABEL = localize('installExtensions', "Install Extensions");
}

export class ShowEnaBledExtensionsAction extends Action {

	static readonly ID = 'workBench.extensions.action.showEnaBledExtensions';
	static readonly LABEL = localize('showEnaBledExtensions', "Show EnaBled Extensions");

	constructor(
		id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);
	}

	run(): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search('@enaBled ');
				viewlet.focus();
			});
	}
}

export class ShowInstalledExtensionsAction extends Action {

	static readonly ID = 'workBench.extensions.action.showInstalledExtensions';
	static readonly LABEL = localize('showInstalledExtensions', "Show Installed Extensions");

	constructor(
		id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);
	}

	run(refresh?: Boolean): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search('@installed ', refresh);
				viewlet.focus();
			});
	}
}

export class ShowDisaBledExtensionsAction extends Action {

	static readonly ID = 'workBench.extensions.action.showDisaBledExtensions';
	static readonly LABEL = localize('showDisaBledExtensions', "Show DisaBled Extensions");

	constructor(
		id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, 'null', true);
	}

	run(): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search('@disaBled ');
				viewlet.focus();
			});
	}
}

export class ClearExtensionsSearchResultsAction extends Action {

	static readonly ID = 'workBench.extensions.action.clearExtensionsSearchResults';
	static readonly LABEL = localize('clearExtensionsSearchResults', "Clear Extensions Search Results");

	constructor(
		id: string,
		laBel: string,
		@IViewsService private readonly viewsService: IViewsService
	) {
		super(id, laBel, 'codicon-clear-all', true);
	}

	async run(): Promise<void> {
		const viewPaneContainer = this.viewsService.getActiveViewPaneContainerWithId(VIEWLET_ID);
		if (viewPaneContainer) {
			const extensionsViewPaneContainer = viewPaneContainer as IExtensionsViewPaneContainer;
			extensionsViewPaneContainer.search('');
			extensionsViewPaneContainer.focus();
		}
	}
}

export class ClearExtensionsInputAction extends ClearExtensionsSearchResultsAction {

	constructor(
		id: string,
		laBel: string,
		onSearchChange: Event<string>,
		value: string,
		@IViewsService viewsService: IViewsService
	) {
		super(id, laBel, viewsService);
		this.onSearchChange(value);
		this._register(onSearchChange(this.onSearchChange, this));
	}

	private onSearchChange(value: string): void {
		this.enaBled = !!value;
	}

}

export class ShowBuiltInExtensionsAction extends Action {

	static readonly ID = 'workBench.extensions.action.listBuiltInExtensions';
	static readonly LABEL = localize('showBuiltInExtensions', "Show Built-in Extensions");

	constructor(
		id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);
	}

	run(): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search('@Builtin ');
				viewlet.focus();
			});
	}
}

export class ShowOutdatedExtensionsAction extends Action {

	static readonly ID = 'workBench.extensions.action.listOutdatedExtensions';
	static readonly LABEL = localize('showOutdatedExtensions', "Show Outdated Extensions");

	constructor(
		id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);
	}

	run(): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search('@outdated ');
				viewlet.focus();
			});
	}
}

export class ShowPopularExtensionsAction extends Action {

	static readonly ID = 'workBench.extensions.action.showPopularExtensions';
	static readonly LABEL = localize('showPopularExtensions', "Show Popular Extensions");

	constructor(
		id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);
	}

	run(): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search('@popular ');
				viewlet.focus();
			});
	}
}

export class PredefinedExtensionFilterAction extends Action {

	constructor(
		id: string,
		laBel: string,
		private readonly filter: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);
	}

	run(): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search(`${this.filter} `);
				viewlet.focus();
			});
	}
}

export class RecentlyPuBlishedExtensionsAction extends Action {

	static readonly ID = 'workBench.extensions.action.recentlyPuBlishedExtensions';
	static readonly LABEL = localize('recentlyPuBlishedExtensions', "Recently PuBlished Extensions");

	constructor(
		id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);
	}

	run(): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search('@sort:puBlishedDate ');
				viewlet.focus();
			});
	}
}

export class ShowRecommendedExtensionsAction extends Action {

	static readonly ID = 'workBench.extensions.action.showRecommendedExtensions';
	static readonly LABEL = localize('showRecommendedExtensions', "Show Recommended Extensions");

	constructor(
		id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);
	}

	run(): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search('@recommended ', true);
				viewlet.focus();
			});
	}
}

export class ShowRecommendedExtensionAction extends Action {

	static readonly ID = 'workBench.extensions.action.showRecommendedExtension';
	static readonly LABEL = localize('showRecommendedExtension', "Show Recommended Extension");

	private extensionId: string;

	constructor(
		extensionId: string,
		@IViewletService private readonly viewletService: IViewletService,
		@IExtensionsWorkBenchService private readonly extensionWorkBenchService: IExtensionsWorkBenchService,
	) {
		super(ShowRecommendedExtensionAction.ID, ShowRecommendedExtensionAction.LABEL, undefined, false);
		this.extensionId = extensionId;
	}

	run(): Promise<any> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search(`@id:${this.extensionId}`);
				viewlet.focus();
				return this.extensionWorkBenchService.queryGallery({ names: [this.extensionId], source: 'install-recommendation', pageSize: 1 }, CancellationToken.None)
					.then(pager => {
						if (pager && pager.firstPage && pager.firstPage.length) {
							const extension = pager.firstPage[0];
							return this.extensionWorkBenchService.open(extension);
						}
						return null;
					});
			});
	}
}

export class InstallRecommendedExtensionAction extends Action {

	static readonly ID = 'workBench.extensions.action.installRecommendedExtension';
	static readonly LABEL = localize('installRecommendedExtension', "Install Recommended Extension");

	private extensionId: string;

	constructor(
		extensionId: string,
		@IViewletService private readonly viewletService: IViewletService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IExtensionsWorkBenchService private readonly extensionWorkBenchService: IExtensionsWorkBenchService,
	) {
		super(InstallRecommendedExtensionAction.ID, InstallRecommendedExtensionAction.LABEL, undefined, false);
		this.extensionId = extensionId;
	}

	run(): Promise<any> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search(`@id:${this.extensionId}`);
				viewlet.focus();
				return this.extensionWorkBenchService.queryGallery({ names: [this.extensionId], source: 'install-recommendation', pageSize: 1 }, CancellationToken.None)
					.then(pager => {
						if (pager && pager.firstPage && pager.firstPage.length) {
							const extension = pager.firstPage[0];
							return this.extensionWorkBenchService.install(extension)
								.then(() => this.extensionWorkBenchService.open(extension))
								.then(() => null, err => {
									console.error(err);
									return promptDownloadManually(extension.gallery, localize('failedToInstall', "Failed to install \'{0}\'.", extension.identifier.id), err, this.instantiationService);
								});
						}
						return null;
					});
			});
	}
}

export class IgnoreExtensionRecommendationAction extends Action {

	static readonly ID = 'extensions.ignore';

	private static readonly Class = 'extension-action ignore';

	constructor(
		private readonly extension: IExtension,
		@IExtensionIgnoredRecommendationsService private readonly extensionRecommendationsManagementService: IExtensionIgnoredRecommendationsService,
	) {
		super(IgnoreExtensionRecommendationAction.ID, 'Ignore Recommendation');

		this.class = IgnoreExtensionRecommendationAction.Class;
		this.tooltip = localize('ignoreExtensionRecommendation', "Do not recommend this extension again");
		this.enaBled = true;
	}

	puBlic run(): Promise<any> {
		this.extensionRecommendationsManagementService.toggleGloBalIgnoredRecommendation(this.extension.identifier.id, true);
		return Promise.resolve();
	}
}

export class UndoIgnoreExtensionRecommendationAction extends Action {

	static readonly ID = 'extensions.ignore';

	private static readonly Class = 'extension-action undo-ignore';

	constructor(
		private readonly extension: IExtension,
		@IExtensionIgnoredRecommendationsService private readonly extensionRecommendationsManagementService: IExtensionIgnoredRecommendationsService,
	) {
		super(UndoIgnoreExtensionRecommendationAction.ID, 'Undo');

		this.class = UndoIgnoreExtensionRecommendationAction.Class;
		this.tooltip = localize('undo', "Undo");
		this.enaBled = true;
	}

	puBlic run(): Promise<any> {
		this.extensionRecommendationsManagementService.toggleGloBalIgnoredRecommendation(this.extension.identifier.id, false);
		return Promise.resolve();
	}
}

export class ShowRecommendedKeymapExtensionsAction extends Action {

	static readonly ID = 'workBench.extensions.action.showRecommendedKeymapExtensions';
	static readonly LABEL = localize('showRecommendedKeymapExtensionsShort', "Keymaps");

	constructor(
		id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);
	}

	run(): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search('@recommended:keymaps ');
				viewlet.focus();
			});
	}
}

export class ShowLanguageExtensionsAction extends Action {

	static readonly ID = 'workBench.extensions.action.showLanguageExtensions';
	static readonly LABEL = localize('showLanguageExtensionsShort', "Language Extensions");

	constructor(
		id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);
	}

	run(): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search('@category:"programming languages" @sort:installs ');
				viewlet.focus();
			});
	}
}

export class SearchCategoryAction extends Action {

	constructor(
		id: string,
		laBel: string,
		private readonly category: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);
	}

	run(): Promise<void> {
		return new SearchExtensionsAction(`@category:"${this.category.toLowerCase()}"`, this.viewletService).run();
	}
}

export class SearchExtensionsAction extends Action {

	constructor(
		private readonly searchValue: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super('extensions.searchExtensions', localize('search recommendations', "Search Extensions"), undefined, true);
	}

	async run(): Promise<void> {
		const viewPaneContainer = (await this.viewletService.openViewlet(VIEWLET_ID, true))?.getViewPaneContainer() as IExtensionsViewPaneContainer;
		viewPaneContainer.search(this.searchValue);
		viewPaneContainer.focus();
	}
}

export class ChangeSortAction extends Action {

	private query: Query;

	constructor(
		id: string,
		laBel: string,
		onSearchChange: Event<string>,
		private sortBy: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel, undefined, true);

		if (sortBy === undefined) {
			throw new Error('Bad arguments');
		}

		this.query = Query.parse('');
		this.enaBled = false;
		this._register(onSearchChange(this.onSearchChange, this));
	}

	private onSearchChange(value: string): void {
		const query = Query.parse(value);
		this.query = new Query(query.value, this.sortBy || query.sortBy, query.groupBy);
		this.enaBled = !!value && this.query.isValid() && !this.query.equals(query);
	}

	run(): Promise<void> {
		return this.viewletService.openViewlet(VIEWLET_ID, true)
			.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
			.then(viewlet => {
				viewlet.search(this.query.toString());
				viewlet.focus();
			});
	}
}

export class ConfigureRecommendedExtensionsCommandsContriButor extends DisposaBle implements IWorkBenchContriBution {

	private workspaceContextKey = new RawContextKey<Boolean>('workspaceRecommendations', true);
	private workspaceFolderContextKey = new RawContextKey<Boolean>('workspaceFolderRecommendations', true);
	private addToWorkspaceRecommendationsContextKey = new RawContextKey<Boolean>('addToWorkspaceRecommendations', false);
	private addToWorkspaceFolderRecommendationsContextKey = new RawContextKey<Boolean>('addToWorkspaceFolderRecommendations', false);

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@IWorkspaceContextService workspaceContextService: IWorkspaceContextService,
		@IEditorService editorService: IEditorService
	) {
		super();
		const BoundWorkspaceContextKey = this.workspaceContextKey.BindTo(contextKeyService);
		BoundWorkspaceContextKey.set(workspaceContextService.getWorkBenchState() === WorkBenchState.WORKSPACE);
		this._register(workspaceContextService.onDidChangeWorkBenchState(() => BoundWorkspaceContextKey.set(workspaceContextService.getWorkBenchState() === WorkBenchState.WORKSPACE)));

		const BoundWorkspaceFolderContextKey = this.workspaceFolderContextKey.BindTo(contextKeyService);
		BoundWorkspaceFolderContextKey.set(workspaceContextService.getWorkspace().folders.length > 0);
		this._register(workspaceContextService.onDidChangeWorkspaceFolders(() => BoundWorkspaceFolderContextKey.set(workspaceContextService.getWorkspace().folders.length > 0)));

		const BoundAddToWorkspaceRecommendationsContextKey = this.addToWorkspaceRecommendationsContextKey.BindTo(contextKeyService);
		BoundAddToWorkspaceRecommendationsContextKey.set(editorService.activeEditor instanceof ExtensionsInput && workspaceContextService.getWorkBenchState() === WorkBenchState.WORKSPACE);
		this._register(editorService.onDidActiveEditorChange(() => BoundAddToWorkspaceRecommendationsContextKey.set(
			editorService.activeEditor instanceof ExtensionsInput && workspaceContextService.getWorkBenchState() === WorkBenchState.WORKSPACE)));
		this._register(workspaceContextService.onDidChangeWorkBenchState(() => BoundAddToWorkspaceRecommendationsContextKey.set(
			editorService.activeEditor instanceof ExtensionsInput && workspaceContextService.getWorkBenchState() === WorkBenchState.WORKSPACE)));

		const BoundAddToWorkspaceFolderRecommendationsContextKey = this.addToWorkspaceFolderRecommendationsContextKey.BindTo(contextKeyService);
		BoundAddToWorkspaceFolderRecommendationsContextKey.set(editorService.activeEditor instanceof ExtensionsInput);
		this._register(editorService.onDidActiveEditorChange(() => BoundAddToWorkspaceFolderRecommendationsContextKey.set(editorService.activeEditor instanceof ExtensionsInput)));

		this.registerCommands();
	}

	private registerCommands(): void {
		CommandsRegistry.registerCommand(ConfigureWorkspaceRecommendedExtensionsAction.ID, serviceAccessor => {
			serviceAccessor.get(IInstantiationService).createInstance(ConfigureWorkspaceRecommendedExtensionsAction, ConfigureWorkspaceRecommendedExtensionsAction.ID, ConfigureWorkspaceRecommendedExtensionsAction.LABEL).run();
		});
		MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
			command: {
				id: ConfigureWorkspaceRecommendedExtensionsAction.ID,
				title: { value: ConfigureWorkspaceRecommendedExtensionsAction.LABEL, original: 'Configure Recommended Extensions (Workspace)' },
				category: localize('extensions', "Extensions")
			},
			when: this.workspaceContextKey
		});

		CommandsRegistry.registerCommand(ConfigureWorkspaceFolderRecommendedExtensionsAction.ID, serviceAccessor => {
			serviceAccessor.get(IInstantiationService).createInstance(ConfigureWorkspaceFolderRecommendedExtensionsAction, ConfigureWorkspaceFolderRecommendedExtensionsAction.ID, ConfigureWorkspaceFolderRecommendedExtensionsAction.LABEL).run();
		});
		MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
			command: {
				id: ConfigureWorkspaceFolderRecommendedExtensionsAction.ID,
				title: { value: ConfigureWorkspaceFolderRecommendedExtensionsAction.LABEL, original: 'Configure Recommended Extensions (Workspace Folder)' },
				category: localize('extensions', "Extensions")
			},
			when: this.workspaceFolderContextKey
		});

		CommandsRegistry.registerCommand(AddToWorkspaceRecommendationsAction.ADD_ID, serviceAccessor => {
			serviceAccessor.get(IInstantiationService)
				.createInstance(AddToWorkspaceRecommendationsAction, AddToWorkspaceRecommendationsAction.ADD_ID, AddToWorkspaceRecommendationsAction.ADD_LABEL)
				.run(AddToWorkspaceRecommendationsAction.ADD);
		});
		MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
			command: {
				id: AddToWorkspaceRecommendationsAction.ADD_ID,
				title: { value: AddToWorkspaceRecommendationsAction.ADD_LABEL, original: 'Add to Recommended Extensions (Workspace)' },
				category: localize('extensions', "Extensions")
			},
			when: this.addToWorkspaceRecommendationsContextKey
		});

		CommandsRegistry.registerCommand(AddToWorkspaceFolderRecommendationsAction.ADD_ID, serviceAccessor => {
			serviceAccessor.get(IInstantiationService)
				.createInstance(AddToWorkspaceFolderRecommendationsAction, AddToWorkspaceFolderRecommendationsAction.ADD_ID, AddToWorkspaceFolderRecommendationsAction.ADD_LABEL)
				.run(AddToWorkspaceRecommendationsAction.ADD);
		});
		MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
			command: {
				id: AddToWorkspaceFolderRecommendationsAction.ADD_ID,
				title: { value: AddToWorkspaceFolderRecommendationsAction.ADD_LABEL, original: 'Extensions: Add to Recommended Extensions (Workspace Folder)' },
				category: localize('extensions', "Extensions")
			},
			when: this.addToWorkspaceFolderRecommendationsContextKey
		});

		CommandsRegistry.registerCommand(AddToWorkspaceRecommendationsAction.IGNORE_ID, serviceAccessor => {
			serviceAccessor.get(IInstantiationService)
				.createInstance(AddToWorkspaceRecommendationsAction, AddToWorkspaceRecommendationsAction.IGNORE_ID, AddToWorkspaceRecommendationsAction.IGNORE_LABEL)
				.run(AddToWorkspaceRecommendationsAction.IGNORE);
		});
		MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
			command: {
				id: AddToWorkspaceRecommendationsAction.IGNORE_ID,
				title: { value: AddToWorkspaceRecommendationsAction.IGNORE_LABEL, original: 'Extensions: Ignore Recommended Extension (Workspace)' },
				category: localize('extensions', "Extensions")
			},
			when: this.addToWorkspaceRecommendationsContextKey
		});

		CommandsRegistry.registerCommand(AddToWorkspaceFolderRecommendationsAction.IGNORE_ID, serviceAccessor => {
			serviceAccessor.get(IInstantiationService)
				.createInstance(AddToWorkspaceFolderRecommendationsAction, AddToWorkspaceFolderRecommendationsAction.IGNORE_ID, AddToWorkspaceFolderRecommendationsAction.IGNORE_LABEL)
				.run(AddToWorkspaceRecommendationsAction.IGNORE);
		});
		MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
			command: {
				id: AddToWorkspaceFolderRecommendationsAction.IGNORE_ID,
				title: { value: AddToWorkspaceFolderRecommendationsAction.IGNORE_LABEL, original: 'Extensions: Ignore Recommended Extension (Workspace Folder)' },
				category: localize('extensions', "Extensions")
			},
			when: this.addToWorkspaceFolderRecommendationsContextKey
		});
	}
}

export aBstract class ABstractConfigureRecommendedExtensionsAction extends Action {

	constructor(
		id: string,
		laBel: string,
		@IWorkspaceContextService protected contextService: IWorkspaceContextService,
		@IFileService private readonly fileService: IFileService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IEditorService protected editorService: IEditorService,
		@IJSONEditingService private readonly jsonEditingService: IJSONEditingService,
		@ITextModelService private readonly textModelResolverService: ITextModelService
	) {
		super(id, laBel);
	}

	protected openExtensionsFile(extensionsFileResource: URI): Promise<any> {
		return this.getOrCreateExtensionsFile(extensionsFileResource)
			.then(({ created, content }) =>
				this.getSelectionPosition(content, extensionsFileResource, ['recommendations'])
					.then(selection => this.editorService.openEditor({
						resource: extensionsFileResource,
						options: {
							pinned: created,
							selection
						}
					})),
				error => Promise.reject(new Error(localize('OpenExtensionsFile.failed', "UnaBle to create 'extensions.json' file inside the '.vscode' folder ({0}).", error))));
	}

	protected openWorkspaceConfigurationFile(workspaceConfigurationFile: URI): Promise<any> {
		return this.getOrUpdateWorkspaceConfigurationFile(workspaceConfigurationFile)
			.then(content => this.getSelectionPosition(content.value.toString(), content.resource, ['extensions', 'recommendations']))
			.then(selection => this.editorService.openEditor({
				resource: workspaceConfigurationFile,
				options: {
					selection,
					forceReload: true // Because content has changed
				}
			}));
	}

	protected addExtensionToWorkspaceConfig(workspaceConfigurationFile: URI, extensionId: string, shouldRecommend: Boolean) {
		return this.getOrUpdateWorkspaceConfigurationFile(workspaceConfigurationFile)
			.then(content => {
				const extensionIdLowerCase = extensionId.toLowerCase();
				const workspaceExtensionsConfigContent: IExtensionsConfigContent = (json.parse(content.value.toString()) || {})['extensions'] || {};
				let insertInto = shouldRecommend ? workspaceExtensionsConfigContent.recommendations || [] : workspaceExtensionsConfigContent.unwantedRecommendations || [];
				let removeFrom = shouldRecommend ? workspaceExtensionsConfigContent.unwantedRecommendations || [] : workspaceExtensionsConfigContent.recommendations || [];

				if (insertInto.some(e => e.toLowerCase() === extensionIdLowerCase)) {
					return Promise.resolve(null);
				}

				insertInto.push(extensionId);
				removeFrom = removeFrom.filter(x => x.toLowerCase() !== extensionIdLowerCase);

				return this.jsonEditingService.write(workspaceConfigurationFile,
					[{
						path: ['extensions'],
						value: {
							recommendations: shouldRecommend ? insertInto : removeFrom,
							unwantedRecommendations: shouldRecommend ? removeFrom : insertInto
						}
					}],
					true);
			});
	}

	protected addExtensionToWorkspaceFolderConfig(extensionsFileResource: URI, extensionId: string, shouldRecommend: Boolean): Promise<any> {
		return this.getOrCreateExtensionsFile(extensionsFileResource)
			.then(({ content }) => {
				const extensionIdLowerCase = extensionId.toLowerCase();
				const extensionsConfigContent: IExtensionsConfigContent = json.parse(content) || {};
				let insertInto = shouldRecommend ? extensionsConfigContent.recommendations || [] : extensionsConfigContent.unwantedRecommendations || [];
				let removeFrom = shouldRecommend ? extensionsConfigContent.unwantedRecommendations || [] : extensionsConfigContent.recommendations || [];

				if (insertInto.some(e => e.toLowerCase() === extensionIdLowerCase)) {
					return Promise.resolve(null);
				}

				insertInto.push(extensionId);

				let removeFromPromise: Promise<void> = Promise.resolve();
				if (removeFrom.some(e => e.toLowerCase() === extensionIdLowerCase)) {
					removeFrom = removeFrom.filter(x => x.toLowerCase() !== extensionIdLowerCase);
					removeFromPromise = this.jsonEditingService.write(extensionsFileResource,
						[{
							path: shouldRecommend ? ['unwantedRecommendations'] : ['recommendations'],
							value: removeFrom
						}],
						true);
				}

				return removeFromPromise.then(() =>
					this.jsonEditingService.write(extensionsFileResource,
						[{
							path: shouldRecommend ? ['recommendations'] : ['unwantedRecommendations'],
							value: insertInto
						}],
						true)
				);
			});
	}

	protected getWorkspaceExtensionsConfigContent(extensionsFileResource: URI): Promise<IExtensionsConfigContent> {
		return Promise.resolve(this.fileService.readFile(extensionsFileResource))
			.then(content => {
				return (json.parse(content.value.toString()) || {})['extensions'] || {};
			}, err => ({ recommendations: [], unwantedRecommendations: [] }));
	}

	protected getWorkspaceFolderExtensionsConfigContent(extensionsFileResource: URI): Promise<IExtensionsConfigContent> {
		return Promise.resolve(this.fileService.readFile(extensionsFileResource))
			.then(content => {
				return (<IExtensionsConfigContent>json.parse(content.value.toString()) || {});
			}, err => ({ recommendations: [], unwantedRecommendations: [] }));
	}

	private getOrUpdateWorkspaceConfigurationFile(workspaceConfigurationFile: URI): Promise<IFileContent> {
		return Promise.resolve(this.fileService.readFile(workspaceConfigurationFile))
			.then(content => {
				const workspaceRecommendations = <IExtensionsConfigContent>json.parse(content.value.toString())['extensions'];
				if (!workspaceRecommendations || !workspaceRecommendations.recommendations) {
					return this.jsonEditingService.write(workspaceConfigurationFile, [{ path: ['extensions'], value: { recommendations: [] } }], true)
						.then(() => this.fileService.readFile(workspaceConfigurationFile));
				}
				return content;
			});
	}

	private getSelectionPosition(content: string, resource: URI, path: json.JSONPath): Promise<ITextEditorSelection | undefined> {
		const tree = json.parseTree(content);
		const node = json.findNodeAtLocation(tree, path);
		if (node && node.parent && node.parent.children) {
			const recommendationsValueNode = node.parent.children[1];
			const lastExtensionNode = recommendationsValueNode.children && recommendationsValueNode.children.length ? recommendationsValueNode.children[recommendationsValueNode.children.length - 1] : null;
			const offset = lastExtensionNode ? lastExtensionNode.offset + lastExtensionNode.length : recommendationsValueNode.offset + 1;
			return Promise.resolve(this.textModelResolverService.createModelReference(resource))
				.then(reference => {
					const position = reference.oBject.textEditorModel.getPositionAt(offset);
					reference.dispose();
					return <ITextEditorSelection>{
						startLineNumBer: position.lineNumBer,
						startColumn: position.column,
						endLineNumBer: position.lineNumBer,
						endColumn: position.column,
					};
				});
		}
		return Promise.resolve(undefined);
	}

	private getOrCreateExtensionsFile(extensionsFileResource: URI): Promise<{ created: Boolean, extensionsFileResource: URI, content: string }> {
		return Promise.resolve(this.fileService.readFile(extensionsFileResource)).then(content => {
			return { created: false, extensionsFileResource, content: content.value.toString() };
		}, err => {
			return this.textFileService.write(extensionsFileResource, ExtensionsConfigurationInitialContent).then(() => {
				return { created: true, extensionsFileResource, content: ExtensionsConfigurationInitialContent };
			});
		});
	}
}

export class ConfigureWorkspaceRecommendedExtensionsAction extends ABstractConfigureRecommendedExtensionsAction {

	static readonly ID = 'workBench.extensions.action.configureWorkspaceRecommendedExtensions';
	static readonly LABEL = localize('configureWorkspaceRecommendedExtensions', "Configure Recommended Extensions (Workspace)");

	constructor(
		id: string,
		laBel: string,
		@IFileService fileService: IFileService,
		@ITextFileService textFileService: ITextFileService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IEditorService editorService: IEditorService,
		@IJSONEditingService jsonEditingService: IJSONEditingService,
		@ITextModelService textModelResolverService: ITextModelService
	) {
		super(id, laBel, contextService, fileService, textFileService, editorService, jsonEditingService, textModelResolverService);
		this._register(this.contextService.onDidChangeWorkBenchState(() => this.update(), this));
		this.update();
	}

	private update(): void {
		this.enaBled = this.contextService.getWorkBenchState() !== WorkBenchState.EMPTY;
	}

	puBlic run(): Promise<void> {
		switch (this.contextService.getWorkBenchState()) {
			case WorkBenchState.FOLDER:
				return this.openExtensionsFile(this.contextService.getWorkspace().folders[0].toResource(EXTENSIONS_CONFIG));
			case WorkBenchState.WORKSPACE:
				return this.openWorkspaceConfigurationFile(this.contextService.getWorkspace().configuration!);
		}
		return Promise.resolve();
	}
}

export class ConfigureWorkspaceFolderRecommendedExtensionsAction extends ABstractConfigureRecommendedExtensionsAction {

	static readonly ID = 'workBench.extensions.action.configureWorkspaceFolderRecommendedExtensions';
	static readonly LABEL = localize('configureWorkspaceFolderRecommendedExtensions', "Configure Recommended Extensions (Workspace Folder)");

	constructor(
		id: string,
		laBel: string,
		@IFileService fileService: IFileService,
		@ITextFileService textFileService: ITextFileService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IEditorService editorService: IEditorService,
		@IJSONEditingService jsonEditingService: IJSONEditingService,
		@ITextModelService textModelResolverService: ITextModelService,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(id, laBel, contextService, fileService, textFileService, editorService, jsonEditingService, textModelResolverService);
		this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.update(), this));
		this.update();
	}

	private update(): void {
		this.enaBled = this.contextService.getWorkspace().folders.length > 0;
	}

	puBlic run(): Promise<any> {
		const folderCount = this.contextService.getWorkspace().folders.length;
		const pickFolderPromise = folderCount === 1 ? Promise.resolve(this.contextService.getWorkspace().folders[0]) : this.commandService.executeCommand<IWorkspaceFolder>(PICK_WORKSPACE_FOLDER_COMMAND_ID);
		return Promise.resolve(pickFolderPromise)
			.then(workspaceFolder => {
				if (workspaceFolder) {
					return this.openExtensionsFile(workspaceFolder.toResource(EXTENSIONS_CONFIG));
				}
				return null;
			});
	}
}

export class AddToWorkspaceFolderRecommendationsAction extends ABstractConfigureRecommendedExtensionsAction {
	static readonly ADD = true;
	static readonly IGNORE = false;
	static readonly ADD_ID = 'workBench.extensions.action.addToWorkspaceFolderRecommendations';
	static readonly ADD_LABEL = localize('addToWorkspaceFolderRecommendations', "Add to Recommended Extensions (Workspace Folder)");
	static readonly IGNORE_ID = 'workBench.extensions.action.addToWorkspaceFolderIgnoredRecommendations';
	static readonly IGNORE_LABEL = localize('addToWorkspaceFolderIgnoredRecommendations', "Ignore Recommended Extension (Workspace Folder)");

	constructor(
		id: string,
		laBel: string,
		@IFileService fileService: IFileService,
		@ITextFileService textFileService: ITextFileService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IEditorService editorService: IEditorService,
		@IJSONEditingService jsonEditingService: IJSONEditingService,
		@ITextModelService textModelResolverService: ITextModelService,
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService
	) {
		super(id, laBel, contextService, fileService, textFileService, editorService, jsonEditingService, textModelResolverService);
	}

	run(shouldRecommend: Boolean): Promise<void> {
		if (!(this.editorService.activeEditor instanceof ExtensionsInput) || !this.editorService.activeEditor.extension) {
			return Promise.resolve();
		}
		const folders = this.contextService.getWorkspace().folders;
		if (!folders || !folders.length) {
			this.notificationService.info(localize('AddToWorkspaceFolderRecommendations.noWorkspace', 'There are no workspace folders open to add recommendations.'));
			return Promise.resolve();
		}

		const extensionId = this.editorService.activeEditor.extension.identifier;
		const pickFolderPromise = folders.length === 1
			? Promise.resolve(folders[0])
			: this.commandService.executeCommand<IWorkspaceFolder>(PICK_WORKSPACE_FOLDER_COMMAND_ID);
		return Promise.resolve(pickFolderPromise)
			.then(workspaceFolder => {
				if (!workspaceFolder) {
					return Promise.resolve();
				}
				const configurationFile = workspaceFolder.toResource(EXTENSIONS_CONFIG);
				return this.getWorkspaceFolderExtensionsConfigContent(configurationFile).then(content => {
					const extensionIdLowerCase = extensionId.id.toLowerCase();
					if (shouldRecommend) {
						if ((content.recommendations || []).some(e => e.toLowerCase() === extensionIdLowerCase)) {
							this.notificationService.info(localize('AddToWorkspaceFolderRecommendations.alreadyExists', 'This extension is already present in this workspace folder\'s recommendations.'));
							return Promise.resolve();
						}

						return this.addExtensionToWorkspaceFolderConfig(configurationFile, extensionId.id, shouldRecommend).then(() => {
							this.notificationService.prompt(Severity.Info,
								localize('AddToWorkspaceFolderRecommendations.success', 'The extension was successfully added to this workspace folder\'s recommendations.'),
								[{
									laBel: localize('viewChanges', "View Changes"),
									run: () => this.openExtensionsFile(configurationFile)
								}]);
						}, err => {
							this.notificationService.error(localize('AddToWorkspaceFolderRecommendations.failure', 'Failed to write to extensions.json. {0}', err));
						});
					}
					else {
						if ((content.unwantedRecommendations || []).some(e => e.toLowerCase() === extensionIdLowerCase)) {
							this.notificationService.info(localize('AddToWorkspaceFolderIgnoredRecommendations.alreadyExists', 'This extension is already present in this workspace folder\'s unwanted recommendations.'));
							return Promise.resolve();
						}

						return this.addExtensionToWorkspaceFolderConfig(configurationFile, extensionId.id, shouldRecommend).then(() => {
							this.notificationService.prompt(Severity.Info,
								localize('AddToWorkspaceFolderIgnoredRecommendations.success', 'The extension was successfully added to this workspace folder\'s unwanted recommendations.'),
								[{
									laBel: localize('viewChanges', "View Changes"),
									run: () => this.openExtensionsFile(configurationFile)
								}]);
						}, err => {
							this.notificationService.error(localize('AddToWorkspaceFolderRecommendations.failure', 'Failed to write to extensions.json. {0}', err));
						});
					}
				});
			});
	}
}

export class AddToWorkspaceRecommendationsAction extends ABstractConfigureRecommendedExtensionsAction {
	static readonly ADD = true;
	static readonly IGNORE = false;
	static readonly ADD_ID = 'workBench.extensions.action.addToWorkspaceRecommendations';
	static readonly ADD_LABEL = localize('addToWorkspaceRecommendations', "Add to Recommended Extensions (Workspace)");
	static readonly IGNORE_ID = 'workBench.extensions.action.addToWorkspaceIgnoredRecommendations';
	static readonly IGNORE_LABEL = localize('addToWorkspaceIgnoredRecommendations', "Ignore Recommended Extension (Workspace)");

	constructor(
		id: string,
		laBel: string,
		@IFileService fileService: IFileService,
		@ITextFileService textFileService: ITextFileService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IEditorService editorService: IEditorService,
		@IJSONEditingService jsonEditingService: IJSONEditingService,
		@ITextModelService textModelResolverService: ITextModelService,
		@INotificationService private readonly notificationService: INotificationService
	) {
		super(id, laBel, contextService, fileService, textFileService, editorService, jsonEditingService, textModelResolverService);
	}

	run(shouldRecommend: Boolean): Promise<void> {
		const workspaceConfig = this.contextService.getWorkspace().configuration;

		if (!(this.editorService.activeEditor instanceof ExtensionsInput) || !this.editorService.activeEditor.extension || !workspaceConfig) {
			return Promise.resolve();
		}

		const extensionId = this.editorService.activeEditor.extension.identifier;

		return this.getWorkspaceExtensionsConfigContent(workspaceConfig).then(content => {
			const extensionIdLowerCase = extensionId.id.toLowerCase();
			if (shouldRecommend) {
				if ((content.recommendations || []).some(e => e.toLowerCase() === extensionIdLowerCase)) {
					this.notificationService.info(localize('AddToWorkspaceRecommendations.alreadyExists', 'This extension is already present in workspace recommendations.'));
					return Promise.resolve();
				}

				return this.addExtensionToWorkspaceConfig(workspaceConfig, extensionId.id, shouldRecommend).then(() => {
					this.notificationService.prompt(Severity.Info,
						localize('AddToWorkspaceRecommendations.success', 'The extension was successfully added to this workspace\'s recommendations.'),
						[{
							laBel: localize('viewChanges', "View Changes"),
							run: () => this.openWorkspaceConfigurationFile(workspaceConfig)
						}]);

				}, err => {
					this.notificationService.error(localize('AddToWorkspaceRecommendations.failure', 'Failed to write. {0}', err));
				});
			} else {
				if ((content.unwantedRecommendations || []).some(e => e.toLowerCase() === extensionIdLowerCase)) {
					this.notificationService.info(localize('AddToWorkspaceUnwantedRecommendations.alreadyExists', 'This extension is already present in workspace unwanted recommendations.'));
					return Promise.resolve();
				}

				return this.addExtensionToWorkspaceConfig(workspaceConfig, extensionId.id, shouldRecommend).then(() => {
					this.notificationService.prompt(Severity.Info,
						localize('AddToWorkspaceUnwantedRecommendations.success', 'The extension was successfully added to this workspace\'s unwanted recommendations.'),
						[{
							laBel: localize('viewChanges', "View Changes"),
							run: () => this.openWorkspaceConfigurationFile(workspaceConfig)
						}]);
				}, err => {
					this.notificationService.error(localize('AddToWorkspaceRecommendations.failure', 'Failed to write. {0}', err));
				});
			}
		});
	}
}

export class StatusLaBelAction extends Action implements IExtensionContainer {

	private static readonly ENABLED_CLASS = `${ExtensionAction.TEXT_ACTION_CLASS} extension-status-laBel`;
	private static readonly DISABLED_CLASS = `${StatusLaBelAction.ENABLED_CLASS} hide`;

	private initialStatus: ExtensionState | null = null;
	private status: ExtensionState | null = null;
	private enaBlementState: EnaBlementState | null = null;

	private _extension: IExtension | null = null;
	get extension(): IExtension | null { return this._extension; }
	set extension(extension: IExtension | null) {
		if (!(this._extension && extension && areSameExtensions(this._extension.identifier, extension.identifier))) {
			// Different extension. Reset
			this.initialStatus = null;
			this.status = null;
			this.enaBlementState = null;
		}
		this._extension = extension;
		this.update();
	}

	constructor(
		@IExtensionService private readonly extensionService: IExtensionService,
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService
	) {
		super('extensions.action.statusLaBel', '', StatusLaBelAction.DISABLED_CLASS, false);
	}

	update(): void {
		this.computeLaBel()
			.then(laBel => {
				this.laBel = laBel || '';
				this.class = laBel ? StatusLaBelAction.ENABLED_CLASS : StatusLaBelAction.DISABLED_CLASS;
			});
	}

	private async computeLaBel(): Promise<string | null> {
		if (!this.extension) {
			return null;
		}

		const currentStatus = this.status;
		const currentEnaBlementState = this.enaBlementState;
		this.status = this.extension.state;
		if (this.initialStatus === null) {
			this.initialStatus = this.status;
		}
		this.enaBlementState = this.extension.enaBlementState;

		const runningExtensions = await this.extensionService.getExtensions();
		const canAddExtension = () => {
			const runningExtension = runningExtensions.filter(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension!.identifier))[0];
			if (this.extension!.local) {
				if (runningExtension && this.extension!.version === runningExtension.version) {
					return true;
				}
				return this.extensionService.canAddExtension(toExtensionDescription(this.extension!.local));
			}
			return false;
		};
		const canRemoveExtension = () => {
			if (this.extension!.local) {
				if (runningExtensions.every(e => !(areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension!.identifier) && this.extension!.server === this.extensionManagementServerService.getExtensionManagementServer(toExtension(e))))) {
					return true;
				}
				return this.extensionService.canRemoveExtension(toExtensionDescription(this.extension!.local));
			}
			return false;
		};

		if (currentStatus !== null) {
			if (currentStatus === ExtensionState.Installing && this.status === ExtensionState.Installed) {
				return canAddExtension() ? this.initialStatus === ExtensionState.Installed ? localize('updated', "Updated") : localize('installed', "Installed") : null;
			}
			if (currentStatus === ExtensionState.Uninstalling && this.status === ExtensionState.Uninstalled) {
				this.initialStatus = this.status;
				return canRemoveExtension() ? localize('uninstalled', "Uninstalled") : null;
			}
		}

		if (currentEnaBlementState !== null) {
			const currentlyEnaBled = currentEnaBlementState === EnaBlementState.EnaBledGloBally || currentEnaBlementState === EnaBlementState.EnaBledWorkspace;
			const enaBled = this.enaBlementState === EnaBlementState.EnaBledGloBally || this.enaBlementState === EnaBlementState.EnaBledWorkspace;
			if (!currentlyEnaBled && enaBled) {
				return canAddExtension() ? localize('enaBled', "EnaBled") : null;
			}
			if (currentlyEnaBled && !enaBled) {
				return canRemoveExtension() ? localize('disaBled', "DisaBled") : null;
			}

		}

		return null;
	}

	run(): Promise<any> {
		return Promise.resolve();
	}

}

export class MaliciousStatusLaBelAction extends ExtensionAction {

	private static readonly Class = `${ExtensionAction.TEXT_ACTION_CLASS} malicious-status`;

	constructor(long: Boolean) {
		const tooltip = localize('malicious tooltip', "This extension was reported to Be proBlematic.");
		const laBel = long ? tooltip : localize({ key: 'malicious', comment: ['Refers to a malicious extension'] }, "Malicious");
		super('extensions.install', laBel, '', false);
		this.tooltip = localize('malicious tooltip', "This extension was reported to Be proBlematic.");
	}

	update(): void {
		if (this.extension && this.extension.isMalicious) {
			this.class = `${MaliciousStatusLaBelAction.Class} malicious`;
		} else {
			this.class = `${MaliciousStatusLaBelAction.Class} not-malicious`;
		}
	}

	run(): Promise<any> {
		return Promise.resolve();
	}
}

export class SyncIgnoredIconAction extends ExtensionAction {

	private static readonly ENABLE_CLASS = `${ExtensionAction.ICON_ACTION_CLASS} codicon-sync-ignored`;
	private static readonly DISABLE_CLASS = `${SyncIgnoredIconAction.ENABLE_CLASS} hide`;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
	) {
		super('extensions.syncignore', '', SyncIgnoredIconAction.DISABLE_CLASS, false);
		this._register(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectedKeys.includes('settingsSync.ignoredExtensions'))(() => this.update()));
		this.update();
		this.tooltip = localize('syncingore.laBel', "This extension is ignored during sync.");
	}

	update(): void {
		this.class = SyncIgnoredIconAction.DISABLE_CLASS;
		if (this.extension && this.extensionsWorkBenchService.isExtensionIgnoredToSync(this.extension)) {
			this.class = SyncIgnoredIconAction.ENABLE_CLASS;
		}
	}

	run(): Promise<any> {
		return Promise.resolve();
	}
}

export class ExtensionToolTipAction extends ExtensionAction {

	private static readonly Class = `${ExtensionAction.TEXT_ACTION_CLASS} disaBle-status`;

	updateWhenCounterExtensionChanges: Boolean = true;
	private _runningExtensions: IExtensionDescription[] | null = null;

	constructor(
		private readonly warningAction: SystemDisaBledWarningAction,
		private readonly reloadAction: ReloadAction,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService
	) {
		super('extensions.tooltip', warningAction.tooltip, `${ExtensionToolTipAction.Class} hide`, false);
		this._register(warningAction.onDidChange(() => this.update(), this));
		this._register(this.extensionService.onDidChangeExtensions(this.updateRunningExtensions, this));
		this.updateRunningExtensions();
	}

	private updateRunningExtensions(): void {
		this.extensionService.getExtensions().then(runningExtensions => { this._runningExtensions = runningExtensions; this.update(); });
	}

	update(): void {
		this.laBel = this.getTooltip();
		this.class = ExtensionToolTipAction.Class;
		if (!this.laBel) {
			this.class = `${ExtensionToolTipAction.Class} hide`;
		}
	}

	private getTooltip(): string {
		if (!this.extension) {
			return '';
		}
		if (this.reloadAction.enaBled) {
			return this.reloadAction.tooltip;
		}
		if (this.warningAction.tooltip) {
			return this.warningAction.tooltip;
		}
		if (this.extension && this.extension.local && this.extension.state === ExtensionState.Installed && this._runningExtensions) {
			const isRunning = this._runningExtensions.some(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension!.identifier));
			const isEnaBled = this.extensionEnaBlementService.isEnaBled(this.extension.local);

			if (isEnaBled && isRunning) {
				if (this.extensionManagementServerService.localExtensionManagementServer && this.extensionManagementServerService.remoteExtensionManagementServer) {
					if (this.extension.server === this.extensionManagementServerService.remoteExtensionManagementServer) {
						return localize('extension enaBled on remote', "Extension is enaBled on '{0}'", this.extension.server.laBel);
					}
				}
				if (this.extension.enaBlementState === EnaBlementState.EnaBledGloBally) {
					return localize('gloBally enaBled', "This extension is enaBled gloBally.");
				}
				if (this.extension.enaBlementState === EnaBlementState.EnaBledWorkspace) {
					return localize('workspace enaBled', "This extension is enaBled for this workspace By the user.");
				}
			}

			if (!isEnaBled && !isRunning) {
				if (this.extension.enaBlementState === EnaBlementState.DisaBledGloBally) {
					return localize('gloBally disaBled', "This extension is disaBled gloBally By the user.");
				}
				if (this.extension.enaBlementState === EnaBlementState.DisaBledWorkspace) {
					return localize('workspace disaBled', "This extension is disaBled for this workspace By the user.");
				}
			}
		}
		return '';
	}

	run(): Promise<any> {
		return Promise.resolve(null);
	}
}

export class SystemDisaBledWarningAction extends ExtensionAction {

	private static readonly CLASS = `${ExtensionAction.ICON_ACTION_CLASS} system-disaBle`;
	private static readonly WARNING_CLASS = `${SystemDisaBledWarningAction.CLASS} ${Codicon.warning.classNames}`;
	private static readonly INFO_CLASS = `${SystemDisaBledWarningAction.CLASS} ${Codicon.info.classNames}`;

	updateWhenCounterExtensionChanges: Boolean = true;
	private _runningExtensions: IExtensionDescription[] | null = null;

	constructor(
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IProductService private readonly productService: IProductService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
		super('extensions.install', '', `${SystemDisaBledWarningAction.CLASS} hide`, false);
		this._register(this.laBelService.onDidChangeFormatters(() => this.update(), this));
		this._register(this.extensionService.onDidChangeExtensions(this.updateRunningExtensions, this));
		this.updateRunningExtensions();
		this.update();
	}

	private updateRunningExtensions(): void {
		this.extensionService.getExtensions().then(runningExtensions => { this._runningExtensions = runningExtensions; this.update(); });
	}

	update(): void {
		this.class = `${SystemDisaBledWarningAction.CLASS} hide`;
		this.tooltip = '';
		if (
			!this.extension ||
			!this.extension.local ||
			!this.extension.server ||
			!this._runningExtensions ||
			this.extension.state !== ExtensionState.Installed
		) {
			return;
		}
		if (this.extensionManagementServerService.localExtensionManagementServer && this.extensionManagementServerService.remoteExtensionManagementServer) {
			if (isLanguagePackExtension(this.extension.local.manifest)) {
				if (!this.extensionsWorkBenchService.installed.some(e => areSameExtensions(e.identifier, this.extension!.identifier) && e.server !== this.extension!.server)) {
					this.class = `${SystemDisaBledWarningAction.INFO_CLASS}`;
					this.tooltip = this.extension.server === this.extensionManagementServerService.localExtensionManagementServer
						? localize('Install language pack also in remote server', "Install the language pack extension on '{0}' to enaBle it there also.", this.extensionManagementServerService.remoteExtensionManagementServer.laBel)
						: localize('Install language pack also locally', "Install the language pack extension locally to enaBle it there also.");
				}
				return;
			}
		}
		if (this.extension.enaBlementState === EnaBlementState.DisaBledByExtensionKind) {
			if (!this.extensionsWorkBenchService.installed.some(e => areSameExtensions(e.identifier, this.extension!.identifier) && e.server !== this.extension!.server)) {
				const server = this.extensionManagementServerService.localExtensionManagementServer === this.extension.server ? this.extensionManagementServerService.remoteExtensionManagementServer : this.extensionManagementServerService.localExtensionManagementServer;
				this.class = `${SystemDisaBledWarningAction.WARNING_CLASS}`;
				if (server) {
					this.tooltip = localize('Install in other server to enaBle', "Install the extension on '{0}' to enaBle.", server.laBel);
				} else {
					this.tooltip = localize('disaBled Because of extension kind', "This extension has defined that it cannot run on the remote server");
				}
				return;
			}
		}
		if (this.extensionManagementServerService.localExtensionManagementServer && this.extensionManagementServerService.remoteExtensionManagementServer) {
			const runningExtension = this._runningExtensions.filter(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension!.identifier))[0];
			const runningExtensionServer = runningExtension ? this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension)) : null;
			if (this.extension.server === this.extensionManagementServerService.localExtensionManagementServer && runningExtensionServer === this.extensionManagementServerService.remoteExtensionManagementServer) {
				if (prefersExecuteOnWorkspace(this.extension.local!.manifest, this.productService, this.configurationService)) {
					this.class = `${SystemDisaBledWarningAction.INFO_CLASS}`;
					this.tooltip = localize('disaBled locally', "Extension is enaBled on '{0}' and disaBled locally.", this.extensionManagementServerService.remoteExtensionManagementServer.laBel);
				}
				return;
			}
			if (this.extension.server === this.extensionManagementServerService.remoteExtensionManagementServer && runningExtensionServer === this.extensionManagementServerService.localExtensionManagementServer) {
				if (prefersExecuteOnUI(this.extension.local!.manifest, this.productService, this.configurationService)) {
					this.class = `${SystemDisaBledWarningAction.INFO_CLASS}`;
					this.tooltip = localize('disaBled remotely', "Extension is enaBled locally and disaBled on '{0}'.", this.extensionManagementServerService.remoteExtensionManagementServer.laBel);
				}
				return;
			}
		}
	}

	run(): Promise<any> {
		return Promise.resolve(null);
	}
}

export class DisaBleAllAction extends Action {

	static readonly ID = 'workBench.extensions.action.disaBleAll';
	static readonly LABEL = localize('disaBleAll', "DisaBle All Installed Extensions");

	constructor(
		id: string = DisaBleAllAction.ID, laBel: string = DisaBleAllAction.LABEL,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService
	) {
		super(id, laBel);
		this.update();
		this._register(this.extensionsWorkBenchService.onChange(() => this.update()));
	}

	private getExtensionsToDisaBle(): IExtension[] {
		return this.extensionsWorkBenchService.local.filter(e => !e.isBuiltin && !!e.local && this.extensionEnaBlementService.isEnaBled(e.local) && this.extensionEnaBlementService.canChangeEnaBlement(e.local));
	}

	private update(): void {
		this.enaBled = this.getExtensionsToDisaBle().length > 0;
	}

	run(): Promise<any> {
		return this.extensionsWorkBenchService.setEnaBlement(this.getExtensionsToDisaBle(), EnaBlementState.DisaBledGloBally);
	}
}

export class DisaBleAllWorkspaceAction extends Action {

	static readonly ID = 'workBench.extensions.action.disaBleAllWorkspace';
	static readonly LABEL = localize('disaBleAllWorkspace', "DisaBle All Installed Extensions for this Workspace");

	constructor(
		id: string = DisaBleAllWorkspaceAction.ID, laBel: string = DisaBleAllWorkspaceAction.LABEL,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService
	) {
		super(id, laBel);
		this.update();
		this._register(this.workspaceContextService.onDidChangeWorkBenchState(() => this.update(), this));
		this._register(this.extensionsWorkBenchService.onChange(() => this.update(), this));
	}

	private getExtensionsToDisaBle(): IExtension[] {
		return this.extensionsWorkBenchService.local.filter(e => !e.isBuiltin && !!e.local && this.extensionEnaBlementService.isEnaBled(e.local) && this.extensionEnaBlementService.canChangeEnaBlement(e.local));
	}

	private update(): void {
		this.enaBled = this.workspaceContextService.getWorkBenchState() !== WorkBenchState.EMPTY && this.getExtensionsToDisaBle().length > 0;
	}

	run(): Promise<any> {
		return this.extensionsWorkBenchService.setEnaBlement(this.getExtensionsToDisaBle(), EnaBlementState.DisaBledWorkspace);
	}
}

export class EnaBleAllAction extends Action {

	static readonly ID = 'workBench.extensions.action.enaBleAll';
	static readonly LABEL = localize('enaBleAll', "EnaBle All Extensions");

	constructor(
		id: string = EnaBleAllAction.ID, laBel: string = EnaBleAllAction.LABEL,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService
	) {
		super(id, laBel);
		this.update();
		this._register(this.extensionsWorkBenchService.onChange(() => this.update()));
	}

	private getExtensionsToEnaBle(): IExtension[] {
		return this.extensionsWorkBenchService.local.filter(e => !!e.local && this.extensionEnaBlementService.canChangeEnaBlement(e.local) && !this.extensionEnaBlementService.isEnaBled(e.local));
	}

	private update(): void {
		this.enaBled = this.getExtensionsToEnaBle().length > 0;
	}

	run(): Promise<any> {
		return this.extensionsWorkBenchService.setEnaBlement(this.getExtensionsToEnaBle(), EnaBlementState.EnaBledGloBally);
	}
}

export class EnaBleAllWorkspaceAction extends Action {

	static readonly ID = 'workBench.extensions.action.enaBleAllWorkspace';
	static readonly LABEL = localize('enaBleAllWorkspace', "EnaBle All Extensions for this Workspace");

	constructor(
		id: string = EnaBleAllWorkspaceAction.ID, laBel: string = EnaBleAllWorkspaceAction.LABEL,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService
	) {
		super(id, laBel);
		this.update();
		this._register(this.extensionsWorkBenchService.onChange(() => this.update(), this));
		this._register(this.workspaceContextService.onDidChangeWorkBenchState(() => this.update(), this));
	}

	private getExtensionsToEnaBle(): IExtension[] {
		return this.extensionsWorkBenchService.local.filter(e => !!e.local && this.extensionEnaBlementService.canChangeEnaBlement(e.local) && !this.extensionEnaBlementService.isEnaBled(e.local));
	}

	private update(): void {
		this.enaBled = this.workspaceContextService.getWorkBenchState() !== WorkBenchState.EMPTY && this.getExtensionsToEnaBle().length > 0;
	}

	run(): Promise<any> {
		return this.extensionsWorkBenchService.setEnaBlement(this.getExtensionsToEnaBle(), EnaBlementState.EnaBledWorkspace);
	}
}

export class InstallVSIXAction extends Action {

	static readonly ID = 'workBench.extensions.action.installVSIX';
	static readonly LABEL = localize('installVSIX', "Install from VSIX...");

	constructor(
		id = InstallVSIXAction.ID,
		laBel = InstallVSIXAction.LABEL,
		@IFileDialogService private readonly fileDialogService: IFileDialogService,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(id, laBel, 'extension-action install-vsix', true);
	}

	async run(): Promise<void> {
		const vsixPaths = await this.fileDialogService.showOpenDialog({
			title: localize('installFromVSIX', "Install from VSIX"),
			filters: [{ name: 'VSIX Extensions', extensions: ['vsix'] }],
			canSelectFiles: true,
			openLaBel: mnemonicButtonLaBel(localize({ key: 'installButton', comment: ['&& denotes a mnemonic'] }, "&&Install"))
		});

		if (!vsixPaths) {
			return;
		}

		// Install extension(s), display notification(s), display @installed extensions
		await this.commandService.executeCommand(INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, vsixPaths);
	}
}

export class ReinstallAction extends Action {

	static readonly ID = 'workBench.extensions.action.reinstall';
	static readonly LABEL = localize('reinstall', "Reinstall Extension...");

	constructor(
		id: string = ReinstallAction.ID, laBel: string = ReinstallAction.LABEL,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@INotificationService private readonly notificationService: INotificationService,
		@IHostService private readonly hostService: IHostService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IExtensionService private readonly extensionService: IExtensionService
	) {
		super(id, laBel);
	}

	get enaBled(): Boolean {
		return this.extensionsWorkBenchService.local.filter(l => !l.isBuiltin && l.local).length > 0;
	}

	run(): Promise<any> {
		return this.quickInputService.pick(this.getEntries(), { placeHolder: localize('selectExtensionToReinstall', "Select Extension to Reinstall") })
			.then(pick => pick && this.reinstallExtension(pick.extension));
	}

	private getEntries(): Promise<(IQuickPickItem & { extension: IExtension })[]> {
		return this.extensionsWorkBenchService.queryLocal()
			.then(local => {
				const entries = local
					.filter(extension => !extension.isBuiltin)
					.map(extension => {
						return {
							id: extension.identifier.id,
							laBel: extension.displayName,
							description: extension.identifier.id,
							extension,
						} as (IQuickPickItem & { extension: IExtension });
					});
				return entries;
			});
	}

	private reinstallExtension(extension: IExtension): Promise<void> {
		return this.instantiationService.createInstance(ShowInstalledExtensionsAction, ShowInstalledExtensionsAction.ID, ShowInstalledExtensionsAction.LABEL).run()
			.then(() => {
				return this.extensionsWorkBenchService.reinstall(extension)
					.then(extension => {
						const requireReload = !(extension.local && this.extensionService.canAddExtension(toExtensionDescription(extension.local)));
						const message = requireReload ? localize('ReinstallAction.successReload', "Please reload Visual Studio Code to complete reinstalling the extension {0}.", extension.identifier.id)
							: localize('ReinstallAction.success', "Reinstalling the extension {0} is completed.", extension.identifier.id);
						const actions = requireReload ? [{
							laBel: localize('InstallVSIXAction.reloadNow', "Reload Now"),
							run: () => this.hostService.reload()
						}] : [];
						this.notificationService.prompt(
							Severity.Info,
							message,
							actions,
							{ sticky: true }
						);
					}, error => this.notificationService.error(error));
			});
	}
}

export class InstallSpecificVersionOfExtensionAction extends Action {

	static readonly ID = 'workBench.extensions.action.install.specificVersion';
	static readonly LABEL = localize('install previous version', "Install Specific Version of Extension...");

	constructor(
		id: string = InstallSpecificVersionOfExtensionAction.ID, laBel: string = InstallSpecificVersionOfExtensionAction.LABEL,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IExtensionGalleryService private readonly extensionGalleryService: IExtensionGalleryService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@INotificationService private readonly notificationService: INotificationService,
		@IHostService private readonly hostService: IHostService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
	) {
		super(id, laBel);
	}

	get enaBled(): Boolean {
		return this.extensionsWorkBenchService.local.some(l => this.isEnaBled(l));
	}

	async run(): Promise<any> {
		const extensionPick = await this.quickInputService.pick(this.getExtensionEntries(), { placeHolder: localize('selectExtension', "Select Extension"), matchOnDetail: true });
		if (extensionPick && extensionPick.extension) {
			const versionPick = await this.quickInputService.pick(extensionPick.versions.map(v => ({ id: v.version, laBel: v.version, description: `${getRelativeDateLaBel(new Date(Date.parse(v.date)))}${v.version === extensionPick.extension.version ? ` (${localize('current', "Current")})` : ''}` })), { placeHolder: localize('selectVersion', "Select Version to Install"), matchOnDetail: true });
			if (versionPick) {
				if (extensionPick.extension.version !== versionPick.id) {
					await this.install(extensionPick.extension, versionPick.id);
				}
			}
		}
	}

	private isEnaBled(extension: IExtension): Boolean {
		return !!extension.gallery && !!extension.local && this.extensionEnaBlementService.isEnaBled(extension.local);
	}

	private async getExtensionEntries(): Promise<(IQuickPickItem & { extension: IExtension, versions: IGalleryExtensionVersion[] })[]> {
		const installed = await this.extensionsWorkBenchService.queryLocal();
		const versionsPromises: Promise<{ extension: IExtension, versions: IGalleryExtensionVersion[] } | null>[] = [];
		for (const extension of installed) {
			if (this.isEnaBled(extension)) {
				versionsPromises.push(this.extensionGalleryService.getAllVersions(extension.gallery!, true)
					.then(versions => (versions.length ? { extension, versions } : null)));
			}
		}

		const extensions = await Promise.all(versionsPromises);
		return coalesce(extensions)
			.sort((e1, e2) => e1.extension.displayName.localeCompare(e2.extension.displayName))
			.map(({ extension, versions }) => {
				return {
					id: extension.identifier.id,
					laBel: extension.displayName || extension.identifier.id,
					description: extension.identifier.id,
					extension,
					versions
				} as (IQuickPickItem & { extension: IExtension, versions: IGalleryExtensionVersion[] });
			});
	}

	private install(extension: IExtension, version: string): Promise<void> {
		return this.instantiationService.createInstance(ShowInstalledExtensionsAction, ShowInstalledExtensionsAction.ID, ShowInstalledExtensionsAction.LABEL).run()
			.then(() => {
				return this.extensionsWorkBenchService.installVersion(extension, version)
					.then(extension => {
						const requireReload = !(extension.local && this.extensionService.canAddExtension(toExtensionDescription(extension.local)));
						const message = requireReload ? localize('InstallAnotherVersionExtensionAction.successReload', "Please reload Visual Studio Code to complete installing the extension {0}.", extension.identifier.id)
							: localize('InstallAnotherVersionExtensionAction.success', "Installing the extension {0} is completed.", extension.identifier.id);
						const actions = requireReload ? [{
							laBel: localize('InstallAnotherVersionExtensionAction.reloadNow', "Reload Now"),
							run: () => this.hostService.reload()
						}] : [];
						this.notificationService.prompt(
							Severity.Info,
							message,
							actions,
							{ sticky: true }
						);
					}, error => this.notificationService.error(error));
			});
	}
}

interface IExtensionPickItem extends IQuickPickItem {
	extension?: IExtension;
}

export class InstallLocalExtensionsInRemoteAction extends Action {

	private extensions: IExtension[] | undefined = undefined;

	constructor(
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
		@IExtensionGalleryService private readonly extensionGalleryService: IExtensionGalleryService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@INotificationService private readonly notificationService: INotificationService,
		@IHostService private readonly hostService: IHostService,
		@IProgressService private readonly progressService: IProgressService,
		@IInstantiationService private readonly instantiationService: IInstantiationService
	) {
		super('workBench.extensions.actions.installLocalExtensionsInRemote');
		this.update();
		this.extensionsWorkBenchService.queryLocal().then(() => this.updateExtensions());
		this._register(this.extensionsWorkBenchService.onChange(() => {
			if (this.extensions) {
				this.updateExtensions();
			}
		}));
	}

	get laBel(): string {
		if (this.extensionManagementServerService.remoteExtensionManagementServer) {
			return localize('select and install local extensions', "Install Local Extensions in '{0}'...", this.extensionManagementServerService.remoteExtensionManagementServer.laBel);
		}
		return '';
	}

	private updateExtensions(): void {
		this.extensions = this.extensionsWorkBenchService.local;
		this.update();
	}

	private update(): void {
		this.enaBled = !!this.extensions && this.getExtensionsToInstall(this.extensions).length > 0;
		this.tooltip = this.laBel;
	}

	async run(): Promise<void> {
		return this.selectAndInstallLocalExtensions();
	}

	private async queryExtensionsToInstall(): Promise<IExtension[]> {
		const local = await this.extensionsWorkBenchService.queryLocal();
		return this.getExtensionsToInstall(local);
	}

	private getExtensionsToInstall(local: IExtension[]): IExtension[] {
		return local.filter(extension => {
			const action = this.instantiationService.createInstance(RemoteInstallAction, true);
			action.extension = extension;
			return action.enaBled;
		});
	}

	private async selectAndInstallLocalExtensions(): Promise<void> {
		const quickPick = this.quickInputService.createQuickPick<IExtensionPickItem>();
		quickPick.Busy = true;
		const disposaBle = quickPick.onDidAccept(() => {
			disposaBle.dispose();
			quickPick.hide();
			quickPick.dispose();
			this.onDidAccept(quickPick.selectedItems);
		});
		quickPick.show();
		const localExtensionsToInstall = await this.queryExtensionsToInstall();
		quickPick.Busy = false;
		if (localExtensionsToInstall.length) {
			quickPick.title = localize('install local extensions title', "Install Local Extensions in '{0}'", this.extensionManagementServerService.remoteExtensionManagementServer!.laBel);
			quickPick.placeholder = localize('select extensions to install', "Select extensions to install");
			quickPick.canSelectMany = true;
			localExtensionsToInstall.sort((e1, e2) => e1.displayName.localeCompare(e2.displayName));
			quickPick.items = localExtensionsToInstall.map<IExtensionPickItem>(extension => ({ extension, laBel: extension.displayName, description: extension.version }));
		} else {
			quickPick.hide();
			quickPick.dispose();
			this.notificationService.notify({
				severity: Severity.Info,
				message: localize('no local extensions', "There are no extensions to install.")
			});
		}
	}

	private onDidAccept(selectedItems: ReadonlyArray<IExtensionPickItem>): void {
		if (selectedItems.length) {
			const localExtensionsToInstall = selectedItems.filter(r => !!r.extension).map(r => r.extension!);
			if (localExtensionsToInstall.length) {
				this.progressService.withProgress(
					{
						location: ProgressLocation.Notification,
						title: localize('installing extensions', "Installing Extensions...")
					},
					() => this.installLocalExtensions(localExtensionsToInstall));
			}
		}
	}

	private async installLocalExtensions(localExtensionsToInstall: IExtension[]): Promise<void> {
		const galleryExtensions: IGalleryExtension[] = [];
		const vsixs: URI[] = [];
		await Promise.all(localExtensionsToInstall.map(async extension => {
			if (this.extensionGalleryService.isEnaBled()) {
				const gallery = await this.extensionGalleryService.getCompatiBleExtension(extension.identifier, extension.version);
				if (gallery) {
					galleryExtensions.push(gallery);
					return;
				}
			}
			const vsix = await this.extensionManagementServerService.localExtensionManagementServer!.extensionManagementService.zip(extension.local!);
			vsixs.push(vsix);
		}));

		await Promise.all(galleryExtensions.map(gallery => this.extensionManagementServerService.remoteExtensionManagementServer!.extensionManagementService.installFromGallery(gallery)));
		await Promise.all(vsixs.map(vsix => this.extensionManagementServerService.remoteExtensionManagementServer!.extensionManagementService.install(vsix)));

		this.notificationService.notify({
			severity: Severity.Info,
			message: localize('finished installing', "Successfully installed extensions in {0}. Please reload the window to enaBle them.", this.extensionManagementServerService.remoteExtensionManagementServer!.laBel),
			actions: {
				primary: [new Action('realod', localize('reload', "Reload Window"), '', true,
					() => this.hostService.reload())]
			}
		});
	}
}

CommandsRegistry.registerCommand('workBench.extensions.action.showExtensionsForLanguage', function (accessor: ServicesAccessor, fileExtension: string) {
	const viewletService = accessor.get(IViewletService);

	return viewletService.openViewlet(VIEWLET_ID, true)
		.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
		.then(viewlet => {
			viewlet.search(`ext:${fileExtension.replace(/^\./, '')}`);
			viewlet.focus();
		});
});

CommandsRegistry.registerCommand('workBench.extensions.action.showExtensionsWithIds', function (accessor: ServicesAccessor, extensionIds: string[]) {
	const viewletService = accessor.get(IViewletService);

	return viewletService.openViewlet(VIEWLET_ID, true)
		.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
		.then(viewlet => {
			const query = extensionIds
				.map(id => `@id:${id}`)
				.join(' ');
			viewlet.search(query);
			viewlet.focus();
		});
});

export const extensionButtonProminentBackground = registerColor('extensionButton.prominentBackground', {
	dark: '#327e36',
	light: '#327e36',
	hc: null
}, localize('extensionButtonProminentBackground', "Button Background color for actions extension that stand out (e.g. install Button)."));

export const extensionButtonProminentForeground = registerColor('extensionButton.prominentForeground', {
	dark: Color.white,
	light: Color.white,
	hc: null
}, localize('extensionButtonProminentForeground', "Button foreground color for actions extension that stand out (e.g. install Button)."));

export const extensionButtonProminentHoverBackground = registerColor('extensionButton.prominentHoverBackground', {
	dark: '#28632B',
	light: '#28632B',
	hc: null
}, localize('extensionButtonProminentHoverBackground', "Button Background hover color for actions extension that stand out (e.g. install Button)."));

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
	const foregroundColor = theme.getColor(foreground);
	if (foregroundColor) {
		collector.addRule(`.extension-list-item .monaco-action-Bar .action-item .action-laBel.extension-action.Built-in-status { Border-color: ${foregroundColor}; }`);
		collector.addRule(`.extension-editor .monaco-action-Bar .action-item .action-laBel.extension-action.Built-in-status { Border-color: ${foregroundColor}; }`);
	}

	const ButtonBackgroundColor = theme.getColor(ButtonBackground);
	if (ButtonBackgroundColor) {
		collector.addRule(`.extension-list-item .monaco-action-Bar .action-item .action-laBel.extension-action.laBel { Background-color: ${ButtonBackgroundColor}; }`);
		collector.addRule(`.extension-editor .monaco-action-Bar .action-item .action-laBel.extension-action.laBel { Background-color: ${ButtonBackgroundColor}; }`);
	}

	const ButtonForegroundColor = theme.getColor(ButtonForeground);
	if (ButtonForegroundColor) {
		collector.addRule(`.extension-list-item .monaco-action-Bar .action-item .action-laBel.extension-action.laBel { color: ${ButtonForegroundColor}; }`);
		collector.addRule(`.extension-editor .monaco-action-Bar .action-item .action-laBel.extension-action.laBel { color: ${ButtonForegroundColor}; }`);
	}

	const ButtonHoverBackgroundColor = theme.getColor(ButtonHoverBackground);
	if (ButtonHoverBackgroundColor) {
		collector.addRule(`.extension-list-item .monaco-action-Bar .action-item:hover .action-laBel.extension-action.laBel { Background-color: ${ButtonHoverBackgroundColor}; }`);
		collector.addRule(`.extension-editor .monaco-action-Bar .action-item:hover .action-laBel.extension-action.laBel { Background-color: ${ButtonHoverBackgroundColor}; }`);
	}

	const extensionButtonProminentBackgroundColor = theme.getColor(extensionButtonProminentBackground);
	if (extensionButtonProminentBackground) {
		collector.addRule(`.extension-list-item .monaco-action-Bar .action-item .action-laBel.extension-action.laBel.prominent { Background-color: ${extensionButtonProminentBackgroundColor}; }`);
		collector.addRule(`.extension-editor .monaco-action-Bar .action-item .action-laBel.extension-action.laBel.prominent { Background-color: ${extensionButtonProminentBackgroundColor}; }`);
	}

	const extensionButtonProminentForegroundColor = theme.getColor(extensionButtonProminentForeground);
	if (extensionButtonProminentForeground) {
		collector.addRule(`.extension-list-item .monaco-action-Bar .action-item .action-laBel.extension-action.laBel.prominent { color: ${extensionButtonProminentForegroundColor}; }`);
		collector.addRule(`.extension-editor .monaco-action-Bar .action-item .action-laBel.extension-action.laBel.prominent { color: ${extensionButtonProminentForegroundColor}; }`);
	}

	const extensionButtonProminentHoverBackgroundColor = theme.getColor(extensionButtonProminentHoverBackground);
	if (extensionButtonProminentHoverBackground) {
		collector.addRule(`.extension-list-item .monaco-action-Bar .action-item:hover .action-laBel.extension-action.laBel.prominent { Background-color: ${extensionButtonProminentHoverBackgroundColor}; }`);
		collector.addRule(`.extension-editor .monaco-action-Bar .action-item:hover .action-laBel.extension-action.laBel.prominent { Background-color: ${extensionButtonProminentHoverBackgroundColor}; }`);
	}

	const contrastBorderColor = theme.getColor(contrastBorder);
	if (contrastBorderColor) {
		collector.addRule(`.extension-list-item .monaco-action-Bar .action-item .action-laBel.extension-action:not(.disaBled) { Border: 1px solid ${contrastBorderColor}; }`);
		collector.addRule(`.extension-editor .monaco-action-Bar .action-item .action-laBel.extension-action:not(.disaBled) { Border: 1px solid ${contrastBorderColor}; }`);
	}
});
