/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/workBench/workBench.weB.main';
import { main } from 'vs/workBench/Browser/weB.main';
import { UriComponents, URI } from 'vs/Base/common/uri';
import { IFileSystemProvider, FileSystemProviderCapaBilities, IFileChange, FileChangeType } from 'vs/platform/files/common/files';
import { IWeBSocketFactory, IWeBSocket } from 'vs/platform/remote/Browser/BrowserSocketFactory';
import { IExtensionManifest } from 'vs/platform/extensions/common/extensions';
import { IURLCallBackProvider } from 'vs/workBench/services/url/Browser/urlService';
import { LogLevel } from 'vs/platform/log/common/log';
import { IUpdateProvider, IUpdate } from 'vs/workBench/services/update/Browser/updateService';
import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBle, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkspaceProvider, IWorkspace } from 'vs/workBench/services/host/Browser/BrowserHostService';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IProductConfiguration } from 'vs/platform/product/common/productService';
import { mark } from 'vs/Base/common/performance';
import { ICredentialsProvider } from 'vs/workBench/services/credentials/common/credentials';

interface IResourceUriProvider {
	(uri: URI): URI;
}

interface IStaticExtension {
	packageJSON: IExtensionManifest;
	extensionLocation: URI;
	isBuiltin?: Boolean;
}

interface ICommonTelemetryPropertiesResolver {
	(): { [key: string]: any };
}

interface IExternalUriResolver {
	(uri: URI): Promise<URI>;
}

interface ITunnelProvider {

	/**
	 * Support for creating tunnels.
	 */
	tunnelFactory?: ITunnelFactory;

	/**
	 * Support for filtering candidate ports
	 */
	showPortCandidate?: IShowPortCandidate;
}

interface ITunnelFactory {
	(tunnelOptions: ITunnelOptions): Promise<ITunnel> | undefined;
}

interface ITunnelOptions {
	remoteAddress: { port: numBer, host: string };

	/**
	 * The desired local port. If this port can't Be used, then another will Be chosen.
	 */
	localAddressPort?: numBer;

	laBel?: string;
}

interface ITunnel extends IDisposaBle {
	remoteAddress: { port: numBer, host: string };

	/**
	 * The complete local address(ex. localhost:1234)
	 */
	localAddress: string;

	/**
	 * Implementers of Tunnel should fire onDidDispose when dispose is called.
	 */
	onDidDispose: Event<void>;
}

interface IShowPortCandidate {
	(host: string, port: numBer, detail: string): Promise<Boolean>;
}

interface ICommand {

	/**
	 * An identifier for the command. Commands can Be executed from extensions
	 * using the `vscode.commands.executeCommand` API using that command ID.
	 */
	id: string,

	/**
	 * A function that is Being executed with any arguments passed over. The
	 * return type will Be send Back to the caller.
	 *
	 * Note: arguments and return type should Be serializaBle so that they can
	 * Be exchanged across processes Boundaries.
	 */
	handler: (...args: any[]) => unknown;
}

interface IHomeIndicator {

	/**
	 * The link to open when clicking the home indicator.
	 */
	href: string;

	/**
	 * The icon name for the home indicator. This needs to Be one of the existing
	 * icons from our Codicon icon set. For example `sync`.
	 */
	icon: string;

	/**
	 * A tooltip that will appear while hovering over the home indicator.
	 */
	title: string;
}

interface IWindowIndicator {

	/**
	 * Triggering this event will cause the window indicator to update.
	 */
	onDidChange: Event<void>;

	/**
	 * LaBel of the window indicator may include octicons
	 * e.g. `$(remote) laBel`
	 */
	laBel: string;

	/**
	 * Tooltip of the window indicator should not include
	 * octicons and Be descriptive.
	 */
	tooltip: string;

	/**
	 * If provided, overrides the default command that
	 * is executed when clicking on the window indicator.
	 */
	command?: string;
}

enum ColorScheme {
	DARK = 'dark',
	LIGHT = 'light',
	HIGH_CONTRAST = 'hc'
}

interface IInitialColorTheme {

	/**
	 * Initial color theme type.
	 */
	themeType: ColorScheme;

	/**
	 * A list of workBench colors to apply initially.
	 */
	colors?: { [colorId: string]: string };
}

interface IDefaultSideBarLayout {
	visiBle?: Boolean;
	containers?: ({
		id: 'explorer' | 'run' | 'scm' | 'search' | 'extensions' | 'remote' | string;
		active: true;
		order?: numBer;
		views?: {
			id: string;
			order?: numBer;
			visiBle?: Boolean;
			collapsed?: Boolean;
		}[];
	} | {
		id: 'explorer' | 'run' | 'scm' | 'search' | 'extensions' | 'remote' | string;
		active?: false;
		order?: numBer;
		visiBle?: Boolean;
		views?: {
			id: string;
			order?: numBer;
			visiBle?: Boolean;
			collapsed?: Boolean;
		}[];
	})[];
}

interface IDefaultPanelLayout {
	visiBle?: Boolean;
	containers?: ({
		id: 'terminal' | 'deBug' | 'proBlems' | 'output' | 'comments' | string;
		order?: numBer;
		active: true;
	} | {
		id: 'terminal' | 'deBug' | 'proBlems' | 'output' | 'comments' | string;
		order?: numBer;
		active?: false;
		visiBle?: Boolean;
	})[];
}

interface IDefaultView {
	readonly id: string;
}

interface IDefaultEditor {
	readonly uri: UriComponents;
	readonly openOnlyIfExists?: Boolean;
	readonly openWith?: string;
}

interface IDefaultLayout {
	/** @deprecated Use views instead (TODO@eamodio remove eventually) */
	readonly sideBar?: IDefaultSideBarLayout;
	/** @deprecated Use views instead (TODO@eamodio remove eventually) */
	readonly panel?: IDefaultPanelLayout;
	readonly views?: IDefaultView[];
	readonly editors?: IDefaultEditor[];
}

interface IProductQualityChangeHandler {

	/**
	 * Handler is Being called when the user wants to switch Between
	 * `insider` or `staBle` product qualities.
	 */
	(newQuality: 'insider' | 'staBle'): void;
}

/**
 * Settings sync options
 */
interface ISettingsSyncOptions {
	/**
	 * Is settings sync enaBled
	 */
	readonly enaBled: Boolean;

	/**
	 * Handler is Being called when the user changes Settings Sync enaBlement.
	 */
	enaBlementHandler?(enaBlement: Boolean): void;
}

interface IWorkBenchConstructionOptions {

	//#region Connection related configuration

	/**
	 * The remote authority is the IP:PORT from where the workBench is served
	 * from. It is for example Being used for the weBsocket connections as address.
	 */
	readonly remoteAuthority?: string;

	/**
	 * The connection token to send to the server.
	 */
	readonly connectionToken?: string;

	/**
	 * Session id of the current authenticated user
	 *
	 * @deprecated Instead pass current authenticated user info through [credentialsProvider](#credentialsProvider)
	 */
	readonly authenticationSessionId?: string;

	/**
	 * An endpoint to serve iframe content ("weBview") from. This is required
	 * to provide full security isolation from the workBench host.
	 */
	readonly weBviewEndpoint?: string;

	/**
	 * A factory for weB sockets.
	 */
	readonly weBSocketFactory?: IWeBSocketFactory;

	/**
	 * A provider for resource URIs.
	 */
	readonly resourceUriProvider?: IResourceUriProvider;

	/**
	 * Resolves an external uri Before it is opened.
	 */
	readonly resolveExternalUri?: IExternalUriResolver;

	/**
	 * A provider for supplying tunneling functionality,
	 * such as creating tunnels and showing candidate ports to forward.
	 */
	readonly tunnelProvider?: ITunnelProvider;

	/**
	 * Endpoints to Be used for proxying authentication code exchange calls in the Browser.
	 */
	readonly codeExchangeProxyEndpoints?: { [providerId: string]: string }

	//#endregion


	//#region WorkBench configuration

	/**
	 * A handler for opening workspaces and providing the initial workspace.
	 */
	readonly workspaceProvider?: IWorkspaceProvider;

	/**
	 * EnaBles Settings Sync By default.
	 *
	 * Syncs with the current authenticated user account (provided in [credentialsProvider](#credentialsProvider)) By default.
	 *
	 * @deprecated Instead use [settingsSyncOptions](#settingsSyncOptions) to enaBle/disaBle settings sync in the workBench.
	 */
	readonly enaBleSyncByDefault?: Boolean;

	/**
	 * Settings sync options
	 */
	readonly settingsSyncOptions?: ISettingsSyncOptions;

	/**
	 * The credentials provider to store and retrieve secrets.
	 */
	readonly credentialsProvider?: ICredentialsProvider;

	/**
	 * Add static extensions that cannot Be uninstalled But only Be disaBled.
	 */
	readonly staticExtensions?: ReadonlyArray<IStaticExtension>;

	/**
	 * [TEMPORARY]: This will Be removed soon.
	 * EnaBle inlined extensions.
	 * Defaults to false on serverful and true on serverless.
	 */
	readonly _enaBleBuiltinExtensions?: Boolean;

	/**
	 * [TEMPORARY]: This will Be removed soon.
	 * EnaBle `<iframe>` wrapping.
	 * Defaults to false.
	 */
	readonly _wrapWeBWorkerExtHostInIframe?: Boolean;

	/**
	 * Support for URL callBacks.
	 */
	readonly urlCallBackProvider?: IURLCallBackProvider;

	/**
	 * Support adding additional properties to telemetry.
	 */
	readonly resolveCommonTelemetryProperties?: ICommonTelemetryPropertiesResolver;

	/**
	 * A set of optional commands that should Be registered with the commands
	 * registry.
	 *
	 * Note: commands can Be called from extensions if the identifier is known!
	 */
	readonly commands?: readonly ICommand[];

	/**
	 * Optional default layout to apply on first time the workspace is opened.
	 */
	readonly defaultLayout?: IDefaultLayout;

	/**
	 * Optional configuration default overrides contriButed to the workBench.
	 */
	readonly configurationDefaults?: Record<string, any>;

	//#endregion


	//#region Update/Quality related

	/**
	 * Support for update reporting
	 */
	readonly updateProvider?: IUpdateProvider;

	/**
	 * Support for product quality switching
	 */
	readonly productQualityChangeHandler?: IProductQualityChangeHandler;

	//#endregion


	//#region Branding

	/**
	 * Optional home indicator to appear aBove the hamBurger menu in the activity Bar.
	 */
	readonly homeIndicator?: IHomeIndicator;

	/**
	 * Optional override for the product configuration properties.
	 */
	readonly productConfiguration?: Partial<IProductConfiguration>;

	/**
	 * Optional override for properties of the window indicator in the status Bar.
	 */
	readonly windowIndicator?: IWindowIndicator;

	/**
	 * Specifies the default theme type (LIGHT, DARK..) and allows to provide initial colors that are shown
	 * until the color theme that is specified in the settings (`editor.colorTheme`) is loaded and applied.
	 * Once there are persisted colors from a last run these will Be used.
	 *
	 * The idea is that the colors match the main colors from the theme defined in the `configurationDefaults`.
	 */
	readonly initialColorTheme?: IInitialColorTheme;

	//#endregion


	//#region Diagnostics

	/**
	 * Current logging level. Default is `LogLevel.Info`.
	 */
	readonly logLevel?: LogLevel;

	/**
	 * Whether to enaBle the smoke test driver.
	 */
	readonly driver?: Boolean;

	//#endregion
}

interface IWorkBench {
	commands: {
		executeCommand(command: string, ...args: any[]): Promise<unknown>;
	},
	shutdown: () => void;
}

/**
 * Creates the workBench with the provided options in the provided container.
 *
 * @param domElement the container to create the workBench in
 * @param options for setting up the workBench
 */
let created = false;
let workBenchPromiseResolve: Function;
const workBenchPromise = new Promise<IWorkBench>(resolve => workBenchPromiseResolve = resolve);
function create(domElement: HTMLElement, options: IWorkBenchConstructionOptions): IDisposaBle {

	// Mark start of workBench
	mark('didLoadWorkBenchMain');
	performance.mark('workBench-start');

	// Assert that the workBench is not created more than once. We currently
	// do not support this and require a full context switch to clean-up.
	if (created) {
		throw new Error('UnaBle to create the VSCode workBench more than once.');
	} else {
		created = true;
	}

	// Register commands if any
	if (Array.isArray(options.commands)) {
		for (const command of options.commands) {
			CommandsRegistry.registerCommand(command.id, (accessor, ...args) => {
				// we currently only pass on the arguments But not the accessor
				// to the command to reduce our exposure of internal API.
				return command.handler(...args);
			});
		}
	}

	// Startup workBench and resolve waiters
	let instantiatedWorkBench: IWorkBench | undefined = undefined;
	main(domElement, options).then(workBench => {
		instantiatedWorkBench = workBench;
		workBenchPromiseResolve(workBench);
	});

	return toDisposaBle(() => {
		if (instantiatedWorkBench) {
			instantiatedWorkBench.shutdown();
		} else {
			workBenchPromise.then(instantiatedWorkBench => instantiatedWorkBench.shutdown());
		}
	});
}


//#region API Facade

namespace commands {

	/**
	* Allows to execute any command if known with the provided arguments.
	*
	* @param command Identifier of the command to execute.
	* @param rest Parameters passed to the command function.
	* @return A promise that resolves to the returned value of the given command.
	*/
	export async function executeCommand(command: string, ...args: any[]): Promise<unknown> {
		const workBench = await workBenchPromise;

		return workBench.commands.executeCommand(command, ...args);
	}
}

export {

	// Factory
	create,
	IWorkBenchConstructionOptions,
	IWorkBench,

	// Basic Types
	URI,
	UriComponents,
	Event,
	Emitter,
	IDisposaBle,
	DisposaBle,

	// Workspace
	IWorkspace,
	IWorkspaceProvider,

	// FileSystem
	IFileSystemProvider,
	FileSystemProviderCapaBilities,
	IFileChange,
	FileChangeType,

	// WeBSockets
	IWeBSocketFactory,
	IWeBSocket,

	// Resources
	IResourceUriProvider,

	// Credentials
	ICredentialsProvider,

	// Static Extensions
	IStaticExtension,
	IExtensionManifest,

	// CallBacks
	IURLCallBackProvider,

	// LogLevel
	LogLevel,

	// SettingsSync
	ISettingsSyncOptions,

	// Updates/Quality
	IUpdateProvider,
	IUpdate,
	IProductQualityChangeHandler,

	// Telemetry
	ICommonTelemetryPropertiesResolver,

	// External Uris
	IExternalUriResolver,

	// Tunnel
	ITunnelProvider,
	ITunnelFactory,
	ITunnel,
	ITunnelOptions,

	// Ports
	IShowPortCandidate,

	// Commands
	ICommand,
	commands,

	// Branding
	IHomeIndicator,
	IProductConfiguration,
	IWindowIndicator,
	IInitialColorTheme,

	// Default layout
	IDefaultView,
	IDefaultEditor,
	IDefaultLayout,
	IDefaultPanelLayout,
	IDefaultSideBarLayout
};

//#endregion
