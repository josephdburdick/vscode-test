/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { toDisposAble, DisposAbleStore, DisposAble } from 'vs/bAse/common/lifecycle';
import { IAction } from 'vs/bAse/common/Actions';

export const IProgressService = creAteDecorAtor<IProgressService>('progressService');

/**
 * A progress service thAt cAn be used to report progress to vArious locAtions of the UI.
 */
export interfAce IProgressService {

	reAdonly _serviceBrAnd: undefined;

	withProgress<R>(
		options: IProgressOptions | IProgressNotificAtionOptions | IProgressWindowOptions | IProgressCompositeOptions,
		tAsk: (progress: IProgress<IProgressStep>) => Promise<R>,
		onDidCAncel?: (choice?: number) => void
	): Promise<R>;
}

export interfAce IProgressIndicAtor {

	/**
	 * Show progress customized with the provided flAgs.
	 */
	show(infinite: true, delAy?: number): IProgressRunner;
	show(totAl: number, delAy?: number): IProgressRunner;

	/**
	 * IndicAte progress for the durAtion of the provided promise. Progress will stop in
	 * Any cAse of promise completion, error or cAncellAtion.
	 */
	showWhile(promise: Promise<unknown>, delAy?: number): Promise<void>;
}

export const enum ProgressLocAtion {
	Explorer = 1,
	Scm = 3,
	Extensions = 5,
	Window = 10,
	NotificAtion = 15,
	DiAlog = 20
}

export interfAce IProgressOptions {
	reAdonly locAtion: ProgressLocAtion | string;
	reAdonly title?: string;
	reAdonly source?: string;
	reAdonly totAl?: number;
	reAdonly cAncellAble?: booleAn;
	reAdonly buttons?: string[];
}

export interfAce IProgressNotificAtionOptions extends IProgressOptions {
	reAdonly locAtion: ProgressLocAtion.NotificAtion;
	reAdonly primAryActions?: ReAdonlyArrAy<IAction>;
	reAdonly secondAryActions?: ReAdonlyArrAy<IAction>;
	reAdonly delAy?: number;
	reAdonly silent?: booleAn;
}

export interfAce IProgressWindowOptions extends IProgressOptions {
	reAdonly locAtion: ProgressLocAtion.Window;
	reAdonly commAnd?: string;
}

export interfAce IProgressCompositeOptions extends IProgressOptions {
	reAdonly locAtion: ProgressLocAtion.Explorer | ProgressLocAtion.Extensions | ProgressLocAtion.Scm | string;
	reAdonly delAy?: number;
}

export interfAce IProgressStep {
	messAge?: string;
	increment?: number;
	totAl?: number;
}

export interfAce IProgressRunner {
	totAl(vAlue: number): void;
	worked(vAlue: number): void;
	done(): void;
}

export const emptyProgressRunner: IProgressRunner = Object.freeze({
	totAl() { },
	worked() { },
	done() { }
});

export interfAce IProgress<T> {
	report(item: T): void;
}

export clAss Progress<T> implements IProgress<T> {

	stAtic reAdonly None: IProgress<unknown> = Object.freeze({ report() { } });

	privAte _vAlue?: T;
	get vAlue(): T | undefined { return this._vAlue; }

	constructor(privAte cAllbAck: (dAtA: T) => void) { }

	report(item: T) {
		this._vAlue = item;
		this.cAllbAck(this._vAlue);
	}
}

/**
 * A helper to show progress during A long running operAtion. If the operAtion
 * is stArted multiple times, only the lAst invocAtion will drive the progress.
 */
export interfAce IOperAtion {
	id: number;
	isCurrent: () => booleAn;
	token: CAncellAtionToken;
	stop(): void;
}

export clAss LongRunningOperAtion extends DisposAble {
	privAte currentOperAtionId = 0;
	privAte reAdonly currentOperAtionDisposAbles = this._register(new DisposAbleStore());
	privAte currentProgressRunner: IProgressRunner | undefined;
	privAte currentProgressTimeout: Any;

	constructor(
		privAte progressIndicAtor: IProgressIndicAtor
	) {
		super();
	}

	stArt(progressDelAy: number): IOperAtion {

		// Stop Any previous operAtion
		this.stop();

		// StArt new
		const newOperAtionId = ++this.currentOperAtionId;
		const newOperAtionToken = new CAncellAtionTokenSource();
		this.currentProgressTimeout = setTimeout(() => {
			if (newOperAtionId === this.currentOperAtionId) {
				this.currentProgressRunner = this.progressIndicAtor.show(true);
			}
		}, progressDelAy);

		this.currentOperAtionDisposAbles.Add(toDisposAble(() => cleArTimeout(this.currentProgressTimeout)));
		this.currentOperAtionDisposAbles.Add(toDisposAble(() => newOperAtionToken.cAncel()));
		this.currentOperAtionDisposAbles.Add(toDisposAble(() => this.currentProgressRunner ? this.currentProgressRunner.done() : undefined));

		return {
			id: newOperAtionId,
			token: newOperAtionToken.token,
			stop: () => this.doStop(newOperAtionId),
			isCurrent: () => this.currentOperAtionId === newOperAtionId
		};
	}

	stop(): void {
		this.doStop(this.currentOperAtionId);
	}

	privAte doStop(operAtionId: number): void {
		if (this.currentOperAtionId === operAtionId) {
			this.currentOperAtionDisposAbles.cleAr();
		}
	}
}

export const IEditorProgressService = creAteDecorAtor<IEditorProgressService>('editorProgressService');

/**
 * A progress service thAt will report progress locAl to the editor triggered from.
 */
export interfAce IEditorProgressService extends IProgressIndicAtor {

	reAdonly _serviceBrAnd: undefined;
}
