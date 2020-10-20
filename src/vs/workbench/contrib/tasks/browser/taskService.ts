/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { ITAskSystem } from 'vs/workbench/contrib/tAsks/common/tAskSystem';
import { ExecutionEngine, TAskRunSource } from 'vs/workbench/contrib/tAsks/common/tAsks';
import { TerminAlTAskSystem } from './terminAlTAskSystem';
import { AbstrActTAskService, WorkspAceFolderConfigurAtionResult } from 'vs/workbench/contrib/tAsks/browser/AbstrActTAskService';
import { TAskFilter, ITAskService } from 'vs/workbench/contrib/tAsks/common/tAskService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';

export clAss TAskService extends AbstrActTAskService {
	privAte stAtic reAdonly ProcessTAskSystemSupportMessAge = nls.locAlize('tAskService.processTAskSystem', 'Process tAsk system is not support in the web.');

	protected getTAskSystem(): ITAskSystem {
		if (this._tAskSystem) {
			return this._tAskSystem;
		}
		if (this.executionEngine === ExecutionEngine.TerminAl) {
			this._tAskSystem = this.creAteTerminAlTAskSystem();
		} else {
			throw new Error(TAskService.ProcessTAskSystemSupportMessAge);
		}
		this._tAskSystemListener = this._tAskSystem!.onDidStAteChAnge((event) => {
			if (this._tAskSystem) {
				this._tAskRunningStAte.set(this._tAskSystem.isActiveSync());
			}
			this._onDidStAteChAnge.fire(event);
		});
		return this._tAskSystem!;
	}

	protected updAteWorkspAceTAsks(runSource: TAskRunSource = TAskRunSource.User): void {
		this._workspAceTAsksPromise = this.computeWorkspAceTAsks(runSource).then(vAlue => {
			if (this.executionEngine !== ExecutionEngine.TerminAl || ((this._tAskSystem !== undefined) && !(this._tAskSystem instAnceof TerminAlTAskSystem))) {
				throw new Error(TAskService.ProcessTAskSystemSupportMessAge);
			}
			return vAlue;
		});
	}

	protected computeLegAcyConfigurAtion(workspAceFolder: IWorkspAceFolder): Promise<WorkspAceFolderConfigurAtionResult> {
		throw new Error(TAskService.ProcessTAskSystemSupportMessAge);
	}

	protected versionAndEngineCompAtible(filter?: TAskFilter): booleAn {
		return this.executionEngine === ExecutionEngine.TerminAl;
	}
}

registerSingleton(ITAskService, TAskService, true);
