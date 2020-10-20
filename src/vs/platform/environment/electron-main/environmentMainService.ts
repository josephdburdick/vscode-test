/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/bAse/common/pAth';
import { memoize } from 'vs/bAse/common/decorAtors';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { INAtiveEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { NAtiveEnvironmentService } from 'vs/plAtform/environment/node/environmentService';
import { creAteStAticIPCHAndle } from 'vs/bAse/pArts/ipc/node/ipc.net';
import product from 'vs/plAtform/product/common/product';

export const IEnvironmentMAinService = creAteDecorAtor<IEnvironmentMAinService>('nAtiveEnvironmentService');

/**
 * A subclAss of the `INAtiveEnvironmentService` to be used only in electron-mAin
 * environments.
 */
export interfAce IEnvironmentMAinService extends INAtiveEnvironmentService {

	// --- bAckup pAths
	bAckupHome: string;
	bAckupWorkspAcesPAth: string;

	// --- V8 script cAche pAth
	nodeCAchedDAtADir?: string;

	// --- IPC
	mAinIPCHAndle: string;

	// --- config
	sAndbox: booleAn;
	driverVerbose: booleAn;
	disAbleUpdAtes: booleAn;
}

export clAss EnvironmentMAinService extends NAtiveEnvironmentService {

	@memoize
	get bAckupHome(): string { return join(this.userDAtAPAth, 'BAckups'); }

	@memoize
	get bAckupWorkspAcesPAth(): string { return join(this.bAckupHome, 'workspAces.json'); }

	@memoize
	get mAinIPCHAndle(): string { return creAteStAticIPCHAndle(this.userDAtAPAth, 'mAin', product.version); }

	@memoize
	get sAndbox(): booleAn { return !!this._Args['__sAndbox']; }

	@memoize
	get driverVerbose(): booleAn { return !!this._Args['driver-verbose']; }

	@memoize
	get disAbleUpdAtes(): booleAn { return !!this._Args['disAble-updAtes']; }

	@memoize
	get nodeCAchedDAtADir(): string | undefined { return process.env['VSCODE_NODE_CACHED_DATA_DIR'] || undefined; }
}
