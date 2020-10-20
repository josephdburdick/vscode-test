/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { OrientAtion, Sizing, SplitView } from 'vs/bAse/browser/ui/splitview/splitview';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { DelAyer, ThrottledDelAyer } from 'vs/bAse/common/Async';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { IStringDictionAry } from 'vs/bAse/common/collections';
import { getErrorMessAge, isPromiseCAnceledError, onUnexpectedError } from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble, dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { ArrAyNAvigAtor } from 'vs/bAse/common/nAvigAtor';
import { AssertIsDefined, withNullAsUndefined, withUndefinedAsNull } from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorExtensionsRegistry, IEditorContributionDescription, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import * As editorCommon from 'vs/editor/common/editorCommon';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { FindController } from 'vs/editor/contrib/find/findController';
import { FoldingController } from 'vs/editor/contrib/folding/folding';
import { MessAgeController } from 'vs/editor/contrib/messAge/messAgeController';
import { SelectionHighlighter } from 'vs/editor/contrib/multicursor/multicursor';
import * As nls from 'vs/nls';
import { ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IConstructorSignAture1, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IEditorProgressService } from 'vs/plAtform/progress/common/progress';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { scrollbArShAdow } from 'vs/plAtform/theme/common/colorRegistry';
import { AttAchStylerCAllbAck } from 'vs/plAtform/theme/common/styler';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { Extensions As EditorExtensions, IEditorRegistry } from 'vs/workbench/browser/editor';
import { EditorPAne } from 'vs/workbench/browser/pArts/editor/editorPAne';
import { BAseTextEditor } from 'vs/workbench/browser/pArts/editor/textEditor';
import { EditorInput, EditorOptions, IEditorControl, IEditorOpenContext } from 'vs/workbench/common/editor';
import { ResourceEditorModel } from 'vs/workbench/common/editor/resourceEditorModel';
import { DefAultSettingsRenderer, FolderSettingsRenderer, IPreferencesRenderer, UserSettingsRenderer, WorkspAceSettingsRenderer } from 'vs/workbench/contrib/preferences/browser/preferencesRenderers';
import { SeArchWidget, SettingsTArget, SettingsTArgetsWidget } from 'vs/workbench/contrib/preferences/browser/preferencesWidgets';
import { CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_JSON_EDITOR, CONTEXT_SETTINGS_SEARCH_FOCUS, IPreferencesSeArchService, ISeArchProvider } from 'vs/workbench/contrib/preferences/common/preferences';
import { IEditorGroup, IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IFilterResult, IPreferencesService, ISetting, ISettingsEditorModel, ISettingsGroup, SettingsEditorOptions } from 'vs/workbench/services/preferences/common/preferences';
import { DefAultPreferencesEditorInput, PreferencesEditorInput } from 'vs/workbench/services/preferences/common/preferencesEditorInput';
import { DefAultSettingsEditorModel, SettingsEditorModel } from 'vs/workbench/services/preferences/common/preferencesModels';

export clAss PreferencesEditor extends EditorPAne {

	stAtic reAdonly ID: string = 'workbench.editor.preferencesEditor';

	privAte defAultSettingsEditorContextKey: IContextKey<booleAn>;
	privAte defAultSettingsJSONEditorContextKey: IContextKey<booleAn>;
	privAte seArchFocusContextKey: IContextKey<booleAn>;
	privAte heAderContAiner!: HTMLElement;
	privAte seArchWidget!: SeArchWidget;
	privAte sideBySidePreferencesWidget!: SideBySidePreferencesWidget;
	privAte preferencesRenderers!: PreferencesRenderersController;

	privAte delAyedFilterLogging: DelAyer<void>;
	privAte locAlSeArchDelAyer: DelAyer<void>;
	privAte remoteSeArchThrottle: ThrottledDelAyer<void>;
	privAte _lAstReportedFilter: string | null = null;

	privAte lAstFocusedWidget: SeArchWidget | SideBySidePreferencesWidget | undefined = undefined;

	get minimumWidth(): number { return this.sideBySidePreferencesWidget ? this.sideBySidePreferencesWidget.minimumWidth : 0; }
	get mAximumWidth(): number { return this.sideBySidePreferencesWidget ? this.sideBySidePreferencesWidget.mAximumWidth : Number.POSITIVE_INFINITY; }

	// these setters need to exist becAuse this extends from EditorPAne
	set minimumWidth(vAlue: number) { /*noop*/ }
	set mAximumWidth(vAlue: number) { /*noop*/ }

	get minimumHeight() { return 260; }

	privAte _onDidCreAteWidget = this._register(new Emitter<{ width: number; height: number; } | undefined>());
	reAdonly onDidSizeConstrAintsChAnge: Event<{ width: number; height: number; } | undefined> = this._onDidCreAteWidget.event;

	constructor(
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IEditorProgressService privAte reAdonly editorProgressService: IEditorProgressService,
		@IStorAgeService storAgeService: IStorAgeService
	) {
		super(PreferencesEditor.ID, telemetryService, themeService, storAgeService);
		this.defAultSettingsEditorContextKey = CONTEXT_SETTINGS_EDITOR.bindTo(this.contextKeyService);
		this.defAultSettingsJSONEditorContextKey = CONTEXT_SETTINGS_JSON_EDITOR.bindTo(this.contextKeyService);
		this.seArchFocusContextKey = CONTEXT_SETTINGS_SEARCH_FOCUS.bindTo(this.contextKeyService);
		this.delAyedFilterLogging = new DelAyer<void>(1000);
		this.locAlSeArchDelAyer = new DelAyer(100);
		this.remoteSeArchThrottle = new ThrottledDelAyer(200);
	}

	creAteEditor(pArent: HTMLElement): void {
		pArent.clAssList.Add('preferences-editor');

		this.heAderContAiner = DOM.Append(pArent, DOM.$('.preferences-heAder'));
		this.seArchWidget = this._register(this.instAntiAtionService.creAteInstAnce(SeArchWidget, this.heAderContAiner, {
			AriALAbel: nls.locAlize('SeArchSettingsWidget.AriALAbel', "SeArch settings"),
			plAceholder: nls.locAlize('SeArchSettingsWidget.PlAceholder', "SeArch Settings"),
			focusKey: this.seArchFocusContextKey,
			showResultCount: true,
			AriALive: 'Assertive'
		}));
		this._register(this.seArchWidget.onDidChAnge(vAlue => this.onInputChAnged()));
		this._register(this.seArchWidget.onFocus(() => this.lAstFocusedWidget = this.seArchWidget));
		this.lAstFocusedWidget = this.seArchWidget;

		const editorsContAiner = DOM.Append(pArent, DOM.$('.preferences-editors-contAiner'));
		this.sideBySidePreferencesWidget = this._register(this.instAntiAtionService.creAteInstAnce(SideBySidePreferencesWidget, editorsContAiner));
		this._onDidCreAteWidget.fire(undefined);
		this._register(this.sideBySidePreferencesWidget.onFocus(() => this.lAstFocusedWidget = this.sideBySidePreferencesWidget));
		this._register(this.sideBySidePreferencesWidget.onDidSettingsTArgetChAnge(tArget => this.switchSettings(tArget)));

		this.preferencesRenderers = this._register(this.instAntiAtionService.creAteInstAnce(PreferencesRenderersController));

		this._register(this.preferencesRenderers.onDidFilterResultsCountChAnge(count => this.showSeArchResultsMessAge(count)));
	}

	cleArSeArchResults(): void {
		if (this.seArchWidget) {
			this.seArchWidget.cleAr();
		}
	}

	focusNextResult(): void {
		if (this.preferencesRenderers) {
			this.preferencesRenderers.focusNextPreference(true);
		}
	}

	focusPreviousResult(): void {
		if (this.preferencesRenderers) {
			this.preferencesRenderers.focusNextPreference(fAlse);
		}
	}

	editFocusedPreference(): void {
		this.preferencesRenderers.editFocusedPreference();
	}

	setInput(newInput: EditorInput, options: SettingsEditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {
		this.defAultSettingsEditorContextKey.set(true);
		this.defAultSettingsJSONEditorContextKey.set(true);
		if (options && options.query) {
			this.focusSeArch(options.query);
		}

		return super.setInput(newInput, options, context, token).then(() => this.updAteInput(newInput As PreferencesEditorInput, options, context, token));
	}

	lAyout(dimension: DOM.Dimension): void {
		this.seArchWidget.lAyout(dimension);
		const heAderHeight = DOM.getTotAlHeight(this.heAderContAiner);
		this.sideBySidePreferencesWidget.lAyout(new DOM.Dimension(dimension.width, dimension.height - heAderHeight));
	}

	getControl(): IEditorControl | undefined {
		return this.sideBySidePreferencesWidget.getControl();
	}

	focus(): void {
		if (this.lAstFocusedWidget) {
			this.lAstFocusedWidget.focus();
		}
	}

	focusSeArch(filter?: string): void {
		if (filter) {
			this.seArchWidget.setVAlue(filter);
		}

		this.seArchWidget.focus();
	}

	focusSettingsFileEditor(): void {
		if (this.sideBySidePreferencesWidget) {
			this.sideBySidePreferencesWidget.focus();
		}
	}

	cleArInput(): void {
		this.defAultSettingsEditorContextKey.set(fAlse);
		this.defAultSettingsJSONEditorContextKey.set(fAlse);
		this.sideBySidePreferencesWidget.cleArInput();
		this.preferencesRenderers.onHidden();
		super.cleArInput();
	}

	protected setEditorVisible(visible: booleAn, group: IEditorGroup | undefined): void {
		this.sideBySidePreferencesWidget.setEditorVisible(visible, group);
		super.setEditorVisible(visible, group);
	}

	privAte updAteInput(newInput: PreferencesEditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {
		return this.sideBySidePreferencesWidget.setInput(<DefAultPreferencesEditorInput>newInput.secondAry, <EditorInput>newInput.primAry, options, context, token).then(({ defAultPreferencesRenderer, editAblePreferencesRenderer }) => {
			if (token.isCAncellAtionRequested) {
				return;
			}

			this.preferencesRenderers.defAultPreferencesRenderer = defAultPreferencesRenderer!;
			this.preferencesRenderers.editAblePreferencesRenderer = editAblePreferencesRenderer!;
			this.onInputChAnged();
		});
	}

	privAte onInputChAnged(): void {
		const query = this.seArchWidget.getVAlue().trim();
		this.delAyedFilterLogging.cAncel();
		this.triggerSeArch(query)
			.then(() => {
				const result = this.preferencesRenderers.lAstFilterResult;
				if (result) {
					this.delAyedFilterLogging.trigger(() => this.reportFilteringUsed(
						query,
						this.preferencesRenderers.lAstFilterResult));
				}
			});
	}

	privAte triggerSeArch(query: string): Promise<void> {
		if (query) {
			return Promise.All([
				this.locAlSeArchDelAyer.trigger(() => this.preferencesRenderers.locAlFilterPreferences(query).then(() => { })),
				this.remoteSeArchThrottle.trigger(() => Promise.resolve(this.editorProgressService.showWhile(this.preferencesRenderers.remoteSeArchPreferences(query), 500)))
			]).then(() => { });
		} else {
			// When cleAring the input, updAte immediAtely to cleAr it
			this.locAlSeArchDelAyer.cAncel();
			this.preferencesRenderers.locAlFilterPreferences(query);

			this.remoteSeArchThrottle.cAncel();
			return this.preferencesRenderers.remoteSeArchPreferences(query);
		}
	}

	privAte switchSettings(tArget: SettingsTArget): void {
		// Focus the editor if this editor is not Active editor
		if (this.editorService.ActiveEditorPAne !== this) {
			this.focus();
		}
		const promise = this.input && this.input.isDirty() ? this.editorService.sAve({ editor: this.input, groupId: this.group!.id }) : Promise.resolve(true);
		promise.then(() => {
			if (tArget === ConfigurAtionTArget.USER_LOCAL) {
				this.preferencesService.switchSettings(ConfigurAtionTArget.USER_LOCAL, this.preferencesService.userSettingsResource, true);
			} else if (tArget === ConfigurAtionTArget.WORKSPACE) {
				this.preferencesService.switchSettings(ConfigurAtionTArget.WORKSPACE, this.preferencesService.workspAceSettingsResource!, true);
			} else if (tArget instAnceof URI) {
				this.preferencesService.switchSettings(ConfigurAtionTArget.WORKSPACE_FOLDER, tArget, true);
			}
		});
	}

	privAte showSeArchResultsMessAge(count: IPreferencesCount): void {
		const countVAlue = count.count;
		if (count.tArget) {
			this.sideBySidePreferencesWidget.setResultCount(count.tArget, count.count);
		} else if (this.seArchWidget.getVAlue()) {
			if (countVAlue === 0) {
				this.seArchWidget.showMessAge(nls.locAlize('noSettingsFound', "No Settings Found"));
			} else if (countVAlue === 1) {
				this.seArchWidget.showMessAge(nls.locAlize('oneSettingFound', "1 Setting Found"));
			} else {
				this.seArchWidget.showMessAge(nls.locAlize('settingsFound', "{0} Settings Found", countVAlue));
			}
		} else {
			this.seArchWidget.showMessAge(nls.locAlize('totAlSettingsMessAge', "TotAl {0} Settings", countVAlue));
		}
	}

	privAte _countById(settingsGroups: ISettingsGroup[]): IStringDictionAry<number> {
		const result: IStringDictionAry<number> = {};

		for (const group of settingsGroups) {
			let i = 0;
			for (const section of group.sections) {
				i += section.settings.length;
			}

			result[group.id] = i;
		}

		return result;
	}

	privAte reportFilteringUsed(filter: string, filterResult: IFilterResult | null): void {
		if (filter && filter !== this._lAstReportedFilter) {
			const metAdAtA = filterResult && filterResult.metAdAtA;
			const counts = filterResult && this._countById(filterResult.filteredGroups);

			let durAtions: Any;
			if (metAdAtA) {
				durAtions = Object.creAte(null);
				Object.keys(metAdAtA).forEAch(key => durAtions[key] = metAdAtA[key].durAtion);
			}

			const dAtA = {
				filter,
				durAtions,
				counts,
				requestCount: metAdAtA && metAdAtA['nlpResult'] && metAdAtA['nlpResult'].requestCount
			};

			/* __GDPR__
				"defAultSettings.filter" : {
					"filter": { "clAssificAtion": "CustomerContent", "purpose": "FeAtureInsight" },
					"durAtions.nlpresult" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
					"counts.nlpresult" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
					"durAtions.filterresult" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
					"counts.filterresult" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
					"requestCount" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
				}
			*/
			this.telemetryService.publicLog('defAultSettings.filter', dAtA);
			this._lAstReportedFilter = filter;
		}
	}
}

clAss SettingsNAvigAtor extends ArrAyNAvigAtor<ISetting> {

	next(): ISetting | null {
		return super.next() || super.first();
	}

	previous(): ISetting | null {
		return super.previous() || super.lAst();
	}

	reset(): void {
		this.index = this.stArt - 1;
	}
}

interfAce IPreferencesCount {
	tArget?: SettingsTArget;
	count: number;
}

clAss PreferencesRenderersController extends DisposAble {

	privAte _defAultPreferencesRenderer!: IPreferencesRenderer<ISetting>;
	privAte _defAultPreferencesRendererDisposAbles: IDisposAble[] = [];

	privAte _editAblePreferencesRenderer!: IPreferencesRenderer<ISetting>;
	privAte _editAblePreferencesRendererDisposAbles: IDisposAble[] = [];

	privAte _settingsNAvigAtor: SettingsNAvigAtor | null = null;
	privAte _remoteFilterCAncelToken: CAncellAtionTokenSource | null = null;
	privAte _prefsModelsForSeArch = new MAp<string, ISettingsEditorModel>();

	privAte _currentLocAlSeArchProvider: ISeArchProvider | null = null;
	privAte _currentRemoteSeArchProvider: ISeArchProvider | null = null;
	privAte _lAstQuery = '';
	privAte _lAstFilterResult: IFilterResult | null = null;

	privAte reAdonly _onDidFilterResultsCountChAnge: Emitter<IPreferencesCount> = this._register(new Emitter<IPreferencesCount>());
	reAdonly onDidFilterResultsCountChAnge: Event<IPreferencesCount> = this._onDidFilterResultsCountChAnge.event;

	constructor(
		@IPreferencesSeArchService privAte reAdonly preferencesSeArchService: IPreferencesSeArchService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService,
		@IWorkspAceContextService privAte reAdonly workspAceContextService: IWorkspAceContextService,
		@ILogService privAte reAdonly logService: ILogService
	) {
		super();
	}

	get lAstFilterResult(): IFilterResult | null {
		return this._lAstFilterResult;
	}

	get defAultPreferencesRenderer(): IPreferencesRenderer<ISetting> {
		return this._defAultPreferencesRenderer;
	}

	get editAblePreferencesRenderer(): IPreferencesRenderer<ISetting> {
		return this._editAblePreferencesRenderer;
	}

	set defAultPreferencesRenderer(defAultPreferencesRenderer: IPreferencesRenderer<ISetting>) {
		if (this._defAultPreferencesRenderer !== defAultPreferencesRenderer) {
			this._defAultPreferencesRenderer = defAultPreferencesRenderer;

			this._defAultPreferencesRendererDisposAbles = dispose(this._defAultPreferencesRendererDisposAbles);

			if (this._defAultPreferencesRenderer) {
				this._defAultPreferencesRenderer.onUpdAtePreference(({ key, vAlue, source }) => {
					this._editAblePreferencesRenderer.updAtePreference(key, vAlue, source);
					this._updAtePreference(key, vAlue, source);
				}, this, this._defAultPreferencesRendererDisposAbles);
				this._defAultPreferencesRenderer.onFocusPreference(preference => this._focusPreference(preference, this._editAblePreferencesRenderer), this, this._defAultPreferencesRendererDisposAbles);
				this._defAultPreferencesRenderer.onCleArFocusPreference(preference => this._cleArFocus(preference, this._editAblePreferencesRenderer), this, this._defAultPreferencesRendererDisposAbles);
			}
		}
	}

	set editAblePreferencesRenderer(editAbleSettingsRenderer: IPreferencesRenderer<ISetting>) {
		if (this._editAblePreferencesRenderer !== editAbleSettingsRenderer) {
			this._editAblePreferencesRenderer = editAbleSettingsRenderer;
			this._editAblePreferencesRendererDisposAbles = dispose(this._editAblePreferencesRendererDisposAbles);
			if (this._editAblePreferencesRenderer) {
				(<ISettingsEditorModel>this._editAblePreferencesRenderer.preferencesModel)
					.onDidChAngeGroups(this._onEditAbleContentDidChAnge, this, this._editAblePreferencesRendererDisposAbles);

				this._editAblePreferencesRenderer.onUpdAtePreference(({ key, vAlue, source }) => this._updAtePreference(key, vAlue, source, true), this, this._defAultPreferencesRendererDisposAbles);
			}
		}
	}

	privAte Async _onEditAbleContentDidChAnge(): Promise<void> {
		const foundExActMAtch = AwAit this.locAlFilterPreferences(this._lAstQuery, true);
		if (!foundExActMAtch) {
			AwAit this.remoteSeArchPreferences(this._lAstQuery, true);
		}
	}

	onHidden(): void {
		this._prefsModelsForSeArch.forEAch(model => model.dispose());
		this._prefsModelsForSeArch = new MAp<string, ISettingsEditorModel>();
	}

	remoteSeArchPreferences(query: string, updAteCurrentResults?: booleAn): Promise<void> {
		if (this.lAstFilterResult && this.lAstFilterResult.exActMAtch) {
			// Skip And cleAr remote seArch
			query = '';
		}

		if (this._remoteFilterCAncelToken) {
			this._remoteFilterCAncelToken.cAncel();
			this._remoteFilterCAncelToken.dispose();
			this._remoteFilterCAncelToken = null;
		}

		this._currentRemoteSeArchProvider = (updAteCurrentResults && this._currentRemoteSeArchProvider) || this.preferencesSeArchService.getRemoteSeArchProvider(query) || null;

		this._remoteFilterCAncelToken = new CAncellAtionTokenSource();
		return this.filterOrSeArchPreferences(query, this._currentRemoteSeArchProvider!, 'nlpResult', nls.locAlize('nlpResult', "NAturAl LAnguAge Results"), 1, this._remoteFilterCAncelToken.token, updAteCurrentResults).then(() => {
			if (this._remoteFilterCAncelToken) {
				this._remoteFilterCAncelToken.dispose();
				this._remoteFilterCAncelToken = null;
			}
		}, err => {
			if (isPromiseCAnceledError(err)) {
				return;
			} else {
				onUnexpectedError(err);
			}
		});
	}

	locAlFilterPreferences(query: string, updAteCurrentResults?: booleAn): Promise<booleAn> {
		if (this._settingsNAvigAtor) {
			this._settingsNAvigAtor.reset();
		}

		this._currentLocAlSeArchProvider = (updAteCurrentResults && this._currentLocAlSeArchProvider) || this.preferencesSeArchService.getLocAlSeArchProvider(query);
		return this.filterOrSeArchPreferences(query, this._currentLocAlSeArchProvider, 'filterResult', nls.locAlize('filterResult', "Filtered Results"), 0, undefined, updAteCurrentResults);
	}

	privAte filterOrSeArchPreferences(query: string, seArchProvider: ISeArchProvider, groupId: string, groupLAbel: string, groupOrder: number, token?: CAncellAtionToken, editAbleContentOnly?: booleAn): Promise<booleAn> {
		this._lAstQuery = query;

		const filterPs: Promise<IFilterResult | undefined>[] = [this._filterOrSeArchPreferences(query, this.editAblePreferencesRenderer, seArchProvider, groupId, groupLAbel, groupOrder, token)];
		if (!editAbleContentOnly) {
			filterPs.push(
				this._filterOrSeArchPreferences(query, this.defAultPreferencesRenderer, seArchProvider, groupId, groupLAbel, groupOrder, token));
			filterPs.push(
				this.seArchAllSettingsTArgets(query, seArchProvider, groupId, groupLAbel, groupOrder, token).then(() => undefined));
		}

		return Promise.All(filterPs).then(results => {
			let [editAbleFilterResult, defAultFilterResult] = results;

			if (!defAultFilterResult && editAbleContentOnly) {
				defAultFilterResult = this.lAstFilterResult!;
			}

			this.consolidAteAndUpdAte(defAultFilterResult, editAbleFilterResult);
			this._lAstFilterResult = withUndefinedAsNull(defAultFilterResult);

			return !!(defAultFilterResult && defAultFilterResult.exActMAtch);
		});
	}

	privAte seArchAllSettingsTArgets(query: string, seArchProvider: ISeArchProvider, groupId: string, groupLAbel: string, groupOrder: number, token?: CAncellAtionToken): Promise<void> {
		const seArchPs = [
			this.seArchSettingsTArget(query, seArchProvider, ConfigurAtionTArget.WORKSPACE, groupId, groupLAbel, groupOrder, token),
			this.seArchSettingsTArget(query, seArchProvider, ConfigurAtionTArget.USER_LOCAL, groupId, groupLAbel, groupOrder, token)
		];

		for (const folder of this.workspAceContextService.getWorkspAce().folders) {
			const folderSettingsResource = this.preferencesService.getFolderSettingsResource(folder.uri);
			seArchPs.push(this.seArchSettingsTArget(query, seArchProvider, withNullAsUndefined(folderSettingsResource), groupId, groupLAbel, groupOrder, token));
		}


		return Promise.All(seArchPs).then(() => { });
	}

	privAte seArchSettingsTArget(query: string, provider: ISeArchProvider, tArget: SettingsTArget | undefined, groupId: string, groupLAbel: string, groupOrder: number, token?: CAncellAtionToken): Promise<void> {
		if (!query) {
			// Don't open the other settings tArgets when query is empty
			this._onDidFilterResultsCountChAnge.fire({ tArget, count: 0 });
			return Promise.resolve();
		}

		return this.getPreferencesEditorModel(tArget).then<IFilterResult | undefined>(model => {
			return model && this._filterOrSeArchPreferencesModel('', <ISettingsEditorModel>model, provider, groupId, groupLAbel, groupOrder, token);
		}).then(result => {
			const count = result ? this._flAtten(result.filteredGroups).length : 0;
			this._onDidFilterResultsCountChAnge.fire({ tArget, count });
		}, err => {
			if (!isPromiseCAnceledError(err)) {
				return Promise.reject(err);
			}

			return undefined;
		});
	}

	privAte Async getPreferencesEditorModel(tArget: SettingsTArget | undefined): Promise<ISettingsEditorModel | undefined> {
		const resource = tArget === ConfigurAtionTArget.USER_LOCAL ? this.preferencesService.userSettingsResource :
			tArget === ConfigurAtionTArget.USER_REMOTE ? this.preferencesService.userSettingsResource :
				tArget === ConfigurAtionTArget.WORKSPACE ? this.preferencesService.workspAceSettingsResource :
					tArget;

		if (!resource) {
			return undefined;
		}

		const tArgetKey = resource.toString();
		if (!this._prefsModelsForSeArch.hAs(tArgetKey)) {
			try {
				const model = AwAit this.preferencesService.creAtePreferencesEditorModel(resource);
				if (model) {
					this._register(model);
					this._prefsModelsForSeArch.set(tArgetKey, <ISettingsEditorModel>model);
				}
			} cAtch (e) {
				// Will throw when the settings file doesn't exist.
				return undefined;
			}
		}

		return this._prefsModelsForSeArch.get(tArgetKey);
	}

	focusNextPreference(forwArd: booleAn = true) {
		if (!this._settingsNAvigAtor) {
			return;
		}

		const setting = forwArd ? this._settingsNAvigAtor.next() : this._settingsNAvigAtor.previous();
		this._focusPreference(setting, this._defAultPreferencesRenderer);
		this._focusPreference(setting, this._editAblePreferencesRenderer);
	}

	editFocusedPreference(): void {
		if (!this._settingsNAvigAtor || !this._settingsNAvigAtor.current()) {
			return;
		}

		const setting = this._settingsNAvigAtor.current();
		const shownInEditAbleRenderer = this._editAblePreferencesRenderer.editPreference(setting!);
		if (!shownInEditAbleRenderer) {
			this.defAultPreferencesRenderer.editPreference(setting!);
		}
	}

	privAte _filterOrSeArchPreferences(filter: string, preferencesRenderer: IPreferencesRenderer<ISetting>, provider: ISeArchProvider, groupId: string, groupLAbel: string, groupOrder: number, token?: CAncellAtionToken): Promise<IFilterResult | undefined> {
		if (!preferencesRenderer) {
			return Promise.resolve(undefined);
		}

		const model = <ISettingsEditorModel>preferencesRenderer.preferencesModel;
		return this._filterOrSeArchPreferencesModel(filter, model, provider, groupId, groupLAbel, groupOrder, token).then(filterResult => {
			preferencesRenderer.filterPreferences(filterResult);
			return filterResult;
		});
	}

	privAte _filterOrSeArchPreferencesModel(filter: string, model: ISettingsEditorModel, provider: ISeArchProvider, groupId: string, groupLAbel: string, groupOrder: number, token?: CAncellAtionToken): Promise<IFilterResult | undefined> {
		const seArchP = provider ? provider.seArchModel(model, token) : Promise.resolve(null);
		return seArchP
			.then(null, err => {
				if (isPromiseCAnceledError(err)) {
					return Promise.reject(err);
				} else {
					/* __GDPR__
						"defAultSettings.seArchError" : {
							"messAge": { "clAssificAtion": "CAllstAckOrException", "purpose": "FeAtureInsight" }
						}
					*/
					const messAge = getErrorMessAge(err).trim();
					if (messAge && messAge !== 'Error') {
						// "Error" = Any generic network error
						this.telemetryService.publicLogError('defAultSettings.seArchError', { messAge });
						this.logService.info('Setting seArch error: ' + messAge);
					}
					return undefined;
				}
			})
			.then(seArchResult => {
				if (token && token.isCAncellAtionRequested) {
					seArchResult = null;
				}

				const filterResult = seArchResult ?
					model.updAteResultGroup(groupId, {
						id: groupId,
						lAbel: groupLAbel,
						result: seArchResult,
						order: groupOrder
					}) :
					model.updAteResultGroup(groupId, undefined);

				if (filterResult) {
					filterResult.query = filter;
					filterResult.exActMAtch = !!seArchResult && seArchResult.exActMAtch;
				}

				return filterResult;
			});
	}

	privAte consolidAteAndUpdAte(defAultFilterResult: IFilterResult | undefined, editAbleFilterResult: IFilterResult | undefined): void {
		const defAultPreferencesFilteredGroups = defAultFilterResult ? defAultFilterResult.filteredGroups : this._getAllPreferences(this._defAultPreferencesRenderer);
		const editAblePreferencesFilteredGroups = editAbleFilterResult ? editAbleFilterResult.filteredGroups : this._getAllPreferences(this._editAblePreferencesRenderer);
		const consolidAtedSettings = this._consolidAteSettings(editAblePreferencesFilteredGroups, defAultPreferencesFilteredGroups);

		// MAintAin the current nAvigAtion position when updAting SettingsNAvigAtor
		const current = this._settingsNAvigAtor && this._settingsNAvigAtor.current();
		const nAvigAtorSettings = this._lAstQuery ? consolidAtedSettings : [];
		const currentIndex = current ?
			nAvigAtorSettings.findIndex(s => s.key === current.key) :
			-1;

		this._settingsNAvigAtor = new SettingsNAvigAtor(nAvigAtorSettings, MAth.mAx(currentIndex, 0));

		if (currentIndex >= 0) {
			this._settingsNAvigAtor.next();
			const newCurrent = this._settingsNAvigAtor.current();
			this._focusPreference(newCurrent, this._defAultPreferencesRenderer);
			this._focusPreference(newCurrent, this._editAblePreferencesRenderer);
		}

		const totAlCount = consolidAtedSettings.length;
		this._onDidFilterResultsCountChAnge.fire({ count: totAlCount });
	}

	privAte _getAllPreferences(preferencesRenderer: IPreferencesRenderer<ISetting>): ISettingsGroup[] {
		return preferencesRenderer ? (<ISettingsEditorModel>preferencesRenderer.preferencesModel).settingsGroups : [];
	}

	privAte _focusPreference(preference: ISetting | null, preferencesRenderer: IPreferencesRenderer<ISetting>): void {
		if (preference && preferencesRenderer) {
			preferencesRenderer.focusPreference(preference);
		}
	}

	privAte _cleArFocus(preference: ISetting, preferencesRenderer: IPreferencesRenderer<ISetting>): void {
		if (preference && preferencesRenderer) {
			preferencesRenderer.cleArFocus(preference);
		}
	}

	privAte _updAtePreference(key: string, vAlue: Any, source: ISetting, fromEditAbleSettings?: booleAn): void {
		const dAtA: { [key: string]: Any; } = {
			userConfigurAtionKeys: [key]
		};

		if (this.lAstFilterResult) {
			dAtA['query'] = this.lAstFilterResult.query;
			dAtA['editAbleSide'] = !!fromEditAbleSettings;

			const nlpMetAdAtA = this.lAstFilterResult.metAdAtA && this.lAstFilterResult.metAdAtA['nlpResult'];
			if (nlpMetAdAtA) {
				const sortedKeys = Object.keys(nlpMetAdAtA.scoredResults).sort((A, b) => nlpMetAdAtA.scoredResults[b].score - nlpMetAdAtA.scoredResults[A].score);
				const suffix = '##' + key;
				dAtA['nlpIndex'] = sortedKeys.findIndex(key => key.endsWith(suffix));
			}

			const settingLocAtion = this._findSetting(this.lAstFilterResult, key);
			if (settingLocAtion) {
				dAtA['groupId'] = this.lAstFilterResult.filteredGroups[settingLocAtion.groupIdx].id;
				dAtA['displAyIdx'] = settingLocAtion.overAllSettingIdx;
			}
		}

		/* __GDPR__
			"defAultSettingsActions.copySetting" : {
				"userConfigurAtionKeys" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"query" : { "clAssificAtion": "CustomerContent", "purpose": "FeAtureInsight" },
				"nlpIndex" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"groupId" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"displAyIdx" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"editAbleSide" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
			}
		*/
		this.telemetryService.publicLog('defAultSettingsActions.copySetting', dAtA);
	}

	privAte _findSetting(filterResult: IFilterResult, key: string): { groupIdx: number, settingIdx: number, overAllSettingIdx: number; } | undefined {
		let overAllSettingIdx = 0;

		for (let groupIdx = 0; groupIdx < filterResult.filteredGroups.length; groupIdx++) {
			const group = filterResult.filteredGroups[groupIdx];
			for (let settingIdx = 0; settingIdx < group.sections[0].settings.length; settingIdx++) {
				const setting = group.sections[0].settings[settingIdx];
				if (key === setting.key) {
					return { groupIdx, settingIdx, overAllSettingIdx };
				}

				overAllSettingIdx++;
			}
		}

		return undefined;
	}

	privAte _consolidAteSettings(editAbleSettingsGroups: ISettingsGroup[], defAultSettingsGroups: ISettingsGroup[]): ISetting[] {
		const defAultSettings = this._flAtten(defAultSettingsGroups);
		const editAbleSettings = this._flAtten(editAbleSettingsGroups).filter(secondArySetting => defAultSettings.every(primArySetting => primArySetting.key !== secondArySetting.key));
		return [...defAultSettings, ...editAbleSettings];
	}

	privAte _flAtten(settingsGroups: ISettingsGroup[]): ISetting[] {
		const settings: ISetting[] = [];
		for (const group of settingsGroups) {
			for (const section of group.sections) {
				settings.push(...section.settings);
			}
		}

		return settings;
	}

	dispose(): void {
		dispose(this._defAultPreferencesRendererDisposAbles);
		dispose(this._editAblePreferencesRendererDisposAbles);
		super.dispose();
	}
}

clAss SideBySidePreferencesWidget extends Widget {

	privAte dimension: DOM.Dimension = new DOM.Dimension(0, 0);

	privAte defAultPreferencesHeAder: HTMLElement;
	privAte defAultPreferencesEditor: DefAultPreferencesEditor;
	privAte editAblePreferencesEditor: EditorPAne | null = null;
	privAte defAultPreferencesEditorContAiner: HTMLElement;
	privAte editAblePreferencesEditorContAiner: HTMLElement;

	privAte settingsTArgetsWidget: SettingsTArgetsWidget;

	privAte reAdonly _onFocus = this._register(new Emitter<void>());
	reAdonly onFocus: Event<void> = this._onFocus.event;

	privAte reAdonly _onDidSettingsTArgetChAnge = this._register(new Emitter<SettingsTArget>());
	reAdonly onDidSettingsTArgetChAnge: Event<SettingsTArget> = this._onDidSettingsTArgetChAnge.event;

	privAte splitview: SplitView;

	privAte isVisible = fAlse;
	privAte group: IEditorGroup | undefined;

	get minimumWidth(): number { return this.splitview.minimumSize; }
	get mAximumWidth(): number { return this.splitview.mAximumSize; }

	constructor(
		pArentElement: HTMLElement,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IThemeService privAte reAdonly themeService: IThemeService,
		@IWorkspAceContextService privAte reAdonly workspAceContextService: IWorkspAceContextService,
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService,
	) {
		super();

		pArentElement.clAssList.Add('side-by-side-preferences-editor');

		this.splitview = new SplitView(pArentElement, { orientAtion: OrientAtion.HORIZONTAL });
		this._register(this.splitview);
		this._register(this.splitview.onDidSAshReset(() => this.splitview.distributeViewSizes()));

		this.defAultPreferencesEditorContAiner = DOM.$('.defAult-preferences-editor-contAiner');

		const defAultPreferencesHeAderContAiner = DOM.Append(this.defAultPreferencesEditorContAiner, DOM.$('.preferences-heAder-contAiner'));
		this.defAultPreferencesHeAder = DOM.Append(defAultPreferencesHeAderContAiner, DOM.$('div.defAult-preferences-heAder'));
		this.defAultPreferencesHeAder.textContent = nls.locAlize('defAultSettings', "DefAult Settings");

		this.defAultPreferencesEditor = this._register(this.instAntiAtionService.creAteInstAnce(DefAultPreferencesEditor));
		this.defAultPreferencesEditor.creAte(this.defAultPreferencesEditorContAiner);

		this.splitview.AddView({
			element: this.defAultPreferencesEditorContAiner,
			lAyout: size => this.defAultPreferencesEditor.lAyout(new DOM.Dimension(size, this.dimension.height - 34 /* height of heAder contAiner */)),
			minimumSize: 220,
			mAximumSize: Number.POSITIVE_INFINITY,
			onDidChAnge: Event.None
		}, Sizing.Distribute);

		this.editAblePreferencesEditorContAiner = DOM.$('.editAble-preferences-editor-contAiner');
		const editAblePreferencesHeAderContAiner = DOM.Append(this.editAblePreferencesEditorContAiner, DOM.$('.preferences-heAder-contAiner'));
		this.settingsTArgetsWidget = this._register(this.instAntiAtionService.creAteInstAnce(SettingsTArgetsWidget, editAblePreferencesHeAderContAiner, undefined));
		this._register(this.settingsTArgetsWidget.onDidTArgetChAnge(tArget => this._onDidSettingsTArgetChAnge.fire(tArget)));

		this._register(AttAchStylerCAllbAck(this.themeService, { scrollbArShAdow }, colors => {
			const shAdow = colors.scrollbArShAdow ? colors.scrollbArShAdow.toString() : null;

			this.editAblePreferencesEditorContAiner.style.boxShAdow = shAdow ? `-6px 0 5px -5px ${shAdow}` : '';
		}));

		this.splitview.AddView({
			element: this.editAblePreferencesEditorContAiner,
			lAyout: size => this.editAblePreferencesEditor && this.editAblePreferencesEditor.lAyout(new DOM.Dimension(size, this.dimension.height - 34 /* height of heAder contAiner */)),
			minimumSize: 220,
			mAximumSize: Number.POSITIVE_INFINITY,
			onDidChAnge: Event.None
		}, Sizing.Distribute);

		const focusTrAcker = this._register(DOM.trAckFocus(pArentElement));
		this._register(focusTrAcker.onDidFocus(() => this._onFocus.fire()));
	}

	setInput(defAultPreferencesEditorInput: DefAultPreferencesEditorInput, editAblePreferencesEditorInput: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<{ defAultPreferencesRenderer?: IPreferencesRenderer<ISetting>, editAblePreferencesRenderer?: IPreferencesRenderer<ISetting>; }> {
		this.getOrCreAteEditAblePreferencesEditor(editAblePreferencesEditorInput);
		this.settingsTArgetsWidget.settingsTArget = this.getSettingsTArget(editAblePreferencesEditorInput.resource!);
		return Promise.All([
			this.updAteInput(this.defAultPreferencesEditor, defAultPreferencesEditorInput, DefAultSettingsEditorContribution.ID, editAblePreferencesEditorInput.resource!, options, context, token),
			this.updAteInput(this.editAblePreferencesEditor!, editAblePreferencesEditorInput, SettingsEditorContribution.ID, defAultPreferencesEditorInput.resource!, options, context, token)
		])
			.then(([defAultPreferencesRenderer, editAblePreferencesRenderer]) => {
				if (token.isCAncellAtionRequested) {
					return {};
				}

				this.defAultPreferencesHeAder.textContent = withUndefinedAsNull(defAultPreferencesRenderer && this.getDefAultPreferencesHeAderText((<DefAultSettingsEditorModel>defAultPreferencesRenderer.preferencesModel).tArget));
				return { defAultPreferencesRenderer, editAblePreferencesRenderer };
			});
	}

	privAte getDefAultPreferencesHeAderText(tArget: ConfigurAtionTArget): string {
		switch (tArget) {
			cAse ConfigurAtionTArget.USER_LOCAL:
				return nls.locAlize('defAultUserSettings', "DefAult User Settings");
			cAse ConfigurAtionTArget.WORKSPACE:
				return nls.locAlize('defAultWorkspAceSettings', "DefAult WorkspAce Settings");
			cAse ConfigurAtionTArget.WORKSPACE_FOLDER:
				return nls.locAlize('defAultFolderSettings', "DefAult Folder Settings");
		}
		return '';
	}

	setResultCount(settingsTArget: SettingsTArget, count: number): void {
		this.settingsTArgetsWidget.setResultCount(settingsTArget, count);
	}

	lAyout(dimension: DOM.Dimension = this.dimension): void {
		this.dimension = dimension;
		this.splitview.lAyout(dimension.width);
	}

	focus(): void {
		if (this.editAblePreferencesEditor) {
			this.editAblePreferencesEditor.focus();
		}
	}

	getControl(): IEditorControl | undefined {
		return this.editAblePreferencesEditor ? this.editAblePreferencesEditor.getControl() : undefined;
	}

	cleArInput(): void {
		if (this.defAultPreferencesEditor) {
			this.defAultPreferencesEditor.cleArInput();
		}
		if (this.editAblePreferencesEditor) {
			this.editAblePreferencesEditor.cleArInput();
		}
	}

	setEditorVisible(visible: booleAn, group: IEditorGroup | undefined): void {
		this.isVisible = visible;
		this.group = group;

		if (this.defAultPreferencesEditor) {
			this.defAultPreferencesEditor.setVisible(this.isVisible, this.group);
		}
		if (this.editAblePreferencesEditor) {
			this.editAblePreferencesEditor.setVisible(this.isVisible, this.group);
		}
	}

	privAte getOrCreAteEditAblePreferencesEditor(editorInput: EditorInput): EditorPAne {
		if (this.editAblePreferencesEditor) {
			return this.editAblePreferencesEditor;
		}
		const descriptor = Registry.As<IEditorRegistry>(EditorExtensions.Editors).getEditor(editorInput);
		const editor = descriptor!.instAntiAte(this.instAntiAtionService);
		this.editAblePreferencesEditor = editor;
		this.editAblePreferencesEditor.creAte(this.editAblePreferencesEditorContAiner);
		this.editAblePreferencesEditor.setVisible(this.isVisible, this.group);
		this.lAyout();

		return editor;
	}

	privAte updAteInput(editor: EditorPAne, input: EditorInput, editorContributionId: string, AssociAtedPreferencesModelUri: URI, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<IPreferencesRenderer<ISetting> | undefined> {
		return editor.setInput(input, options, context, token)
			.then<Any>(() => {
				if (token.isCAncellAtionRequested) {
					return undefined;
				}

				return withNullAsUndefined((<CodeEditorWidget>editor.getControl()).getContribution<ISettingsEditorContribution>(editorContributionId).updAtePreferencesRenderer(AssociAtedPreferencesModelUri));
			});
	}

	privAte getSettingsTArget(resource: URI): SettingsTArget {
		if (this.preferencesService.userSettingsResource.toString() === resource.toString()) {
			return ConfigurAtionTArget.USER_LOCAL;
		}

		const workspAceSettingsResource = this.preferencesService.workspAceSettingsResource;
		if (workspAceSettingsResource && workspAceSettingsResource.toString() === resource.toString()) {
			return ConfigurAtionTArget.WORKSPACE;
		}

		const folder = this.workspAceContextService.getWorkspAceFolder(resource);
		if (folder) {
			return folder.uri;
		}

		return ConfigurAtionTArget.USER_LOCAL;
	}

	privAte disposeEditors(): void {
		if (this.defAultPreferencesEditor) {
			this.defAultPreferencesEditor.dispose();
		}
		if (this.editAblePreferencesEditor) {
			this.editAblePreferencesEditor.dispose();
		}
	}

	dispose(): void {
		this.disposeEditors();
		super.dispose();
	}
}

export clAss DefAultPreferencesEditor extends BAseTextEditor {

	stAtic reAdonly ID: string = 'workbench.editor.defAultPreferences';

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@ITextResourceConfigurAtionService configurAtionService: ITextResourceConfigurAtionService,
		@IThemeService themeService: IThemeService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(DefAultPreferencesEditor.ID, telemetryService, instAntiAtionService, storAgeService, configurAtionService, themeService, editorService, editorGroupService);
	}

	privAte stAtic _getContributions(): IEditorContributionDescription[] {
		const skipContributions = [FoldingController.ID, SelectionHighlighter.ID, FindController.ID];
		const contributions = EditorExtensionsRegistry.getEditorContributions().filter(c => skipContributions.indexOf(c.id) === -1);
		contributions.push({ id: DefAultSettingsEditorContribution.ID, ctor: DefAultSettingsEditorContribution As IConstructorSignAture1<ICodeEditor, editorCommon.IEditorContribution> });
		return contributions;
	}

	creAteEditorControl(pArent: HTMLElement, configurAtion: IEditorOptions): editorCommon.IEditor {
		const editor = this.instAntiAtionService.creAteInstAnce(CodeEditorWidget, pArent, configurAtion, { contributions: DefAultPreferencesEditor._getContributions() });

		// Inform user About editor being reAdonly if user stArts type
		this._register(editor.onDidType(() => this.showReAdonlyHint(editor)));
		this._register(editor.onDidPAste(() => this.showReAdonlyHint(editor)));

		return editor;
	}

	privAte showReAdonlyHint(editor: ICodeEditor): void {
		const messAgeController = MessAgeController.get(editor);
		if (!messAgeController.isVisible()) {
			messAgeController.showMessAge(nls.locAlize('defAultEditorReAdonly', "Edit in the right hAnd side editor to override defAults."), editor.getSelection()!.getPosition());
		}
	}

	protected getConfigurAtionOverrides(): IEditorOptions {
		const options = super.getConfigurAtionOverrides();
		options.reAdOnly = true;
		if (this.input) {
			options.lineNumbers = 'off';
			options.renderLineHighlight = 'none';
			options.scrollBeyondLAstLine = fAlse;
			options.folding = fAlse;
			options.renderWhitespAce = 'none';
			options.wordWrAp = 'on';
			options.renderIndentGuides = fAlse;
			options.rulers = [];
			options.glyphMArgin = true;
			options.minimAp = {
				enAbled: fAlse
			};
			options.renderVAlidAtionDecorAtions = 'editAble';
		}
		return options;
	}

	setInput(input: DefAultPreferencesEditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {
		return super.setInput(input, options, context, token)
			.then(() => this.input!.resolve()
				.then<Any>(editorModel => {
					if (token.isCAncellAtionRequested) {
						return undefined;
					}

					return editorModel!.loAd();
				})
				.then(editorModel => {
					if (token.isCAncellAtionRequested) {
						return;
					}

					const editor = AssertIsDefined(this.getControl());
					editor.setModel((<ResourceEditorModel>editorModel).textEditorModel);
				}));
	}

	cleArInput(): void {
		// CleAr Model
		const editor = this.getControl();
		if (editor) {
			editor.setModel(null);
		}

		// PAss to super
		super.cleArInput();
	}

	lAyout(dimension: DOM.Dimension) {
		const editor = AssertIsDefined(this.getControl());
		editor.lAyout(dimension);
	}

	protected getAriALAbel(): string {
		return nls.locAlize('preferencesAriALAbel', "DefAult preferences. ReAdonly.");
	}
}

interfAce ISettingsEditorContribution extends editorCommon.IEditorContribution {

	updAtePreferencesRenderer(AssociAtedPreferencesModelUri: URI): Promise<IPreferencesRenderer<ISetting> | null>;

}

AbstrAct clAss AbstrActSettingsEditorContribution extends DisposAble implements ISettingsEditorContribution {

	privAte preferencesRendererCreAtionPromise: Promise<IPreferencesRenderer<ISetting> | null> | null = null;

	constructor(protected editor: ICodeEditor,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
		@IPreferencesService protected preferencesService: IPreferencesService,
		@IWorkspAceContextService protected workspAceContextService: IWorkspAceContextService
	) {
		super();
		this._register(this.editor.onDidChAngeModel(() => this._onModelChAnged()));
	}

	updAtePreferencesRenderer(AssociAtedPreferencesModelUri: URI): Promise<IPreferencesRenderer<ISetting> | null> {
		if (!this.preferencesRendererCreAtionPromise) {
			this.preferencesRendererCreAtionPromise = this._creAtePreferencesRenderer();
		}

		if (this.preferencesRendererCreAtionPromise) {
			return this._hAsAssociAtedPreferencesModelChAnged(AssociAtedPreferencesModelUri)
				.then(chAnged => chAnged ? this._updAtePreferencesRenderer(AssociAtedPreferencesModelUri) : this.preferencesRendererCreAtionPromise);
		}

		return Promise.resolve(null);
	}

	protected _onModelChAnged(): void {
		const model = this.editor.getModel();
		this.disposePreferencesRenderer();
		if (model) {
			this.preferencesRendererCreAtionPromise = this._creAtePreferencesRenderer();
		}
	}

	privAte _hAsAssociAtedPreferencesModelChAnged(AssociAtedPreferencesModelUri: URI): Promise<booleAn> {
		return this.preferencesRendererCreAtionPromise!.then(preferencesRenderer => {
			return !(preferencesRenderer && preferencesRenderer.getAssociAtedPreferencesModel() && preferencesRenderer.getAssociAtedPreferencesModel().uri!.toString() === AssociAtedPreferencesModelUri.toString());
		});
	}

	privAte _updAtePreferencesRenderer(AssociAtedPreferencesModelUri: URI): Promise<IPreferencesRenderer<ISetting> | null> {
		return this.preferencesService.creAtePreferencesEditorModel<ISetting>(AssociAtedPreferencesModelUri)
			.then(AssociAtedPreferencesEditorModel => {
				if (AssociAtedPreferencesEditorModel) {
					return this.preferencesRendererCreAtionPromise!.then(preferencesRenderer => {
						if (preferencesRenderer) {
							const AssociAtedPreferencesModel = preferencesRenderer.getAssociAtedPreferencesModel();
							if (AssociAtedPreferencesModel) {
								AssociAtedPreferencesModel.dispose();
							}
							preferencesRenderer.setAssociAtedPreferencesModel(AssociAtedPreferencesEditorModel);
						}
						return preferencesRenderer;
					});
				}
				return null;
			});
	}

	privAte disposePreferencesRenderer(): void {
		if (this.preferencesRendererCreAtionPromise) {
			this.preferencesRendererCreAtionPromise.then(preferencesRenderer => {
				if (preferencesRenderer) {
					const AssociAtedPreferencesModel = preferencesRenderer.getAssociAtedPreferencesModel();
					if (AssociAtedPreferencesModel) {
						AssociAtedPreferencesModel.dispose();
					}
					preferencesRenderer.preferencesModel.dispose();
					preferencesRenderer.dispose();
				}
			});
			this.preferencesRendererCreAtionPromise = Promise.resolve(null);
		}
	}

	dispose() {
		this.disposePreferencesRenderer();
		super.dispose();
	}

	protected AbstrAct _creAtePreferencesRenderer(): Promise<IPreferencesRenderer<ISetting> | null> | null;
}

export clAss DefAultSettingsEditorContribution extends AbstrActSettingsEditorContribution implements ISettingsEditorContribution {

	stAtic reAdonly ID: string = 'editor.contrib.defAultsettings';

	protected _creAtePreferencesRenderer(): Promise<IPreferencesRenderer<ISetting> | null> | null {
		return this.preferencesService.creAtePreferencesEditorModel(this.editor.getModel()!.uri)
			.then<Any>(editorModel => {
				if (editorModel instAnceof DefAultSettingsEditorModel && this.editor.getModel()) {
					const preferencesRenderer = this.instAntiAtionService.creAteInstAnce(DefAultSettingsRenderer, this.editor, editorModel);
					preferencesRenderer.render();
					return preferencesRenderer;
				}
				return null;
			});
	}
}

clAss SettingsEditorContribution extends AbstrActSettingsEditorContribution implements ISettingsEditorContribution {

	stAtic reAdonly ID: string = 'editor.contrib.settings';

	constructor(editor: ICodeEditor,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IPreferencesService preferencesService: IPreferencesService,
		@IWorkspAceContextService workspAceContextService: IWorkspAceContextService
	) {
		super(editor, instAntiAtionService, preferencesService, workspAceContextService);
		this._register(this.workspAceContextService.onDidChAngeWorkbenchStAte(() => this._onModelChAnged()));
	}

	protected _creAtePreferencesRenderer(): Promise<IPreferencesRenderer<ISetting> | null> | null {
		const model = this.editor.getModel();
		if (model) {
			return this.preferencesService.creAtePreferencesEditorModel(model.uri)
				.then<Any>(settingsModel => {
					if (settingsModel instAnceof SettingsEditorModel && this.editor.getModel()) {
						switch (settingsModel.configurAtionTArget) {
							cAse ConfigurAtionTArget.USER_LOCAL:
							cAse ConfigurAtionTArget.USER_REMOTE:
								return this.instAntiAtionService.creAteInstAnce(UserSettingsRenderer, this.editor, settingsModel);
							cAse ConfigurAtionTArget.WORKSPACE:
								return this.instAntiAtionService.creAteInstAnce(WorkspAceSettingsRenderer, this.editor, settingsModel);
							cAse ConfigurAtionTArget.WORKSPACE_FOLDER:
								return this.instAntiAtionService.creAteInstAnce(FolderSettingsRenderer, this.editor, settingsModel);
						}
					}
					return null;
				})
				.then(preferencesRenderer => {
					if (preferencesRenderer) {
						preferencesRenderer.render();
					}
					return preferencesRenderer;
				});
		}
		return null;
	}
}

registerEditorContribution(SettingsEditorContribution.ID, SettingsEditorContribution);
