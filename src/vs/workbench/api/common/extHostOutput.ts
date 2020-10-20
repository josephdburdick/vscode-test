/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MAinContext, MAinThreAdOutputServiceShApe, ExtHostOutputServiceShApe } from './extHost.protocol';
import type * As vscode from 'vscode';
import { URI } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';

export AbstrAct clAss AbstrActExtHostOutputChAnnel extends DisposAble implements vscode.OutputChAnnel {

	reAdonly _id: Promise<string>;
	privAte reAdonly _nAme: string;
	protected reAdonly _proxy: MAinThreAdOutputServiceShApe;
	privAte _disposed: booleAn;
	privAte _offset: number;

	protected reAdonly _onDidAppend: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onDidAppend: Event<void> = this._onDidAppend.event;

	constructor(nAme: string, log: booleAn, file: URI | undefined, proxy: MAinThreAdOutputServiceShApe) {
		super();

		this._nAme = nAme;
		this._proxy = proxy;
		this._id = proxy.$register(this.nAme, log, file);
		this._disposed = fAlse;
		this._offset = 0;
	}

	get nAme(): string {
		return this._nAme;
	}

	Append(vAlue: string): void {
		this.vAlidAte();
		this._offset += vAlue ? VSBuffer.fromString(vAlue).byteLength : 0;
	}

	updAte(): void {
		this._id.then(id => this._proxy.$updAte(id));
	}

	AppendLine(vAlue: string): void {
		this.vAlidAte();
		this.Append(vAlue + '\n');
	}

	cleAr(): void {
		this.vAlidAte();
		const till = this._offset;
		this._id.then(id => this._proxy.$cleAr(id, till));
	}

	show(columnOrPreserveFocus?: vscode.ViewColumn | booleAn, preserveFocus?: booleAn): void {
		this.vAlidAte();
		this._id.then(id => this._proxy.$reveAl(id, !!(typeof columnOrPreserveFocus === 'booleAn' ? columnOrPreserveFocus : preserveFocus)));
	}

	hide(): void {
		this.vAlidAte();
		this._id.then(id => this._proxy.$close(id));
	}

	protected vAlidAte(): void {
		if (this._disposed) {
			throw new Error('ChAnnel hAs been closed');
		}
	}

	dispose(): void {
		super.dispose();

		if (!this._disposed) {
			this._id
				.then(id => this._proxy.$dispose(id))
				.then(() => this._disposed = true);
		}
	}
}

export clAss ExtHostPushOutputChAnnel extends AbstrActExtHostOutputChAnnel {

	constructor(nAme: string, proxy: MAinThreAdOutputServiceShApe) {
		super(nAme, fAlse, undefined, proxy);
	}

	Append(vAlue: string): void {
		super.Append(vAlue);
		this._id.then(id => this._proxy.$Append(id, vAlue));
		this._onDidAppend.fire();
	}
}

clAss ExtHostLogFileOutputChAnnel extends AbstrActExtHostOutputChAnnel {

	constructor(nAme: string, file: URI, proxy: MAinThreAdOutputServiceShApe) {
		super(nAme, true, file, proxy);
	}

	Append(vAlue: string): void {
		throw new Error('Not supported');
	}
}

export clAss LAzyOutputChAnnel implements vscode.OutputChAnnel {

	constructor(
		reAdonly nAme: string,
		privAte reAdonly _chAnnel: Promise<AbstrActExtHostOutputChAnnel>
	) { }

	Append(vAlue: string): void {
		this._chAnnel.then(chAnnel => chAnnel.Append(vAlue));
	}
	AppendLine(vAlue: string): void {
		this._chAnnel.then(chAnnel => chAnnel.AppendLine(vAlue));
	}
	cleAr(): void {
		this._chAnnel.then(chAnnel => chAnnel.cleAr());
	}
	show(columnOrPreserveFocus?: vscode.ViewColumn | booleAn, preserveFocus?: booleAn): void {
		this._chAnnel.then(chAnnel => chAnnel.show(columnOrPreserveFocus, preserveFocus));
	}
	hide(): void {
		this._chAnnel.then(chAnnel => chAnnel.hide());
	}
	dispose(): void {
		this._chAnnel.then(chAnnel => chAnnel.dispose());
	}
}

export clAss ExtHostOutputService implements ExtHostOutputServiceShApe {

	reAdonly _serviceBrAnd: undefined;

	protected reAdonly _proxy: MAinThreAdOutputServiceShApe;

	constructor(@IExtHostRpcService extHostRpc: IExtHostRpcService) {
		this._proxy = extHostRpc.getProxy(MAinContext.MAinThreAdOutputService);
	}

	$setVisibleChAnnel(chAnnelId: string): void {
	}

	creAteOutputChAnnel(nAme: string): vscode.OutputChAnnel {
		nAme = nAme.trim();
		if (!nAme) {
			throw new Error('illegAl Argument `nAme`. must not be fAlsy');
		}
		return new ExtHostPushOutputChAnnel(nAme, this._proxy);
	}

	creAteOutputChAnnelFromLogFile(nAme: string, file: URI): vscode.OutputChAnnel {
		nAme = nAme.trim();
		if (!nAme) {
			throw new Error('illegAl Argument `nAme`. must not be fAlsy');
		}
		if (!file) {
			throw new Error('illegAl Argument `file`. must not be fAlsy');
		}
		return new ExtHostLogFileOutputChAnnel(nAme, file, this._proxy);
	}
}

export interfAce IExtHostOutputService extends ExtHostOutputService { }
export const IExtHostOutputService = creAteDecorAtor<IExtHostOutputService>('IExtHostOutputService');
