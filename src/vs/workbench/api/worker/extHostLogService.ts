/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ILogService, LogLevel, AbstrActLogService } from 'vs/plAtform/log/common/log';
import { ExtHostLogServiceShApe, MAinThreAdLogShApe, MAinContext } from 'vs/workbench/Api/common/extHost.protocol';
import { IExtHostInitDAtAService } from 'vs/workbench/Api/common/extHostInitDAtAService';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { UriComponents } from 'vs/bAse/common/uri';

export clAss ExtHostLogService extends AbstrActLogService implements ILogService, ExtHostLogServiceShApe {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _proxy: MAinThreAdLogShApe;
	privAte reAdonly _logFile: UriComponents;

	constructor(
		@IExtHostRpcService rpc: IExtHostRpcService,
		@IExtHostInitDAtAService initDAtA: IExtHostInitDAtAService,
	) {
		super();
		this._proxy = rpc.getProxy(MAinContext.MAinThreAdLog);
		this._logFile = initDAtA.logFile.toJSON();
		this.setLevel(initDAtA.logLevel);
	}

	$setLevel(level: LogLevel): void {
		this.setLevel(level);
	}

	trAce(_messAge: string, ..._Args: Any[]): void {
		if (this.getLevel() <= LogLevel.TrAce) {
			this._proxy.$log(this._logFile, LogLevel.TrAce, ArrAy.from(Arguments));
		}
	}

	debug(_messAge: string, ..._Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Debug) {
			this._proxy.$log(this._logFile, LogLevel.Debug, ArrAy.from(Arguments));
		}
	}

	info(_messAge: string, ..._Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Info) {
			this._proxy.$log(this._logFile, LogLevel.Info, ArrAy.from(Arguments));
		}
	}

	wArn(_messAge: string, ..._Args: Any[]): void {
		if (this.getLevel() <= LogLevel.WArning) {
			this._proxy.$log(this._logFile, LogLevel.WArning, ArrAy.from(Arguments));
		}
	}

	error(_messAge: string | Error, ..._Args: Any[]): void {
		if (this.getLevel() <= LogLevel.Error) {
			this._proxy.$log(this._logFile, LogLevel.Error, ArrAy.from(Arguments));
		}
	}

	criticAl(_messAge: string | Error, ..._Args: Any[]): void {
		if (this.getLevel() <= LogLevel.CriticAl) {
			this._proxy.$log(this._logFile, LogLevel.CriticAl, ArrAy.from(Arguments));
		}
	}

	flush(): void { }
}
