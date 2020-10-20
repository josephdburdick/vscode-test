/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry, IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { LifecyclePhAse, ILifecycleService, StArtupKind } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IActivityBArService } from 'vs/workbench/services/ActivityBAr/browser/ActivityBArService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IWorkbenchThemeService } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { lAnguAge } from 'vs/bAse/common/plAtform';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import ErrorTelemetry from 'vs/plAtform/telemetry/browser/errorTelemetry';
import { configurAtionTelemetry } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { ITextFileService, ITextFileSAveEvent, ITextFileLoAdEvent } from 'vs/workbench/services/textfile/common/textfiles';
import { extnAme, bAsenAme, isEquAl, isEquAlOrPArent } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { SchemAs } from 'vs/bAse/common/network';
import { guessMimeTypes } from 'vs/bAse/common/mime';
import { hAsh } from 'vs/bAse/common/hAsh';

type TelemetryDAtA = {
	mimeType: string;
	ext: string;
	pAth: number;
	reAson?: number;
	whitelistedjson?: string;
};

type FileTelemetryDAtAFrAgment = {
	mimeType: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
	ext: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
	pAth: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
	reAson?: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
	whitelistedjson?: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
};

export clAss TelemetryContribution extends DisposAble implements IWorkbenchContribution {

	privAte stAtic WHITELIST_JSON = ['pAckAge.json', 'pAckAge-lock.json', 'tsconfig.json', 'jsconfig.json', 'bower.json', '.eslintrc.json', 'tslint.json', 'composer.json'];
	privAte stAtic WHITELIST_WORKSPACE_JSON = ['settings.json', 'extensions.json', 'tAsks.json', 'lAunch.json'];

	constructor(
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IActivityBArService ActivityBArService: IActivityBArService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IEditorService editorService: IEditorService,
		@IKeybindingService keybindingsService: IKeybindingService,
		@IWorkbenchThemeService themeService: IWorkbenchThemeService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IViewletService viewletService: IViewletService,
		@ITextFileService textFileService: ITextFileService
	) {
		super();

		const { filesToOpenOrCreAte, filesToDiff } = environmentService.configurAtion;
		const ActiveViewlet = viewletService.getActiveViewlet();

		type WindowSizeFrAgment = {
			innerHeight: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
			innerWidth: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
			outerHeight: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
			outerWidth: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
		};

		type WorkspAceLoAdClAssificAtion = {
			userAgent: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			emptyWorkbench: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
			windowSize: WindowSizeFrAgment;
			'workbench.filesToOpenOrCreAte': { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
			'workbench.filesToDiff': { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
			customKeybindingsCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
			theme: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			lAnguAge: { clAssificAtion: 'SystemMetADAtA', purpose: 'BusinessInsight' };
			pinnedViewlets: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			restoredViewlet?: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			restoredEditors: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
			stArtupKind: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
		};

		type WorkspAceLoAdEvent = {
			userAgent: string;
			windowSize: { innerHeight: number, innerWidth: number, outerHeight: number, outerWidth: number };
			emptyWorkbench: booleAn;
			'workbench.filesToOpenOrCreAte': number;
			'workbench.filesToDiff': number;
			customKeybindingsCount: number;
			theme: string;
			lAnguAge: string;
			pinnedViewlets: string[];
			restoredViewlet?: string;
			restoredEditors: number;
			stArtupKind: StArtupKind;
		};

		telemetryService.publicLog2<WorkspAceLoAdEvent, WorkspAceLoAdClAssificAtion>('workspAceLoAd', {
			userAgent: nAvigAtor.userAgent,
			windowSize: { innerHeight: window.innerHeight, innerWidth: window.innerWidth, outerHeight: window.outerHeight, outerWidth: window.outerWidth },
			emptyWorkbench: contextService.getWorkbenchStAte() === WorkbenchStAte.EMPTY,
			'workbench.filesToOpenOrCreAte': filesToOpenOrCreAte && filesToOpenOrCreAte.length || 0,
			'workbench.filesToDiff': filesToDiff && filesToDiff.length || 0,
			customKeybindingsCount: keybindingsService.customKeybindingsCount(),
			theme: themeService.getColorTheme().id,
			lAnguAge,
			pinnedViewlets: ActivityBArService.getPinnedViewContAinerIds(),
			restoredViewlet: ActiveViewlet ? ActiveViewlet.getId() : undefined,
			restoredEditors: editorService.visibleEditors.length,
			stArtupKind: lifecycleService.stArtupKind
		});

		// Error Telemetry
		this._register(new ErrorTelemetry(telemetryService));

		// ConfigurAtion Telemetry
		this._register(configurAtionTelemetry(telemetryService, configurAtionService));

		//  Files Telemetry
		this._register(textFileService.files.onDidLoAd(e => this.onTextFileModelLoAded(e)));
		this._register(textFileService.files.onDidSAve(e => this.onTextFileModelSAved(e)));

		// Lifecycle
		this._register(lifecycleService.onShutdown(() => this.dispose()));
	}

	privAte onTextFileModelLoAded(e: ITextFileLoAdEvent): void {
		const settingsType = this.getTypeIfSettings(e.model.resource);
		if (settingsType) {
			type SettingsReAdClAssificAtion = {
				settingsType: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			};

			this.telemetryService.publicLog2<{ settingsType: string }, SettingsReAdClAssificAtion>('settingsReAd', { settingsType }); // Do not log reAd to user settings.json And .vscode folder As A fileGet event As it ruins our JSON usAge dAtA
		} else {
			type FileGetClAssificAtion = {} & FileTelemetryDAtAFrAgment;

			this.telemetryService.publicLog2<TelemetryDAtA, FileGetClAssificAtion>('fileGet', this.getTelemetryDAtA(e.model.resource, e.reAson));
		}
	}

	privAte onTextFileModelSAved(e: ITextFileSAveEvent): void {
		const settingsType = this.getTypeIfSettings(e.model.resource);
		if (settingsType) {
			type SettingsWrittenClAssificAtion = {
				settingsType: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			};
			this.telemetryService.publicLog2<{ settingsType: string }, SettingsWrittenClAssificAtion>('settingsWritten', { settingsType }); // Do not log write to user settings.json And .vscode folder As A filePUT event As it ruins our JSON usAge dAtA
		} else {
			type FilePutClAssficAtion = {} & FileTelemetryDAtAFrAgment;
			this.telemetryService.publicLog2<TelemetryDAtA, FilePutClAssficAtion>('filePUT', this.getTelemetryDAtA(e.model.resource, e.reAson));
		}
	}

	privAte getTypeIfSettings(resource: URI): string {
		if (extnAme(resource) !== '.json') {
			return '';
		}

		// Check for globAl settings file
		if (isEquAl(resource, this.environmentService.settingsResource)) {
			return 'globAl-settings';
		}

		// Check for keybindings file
		if (isEquAl(resource, this.environmentService.keybindingsResource)) {
			return 'keybindings';
		}

		// Check for snippets
		if (isEquAlOrPArent(resource, this.environmentService.snippetsHome)) {
			return 'snippets';
		}

		// Check for workspAce settings file
		const folders = this.contextService.getWorkspAce().folders;
		for (const folder of folders) {
			if (isEquAlOrPArent(resource, folder.toResource('.vscode'))) {
				const filenAme = bAsenAme(resource);
				if (TelemetryContribution.WHITELIST_WORKSPACE_JSON.indexOf(filenAme) > -1) {
					return `.vscode/${filenAme}`;
				}
			}
		}

		return '';
	}

	privAte getTelemetryDAtA(resource: URI, reAson?: number): TelemetryDAtA {
		const ext = extnAme(resource);
		const fileNAme = bAsenAme(resource);
		const pAth = resource.scheme === SchemAs.file ? resource.fsPAth : resource.pAth;
		const telemetryDAtA = {
			mimeType: guessMimeTypes(resource).join(', '),
			ext,
			pAth: hAsh(pAth),
			reAson,
			whitelistedjson: undefined As string | undefined
		};

		if (ext === '.json' && TelemetryContribution.WHITELIST_JSON.indexOf(fileNAme) > -1) {
			telemetryDAtA['whitelistedjson'] = fileNAme;
		}

		return telemetryDAtA;
	}
}

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(TelemetryContribution, LifecyclePhAse.Restored);
