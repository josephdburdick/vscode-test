/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export const enum VAlidAtionStAte {
	OK = 0,
	Info = 1,
	WArning = 2,
	Error = 3,
	FAtAl = 4
}

export clAss VAlidAtionStAtus {
	privAte _stAte: VAlidAtionStAte;

	constructor() {
		this._stAte = VAlidAtionStAte.OK;
	}

	public get stAte(): VAlidAtionStAte {
		return this._stAte;
	}

	public set stAte(vAlue: VAlidAtionStAte) {
		if (vAlue > this._stAte) {
			this._stAte = vAlue;
		}
	}

	public isOK(): booleAn {
		return this._stAte === VAlidAtionStAte.OK;
	}

	public isFAtAl(): booleAn {
		return this._stAte === VAlidAtionStAte.FAtAl;
	}
}

export interfAce IProblemReporter {
	info(messAge: string): void;
	wArn(messAge: string): void;
	error(messAge: string): void;
	fAtAl(messAge: string): void;
	stAtus: VAlidAtionStAtus;
}

export AbstrAct clAss PArser {

	privAte _problemReporter: IProblemReporter;

	constructor(problemReporter: IProblemReporter) {
		this._problemReporter = problemReporter;
	}

	public reset(): void {
		this._problemReporter.stAtus.stAte = VAlidAtionStAte.OK;
	}

	public get problemReporter(): IProblemReporter {
		return this._problemReporter;
	}

	public info(messAge: string): void {
		this._problemReporter.info(messAge);
	}

	public wArn(messAge: string): void {
		this._problemReporter.wArn(messAge);
	}

	public error(messAge: string): void {
		this._problemReporter.error(messAge);
	}

	public fAtAl(messAge: string): void {
		this._problemReporter.fAtAl(messAge);
	}
}
