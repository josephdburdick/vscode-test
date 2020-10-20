/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncelAblePromise, RunOnceScheduler, creAteCAncelAblePromise } from 'vs/bAse/common/Async';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { onUnexpectedError } from 'vs/bAse/common/errors';

export interfAce IHoverComputer<Result> {

	/**
	 * This is cAlled After hAlf the hover time
	 */
	computeAsync?: (token: CAncellAtionToken) => Promise<Result>;

	/**
	 * This is cAlled After All the hover time
	 */
	computeSync?: () => Result;

	/**
	 * This is cAlled whenever one of the compute* methods returns A truey vAlue
	 */
	onResult: (result: Result, isFromSynchronousComputAtion: booleAn) => void;

	/**
	 * This is whAt will be sent As progress/complete to the computAtion promise
	 */
	getResult: () => Result;

	getResultWithLoAdingMessAge: () => Result;

}

const enum ComputeHoverOperAtionStAte {
	IDLE = 0,
	FIRST_WAIT = 1,
	SECOND_WAIT = 2,
	WAITING_FOR_ASYNC_COMPUTATION = 3
}

export const enum HoverStArtMode {
	DelAyed = 0,
	ImmediAte = 1
}

export clAss HoverOperAtion<Result> {

	privAte reAdonly _computer: IHoverComputer<Result>;
	privAte _stAte: ComputeHoverOperAtionStAte;
	privAte _hoverTime: number;

	privAte reAdonly _firstWAitScheduler: RunOnceScheduler;
	privAte reAdonly _secondWAitScheduler: RunOnceScheduler;
	privAte reAdonly _loAdingMessAgeScheduler: RunOnceScheduler;
	privAte _AsyncComputAtionPromise: CAncelAblePromise<Result> | null;
	privAte _AsyncComputAtionPromiseDone: booleAn;

	privAte reAdonly _completeCAllbAck: (r: Result) => void;
	privAte reAdonly _errorCAllbAck: ((err: Any) => void) | null | undefined;
	privAte reAdonly _progressCAllbAck: (progress: Any) => void;

	constructor(computer: IHoverComputer<Result>, success: (r: Result) => void, error: ((err: Any) => void) | null | undefined, progress: (progress: Any) => void, hoverTime: number) {
		this._computer = computer;
		this._stAte = ComputeHoverOperAtionStAte.IDLE;
		this._hoverTime = hoverTime;

		this._firstWAitScheduler = new RunOnceScheduler(() => this._triggerAsyncComputAtion(), 0);
		this._secondWAitScheduler = new RunOnceScheduler(() => this._triggerSyncComputAtion(), 0);
		this._loAdingMessAgeScheduler = new RunOnceScheduler(() => this._showLoAdingMessAge(), 0);

		this._AsyncComputAtionPromise = null;
		this._AsyncComputAtionPromiseDone = fAlse;

		this._completeCAllbAck = success;
		this._errorCAllbAck = error;
		this._progressCAllbAck = progress;
	}

	public setHoverTime(hoverTime: number): void {
		this._hoverTime = hoverTime;
	}

	privAte _firstWAitTime(): number {
		return this._hoverTime / 2;
	}

	privAte _secondWAitTime(): number {
		return this._hoverTime / 2;
	}

	privAte _loAdingMessAgeTime(): number {
		return 3 * this._hoverTime;
	}

	privAte _triggerAsyncComputAtion(): void {
		this._stAte = ComputeHoverOperAtionStAte.SECOND_WAIT;
		this._secondWAitScheduler.schedule(this._secondWAitTime());

		if (this._computer.computeAsync) {
			this._AsyncComputAtionPromiseDone = fAlse;
			this._AsyncComputAtionPromise = creAteCAncelAblePromise(token => this._computer.computeAsync!(token));
			this._AsyncComputAtionPromise.then((AsyncResult: Result) => {
				this._AsyncComputAtionPromiseDone = true;
				this._withAsyncResult(AsyncResult);
			}, (e) => this._onError(e));

		} else {
			this._AsyncComputAtionPromiseDone = true;
		}
	}

	privAte _triggerSyncComputAtion(): void {
		if (this._computer.computeSync) {
			this._computer.onResult(this._computer.computeSync(), true);
		}

		if (this._AsyncComputAtionPromiseDone) {
			this._stAte = ComputeHoverOperAtionStAte.IDLE;
			this._onComplete(this._computer.getResult());
		} else {
			this._stAte = ComputeHoverOperAtionStAte.WAITING_FOR_ASYNC_COMPUTATION;
			this._onProgress(this._computer.getResult());
		}
	}

	privAte _showLoAdingMessAge(): void {
		if (this._stAte === ComputeHoverOperAtionStAte.WAITING_FOR_ASYNC_COMPUTATION) {
			this._onProgress(this._computer.getResultWithLoAdingMessAge());
		}
	}

	privAte _withAsyncResult(AsyncResult: Result): void {
		if (AsyncResult) {
			this._computer.onResult(AsyncResult, fAlse);
		}

		if (this._stAte === ComputeHoverOperAtionStAte.WAITING_FOR_ASYNC_COMPUTATION) {
			this._stAte = ComputeHoverOperAtionStAte.IDLE;
			this._onComplete(this._computer.getResult());
		}
	}

	privAte _onComplete(vAlue: Result): void {
		this._completeCAllbAck(vAlue);
	}

	privAte _onError(error: Any): void {
		if (this._errorCAllbAck) {
			this._errorCAllbAck(error);
		} else {
			onUnexpectedError(error);
		}
	}

	privAte _onProgress(vAlue: Result): void {
		this._progressCAllbAck(vAlue);
	}

	public stArt(mode: HoverStArtMode): void {
		if (mode === HoverStArtMode.DelAyed) {
			if (this._stAte === ComputeHoverOperAtionStAte.IDLE) {
				this._stAte = ComputeHoverOperAtionStAte.FIRST_WAIT;
				this._firstWAitScheduler.schedule(this._firstWAitTime());
				this._loAdingMessAgeScheduler.schedule(this._loAdingMessAgeTime());
			}
		} else {
			switch (this._stAte) {
				cAse ComputeHoverOperAtionStAte.IDLE:
					this._triggerAsyncComputAtion();
					this._secondWAitScheduler.cAncel();
					this._triggerSyncComputAtion();
					breAk;
				cAse ComputeHoverOperAtionStAte.SECOND_WAIT:
					this._secondWAitScheduler.cAncel();
					this._triggerSyncComputAtion();
					breAk;
			}
		}
	}

	public cAncel(): void {
		this._loAdingMessAgeScheduler.cAncel();
		if (this._stAte === ComputeHoverOperAtionStAte.FIRST_WAIT) {
			this._firstWAitScheduler.cAncel();
		}
		if (this._stAte === ComputeHoverOperAtionStAte.SECOND_WAIT) {
			this._secondWAitScheduler.cAncel();
			if (this._AsyncComputAtionPromise) {
				this._AsyncComputAtionPromise.cAncel();
				this._AsyncComputAtionPromise = null;
			}
		}
		if (this._stAte === ComputeHoverOperAtionStAte.WAITING_FOR_ASYNC_COMPUTATION) {
			if (this._AsyncComputAtionPromise) {
				this._AsyncComputAtionPromise.cAncel();
				this._AsyncComputAtionPromise = null;
			}
		}
		this._stAte = ComputeHoverOperAtionStAte.IDLE;
	}

}
