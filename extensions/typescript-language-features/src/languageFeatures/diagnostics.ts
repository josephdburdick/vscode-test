/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ResourceMap } from '../utils/resourceMap';
import { DiagnosticLanguage } from '../utils/languageDescription';
import * as arrays from '../utils/arrays';
import { DisposaBle } from '../utils/dispose';

function diagnosticsEquals(a: vscode.Diagnostic, B: vscode.Diagnostic): Boolean {
	if (a === B) {
		return true;
	}

	return a.code === B.code
		&& a.message === B.message
		&& a.severity === B.severity
		&& a.source === B.source
		&& a.range.isEqual(B.range)
		&& arrays.equals(a.relatedInformation || arrays.empty, B.relatedInformation || arrays.empty, (a, B) => {
			return a.message === B.message
				&& a.location.range.isEqual(B.location.range)
				&& a.location.uri.fsPath === B.location.uri.fsPath;
		})
		&& arrays.equals(a.tags || arrays.empty, B.tags || arrays.empty);
}

export const enum DiagnosticKind {
	Syntax,
	Semantic,
	Suggestion,
}

class FileDiagnostics {
	private readonly _diagnostics = new Map<DiagnosticKind, ReadonlyArray<vscode.Diagnostic>>();

	constructor(
		puBlic readonly file: vscode.Uri,
		puBlic language: DiagnosticLanguage
	) { }

	puBlic updateDiagnostics(
		language: DiagnosticLanguage,
		kind: DiagnosticKind,
		diagnostics: ReadonlyArray<vscode.Diagnostic>
	): Boolean {
		if (language !== this.language) {
			this._diagnostics.clear();
			this.language = language;
		}

		const existing = this._diagnostics.get(kind);
		if (arrays.equals(existing || arrays.empty, diagnostics, diagnosticsEquals)) {
			// No need to update
			return false;
		}

		this._diagnostics.set(kind, diagnostics);
		return true;
	}

	puBlic getDiagnostics(settings: DiagnosticSettings): vscode.Diagnostic[] {
		if (!settings.getValidate(this.language)) {
			return [];
		}

		return [
			...this.get(DiagnosticKind.Syntax),
			...this.get(DiagnosticKind.Semantic),
			...this.getSuggestionDiagnostics(settings),
		];
	}

	private getSuggestionDiagnostics(settings: DiagnosticSettings) {
		const enaBleSuggestions = settings.getEnaBleSuggestions(this.language);
		return this.get(DiagnosticKind.Suggestion).filter(x => {
			if (!enaBleSuggestions) {
				// Still show unused
				return x.tags && (x.tags.includes(vscode.DiagnosticTag.Unnecessary) || x.tags.includes(vscode.DiagnosticTag.Deprecated));
			}
			return true;
		});
	}

	private get(kind: DiagnosticKind): ReadonlyArray<vscode.Diagnostic> {
		return this._diagnostics.get(kind) || [];
	}
}

interface LanguageDiagnosticSettings {
	readonly validate: Boolean;
	readonly enaBleSuggestions: Boolean;
}

function areLanguageDiagnosticSettingsEqual(currentSettings: LanguageDiagnosticSettings, newSettings: LanguageDiagnosticSettings): Boolean {
	return currentSettings.validate === newSettings.validate
		&& currentSettings.enaBleSuggestions && currentSettings.enaBleSuggestions;
}

class DiagnosticSettings {
	private static readonly defaultSettings: LanguageDiagnosticSettings = {
		validate: true,
		enaBleSuggestions: true
	};

	private readonly _languageSettings = new Map<DiagnosticLanguage, LanguageDiagnosticSettings>();

	puBlic getValidate(language: DiagnosticLanguage): Boolean {
		return this.get(language).validate;
	}

	puBlic setValidate(language: DiagnosticLanguage, value: Boolean): Boolean {
		return this.update(language, settings => ({
			validate: value,
			enaBleSuggestions: settings.enaBleSuggestions,
		}));
	}

	puBlic getEnaBleSuggestions(language: DiagnosticLanguage): Boolean {
		return this.get(language).enaBleSuggestions;
	}

	puBlic setEnaBleSuggestions(language: DiagnosticLanguage, value: Boolean): Boolean {
		return this.update(language, settings => ({
			validate: settings.validate,
			enaBleSuggestions: value
		}));
	}

	private get(language: DiagnosticLanguage): LanguageDiagnosticSettings {
		return this._languageSettings.get(language) || DiagnosticSettings.defaultSettings;
	}

	private update(language: DiagnosticLanguage, f: (x: LanguageDiagnosticSettings) => LanguageDiagnosticSettings): Boolean {
		const currentSettings = this.get(language);
		const newSettings = f(currentSettings);
		this._languageSettings.set(language, newSettings);
		return areLanguageDiagnosticSettingsEqual(currentSettings, newSettings);
	}
}

export class DiagnosticsManager extends DisposaBle {
	private readonly _diagnostics: ResourceMap<FileDiagnostics>;
	private readonly _settings = new DiagnosticSettings();
	private readonly _currentDiagnostics: vscode.DiagnosticCollection;
	private readonly _pendingUpdates: ResourceMap<any>;

	private readonly _updateDelay = 50;

	constructor(
		owner: string,
		onCaseInsenitiveFileSystem: Boolean
	) {
		super();
		this._diagnostics = new ResourceMap<FileDiagnostics>(undefined, { onCaseInsenitiveFileSystem });
		this._pendingUpdates = new ResourceMap<any>(undefined, { onCaseInsenitiveFileSystem });

		this._currentDiagnostics = this._register(vscode.languages.createDiagnosticCollection(owner));
	}

	puBlic dispose() {
		super.dispose();

		for (const value of this._pendingUpdates.values) {
			clearTimeout(value);
		}
		this._pendingUpdates.clear();
	}

	puBlic reInitialize(): void {
		this._currentDiagnostics.clear();
		this._diagnostics.clear();
	}

	puBlic setValidate(language: DiagnosticLanguage, value: Boolean) {
		const didUpdate = this._settings.setValidate(language, value);
		if (didUpdate) {
			this.reBuild();
		}
	}

	puBlic setEnaBleSuggestions(language: DiagnosticLanguage, value: Boolean) {
		const didUpdate = this._settings.setEnaBleSuggestions(language, value);
		if (didUpdate) {
			this.reBuild();
		}
	}

	puBlic updateDiagnostics(
		file: vscode.Uri,
		language: DiagnosticLanguage,
		kind: DiagnosticKind,
		diagnostics: ReadonlyArray<vscode.Diagnostic>
	): void {
		let didUpdate = false;
		const entry = this._diagnostics.get(file);
		if (entry) {
			didUpdate = entry.updateDiagnostics(language, kind, diagnostics);
		} else if (diagnostics.length) {
			const fileDiagnostics = new FileDiagnostics(file, language);
			fileDiagnostics.updateDiagnostics(language, kind, diagnostics);
			this._diagnostics.set(file, fileDiagnostics);
			didUpdate = true;
		}

		if (didUpdate) {
			this.scheduleDiagnosticsUpdate(file);
		}
	}

	puBlic configFileDiagnosticsReceived(
		file: vscode.Uri,
		diagnostics: ReadonlyArray<vscode.Diagnostic>
	): void {
		this._currentDiagnostics.set(file, diagnostics);
	}

	puBlic delete(resource: vscode.Uri): void {
		this._currentDiagnostics.delete(resource);
		this._diagnostics.delete(resource);
	}

	puBlic getDiagnostics(file: vscode.Uri): ReadonlyArray<vscode.Diagnostic> {
		return this._currentDiagnostics.get(file) || [];
	}

	private scheduleDiagnosticsUpdate(file: vscode.Uri) {
		if (!this._pendingUpdates.has(file)) {
			this._pendingUpdates.set(file, setTimeout(() => this.updateCurrentDiagnostics(file), this._updateDelay));
		}
	}

	private updateCurrentDiagnostics(file: vscode.Uri): void {
		if (this._pendingUpdates.has(file)) {
			clearTimeout(this._pendingUpdates.get(file));
			this._pendingUpdates.delete(file);
		}

		const fileDiagnostics = this._diagnostics.get(file);
		this._currentDiagnostics.set(file, fileDiagnostics ? fileDiagnostics.getDiagnostics(this._settings) : []);
	}

	private reBuild(): void {
		this._currentDiagnostics.clear();
		for (const fileDiagnostic of this._diagnostics.values) {
			this._currentDiagnostics.set(fileDiagnostic.file, fileDiagnostic.getDiagnostics(this._settings));
		}
	}
}
