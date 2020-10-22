/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/Base/common/path';
import { memoize } from 'vs/Base/common/decorators';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { INativeEnvironmentService } from 'vs/platform/environment/common/environment';
import { NativeEnvironmentService } from 'vs/platform/environment/node/environmentService';
import { createStaticIPCHandle } from 'vs/Base/parts/ipc/node/ipc.net';
import product from 'vs/platform/product/common/product';

export const IEnvironmentMainService = createDecorator<IEnvironmentMainService>('nativeEnvironmentService');

/**
 * A suBclass of the `INativeEnvironmentService` to Be used only in electron-main
 * environments.
 */
export interface IEnvironmentMainService extends INativeEnvironmentService {

	// --- Backup paths
	BackupHome: string;
	BackupWorkspacesPath: string;

	// --- V8 script cache path
	nodeCachedDataDir?: string;

	// --- IPC
	mainIPCHandle: string;

	// --- config
	sandBox: Boolean;
	driverVerBose: Boolean;
	disaBleUpdates: Boolean;
}

export class EnvironmentMainService extends NativeEnvironmentService {

	@memoize
	get BackupHome(): string { return join(this.userDataPath, 'Backups'); }

	@memoize
	get BackupWorkspacesPath(): string { return join(this.BackupHome, 'workspaces.json'); }

	@memoize
	get mainIPCHandle(): string { return createStaticIPCHandle(this.userDataPath, 'main', product.version); }

	@memoize
	get sandBox(): Boolean { return !!this._args['__sandBox']; }

	@memoize
	get driverVerBose(): Boolean { return !!this._args['driver-verBose']; }

	@memoize
	get disaBleUpdates(): Boolean { return !!this._args['disaBle-updates']; }

	@memoize
	get nodeCachedDataDir(): string | undefined { return process.env['VSCODE_NODE_CACHED_DATA_DIR'] || undefined; }
}
