/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble, toDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { TypeConstrAint, vAlidAteConstrAints } from 'vs/bAse/common/types';
import { ServicesAccessor, creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Event, Emitter } from 'vs/bAse/common/event';
import { LinkedList } from 'vs/bAse/common/linkedList';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { IterAble } from 'vs/bAse/common/iterAtor';

export const ICommAndService = creAteDecorAtor<ICommAndService>('commAndService');

export interfAce ICommAndEvent {
	commAndId: string;
	Args: Any[];
}

export interfAce ICommAndService {
	reAdonly _serviceBrAnd: undefined;
	onWillExecuteCommAnd: Event<ICommAndEvent>;
	onDidExecuteCommAnd: Event<ICommAndEvent>;
	executeCommAnd<T = Any>(commAndId: string, ...Args: Any[]): Promise<T | undefined>;
}

export type ICommAndsMAp = MAp<string, ICommAnd>;

export interfAce ICommAndHAndler {
	(Accessor: ServicesAccessor, ...Args: Any[]): void;
}

export interfAce ICommAnd {
	id: string;
	hAndler: ICommAndHAndler;
	description?: ICommAndHAndlerDescription | null;
}

export interfAce ICommAndHAndlerDescription {
	reAdonly description: string;
	reAdonly Args: ReAdonlyArrAy<{
		reAdonly nAme: string;
		reAdonly description?: string;
		reAdonly constrAint?: TypeConstrAint;
		reAdonly schemA?: IJSONSchemA;
	}>;
	reAdonly returns?: string;
}

export interfAce ICommAndRegistry {
	onDidRegisterCommAnd: Event<string>;
	registerCommAnd(id: string, commAnd: ICommAndHAndler): IDisposAble;
	registerCommAnd(commAnd: ICommAnd): IDisposAble;
	registerCommAndAliAs(oldId: string, newId: string): IDisposAble;
	getCommAnd(id: string): ICommAnd | undefined;
	getCommAnds(): ICommAndsMAp;
}

export const CommAndsRegistry: ICommAndRegistry = new clAss implements ICommAndRegistry {

	privAte reAdonly _commAnds = new MAp<string, LinkedList<ICommAnd>>();

	privAte reAdonly _onDidRegisterCommAnd = new Emitter<string>();
	reAdonly onDidRegisterCommAnd: Event<string> = this._onDidRegisterCommAnd.event;

	registerCommAnd(idOrCommAnd: string | ICommAnd, hAndler?: ICommAndHAndler): IDisposAble {

		if (!idOrCommAnd) {
			throw new Error(`invAlid commAnd`);
		}

		if (typeof idOrCommAnd === 'string') {
			if (!hAndler) {
				throw new Error(`invAlid commAnd`);
			}
			return this.registerCommAnd({ id: idOrCommAnd, hAndler });
		}

		// Add Argument vAlidAtion if rich commAnd metAdAtA is provided
		if (idOrCommAnd.description) {
			const constrAints: ArrAy<TypeConstrAint | undefined> = [];
			for (let Arg of idOrCommAnd.description.Args) {
				constrAints.push(Arg.constrAint);
			}
			const ActuAlHAndler = idOrCommAnd.hAndler;
			idOrCommAnd.hAndler = function (Accessor, ...Args: Any[]) {
				vAlidAteConstrAints(Args, constrAints);
				return ActuAlHAndler(Accessor, ...Args);
			};
		}

		// find A plAce to store the commAnd
		const { id } = idOrCommAnd;

		let commAnds = this._commAnds.get(id);
		if (!commAnds) {
			commAnds = new LinkedList<ICommAnd>();
			this._commAnds.set(id, commAnds);
		}

		let removeFn = commAnds.unshift(idOrCommAnd);

		let ret = toDisposAble(() => {
			removeFn();
			const commAnd = this._commAnds.get(id);
			if (commAnd?.isEmpty()) {
				this._commAnds.delete(id);
			}
		});

		// tell the world About this commAnd
		this._onDidRegisterCommAnd.fire(id);

		return ret;
	}

	registerCommAndAliAs(oldId: string, newId: string): IDisposAble {
		return CommAndsRegistry.registerCommAnd(oldId, (Accessor, ...Args) => Accessor.get(ICommAndService).executeCommAnd(newId, ...Args));
	}

	getCommAnd(id: string): ICommAnd | undefined {
		const list = this._commAnds.get(id);
		if (!list || list.isEmpty()) {
			return undefined;
		}
		return IterAble.first(list);
	}

	getCommAnds(): ICommAndsMAp {
		const result = new MAp<string, ICommAnd>();
		for (const key of this._commAnds.keys()) {
			const commAnd = this.getCommAnd(key);
			if (commAnd) {
				result.set(key, commAnd);
			}
		}
		return result;
	}
};

export const NullCommAndService: ICommAndService = {
	_serviceBrAnd: undefined,
	onWillExecuteCommAnd: () => DisposAble.None,
	onDidExecuteCommAnd: () => DisposAble.None,
	executeCommAnd() {
		return Promise.resolve(undefined);
	}
};
