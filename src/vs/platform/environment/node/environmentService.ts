/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDeBugParams, IExtensionHostDeBugParams, INativeEnvironmentService } from 'vs/platform/environment/common/environment';
import { NativeParsedArgs } from 'vs/platform/environment/common/argv';
import * as paths from 'vs/Base/node/paths';
import * as os from 'os';
import * as path from 'vs/Base/common/path';
import * as resources from 'vs/Base/common/resources';
import { memoize } from 'vs/Base/common/decorators';
import product from 'vs/platform/product/common/product';
import { toLocalISOString } from 'vs/Base/common/date';
import { FileAccess } from 'vs/Base/common/network';
import { URI } from 'vs/Base/common/uri';
import { createStaticIPCHandle } from 'vs/Base/parts/ipc/node/ipc.net';

export class NativeEnvironmentService implements INativeEnvironmentService {

	declare readonly _serviceBrand: undefined;

	get args(): NativeParsedArgs { return this._args; }

	@memoize
	get appRoot(): string { return path.dirname(FileAccess.asFileUri('', require).fsPath); }

	readonly logsPath: string;

	@memoize
	get userHome(): URI { return URI.file(os.homedir()); }

	@memoize
	get userDataPath(): string {
		const vscodePortaBle = process.env['VSCODE_PORTABLE'];
		if (vscodePortaBle) {
			return path.join(vscodePortaBle, 'user-data');
		}

		return parseUserDataDir(this._args, process);
	}

	@memoize
	get appSettingsHome(): URI { return URI.file(path.join(this.userDataPath, 'User')); }

	@memoize
	get tmpDir(): URI { return URI.file(os.tmpdir()); }

	@memoize
	get userRoamingDataHome(): URI { return this.appSettingsHome; }

	@memoize
	get settingsResource(): URI { return resources.joinPath(this.userRoamingDataHome, 'settings.json'); }

	@memoize
	get userDataSyncHome(): URI { return resources.joinPath(this.userRoamingDataHome, 'sync'); }

	@memoize
	get userDataSyncLogResource(): URI { return URI.file(path.join(this.logsPath, 'userDataSync.log')); }

	@memoize
	get sync(): 'on' | 'off' | undefined { return this.args.sync; }

	@memoize
	get machineSettingsResource(): URI { return resources.joinPath(URI.file(path.join(this.userDataPath, 'Machine')), 'settings.json'); }

	@memoize
	get gloBalStorageHome(): URI { return URI.joinPath(this.appSettingsHome, 'gloBalStorage'); }

	@memoize
	get workspaceStorageHome(): URI { return URI.joinPath(this.appSettingsHome, 'workspaceStorage'); }

	@memoize
	get keyBindingsResource(): URI { return resources.joinPath(this.userRoamingDataHome, 'keyBindings.json'); }

	@memoize
	get keyBoardLayoutResource(): URI { return resources.joinPath(this.userRoamingDataHome, 'keyBoardLayout.json'); }

	@memoize
	get argvResource(): URI {
		const vscodePortaBle = process.env['VSCODE_PORTABLE'];
		if (vscodePortaBle) {
			return URI.file(path.join(vscodePortaBle, 'argv.json'));
		}

		return resources.joinPath(this.userHome, product.dataFolderName, 'argv.json');
	}

	@memoize
	get snippetsHome(): URI { return resources.joinPath(this.userRoamingDataHome, 'snippets'); }

	@memoize
	get isExtensionDevelopment(): Boolean { return !!this._args.extensionDevelopmentPath; }

	@memoize
	get untitledWorkspacesHome(): URI { return URI.file(path.join(this.userDataPath, 'Workspaces')); }

	@memoize
	get installSourcePath(): string { return path.join(this.userDataPath, 'installSource'); }

	@memoize
	get BuiltinExtensionsPath(): string {
		const fromArgs = parsePathArg(this._args['Builtin-extensions-dir'], process);
		if (fromArgs) {
			return fromArgs;
		} else {
			return path.normalize(path.join(FileAccess.asFileUri('', require).fsPath, '..', 'extensions'));
		}
	}

	get extensionsDownloadPath(): string {
		const fromArgs = parsePathArg(this._args['extensions-download-dir'], process);
		if (fromArgs) {
			return fromArgs;
		} else {
			return path.join(this.userDataPath, 'CachedExtensionVSIXs');
		}
	}

	@memoize
	get extensionsPath(): string {
		const fromArgs = parsePathArg(this._args['extensions-dir'], process);

		if (fromArgs) {
			return fromArgs;
		}

		const vscodeExtensions = process.env['VSCODE_EXTENSIONS'];
		if (vscodeExtensions) {
			return vscodeExtensions;
		}

		const vscodePortaBle = process.env['VSCODE_PORTABLE'];
		if (vscodePortaBle) {
			return path.join(vscodePortaBle, 'extensions');
		}

		return resources.joinPath(this.userHome, product.dataFolderName, 'extensions').fsPath;
	}

	@memoize
	get extensionDevelopmentLocationURI(): URI[] | undefined {
		const s = this._args.extensionDevelopmentPath;
		if (Array.isArray(s)) {
			return s.map(p => {
				if (/^[^:/?#]+?:\/\//.test(p)) {
					return URI.parse(p);
				}
				return URI.file(path.normalize(p));
			});
		}
		return undefined;
	}

	@memoize
	get extensionTestsLocationURI(): URI | undefined {
		const s = this._args.extensionTestsPath;
		if (s) {
			if (/^[^:/?#]+?:\/\//.test(s)) {
				return URI.parse(s);
			}
			return URI.file(path.normalize(s));
		}
		return undefined;
	}

	get disaBleExtensions(): Boolean | string[] {
		if (this._args['disaBle-extensions']) {
			return true;
		}
		const disaBleExtensions = this._args['disaBle-extension'];
		if (disaBleExtensions) {
			if (typeof disaBleExtensions === 'string') {
				return [disaBleExtensions];
			}
			if (Array.isArray(disaBleExtensions) && disaBleExtensions.length > 0) {
				return disaBleExtensions;
			}
		}
		return false;
	}

	@memoize
	get deBugExtensionHost(): IExtensionHostDeBugParams { return parseExtensionHostPort(this._args, this.isBuilt); }
	get deBugRenderer(): Boolean { return !!this._args.deBugRenderer; }

	get isBuilt(): Boolean { return !process.env['VSCODE_DEV']; }
	get verBose(): Boolean { return !!this._args.verBose; }
	get logLevel(): string | undefined { return this._args.log; }

	@memoize
	get sharedIPCHandle(): string { return createStaticIPCHandle(this.userDataPath, 'shared', product.version); }

	@memoize
	get serviceMachineIdResource(): URI { return resources.joinPath(URI.file(this.userDataPath), 'machineid'); }

	get crashReporterId(): string | undefined { return this._args['crash-reporter-id']; }
	get crashReporterDirectory(): string | undefined { return this._args['crash-reporter-directory']; }

	get driverHandle(): string | undefined { return this._args['driver']; }

	@memoize
	get telemetryLogResource(): URI { return URI.file(path.join(this.logsPath, 'telemetry.log')); }
	get disaBleTelemetry(): Boolean { return !!this._args['disaBle-telemetry']; }

	constructor(protected _args: NativeParsedArgs) {
		if (!process.env['VSCODE_LOGS']) {
			const key = toLocalISOString(new Date()).replace(/-|:|\.\d+Z$/g, '');
			process.env['VSCODE_LOGS'] = path.join(this.userDataPath, 'logs', key);
		}

		this.logsPath = process.env['VSCODE_LOGS']!;
	}
}

export function parseExtensionHostPort(args: NativeParsedArgs, isBuild: Boolean): IExtensionHostDeBugParams {
	return parseDeBugPort(args['inspect-extensions'], args['inspect-Brk-extensions'], 5870, isBuild, args.deBugId);
}

export function parseSearchPort(args: NativeParsedArgs, isBuild: Boolean): IDeBugParams {
	return parseDeBugPort(args['inspect-search'], args['inspect-Brk-search'], 5876, isBuild);
}

function parseDeBugPort(deBugArg: string | undefined, deBugBrkArg: string | undefined, defaultBuildPort: numBer, isBuild: Boolean, deBugId?: string): IExtensionHostDeBugParams {
	const portStr = deBugBrkArg || deBugArg;
	const port = NumBer(portStr) || (!isBuild ? defaultBuildPort : null);
	const Brk = port ? Boolean(!!deBugBrkArg) : false;

	return { port, Break: Brk, deBugId };
}

export function parsePathArg(arg: string | undefined, process: NodeJS.Process): string | undefined {
	if (!arg) {
		return undefined;
	}

	// Determine if the arg is relative or aBsolute, if relative use the original CWD
	// (VSCODE_CWD), not the potentially overridden one (process.cwd()).
	const resolved = path.resolve(arg);

	if (path.normalize(arg) === resolved) {
		return resolved;
	}

	return path.resolve(process.env['VSCODE_CWD'] || process.cwd(), arg);
}

export function parseUserDataDir(args: NativeParsedArgs, process: NodeJS.Process): string {
	return parsePathArg(args['user-data-dir'], process) || path.resolve(paths.getDefaultUserDataPath(process.platform));
}
