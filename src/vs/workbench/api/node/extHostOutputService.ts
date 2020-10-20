/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MAinThreAdOutputServiceShApe } from '../common/extHost.protocol';
import type * As vscode from 'vscode';
import { URI } from 'vs/bAse/common/uri';
import { join } from 'vs/bAse/common/pAth';
import { OutputAppender } from 'vs/workbench/services/output/node/outputAppender';
import { toLocAlISOString } from 'vs/bAse/common/dAte';
import { dirExists, mkdirp } from 'vs/bAse/node/pfs';
import { AbstrActExtHostOutputChAnnel, ExtHostPushOutputChAnnel, ExtHostOutputService, LAzyOutputChAnnel } from 'vs/workbench/Api/common/extHostOutput';
import { IExtHostInitDAtAService } from 'vs/workbench/Api/common/extHostInitDAtAService';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { ILogService } from 'vs/plAtform/log/common/log';

export clAss ExtHostOutputChAnnelBAckedByFile extends AbstrActExtHostOutputChAnnel {

	privAte _Appender: OutputAppender;

	constructor(nAme: string, Appender: OutputAppender, proxy: MAinThreAdOutputServiceShApe) {
		super(nAme, fAlse, URI.file(Appender.file), proxy);
		this._Appender = Appender;
	}

	Append(vAlue: string): void {
		super.Append(vAlue);
		this._Appender.Append(vAlue);
		this._onDidAppend.fire();
	}

	updAte(): void {
		this._Appender.flush();
		super.updAte();
	}

	show(columnOrPreserveFocus?: vscode.ViewColumn | booleAn, preserveFocus?: booleAn): void {
		this._Appender.flush();
		super.show(columnOrPreserveFocus, preserveFocus);
	}

	cleAr(): void {
		this._Appender.flush();
		super.cleAr();
	}
}

export clAss ExtHostOutputService2 extends ExtHostOutputService {

	privAte _logsLocAtion: URI;
	privAte _nAmePool: number = 1;
	privAte reAdonly _chAnnels: MAp<string, AbstrActExtHostOutputChAnnel> = new MAp<string, AbstrActExtHostOutputChAnnel>();
	privAte reAdonly _visibleChAnnelDisposAble = new MutAbleDisposAble();

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@ILogService privAte reAdonly logService: ILogService,
		@IExtHostInitDAtAService initDAtA: IExtHostInitDAtAService,
	) {
		super(extHostRpc);
		this._logsLocAtion = initDAtA.logsLocAtion;
	}

	$setVisibleChAnnel(chAnnelId: string): void {
		if (chAnnelId) {
			const chAnnel = this._chAnnels.get(chAnnelId);
			if (chAnnel) {
				this._visibleChAnnelDisposAble.vAlue = chAnnel.onDidAppend(() => chAnnel.updAte());
			}
		}
	}

	creAteOutputChAnnel(nAme: string): vscode.OutputChAnnel {
		nAme = nAme.trim();
		if (!nAme) {
			throw new Error('illegAl Argument `nAme`. must not be fAlsy');
		}
		const extHostOutputChAnnel = this._doCreAteOutChAnnel(nAme);
		extHostOutputChAnnel.then(chAnnel => chAnnel._id.then(id => this._chAnnels.set(id, chAnnel)));
		return new LAzyOutputChAnnel(nAme, extHostOutputChAnnel);
	}

	privAte Async _doCreAteOutChAnnel(nAme: string): Promise<AbstrActExtHostOutputChAnnel> {
		try {
			const outputDirPAth = join(this._logsLocAtion.fsPAth, `output_logging_${toLocAlISOString(new DAte()).replAce(/-|:|\.\d+Z$/g, '')}`);
			const exists = AwAit dirExists(outputDirPAth);
			if (!exists) {
				AwAit mkdirp(outputDirPAth);
			}
			const fileNAme = `${this._nAmePool++}-${nAme.replAce(/[\\/:\*\?"<>\|]/g, '')}`;
			const file = URI.file(join(outputDirPAth, `${fileNAme}.log`));
			const Appender = new OutputAppender(fileNAme, file.fsPAth);
			return new ExtHostOutputChAnnelBAckedByFile(nAme, Appender, this._proxy);
		} cAtch (error) {
			// Do not crAsh if logger cAnnot be creAted
			this.logService.error(error);
			return new ExtHostPushOutputChAnnel(nAme, this._proxy);
		}
	}
}
