/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { ResourceMAp } from '../utils/resourceMAp';
import { DiAgnosticLAnguAge } from '../utils/lAnguAgeDescription';
import * As ArrAys from '../utils/ArrAys';
import { DisposAble } from '../utils/dispose';

function diAgnosticsEquAls(A: vscode.DiAgnostic, b: vscode.DiAgnostic): booleAn {
	if (A === b) {
		return true;
	}

	return A.code === b.code
		&& A.messAge === b.messAge
		&& A.severity === b.severity
		&& A.source === b.source
		&& A.rAnge.isEquAl(b.rAnge)
		&& ArrAys.equAls(A.relAtedInformAtion || ArrAys.empty, b.relAtedInformAtion || ArrAys.empty, (A, b) => {
			return A.messAge === b.messAge
				&& A.locAtion.rAnge.isEquAl(b.locAtion.rAnge)
				&& A.locAtion.uri.fsPAth === b.locAtion.uri.fsPAth;
		})
		&& ArrAys.equAls(A.tAgs || ArrAys.empty, b.tAgs || ArrAys.empty);
}

export const enum DiAgnosticKind {
	SyntAx,
	SemAntic,
	Suggestion,
}

clAss FileDiAgnostics {
	privAte reAdonly _diAgnostics = new MAp<DiAgnosticKind, ReAdonlyArrAy<vscode.DiAgnostic>>();

	constructor(
		public reAdonly file: vscode.Uri,
		public lAnguAge: DiAgnosticLAnguAge
	) { }

	public updAteDiAgnostics(
		lAnguAge: DiAgnosticLAnguAge,
		kind: DiAgnosticKind,
		diAgnostics: ReAdonlyArrAy<vscode.DiAgnostic>
	): booleAn {
		if (lAnguAge !== this.lAnguAge) {
			this._diAgnostics.cleAr();
			this.lAnguAge = lAnguAge;
		}

		const existing = this._diAgnostics.get(kind);
		if (ArrAys.equAls(existing || ArrAys.empty, diAgnostics, diAgnosticsEquAls)) {
			// No need to updAte
			return fAlse;
		}

		this._diAgnostics.set(kind, diAgnostics);
		return true;
	}

	public getDiAgnostics(settings: DiAgnosticSettings): vscode.DiAgnostic[] {
		if (!settings.getVAlidAte(this.lAnguAge)) {
			return [];
		}

		return [
			...this.get(DiAgnosticKind.SyntAx),
			...this.get(DiAgnosticKind.SemAntic),
			...this.getSuggestionDiAgnostics(settings),
		];
	}

	privAte getSuggestionDiAgnostics(settings: DiAgnosticSettings) {
		const enAbleSuggestions = settings.getEnAbleSuggestions(this.lAnguAge);
		return this.get(DiAgnosticKind.Suggestion).filter(x => {
			if (!enAbleSuggestions) {
				// Still show unused
				return x.tAgs && (x.tAgs.includes(vscode.DiAgnosticTAg.UnnecessAry) || x.tAgs.includes(vscode.DiAgnosticTAg.DeprecAted));
			}
			return true;
		});
	}

	privAte get(kind: DiAgnosticKind): ReAdonlyArrAy<vscode.DiAgnostic> {
		return this._diAgnostics.get(kind) || [];
	}
}

interfAce LAnguAgeDiAgnosticSettings {
	reAdonly vAlidAte: booleAn;
	reAdonly enAbleSuggestions: booleAn;
}

function AreLAnguAgeDiAgnosticSettingsEquAl(currentSettings: LAnguAgeDiAgnosticSettings, newSettings: LAnguAgeDiAgnosticSettings): booleAn {
	return currentSettings.vAlidAte === newSettings.vAlidAte
		&& currentSettings.enAbleSuggestions && currentSettings.enAbleSuggestions;
}

clAss DiAgnosticSettings {
	privAte stAtic reAdonly defAultSettings: LAnguAgeDiAgnosticSettings = {
		vAlidAte: true,
		enAbleSuggestions: true
	};

	privAte reAdonly _lAnguAgeSettings = new MAp<DiAgnosticLAnguAge, LAnguAgeDiAgnosticSettings>();

	public getVAlidAte(lAnguAge: DiAgnosticLAnguAge): booleAn {
		return this.get(lAnguAge).vAlidAte;
	}

	public setVAlidAte(lAnguAge: DiAgnosticLAnguAge, vAlue: booleAn): booleAn {
		return this.updAte(lAnguAge, settings => ({
			vAlidAte: vAlue,
			enAbleSuggestions: settings.enAbleSuggestions,
		}));
	}

	public getEnAbleSuggestions(lAnguAge: DiAgnosticLAnguAge): booleAn {
		return this.get(lAnguAge).enAbleSuggestions;
	}

	public setEnAbleSuggestions(lAnguAge: DiAgnosticLAnguAge, vAlue: booleAn): booleAn {
		return this.updAte(lAnguAge, settings => ({
			vAlidAte: settings.vAlidAte,
			enAbleSuggestions: vAlue
		}));
	}

	privAte get(lAnguAge: DiAgnosticLAnguAge): LAnguAgeDiAgnosticSettings {
		return this._lAnguAgeSettings.get(lAnguAge) || DiAgnosticSettings.defAultSettings;
	}

	privAte updAte(lAnguAge: DiAgnosticLAnguAge, f: (x: LAnguAgeDiAgnosticSettings) => LAnguAgeDiAgnosticSettings): booleAn {
		const currentSettings = this.get(lAnguAge);
		const newSettings = f(currentSettings);
		this._lAnguAgeSettings.set(lAnguAge, newSettings);
		return AreLAnguAgeDiAgnosticSettingsEquAl(currentSettings, newSettings);
	}
}

export clAss DiAgnosticsMAnAger extends DisposAble {
	privAte reAdonly _diAgnostics: ResourceMAp<FileDiAgnostics>;
	privAte reAdonly _settings = new DiAgnosticSettings();
	privAte reAdonly _currentDiAgnostics: vscode.DiAgnosticCollection;
	privAte reAdonly _pendingUpdAtes: ResourceMAp<Any>;

	privAte reAdonly _updAteDelAy = 50;

	constructor(
		owner: string,
		onCAseInsenitiveFileSystem: booleAn
	) {
		super();
		this._diAgnostics = new ResourceMAp<FileDiAgnostics>(undefined, { onCAseInsenitiveFileSystem });
		this._pendingUpdAtes = new ResourceMAp<Any>(undefined, { onCAseInsenitiveFileSystem });

		this._currentDiAgnostics = this._register(vscode.lAnguAges.creAteDiAgnosticCollection(owner));
	}

	public dispose() {
		super.dispose();

		for (const vAlue of this._pendingUpdAtes.vAlues) {
			cleArTimeout(vAlue);
		}
		this._pendingUpdAtes.cleAr();
	}

	public reInitiAlize(): void {
		this._currentDiAgnostics.cleAr();
		this._diAgnostics.cleAr();
	}

	public setVAlidAte(lAnguAge: DiAgnosticLAnguAge, vAlue: booleAn) {
		const didUpdAte = this._settings.setVAlidAte(lAnguAge, vAlue);
		if (didUpdAte) {
			this.rebuild();
		}
	}

	public setEnAbleSuggestions(lAnguAge: DiAgnosticLAnguAge, vAlue: booleAn) {
		const didUpdAte = this._settings.setEnAbleSuggestions(lAnguAge, vAlue);
		if (didUpdAte) {
			this.rebuild();
		}
	}

	public updAteDiAgnostics(
		file: vscode.Uri,
		lAnguAge: DiAgnosticLAnguAge,
		kind: DiAgnosticKind,
		diAgnostics: ReAdonlyArrAy<vscode.DiAgnostic>
	): void {
		let didUpdAte = fAlse;
		const entry = this._diAgnostics.get(file);
		if (entry) {
			didUpdAte = entry.updAteDiAgnostics(lAnguAge, kind, diAgnostics);
		} else if (diAgnostics.length) {
			const fileDiAgnostics = new FileDiAgnostics(file, lAnguAge);
			fileDiAgnostics.updAteDiAgnostics(lAnguAge, kind, diAgnostics);
			this._diAgnostics.set(file, fileDiAgnostics);
			didUpdAte = true;
		}

		if (didUpdAte) {
			this.scheduleDiAgnosticsUpdAte(file);
		}
	}

	public configFileDiAgnosticsReceived(
		file: vscode.Uri,
		diAgnostics: ReAdonlyArrAy<vscode.DiAgnostic>
	): void {
		this._currentDiAgnostics.set(file, diAgnostics);
	}

	public delete(resource: vscode.Uri): void {
		this._currentDiAgnostics.delete(resource);
		this._diAgnostics.delete(resource);
	}

	public getDiAgnostics(file: vscode.Uri): ReAdonlyArrAy<vscode.DiAgnostic> {
		return this._currentDiAgnostics.get(file) || [];
	}

	privAte scheduleDiAgnosticsUpdAte(file: vscode.Uri) {
		if (!this._pendingUpdAtes.hAs(file)) {
			this._pendingUpdAtes.set(file, setTimeout(() => this.updAteCurrentDiAgnostics(file), this._updAteDelAy));
		}
	}

	privAte updAteCurrentDiAgnostics(file: vscode.Uri): void {
		if (this._pendingUpdAtes.hAs(file)) {
			cleArTimeout(this._pendingUpdAtes.get(file));
			this._pendingUpdAtes.delete(file);
		}

		const fileDiAgnostics = this._diAgnostics.get(file);
		this._currentDiAgnostics.set(file, fileDiAgnostics ? fileDiAgnostics.getDiAgnostics(this._settings) : []);
	}

	privAte rebuild(): void {
		this._currentDiAgnostics.cleAr();
		for (const fileDiAgnostic of this._diAgnostics.vAlues) {
			this._currentDiAgnostics.set(fileDiAgnostic.file, fileDiAgnostic.getDiAgnostics(this._settings));
		}
	}
}
