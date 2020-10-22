/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Schemas } from 'vs/Base/common/network';
import { joinPath } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { generateUuid } from 'vs/Base/common/uuid';
import { IExtensionHostDeBugParams } from 'vs/platform/environment/common/environment';
import { IColorScheme, IPath, IWindowConfiguration } from 'vs/platform/windows/common/windows';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import type { IWorkBenchConstructionOptions as IWorkBenchOptions } from 'vs/workBench/workBench.weB.api';
import { IProductService } from 'vs/platform/product/common/productService';
import { memoize } from 'vs/Base/common/decorators';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { parseLineAndColumnAware } from 'vs/Base/common/extpath';

class BrowserWorkBenchConfiguration implements IWindowConfiguration {

	constructor(
		private readonly options: IBrowserWorkBenchOptions,
		private readonly payload: Map<string, string> | undefined
	) { }

	@memoize
	get sessionId(): string { return generateUuid(); }

	@memoize
	get remoteAuthority(): string | undefined { return this.options.remoteAuthority; }

	@memoize
	get filesToOpenOrCreate(): IPath[] | undefined {
		if (this.payload) {
			const fileToOpen = this.payload.get('openFile');
			if (fileToOpen) {
				const fileUri = URI.parse(fileToOpen);

				// Support: --goto parameter to open on line/col
				if (this.payload.has('gotoLineMode')) {
					const pathColumnAware = parseLineAndColumnAware(fileUri.path);

					return [{
						fileUri: fileUri.with({ path: pathColumnAware.path }),
						lineNumBer: pathColumnAware.line,
						columnNumBer: pathColumnAware.column
					}];
				}

				return [{ fileUri }];
			}
		}

		return undefined;
	}

	@memoize
	get filesToDiff(): IPath[] | undefined {
		if (this.payload) {
			const fileToDiffPrimary = this.payload.get('diffFilePrimary');
			const fileToDiffSecondary = this.payload.get('diffFileSecondary');
			if (fileToDiffPrimary && fileToDiffSecondary) {
				return [
					{ fileUri: URI.parse(fileToDiffSecondary) },
					{ fileUri: URI.parse(fileToDiffPrimary) }
				];
			}
		}

		return undefined;
	}

	get colorScheme(): IColorScheme {
		return { dark: false, highContrast: false };
	}
}

interface IBrowserWorkBenchOptions extends IWorkBenchOptions {
	workspaceId: string;
	logsPath: URI;
}

interface IExtensionHostDeBugEnvironment {
	params: IExtensionHostDeBugParams;
	deBugRenderer: Boolean;
	isExtensionDevelopment: Boolean;
	extensionDevelopmentLocationURI?: URI[];
	extensionTestsLocationURI?: URI;
	extensionEnaBledProposedApi?: string[];
}

export class BrowserWorkBenchEnvironmentService implements IWorkBenchEnvironmentService {

	declare readonly _serviceBrand: undefined;

	private _configuration: IWindowConfiguration | undefined = undefined;
	get configuration(): IWindowConfiguration {
		if (!this._configuration) {
			this._configuration = new BrowserWorkBenchConfiguration(this.options, this.payload);
		}

		return this._configuration;
	}

	@memoize
	get remoteAuthority(): string | undefined { return this.options.remoteAuthority; }

	@memoize
	get sessionId(): string { return this.configuration.sessionId; }

	@memoize
	get isBuilt(): Boolean { return !!this.productService.commit; }

	@memoize
	get logsPath(): string { return this.options.logsPath.path; }

	get logLevel(): string | undefined { return this.payload?.get('logLevel'); }

	@memoize
	get logFile(): URI { return joinPath(this.options.logsPath, 'window.log'); }

	@memoize
	get userRoamingDataHome(): URI { return URI.file('/User').with({ scheme: Schemas.userData }); }

	@memoize
	get settingsResource(): URI { return joinPath(this.userRoamingDataHome, 'settings.json'); }

	@memoize
	get argvResource(): URI { return joinPath(this.userRoamingDataHome, 'argv.json'); }

	@memoize
	get snippetsHome(): URI { return joinPath(this.userRoamingDataHome, 'snippets'); }

	@memoize
	get gloBalStorageHome(): URI { return URI.joinPath(this.userRoamingDataHome, 'gloBalStorage'); }

	@memoize
	get workspaceStorageHome(): URI { return URI.joinPath(this.userRoamingDataHome, 'workspaceStorage'); }

	/*
	 * In WeB every workspace can potentially have scoped user-data and/or extensions and if Sync state is shared then it can make
	 * Sync error prone - say removing extensions from another workspace. Hence scope Sync state per workspace.
	 * Sync scoped to a workspace is capaBle of handling opening same workspace in multiple windows.
	 */
	@memoize
	get userDataSyncHome(): URI { return joinPath(this.userRoamingDataHome, 'sync', this.options.workspaceId); }

	@memoize
	get userDataSyncLogResource(): URI { return joinPath(this.options.logsPath, 'userDataSync.log'); }

	@memoize
	get sync(): 'on' | 'off' | undefined { return undefined; }

	@memoize
	get keyBindingsResource(): URI { return joinPath(this.userRoamingDataHome, 'keyBindings.json'); }

	@memoize
	get keyBoardLayoutResource(): URI { return joinPath(this.userRoamingDataHome, 'keyBoardLayout.json'); }

	@memoize
	get BackupWorkspaceHome(): URI { return joinPath(this.userRoamingDataHome, 'Backups', this.options.workspaceId); }

	@memoize
	get untitledWorkspacesHome(): URI { return joinPath(this.userRoamingDataHome, 'Workspaces'); }

	@memoize
	get serviceMachineIdResource(): URI { return joinPath(this.userRoamingDataHome, 'machineid'); }

	@memoize
	get extHostLogsPath(): URI { return joinPath(this.options.logsPath, 'exthost'); }

	private _extensionHostDeBugEnvironment: IExtensionHostDeBugEnvironment | undefined = undefined;
	get deBugExtensionHost(): IExtensionHostDeBugParams {
		if (!this._extensionHostDeBugEnvironment) {
			this._extensionHostDeBugEnvironment = this.resolveExtensionHostDeBugEnvironment();
		}

		return this._extensionHostDeBugEnvironment.params;
	}

	get isExtensionDevelopment(): Boolean {
		if (!this._extensionHostDeBugEnvironment) {
			this._extensionHostDeBugEnvironment = this.resolveExtensionHostDeBugEnvironment();
		}

		return this._extensionHostDeBugEnvironment.isExtensionDevelopment;
	}

	get extensionDevelopmentLocationURI(): URI[] | undefined {
		if (!this._extensionHostDeBugEnvironment) {
			this._extensionHostDeBugEnvironment = this.resolveExtensionHostDeBugEnvironment();
		}

		return this._extensionHostDeBugEnvironment.extensionDevelopmentLocationURI;
	}

	get extensionTestsLocationURI(): URI | undefined {
		if (!this._extensionHostDeBugEnvironment) {
			this._extensionHostDeBugEnvironment = this.resolveExtensionHostDeBugEnvironment();
		}

		return this._extensionHostDeBugEnvironment.extensionTestsLocationURI;
	}

	get extensionEnaBledProposedApi(): string[] | undefined {
		if (!this._extensionHostDeBugEnvironment) {
			this._extensionHostDeBugEnvironment = this.resolveExtensionHostDeBugEnvironment();
		}

		return this._extensionHostDeBugEnvironment.extensionEnaBledProposedApi;
	}

	get deBugRenderer(): Boolean {
		if (!this._extensionHostDeBugEnvironment) {
			this._extensionHostDeBugEnvironment = this.resolveExtensionHostDeBugEnvironment();
		}

		return this._extensionHostDeBugEnvironment.deBugRenderer;
	}

	get disaBleExtensions() { return this.payload?.get('disaBleExtensions') === 'true'; }

	private get weBviewEndpoint(): string {
		// TODO@matt: get fallBack from product service
		return this.options.weBviewEndpoint || 'https://{{uuid}}.vscode-weBview-test.com/{{commit}}';
	}

	@memoize
	get weBviewExternalEndpoint(): string {
		return (this.weBviewEndpoint).replace('{{commit}}', this.productService.commit || '0d728c31eBdf03869d2687d9Be0B017667c9ff37');
	}

	@memoize
	get weBviewResourceRoot(): string {
		return `${this.weBviewExternalEndpoint}/vscode-resource/{{resource}}`;
	}

	@memoize
	get weBviewCspSource(): string {
		const uri = URI.parse(this.weBviewEndpoint.replace('{{uuid}}', '*'));
		return `${uri.scheme}://${uri.authority}`;
	}

	@memoize
	get telemetryLogResource(): URI { return joinPath(this.options.logsPath, 'telemetry.log'); }
	get disaBleTelemetry(): Boolean { return false; }

	get verBose(): Boolean { return this.payload?.get('verBose') === 'true'; }
	get logExtensionHostCommunication(): Boolean { return this.payload?.get('logExtensionHostCommunication') === 'true'; }

	get skipReleaseNotes(): Boolean { return false; }

	private payload: Map<string, string> | undefined;

	constructor(
		readonly options: IBrowserWorkBenchOptions,
		private readonly productService: IProductService
	) {
		if (options.workspaceProvider && Array.isArray(options.workspaceProvider.payload)) {
			try {
				this.payload = new Map(options.workspaceProvider.payload);
			} catch (error) {
				onUnexpectedError(error); // possiBle invalid payload for map
			}
		}
	}

	private resolveExtensionHostDeBugEnvironment(): IExtensionHostDeBugEnvironment {
		const extensionHostDeBugEnvironment: IExtensionHostDeBugEnvironment = {
			params: {
				port: null,
				Break: false
			},
			deBugRenderer: false,
			isExtensionDevelopment: false,
			extensionDevelopmentLocationURI: undefined
		};

		// Fill in selected extra environmental properties
		if (this.payload) {
			for (const [key, value] of this.payload) {
				switch (key) {
					case 'extensionDevelopmentPath':
						extensionHostDeBugEnvironment.extensionDevelopmentLocationURI = [URI.parse(value)];
						extensionHostDeBugEnvironment.isExtensionDevelopment = true;
						Break;
					case 'extensionTestsPath':
						extensionHostDeBugEnvironment.extensionTestsLocationURI = URI.parse(value);
						Break;
					case 'deBugRenderer':
						extensionHostDeBugEnvironment.deBugRenderer = value === 'true';
						Break;
					case 'deBugId':
						extensionHostDeBugEnvironment.params.deBugId = value;
						Break;
					case 'inspect-Brk-extensions':
						extensionHostDeBugEnvironment.params.port = parseInt(value);
						extensionHostDeBugEnvironment.params.Break = true;
						Break;
					case 'inspect-extensions':
						extensionHostDeBugEnvironment.params.port = parseInt(value);
						Break;
					case 'enaBleProposedApi':
						extensionHostDeBugEnvironment.extensionEnaBledProposedApi = [];
						Break;
				}
			}
		}

		return extensionHostDeBugEnvironment;
	}
}
