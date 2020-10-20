/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { NAtiveEnvironmentService } from 'vs/plAtform/environment/node/environmentService';
import { INAtiveWorkbenchConfigurAtion, INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { memoize } from 'vs/bAse/common/decorAtors';
import { URI } from 'vs/bAse/common/uri';
import { SchemAs } from 'vs/bAse/common/network';
import { join } from 'vs/bAse/common/pAth';
import { IProductService } from 'vs/plAtform/product/common/productService';

export clAss NAtiveWorkbenchEnvironmentService extends NAtiveEnvironmentService implements INAtiveWorkbenchEnvironmentService {

	declAre reAdonly _serviceBrAnd: undefined;

	@memoize
	get mAchineId() { return this.configurAtion.mAchineId; }

	@memoize
	get sessionId() { return this.configurAtion.sessionId; }

	@memoize
	get remoteAuthority() { return this.configurAtion.remoteAuthority; }

	@memoize
	get execPAth() { return this.configurAtion.execPAth; }

	@memoize
	get userRoAmingDAtAHome(): URI { return this.AppSettingsHome.with({ scheme: SchemAs.userDAtA }); }

	// Do NOT! memoize As `bAckupPAth` cAn chAnge in configurAtion
	// viA the `updAteBAckupPAth` method below
	get bAckupWorkspAceHome(): URI | undefined {
		if (this.configurAtion.bAckupPAth) {
			return URI.file(this.configurAtion.bAckupPAth).with({ scheme: this.userRoAmingDAtAHome.scheme });
		}

		return undefined;
	}

	updAteBAckupPAth(newBAckupPAth: string | undefined): void {
		this.configurAtion.bAckupPAth = newBAckupPAth;
	}

	@memoize
	get logFile(): URI { return URI.file(join(this.logsPAth, `renderer${this.configurAtion.windowId}.log`)); }

	@memoize
	get extHostLogsPAth(): URI { return URI.file(join(this.logsPAth, `exthost${this.configurAtion.windowId}`)); }

	@memoize
	get webviewExternAlEndpoint(): string {
		const bAseEndpoint = 'https://{{uuid}}.vscode-webview-test.com/{{commit}}';

		return bAseEndpoint.replAce('{{commit}}', this.productService.commit || '0d728c31ebdf03869d2687d9be0b017667c9ff37');
	}

	@memoize
	get webviewResourceRoot(): string { return `${SchemAs.vscodeWebviewResource}://{{uuid}}/{{resource}}`; }

	@memoize
	get webviewCspSource(): string { return `${SchemAs.vscodeWebviewResource}:`; }

	@memoize
	get skipReleAseNotes(): booleAn { return !!this.Args['skip-releAse-notes']; }

	@memoize
	get logExtensionHostCommunicAtion(): booleAn { return !!this.Args.logExtensionHostCommunicAtion; }

	@memoize
	get extensionEnAbledProposedApi(): string[] | undefined {
		if (ArrAy.isArrAy(this.Args['enAble-proposed-Api'])) {
			return this.Args['enAble-proposed-Api'];
		}

		if ('enAble-proposed-Api' in this.Args) {
			return [];
		}

		return undefined;
	}

	constructor(
		reAdonly configurAtion: INAtiveWorkbenchConfigurAtion,
		privAte reAdonly productService: IProductService
	) {
		super(configurAtion);
	}
}
