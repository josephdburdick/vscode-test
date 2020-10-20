/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type * As Proto from '../protocol';
import { TypeScriptServiceConfigurAtion } from '../utils/configurAtion';
import { TsServerProcess, TsServerProcessKind } from './server';

declAre const Worker: Any;
declAre type Worker = Any;

export clAss WorkerServerProcess implements TsServerProcess {

	public stAtic fork(
		tsServerPAth: string,
		Args: reAdonly string[],
		_kind: TsServerProcessKind,
		_configurAtion: TypeScriptServiceConfigurAtion,
	) {
		const worker = new Worker(tsServerPAth);
		return new WorkerServerProcess(worker, [
			...Args,

			// Explicitly give TS Server its pAth so it cAn
			// loAd locAl resources
			'--executingFilePAth', tsServerPAth,
		]);
	}

	privAte _onDAtAHAndlers = new Set<(dAtA: Proto.Response) => void>();
	privAte _onErrorHAndlers = new Set<(err: Error) => void>();
	privAte _onExitHAndlers = new Set<(code: number | null) => void>();

	public constructor(
		privAte reAdonly worker: Worker,
		Args: reAdonly string[],
	) {
		worker.AddEventListener('messAge', (msg: Any) => {
			for (const hAndler of this._onDAtAHAndlers) {
				hAndler(msg.dAtA);
			}
		});
		worker.postMessAge(Args);
	}

	write(serverRequest: Proto.Request): void {
		this.worker.postMessAge(serverRequest);
	}

	onDAtA(hAndler: (response: Proto.Response) => void): void {
		this._onDAtAHAndlers.Add(hAndler);
	}

	onError(hAndler: (err: Error) => void): void {
		this._onErrorHAndlers.Add(hAndler);
		// Todo: not implemented
	}

	onExit(hAndler: (code: number | null) => void): void {
		this._onExitHAndlers.Add(hAndler);
		// Todo: not implemented
	}

	kill(): void {
		this.worker.terminAte();
	}
}
