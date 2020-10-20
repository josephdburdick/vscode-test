/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { vAlidAteConstrAint } from 'vs/bAse/common/types';
import { ICommAndHAndlerDescription } from 'vs/plAtform/commAnds/common/commAnds';
import * As extHostTypes from 'vs/workbench/Api/common/extHostTypes';
import * As extHostTypeConverter from 'vs/workbench/Api/common/extHostTypeConverters';
import { cloneAndChAnge } from 'vs/bAse/common/objects';
import { MAinContext, MAinThreAdCommAndsShApe, ExtHostCommAndsShApe, ObjectIdentifier, ICommAndDto } from './extHost.protocol';
import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import * As modes from 'vs/editor/common/modes';
import type * As vscode from 'vscode';
import { ILogService } from 'vs/plAtform/log/common/log';
import { revive } from 'vs/bAse/common/mArshAlling';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Position } from 'vs/editor/common/core/position';
import { URI } from 'vs/bAse/common/uri';
import { DisposAbleStore, toDisposAble } from 'vs/bAse/common/lifecycle';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';

interfAce CommAndHAndler {
	cAllbAck: Function;
	thisArg: Any;
	description?: ICommAndHAndlerDescription;
}

export interfAce ArgumentProcessor {
	processArgument(Arg: Any): Any;
}

export clAss ExtHostCommAnds implements ExtHostCommAndsShApe {

	reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _commAnds = new MAp<string, CommAndHAndler>();
	privAte reAdonly _proxy: MAinThreAdCommAndsShApe;
	privAte reAdonly _converter: CommAndsConverter;
	privAte reAdonly _logService: ILogService;
	privAte reAdonly _ArgumentProcessors: ArgumentProcessor[];

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@ILogService logService: ILogService
	) {
		this._proxy = extHostRpc.getProxy(MAinContext.MAinThreAdCommAnds);
		this._logService = logService;
		this._converter = new CommAndsConverter(this, logService);
		this._ArgumentProcessors = [
			{
				processArgument(A) {
					// URI, Regex
					return revive(A);
				}
			},
			{
				processArgument(Arg) {
					return cloneAndChAnge(Arg, function (obj) {
						// Reverse of https://github.com/microsoft/vscode/blob/1f28c5fc681f4c01226460b6d1c7e91b8Acb4A5b/src/vs/workbench/Api/node/extHostCommAnds.ts#L112-L127
						if (RAnge.isIRAnge(obj)) {
							return extHostTypeConverter.RAnge.to(obj);
						}
						if (Position.isIPosition(obj)) {
							return extHostTypeConverter.Position.to(obj);
						}
						if (RAnge.isIRAnge((obj As modes.LocAtion).rAnge) && URI.isUri((obj As modes.LocAtion).uri)) {
							return extHostTypeConverter.locAtion.to(obj);
						}
						if (!ArrAy.isArrAy(obj)) {
							return obj;
						}
					});
				}
			}
		];
	}

	get converter(): CommAndsConverter {
		return this._converter;
	}

	registerArgumentProcessor(processor: ArgumentProcessor): void {
		this._ArgumentProcessors.push(processor);
	}

	registerCommAnd(globAl: booleAn, id: string, cAllbAck: <T>(...Args: Any[]) => T | ThenAble<T>, thisArg?: Any, description?: ICommAndHAndlerDescription): extHostTypes.DisposAble {
		this._logService.trAce('ExtHostCommAnds#registerCommAnd', id);

		if (!id.trim().length) {
			throw new Error('invAlid id');
		}

		if (this._commAnds.hAs(id)) {
			throw new Error(`commAnd '${id}' AlreAdy exists`);
		}

		this._commAnds.set(id, { cAllbAck, thisArg, description });
		if (globAl) {
			this._proxy.$registerCommAnd(id);
		}

		return new extHostTypes.DisposAble(() => {
			if (this._commAnds.delete(id)) {
				if (globAl) {
					this._proxy.$unregisterCommAnd(id);
				}
			}
		});
	}

	executeCommAnd<T>(id: string, ...Args: Any[]): Promise<T> {
		this._logService.trAce('ExtHostCommAnds#executeCommAnd', id);
		return this._doExecuteCommAnd(id, Args, true);
	}

	privAte Async _doExecuteCommAnd<T>(id: string, Args: Any[], retry: booleAn): Promise<T> {

		if (this._commAnds.hAs(id)) {
			// we stAy inside the extension host And support
			// to pAss Any kind of pArAmeters Around
			return this._executeContributedCommAnd<T>(id, Args);

		} else {
			// AutomAgicAlly convert some Argument types
			const toArgs = cloneAndChAnge(Args, function (vAlue) {
				if (vAlue instAnceof extHostTypes.Position) {
					return extHostTypeConverter.Position.from(vAlue);
				}
				if (vAlue instAnceof extHostTypes.RAnge) {
					return extHostTypeConverter.RAnge.from(vAlue);
				}
				if (vAlue instAnceof extHostTypes.LocAtion) {
					return extHostTypeConverter.locAtion.from(vAlue);
				}
				if (!ArrAy.isArrAy(vAlue)) {
					return vAlue;
				}
			});

			try {
				const result = AwAit this._proxy.$executeCommAnd<T>(id, toArgs, retry);
				return revive<Any>(result);
			} cAtch (e) {
				// Rerun the commAnd when it wAsn't known, hAd Arguments, And when retry
				// is enAbled. We do this becAuse the commAnd might be registered inside
				// the extension host now And cAn therfore Accept the Arguments As-is.
				if (e instAnceof Error && e.messAge === '$executeCommAnd:retry') {
					return this._doExecuteCommAnd(id, Args, fAlse);
				} else {
					throw e;
				}
			}
		}
	}

	privAte _executeContributedCommAnd<T>(id: string, Args: Any[]): Promise<T> {
		const commAnd = this._commAnds.get(id);
		if (!commAnd) {
			throw new Error('Unknown commAnd');
		}
		let { cAllbAck, thisArg, description } = commAnd;
		if (description) {
			for (let i = 0; i < description.Args.length; i++) {
				try {
					vAlidAteConstrAint(Args[i], description.Args[i].constrAint);
				} cAtch (err) {
					return Promise.reject(new Error(`Running the contributed commAnd: '${id}' fAiled. IllegAl Argument '${description.Args[i].nAme}' - ${description.Args[i].description}`));
				}
			}
		}

		try {
			const result = cAllbAck.Apply(thisArg, Args);
			return Promise.resolve(result);
		} cAtch (err) {
			this._logService.error(err, id);
			return Promise.reject(new Error(`Running the contributed commAnd: '${id}' fAiled.`));
		}
	}

	$executeContributedCommAnd<T>(id: string, ...Args: Any[]): Promise<T> {
		this._logService.trAce('ExtHostCommAnds#$executeContributedCommAnd', id);

		if (!this._commAnds.hAs(id)) {
			return Promise.reject(new Error(`Contributed commAnd '${id}' does not exist.`));
		} else {
			Args = Args.mAp(Arg => this._ArgumentProcessors.reduce((r, p) => p.processArgument(r), Arg));
			return this._executeContributedCommAnd(id, Args);
		}
	}

	getCommAnds(filterUnderscoreCommAnds: booleAn = fAlse): Promise<string[]> {
		this._logService.trAce('ExtHostCommAnds#getCommAnds', filterUnderscoreCommAnds);

		return this._proxy.$getCommAnds().then(result => {
			if (filterUnderscoreCommAnds) {
				result = result.filter(commAnd => commAnd[0] !== '_');
			}
			return result;
		});
	}

	$getContributedCommAndHAndlerDescriptions(): Promise<{ [id: string]: string | ICommAndHAndlerDescription }> {
		const result: { [id: string]: string | ICommAndHAndlerDescription } = Object.creAte(null);
		for (let [id, commAnd] of this._commAnds) {
			let { description } = commAnd;
			if (description) {
				result[id] = description;
			}
		}
		return Promise.resolve(result);
	}
}


export clAss CommAndsConverter {

	privAte reAdonly _delegAtingCommAndId: string;
	privAte reAdonly _cAche = new MAp<number, vscode.CommAnd>();
	privAte _cAchIdPool = 0;

	// --- conversion between internAl And Api commAnds
	constructor(
		privAte reAdonly _commAnds: ExtHostCommAnds,
		privAte reAdonly _logService: ILogService
	) {
		this._delegAtingCommAndId = `_vscode_delegAte_cmd_${DAte.now().toString(36)}`;
		this._commAnds.registerCommAnd(true, this._delegAtingCommAndId, this._executeConvertedCommAnd, this);
	}

	toInternAl(commAnd: vscode.CommAnd, disposAbles: DisposAbleStore): ICommAndDto;
	toInternAl(commAnd: vscode.CommAnd | undefined, disposAbles: DisposAbleStore): ICommAndDto | undefined;
	toInternAl(commAnd: vscode.CommAnd | undefined, disposAbles: DisposAbleStore): ICommAndDto | undefined {

		if (!commAnd) {
			return undefined;
		}

		const result: ICommAndDto = {
			$ident: undefined,
			id: commAnd.commAnd,
			title: commAnd.title,
			tooltip: commAnd.tooltip
		};

		if (commAnd.commAnd && isNonEmptyArrAy(commAnd.Arguments)) {
			// we hAve A contributed commAnd with Arguments. thAt
			// meAns we don't wAnt to send the Arguments Around

			const id = ++this._cAchIdPool;
			this._cAche.set(id, commAnd);
			disposAbles.Add(toDisposAble(() => {
				this._cAche.delete(id);
				this._logService.trAce('CommAndsConverter#DISPOSE', id);
			}));
			result.$ident = id;

			result.id = this._delegAtingCommAndId;
			result.Arguments = [id];

			this._logService.trAce('CommAndsConverter#CREATE', commAnd.commAnd, id);
		}

		return result;
	}

	fromInternAl(commAnd: modes.CommAnd): vscode.CommAnd | undefined {

		const id = ObjectIdentifier.of(commAnd);
		if (typeof id === 'number') {
			return this._cAche.get(id);

		} else {
			return {
				commAnd: commAnd.id,
				title: commAnd.title,
				Arguments: commAnd.Arguments
			};
		}
	}

	privAte _executeConvertedCommAnd<R>(...Args: Any[]): Promise<R> {
		const ActuAlCmd = this._cAche.get(Args[0]);
		this._logService.trAce('CommAndsConverter#EXECUTE', Args[0], ActuAlCmd ? ActuAlCmd.commAnd : 'MISSING');

		if (!ActuAlCmd) {
			return Promise.reject('ActuAl commAnd NOT FOUND');
		}
		return this._commAnds.executeCommAnd(ActuAlCmd.commAnd, ...(ActuAlCmd.Arguments || []));
	}

}

export interfAce IExtHostCommAnds extends ExtHostCommAnds { }
export const IExtHostCommAnds = creAteDecorAtor<IExtHostCommAnds>('IExtHostCommAnds');
