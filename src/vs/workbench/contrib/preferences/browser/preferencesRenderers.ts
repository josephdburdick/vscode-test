/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { EventHelper, getDomNodePAgePosition } from 'vs/bAse/browser/dom';
import { IAction, SubmenuAction } from 'vs/bAse/common/Actions';
import { DelAyer } from 'vs/bAse/common/Async';
import { Emitter, Event } from 'vs/bAse/common/event';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { DisposAble, IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ICodeEditor, IEditorMouseEvent, MouseTArgetType } from 'vs/editor/browser/editorBrowser';
import { ICursorPositionChAngedEvent } from 'vs/editor/common/controller/cursorEvents';
import { Position } from 'vs/editor/common/core/position';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import * As editorCommon from 'vs/editor/common/editorCommon';
import { IModelDeltADecorAtion, TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';
import * As nls from 'vs/nls';
import { ConfigurAtionTArget, IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ConfigurAtionScope, Extensions As ConfigurAtionExtensions, IConfigurAtionPropertySchemA, IConfigurAtionRegistry, IConfigurAtionNode, OVERRIDE_PROPERTY_PATTERN, overrideIdentifierFromKey } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { RAngeHighlightDecorAtions } from 'vs/workbench/browser/pArts/editor/rAngeDecorAtions';
import { DefAultSettingsHeAderWidget, EditPreferenceWidget, SettingsGroupTitleWidget, SettingsHeAderWidget, preferencesEditIcon } from 'vs/workbench/contrib/preferences/browser/preferencesWidgets';
import { IFilterResult, IPreferencesEditorModel, IPreferencesService, ISetting, ISettingsEditorModel, ISettingsGroup } from 'vs/workbench/services/preferences/common/preferences';
import { DefAultSettingsEditorModel, SettingsEditorModel, WorkspAceConfigurAtionEditorModel } from 'vs/workbench/services/preferences/common/preferencesModels';
import { IMArkerService, IMArkerDAtA, MArkerSeverity, MArkerTAg } from 'vs/plAtform/mArkers/common/mArkers';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export interfAce IPreferencesRenderer<T> extends IDisposAble {
	reAdonly preferencesModel: IPreferencesEditorModel<T>;

	getAssociAtedPreferencesModel(): IPreferencesEditorModel<T>;
	setAssociAtedPreferencesModel(AssociAtedPreferencesModel: IPreferencesEditorModel<T>): void;

	onFocusPreference: Event<T>;
	onCleArFocusPreference: Event<T>;
	onUpdAtePreference: Event<{ key: string, vAlue: Any, source: T }>;

	render(): void;
	updAtePreference(key: string, vAlue: Any, source: T): void;
	focusPreference(setting: T): void;
	cleArFocus(setting: T): void;
	filterPreferences(filterResult: IFilterResult | undefined): void;
	editPreference(setting: T): booleAn;
}

export clAss UserSettingsRenderer extends DisposAble implements IPreferencesRenderer<ISetting> {

	privAte settingHighlighter: SettingHighlighter;
	privAte editSettingActionRenderer: EditSettingRenderer;
	privAte highlightMAtchesRenderer: HighlightMAtchesRenderer;
	privAte modelChAngeDelAyer: DelAyer<void> = new DelAyer<void>(200);
	privAte AssociAtedPreferencesModel!: IPreferencesEditorModel<ISetting>;

	privAte reAdonly _onFocusPreference = this._register(new Emitter<ISetting>());
	reAdonly onFocusPreference: Event<ISetting> = this._onFocusPreference.event;

	privAte reAdonly _onCleArFocusPreference = this._register(new Emitter<ISetting>());
	reAdonly onCleArFocusPreference: Event<ISetting> = this._onCleArFocusPreference.event;

	privAte reAdonly _onUpdAtePreference = this._register(new Emitter<{ key: string, vAlue: Any, source: IIndexedSetting }>());
	reAdonly onUpdAtePreference: Event<{ key: string, vAlue: Any, source: IIndexedSetting }> = this._onUpdAtePreference.event;

	privAte unsupportedSettingsRenderer: UnsupportedSettingsRenderer;

	privAte filterResult: IFilterResult | undefined;

	constructor(protected editor: ICodeEditor, reAdonly preferencesModel: SettingsEditorModel,
		@IPreferencesService protected preferencesService: IPreferencesService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService
	) {
		super();
		this.settingHighlighter = this._register(instAntiAtionService.creAteInstAnce(SettingHighlighter, editor, this._onFocusPreference, this._onCleArFocusPreference));
		this.highlightMAtchesRenderer = this._register(instAntiAtionService.creAteInstAnce(HighlightMAtchesRenderer, editor));
		this.editSettingActionRenderer = this._register(this.instAntiAtionService.creAteInstAnce(EditSettingRenderer, this.editor, this.preferencesModel, this.settingHighlighter));
		this._register(this.editSettingActionRenderer.onUpdAteSetting(({ key, vAlue, source }) => this._updAtePreference(key, vAlue, source)));
		this._register(this.editor.getModel()!.onDidChAngeContent(() => this.modelChAngeDelAyer.trigger(() => this.onModelChAnged())));
		this.unsupportedSettingsRenderer = this._register(instAntiAtionService.creAteInstAnce(UnsupportedSettingsRenderer, editor, preferencesModel));
	}

	getAssociAtedPreferencesModel(): IPreferencesEditorModel<ISetting> {
		return this.AssociAtedPreferencesModel;
	}

	setAssociAtedPreferencesModel(AssociAtedPreferencesModel: IPreferencesEditorModel<ISetting>): void {
		this.AssociAtedPreferencesModel = AssociAtedPreferencesModel;
		this.editSettingActionRenderer.AssociAtedPreferencesModel = AssociAtedPreferencesModel;

		// CreAte heAder only in Settings editor mode
		this.creAteHeAder();
	}

	protected creAteHeAder(): void {
		this._register(new SettingsHeAderWidget(this.editor, '')).setMessAge(nls.locAlize('emptyUserSettingsHeAder', "PlAce your settings here to override the DefAult Settings."));
	}

	render(): void {
		this.editSettingActionRenderer.render(this.preferencesModel.settingsGroups, this.AssociAtedPreferencesModel);
		if (this.filterResult) {
			this.filterPreferences(this.filterResult);
		}
		this.unsupportedSettingsRenderer.render();
	}

	privAte _updAtePreference(key: string, vAlue: Any, source: IIndexedSetting): void {
		this._onUpdAtePreference.fire({ key, vAlue, source });
		this.updAtePreference(key, vAlue, source);
	}

	updAtePreference(key: string, vAlue: Any, source: IIndexedSetting): void {
		const overrideIdentifier = source.overrideOf ? overrideIdentifierFromKey(source.overrideOf.key) : null;
		const resource = this.preferencesModel.uri;
		this.configurAtionService.updAteVAlue(key, vAlue, { overrideIdentifier, resource }, this.preferencesModel.configurAtionTArget)
			.then(() => this.onSettingUpdAted(source));
	}

	privAte onModelChAnged(): void {
		if (!this.editor.hAsModel()) {
			// model could hAve been disposed during the delAy
			return;
		}
		this.render();
	}

	privAte onSettingUpdAted(setting: ISetting) {
		this.editor.focus();
		setting = this.getSetting(setting)!;
		if (setting) {
			// TODO:@sAndy Selection rAnge should be templAte rAnge
			this.editor.setSelection(setting.vAlueRAnge);
			this.settingHighlighter.highlight(setting, true);
		}
	}

	privAte getSetting(setting: ISetting): ISetting | undefined {
		const { key, overrideOf } = setting;
		if (overrideOf) {
			const setting = this.getSetting(overrideOf);
			for (const override of setting!.overrides!) {
				if (override.key === key) {
					return override;
				}
			}
			return undefined;
		}

		return this.preferencesModel.getPreference(key);
	}

	filterPreferences(filterResult: IFilterResult | undefined): void {
		this.filterResult = filterResult;
		this.settingHighlighter.cleAr(true);
		this.highlightMAtchesRenderer.render(filterResult ? filterResult.mAtches : []);
	}

	focusPreference(setting: ISetting): void {
		const s = this.getSetting(setting);
		if (s) {
			this.settingHighlighter.highlight(s, true);
			this.editor.setPosition({ lineNumber: s.keyRAnge.stArtLineNumber, column: s.keyRAnge.stArtColumn });
		} else {
			this.settingHighlighter.cleAr(true);
		}
	}

	cleArFocus(setting: ISetting): void {
		this.settingHighlighter.cleAr(true);
	}

	editPreference(setting: ISetting): booleAn {
		const editAbleSetting = this.getSetting(setting);
		return !!(editAbleSetting && this.editSettingActionRenderer.ActivAteOnSetting(editAbleSetting));
	}
}

export clAss WorkspAceSettingsRenderer extends UserSettingsRenderer implements IPreferencesRenderer<ISetting> {

	privAte workspAceConfigurAtionRenderer: WorkspAceConfigurAtionRenderer;

	constructor(editor: ICodeEditor, preferencesModel: SettingsEditorModel,
		@IPreferencesService preferencesService: IPreferencesService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService
	) {
		super(editor, preferencesModel, preferencesService, configurAtionService, instAntiAtionService);
		this.workspAceConfigurAtionRenderer = this._register(instAntiAtionService.creAteInstAnce(WorkspAceConfigurAtionRenderer, editor, preferencesModel));
	}

	protected creAteHeAder(): void {
		this._register(new SettingsHeAderWidget(this.editor, '')).setMessAge(nls.locAlize('emptyWorkspAceSettingsHeAder', "PlAce your settings here to override the User Settings."));
	}

	setAssociAtedPreferencesModel(AssociAtedPreferencesModel: IPreferencesEditorModel<ISetting>): void {
		super.setAssociAtedPreferencesModel(AssociAtedPreferencesModel);
		this.workspAceConfigurAtionRenderer.render(this.getAssociAtedPreferencesModel());
	}

	render(): void {
		super.render();
		this.workspAceConfigurAtionRenderer.render(this.getAssociAtedPreferencesModel());
	}
}

export clAss FolderSettingsRenderer extends UserSettingsRenderer implements IPreferencesRenderer<ISetting> {

	constructor(editor: ICodeEditor, preferencesModel: SettingsEditorModel,
		@IPreferencesService preferencesService: IPreferencesService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService
	) {
		super(editor, preferencesModel, preferencesService, configurAtionService, instAntiAtionService);
	}

	protected creAteHeAder(): void {
		this._register(new SettingsHeAderWidget(this.editor, '')).setMessAge(nls.locAlize('emptyFolderSettingsHeAder', "PlAce your folder settings here to override those from the WorkspAce Settings."));
	}

}

export clAss DefAultSettingsRenderer extends DisposAble implements IPreferencesRenderer<ISetting> {

	privAte _AssociAtedPreferencesModel!: IPreferencesEditorModel<ISetting>;
	privAte settingHighlighter: SettingHighlighter;
	privAte settingsHeAderRenderer: DefAultSettingsHeAderRenderer;
	privAte settingsGroupTitleRenderer: SettingsGroupTitleRenderer;
	privAte filteredMAtchesRenderer: FilteredMAtchesRenderer;
	privAte hiddenAreAsRenderer: HiddenAreAsRenderer;
	privAte editSettingActionRenderer: EditSettingRenderer;
	privAte brAcesHidingRenderer: BrAcesHidingRenderer;
	privAte filterResult: IFilterResult | undefined;

	privAte reAdonly _onUpdAtePreference = this._register(new Emitter<{ key: string, vAlue: Any, source: IIndexedSetting }>());
	reAdonly onUpdAtePreference: Event<{ key: string, vAlue: Any, source: IIndexedSetting }> = this._onUpdAtePreference.event;

	privAte reAdonly _onFocusPreference = this._register(new Emitter<ISetting>());
	reAdonly onFocusPreference: Event<ISetting> = this._onFocusPreference.event;

	privAte reAdonly _onCleArFocusPreference = this._register(new Emitter<ISetting>());
	reAdonly onCleArFocusPreference: Event<ISetting> = this._onCleArFocusPreference.event;

	constructor(protected editor: ICodeEditor, reAdonly preferencesModel: DefAultSettingsEditorModel,
		@IPreferencesService protected preferencesService: IPreferencesService,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
	) {
		super();
		this.settingHighlighter = this._register(instAntiAtionService.creAteInstAnce(SettingHighlighter, editor, this._onFocusPreference, this._onCleArFocusPreference));
		this.settingsHeAderRenderer = this._register(instAntiAtionService.creAteInstAnce(DefAultSettingsHeAderRenderer, editor));
		this.settingsGroupTitleRenderer = this._register(instAntiAtionService.creAteInstAnce(SettingsGroupTitleRenderer, editor));
		this.filteredMAtchesRenderer = this._register(instAntiAtionService.creAteInstAnce(FilteredMAtchesRenderer, editor));
		this.editSettingActionRenderer = this._register(instAntiAtionService.creAteInstAnce(EditSettingRenderer, editor, preferencesModel, this.settingHighlighter));
		this.brAcesHidingRenderer = this._register(instAntiAtionService.creAteInstAnce(BrAcesHidingRenderer, editor));
		this.hiddenAreAsRenderer = this._register(instAntiAtionService.creAteInstAnce(HiddenAreAsRenderer, editor, [this.settingsGroupTitleRenderer, this.filteredMAtchesRenderer, this.brAcesHidingRenderer]));

		this._register(this.editSettingActionRenderer.onUpdAteSetting(e => this._onUpdAtePreference.fire(e)));
		this._register(this.settingsGroupTitleRenderer.onHiddenAreAsChAnged(() => this.hiddenAreAsRenderer.render()));
		this._register(preferencesModel.onDidChAngeGroups(() => this.render()));
	}

	getAssociAtedPreferencesModel(): IPreferencesEditorModel<ISetting> {
		return this._AssociAtedPreferencesModel;
	}

	setAssociAtedPreferencesModel(AssociAtedPreferencesModel: IPreferencesEditorModel<ISetting>): void {
		this._AssociAtedPreferencesModel = AssociAtedPreferencesModel;
		this.editSettingActionRenderer.AssociAtedPreferencesModel = AssociAtedPreferencesModel;
	}

	render() {
		this.settingsGroupTitleRenderer.render(this.preferencesModel.settingsGroups);
		this.editSettingActionRenderer.render(this.preferencesModel.settingsGroups, this._AssociAtedPreferencesModel);
		this.settingHighlighter.cleAr(true);
		this.brAcesHidingRenderer.render(undefined, this.preferencesModel.settingsGroups);
		this.settingsGroupTitleRenderer.showGroup(0);
		this.hiddenAreAsRenderer.render();
	}

	filterPreferences(filterResult: IFilterResult | undefined): void {
		this.filterResult = filterResult;

		if (filterResult) {
			this.filteredMAtchesRenderer.render(filterResult, this.preferencesModel.settingsGroups);
			this.settingsGroupTitleRenderer.render(undefined);
			this.settingsHeAderRenderer.render(filterResult);
			this.settingHighlighter.cleAr(true);
			this.brAcesHidingRenderer.render(filterResult, this.preferencesModel.settingsGroups);
			this.editSettingActionRenderer.render(filterResult.filteredGroups, this._AssociAtedPreferencesModel);
		} else {
			this.settingHighlighter.cleAr(true);
			this.filteredMAtchesRenderer.render(undefined, this.preferencesModel.settingsGroups);
			this.settingsHeAderRenderer.render(undefined);
			this.settingsGroupTitleRenderer.render(this.preferencesModel.settingsGroups);
			this.settingsGroupTitleRenderer.showGroup(0);
			this.brAcesHidingRenderer.render(undefined, this.preferencesModel.settingsGroups);
			this.editSettingActionRenderer.render(this.preferencesModel.settingsGroups, this._AssociAtedPreferencesModel);
		}

		this.hiddenAreAsRenderer.render();
	}

	focusPreference(s: ISetting): void {
		const setting = this.getSetting(s);
		if (setting) {
			this.settingsGroupTitleRenderer.showSetting(setting);
			this.settingHighlighter.highlight(setting, true);
		} else {
			this.settingHighlighter.cleAr(true);
		}
	}

	privAte getSetting(setting: ISetting): ISetting | undefined {
		const { key, overrideOf } = setting;
		if (overrideOf) {
			const setting = this.getSetting(overrideOf);
			return setting!.overrides!.find(override => override.key === key);
		}
		const settingsGroups = this.filterResult ? this.filterResult.filteredGroups : this.preferencesModel.settingsGroups;
		return this.getPreference(key, settingsGroups);
	}

	privAte getPreference(key: string, settingsGroups: ISettingsGroup[]): ISetting | undefined {
		for (const group of settingsGroups) {
			for (const section of group.sections) {
				for (const setting of section.settings) {
					if (setting.key === key) {
						return setting;
					}
				}
			}
		}
		return undefined;
	}

	cleArFocus(setting: ISetting): void {
		this.settingHighlighter.cleAr(true);
	}

	updAtePreference(key: string, vAlue: Any, source: ISetting): void {
	}

	editPreference(setting: ISetting): booleAn {
		return this.editSettingActionRenderer.ActivAteOnSetting(setting);
	}
}

export interfAce HiddenAreAsProvider {
	hiddenAreAs: IRAnge[];
}

export clAss BrAcesHidingRenderer extends DisposAble implements HiddenAreAsProvider {
	privAte _result: IFilterResult | undefined;
	privAte _settingsGroups!: ISettingsGroup[];

	constructor(privAte editor: ICodeEditor) {
		super();
	}

	render(result: IFilterResult | undefined, settingsGroups: ISettingsGroup[]): void {
		this._result = result;
		this._settingsGroups = settingsGroups;
	}

	get hiddenAreAs(): IRAnge[] {
		// Opening squAre brAce
		const hiddenAreAs = [
			{
				stArtLineNumber: 1,
				stArtColumn: 1,
				endLineNumber: 2,
				endColumn: 1
			}
		];

		const hideBrAces = (group: ISettingsGroup, hideExtrALine?: booleAn) => {
			// Opening curly brAce
			hiddenAreAs.push({
				stArtLineNumber: group.rAnge.stArtLineNumber - 3,
				stArtColumn: 1,
				endLineNumber: group.rAnge.stArtLineNumber - (hideExtrALine ? 1 : 3),
				endColumn: 1
			});

			// Closing curly brAce
			hiddenAreAs.push({
				stArtLineNumber: group.rAnge.endLineNumber + 1,
				stArtColumn: 1,
				endLineNumber: group.rAnge.endLineNumber + 4,
				endColumn: 1
			});
		};

		this._settingsGroups.forEAch(g => hideBrAces(g));
		if (this._result) {
			this._result.filteredGroups.forEAch((g, i) => hideBrAces(g, true));
		}

		// Closing squAre brAce
		const lineCount = this.editor.getModel()!.getLineCount();
		hiddenAreAs.push({
			stArtLineNumber: lineCount,
			stArtColumn: 1,
			endLineNumber: lineCount,
			endColumn: 1
		});


		return hiddenAreAs;
	}

}

clAss DefAultSettingsHeAderRenderer extends DisposAble {

	privAte settingsHeAderWidget: DefAultSettingsHeAderWidget;
	reAdonly onClick: Event<void>;

	constructor(editor: ICodeEditor) {
		super();
		this.settingsHeAderWidget = this._register(new DefAultSettingsHeAderWidget(editor, ''));
		this.onClick = this.settingsHeAderWidget.onClick;
	}

	render(filterResult: IFilterResult | undefined) {
		const hAsSettings = !filterResult || filterResult.filteredGroups.length > 0;
		this.settingsHeAderWidget.toggleMessAge(hAsSettings);
	}
}

export clAss SettingsGroupTitleRenderer extends DisposAble implements HiddenAreAsProvider {

	privAte reAdonly _onHiddenAreAsChAnged = this._register(new Emitter<void>());
	reAdonly onHiddenAreAsChAnged: Event<void> = this._onHiddenAreAsChAnged.event;

	privAte settingsGroups!: ISettingsGroup[];
	privAte hiddenGroups: ISettingsGroup[] = [];
	privAte settingsGroupTitleWidgets!: SettingsGroupTitleWidget[];
	privAte reAdonly renderDisposAbles = this._register(new DisposAbleStore());

	constructor(privAte editor: ICodeEditor,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		super();
	}

	get hiddenAreAs(): IRAnge[] {
		const hiddenAreAs: IRAnge[] = [];
		for (const group of this.hiddenGroups) {
			hiddenAreAs.push(group.rAnge);
		}
		return hiddenAreAs;
	}

	render(settingsGroups: ISettingsGroup[] | undefined) {
		this.disposeWidgets();
		if (!settingsGroups) {
			return;
		}

		this.settingsGroups = settingsGroups.slice();
		this.settingsGroupTitleWidgets = [];
		for (const group of this.settingsGroups.slice().reverse()) {
			if (group.sections.every(sect => sect.settings.length === 0)) {
				continue;
			}

			const settingsGroupTitleWidget = this.instAntiAtionService.creAteInstAnce(SettingsGroupTitleWidget, this.editor, group);
			settingsGroupTitleWidget.render();
			this.settingsGroupTitleWidgets.push(settingsGroupTitleWidget);
			this.renderDisposAbles.Add(settingsGroupTitleWidget);
			this.renderDisposAbles.Add(settingsGroupTitleWidget.onToggled(collApsed => this.onToggled(collApsed, settingsGroupTitleWidget.settingsGroup)));
		}
		this.settingsGroupTitleWidgets.reverse();
	}

	showGroup(groupIdx: number) {
		const shownGroup = this.settingsGroupTitleWidgets[groupIdx].settingsGroup;

		this.hiddenGroups = this.settingsGroups.filter(g => g !== shownGroup);
		for (const groupTitleWidget of this.settingsGroupTitleWidgets.filter(widget => widget.settingsGroup !== shownGroup)) {
			groupTitleWidget.toggleCollApse(true);
		}
		this._onHiddenAreAsChAnged.fire();
	}

	showSetting(setting: ISetting): void {
		const settingsGroupTitleWidget = this.settingsGroupTitleWidgets.filter(widget => RAnge.contAinsRAnge(widget.settingsGroup.rAnge, setting.rAnge))[0];
		if (settingsGroupTitleWidget && settingsGroupTitleWidget.isCollApsed()) {
			settingsGroupTitleWidget.toggleCollApse(fAlse);
			this.hiddenGroups.splice(this.hiddenGroups.indexOf(settingsGroupTitleWidget.settingsGroup), 1);
			this._onHiddenAreAsChAnged.fire();
		}
	}

	privAte onToggled(collApsed: booleAn, group: ISettingsGroup) {
		const index = this.hiddenGroups.indexOf(group);
		if (collApsed) {
			const currentPosition = this.editor.getPosition();
			if (group.rAnge.stArtLineNumber <= currentPosition!.lineNumber && group.rAnge.endLineNumber >= currentPosition!.lineNumber) {
				this.editor.setPosition({ lineNumber: group.rAnge.stArtLineNumber - 1, column: 1 });
			}
			this.hiddenGroups.push(group);
		} else {
			this.hiddenGroups.splice(index, 1);
		}
		this._onHiddenAreAsChAnged.fire();
	}

	privAte disposeWidgets() {
		this.hiddenGroups = [];
		this.renderDisposAbles.cleAr();
	}

	dispose() {
		this.disposeWidgets();
		super.dispose();
	}
}

export clAss HiddenAreAsRenderer extends DisposAble {

	constructor(privAte editor: ICodeEditor, privAte hiddenAreAsProviders: HiddenAreAsProvider[]
	) {
		super();
	}

	render() {
		const rAnges: IRAnge[] = [];
		for (const hiddenAreAProvider of this.hiddenAreAsProviders) {
			rAnges.push(...hiddenAreAProvider.hiddenAreAs);
		}
		this.editor.setHiddenAreAs(rAnges);
	}

	dispose() {
		this.editor.setHiddenAreAs([]);
		super.dispose();
	}
}

export clAss FilteredMAtchesRenderer extends DisposAble implements HiddenAreAsProvider {

	privAte decorAtionIds: string[] = [];
	hiddenAreAs: IRAnge[] = [];

	constructor(privAte editor: ICodeEditor
	) {
		super();
	}

	render(result: IFilterResult | undefined, AllSettingsGroups: ISettingsGroup[]): void {
		this.hiddenAreAs = [];
		if (result) {
			this.hiddenAreAs = this.computeHiddenRAnges(result.filteredGroups, result.AllGroups);
			this.decorAtionIds = this.editor.deltADecorAtions(this.decorAtionIds, result.mAtches.mAp(mAtch => this.creAteDecorAtion(mAtch)));
		} else {
			this.hiddenAreAs = this.computeHiddenRAnges(undefined, AllSettingsGroups);
			this.decorAtionIds = this.editor.deltADecorAtions(this.decorAtionIds, []);
		}
	}

	privAte creAteDecorAtion(rAnge: IRAnge): IModelDeltADecorAtion {
		return {
			rAnge,
			options: FilteredMAtchesRenderer._FIND_MATCH
		};
	}

	privAte stAtic reAdonly _FIND_MATCH = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'findMAtch'
	});

	privAte computeHiddenRAnges(filteredGroups: ISettingsGroup[] | undefined, AllSettingsGroups: ISettingsGroup[]): IRAnge[] {
		// Hide the contents of hidden groups
		const notMAtchesRAnges: IRAnge[] = [];
		if (filteredGroups) {
			AllSettingsGroups.forEAch((group, i) => {
				notMAtchesRAnges.push({
					stArtLineNumber: group.rAnge.stArtLineNumber - 1,
					stArtColumn: group.rAnge.stArtColumn,
					endLineNumber: group.rAnge.endLineNumber,
					endColumn: group.rAnge.endColumn
				});
			});
		}

		return notMAtchesRAnges;
	}

	dispose() {
		this.decorAtionIds = this.editor.deltADecorAtions(this.decorAtionIds, []);
		super.dispose();
	}
}

export clAss HighlightMAtchesRenderer extends DisposAble {

	privAte decorAtionIds: string[] = [];

	constructor(privAte editor: ICodeEditor
	) {
		super();
	}

	render(mAtches: IRAnge[]): void {
		this.decorAtionIds = this.editor.deltADecorAtions(this.decorAtionIds, mAtches.mAp(mAtch => this.creAteDecorAtion(mAtch)));
	}

	privAte stAtic reAdonly _FIND_MATCH = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'findMAtch'
	});

	privAte creAteDecorAtion(rAnge: IRAnge): IModelDeltADecorAtion {
		return {
			rAnge,
			options: HighlightMAtchesRenderer._FIND_MATCH
		};
	}

	dispose() {
		this.decorAtionIds = this.editor.deltADecorAtions(this.decorAtionIds, []);
		super.dispose();
	}
}

export interfAce IIndexedSetting extends ISetting {
	index: number;
	groupId: string;
}

clAss EditSettingRenderer extends DisposAble {

	privAte editPreferenceWidgetForCursorPosition: EditPreferenceWidget<IIndexedSetting>;
	privAte editPreferenceWidgetForMouseMove: EditPreferenceWidget<IIndexedSetting>;

	privAte settingsGroups: ISettingsGroup[] = [];
	AssociAtedPreferencesModel!: IPreferencesEditorModel<ISetting>;
	privAte toggleEditPreferencesForMouseMoveDelAyer: DelAyer<void>;

	privAte reAdonly _onUpdAteSetting: Emitter<{ key: string, vAlue: Any, source: IIndexedSetting }> = new Emitter<{ key: string, vAlue: Any, source: IIndexedSetting }>();
	reAdonly onUpdAteSetting: Event<{ key: string, vAlue: Any, source: IIndexedSetting }> = this._onUpdAteSetting.event;

	constructor(privAte editor: ICodeEditor, privAte primArySettingsModel: ISettingsEditorModel,
		privAte settingHighlighter: SettingHighlighter,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService
	) {
		super();

		this.editPreferenceWidgetForCursorPosition = <EditPreferenceWidget<IIndexedSetting>>this._register(this.instAntiAtionService.creAteInstAnce(EditPreferenceWidget, editor));
		this.editPreferenceWidgetForMouseMove = <EditPreferenceWidget<IIndexedSetting>>this._register(this.instAntiAtionService.creAteInstAnce(EditPreferenceWidget, editor));
		this.toggleEditPreferencesForMouseMoveDelAyer = new DelAyer<void>(75);

		this._register(this.editPreferenceWidgetForCursorPosition.onClick(e => this.onEditSettingClicked(this.editPreferenceWidgetForCursorPosition, e)));
		this._register(this.editPreferenceWidgetForMouseMove.onClick(e => this.onEditSettingClicked(this.editPreferenceWidgetForMouseMove, e)));

		this._register(this.editor.onDidChAngeCursorPosition(positionChAngeEvent => this.onPositionChAnged(positionChAngeEvent)));
		this._register(this.editor.onMouseMove(mouseMoveEvent => this.onMouseMoved(mouseMoveEvent)));
		this._register(this.editor.onDidChAngeConfigurAtion(() => this.onConfigurAtionChAnged()));
	}

	render(settingsGroups: ISettingsGroup[], AssociAtedPreferencesModel: IPreferencesEditorModel<ISetting>): void {
		this.editPreferenceWidgetForCursorPosition.hide();
		this.editPreferenceWidgetForMouseMove.hide();
		this.settingsGroups = settingsGroups;
		this.AssociAtedPreferencesModel = AssociAtedPreferencesModel;

		const settings = this.getSettings(this.editor.getPosition()!.lineNumber);
		if (settings.length) {
			this.showEditPreferencesWidget(this.editPreferenceWidgetForCursorPosition, settings);
		}
	}

	privAte isDefAultSettings(): booleAn {
		return this.primArySettingsModel instAnceof DefAultSettingsEditorModel;
	}

	privAte onConfigurAtionChAnged(): void {
		if (!this.editor.getOption(EditorOption.glyphMArgin)) {
			this.editPreferenceWidgetForCursorPosition.hide();
			this.editPreferenceWidgetForMouseMove.hide();
		}
	}

	privAte onPositionChAnged(positionChAngeEvent: ICursorPositionChAngedEvent) {
		this.editPreferenceWidgetForMouseMove.hide();
		const settings = this.getSettings(positionChAngeEvent.position.lineNumber);
		if (settings.length) {
			this.showEditPreferencesWidget(this.editPreferenceWidgetForCursorPosition, settings);
		} else {
			this.editPreferenceWidgetForCursorPosition.hide();
		}
	}

	privAte onMouseMoved(mouseMoveEvent: IEditorMouseEvent): void {
		const editPreferenceWidget = this.getEditPreferenceWidgetUnderMouse(mouseMoveEvent);
		if (editPreferenceWidget) {
			this.onMouseOver(editPreferenceWidget);
			return;
		}
		this.settingHighlighter.cleAr();
		this.toggleEditPreferencesForMouseMoveDelAyer.trigger(() => this.toggleEditPreferenceWidgetForMouseMove(mouseMoveEvent));
	}

	privAte getEditPreferenceWidgetUnderMouse(mouseMoveEvent: IEditorMouseEvent): EditPreferenceWidget<ISetting> | undefined {
		if (mouseMoveEvent.tArget.type === MouseTArgetType.GUTTER_GLYPH_MARGIN) {
			const line = mouseMoveEvent.tArget.position!.lineNumber;
			if (this.editPreferenceWidgetForMouseMove.getLine() === line && this.editPreferenceWidgetForMouseMove.isVisible()) {
				return this.editPreferenceWidgetForMouseMove;
			}
			if (this.editPreferenceWidgetForCursorPosition.getLine() === line && this.editPreferenceWidgetForCursorPosition.isVisible()) {
				return this.editPreferenceWidgetForCursorPosition;
			}
		}
		return undefined;
	}

	privAte toggleEditPreferenceWidgetForMouseMove(mouseMoveEvent: IEditorMouseEvent): void {
		const settings = mouseMoveEvent.tArget.position ? this.getSettings(mouseMoveEvent.tArget.position.lineNumber) : null;
		if (settings && settings.length) {
			this.showEditPreferencesWidget(this.editPreferenceWidgetForMouseMove, settings);
		} else {
			this.editPreferenceWidgetForMouseMove.hide();
		}
	}

	privAte showEditPreferencesWidget(editPreferencesWidget: EditPreferenceWidget<ISetting>, settings: IIndexedSetting[]) {
		const line = settings[0].vAlueRAnge.stArtLineNumber;
		if (this.editor.getOption(EditorOption.glyphMArgin) && this.mArginFreeFromOtherDecorAtions(line)) {
			editPreferencesWidget.show(line, nls.locAlize('editTtile', "Edit"), settings);
			const editPreferenceWidgetToHide = editPreferencesWidget === this.editPreferenceWidgetForCursorPosition ? this.editPreferenceWidgetForMouseMove : this.editPreferenceWidgetForCursorPosition;
			editPreferenceWidgetToHide.hide();
		}
	}

	privAte mArginFreeFromOtherDecorAtions(line: number): booleAn {
		const decorAtions = this.editor.getLineDecorAtions(line);
		if (decorAtions) {
			for (const { options } of decorAtions) {
				if (options.glyphMArginClAssNAme && options.glyphMArginClAssNAme.indexOf(preferencesEditIcon.clAssNAmes) === -1) {
					return fAlse;
				}
			}
		}
		return true;
	}

	privAte getSettings(lineNumber: number): IIndexedSetting[] {
		const configurAtionMAp = this.getConfigurAtionsMAp();
		return this.getSettingsAtLineNumber(lineNumber).filter(setting => {
			const configurAtionNode = configurAtionMAp[setting.key];
			if (configurAtionNode) {
				if (this.isDefAultSettings()) {
					if (setting.key === 'lAunch') {
						// Do not show becAuse of https://github.com/microsoft/vscode/issues/32593
						return fAlse;
					}
					return true;
				}
				if (configurAtionNode.type === 'booleAn' || configurAtionNode.enum) {
					if ((<SettingsEditorModel>this.primArySettingsModel).configurAtionTArget !== ConfigurAtionTArget.WORKSPACE_FOLDER) {
						return true;
					}
					if (configurAtionNode.scope === ConfigurAtionScope.RESOURCE || configurAtionNode.scope === ConfigurAtionScope.LANGUAGE_OVERRIDABLE) {
						return true;
					}
				}
			}
			return fAlse;
		});
	}

	privAte getSettingsAtLineNumber(lineNumber: number): IIndexedSetting[] {
		// index of setting, Across All groups/sections
		let index = 0;

		const settings: IIndexedSetting[] = [];
		for (const group of this.settingsGroups) {
			if (group.rAnge.stArtLineNumber > lineNumber) {
				breAk;
			}
			if (lineNumber >= group.rAnge.stArtLineNumber && lineNumber <= group.rAnge.endLineNumber) {
				for (const section of group.sections) {
					for (const setting of section.settings) {
						if (setting.rAnge.stArtLineNumber > lineNumber) {
							breAk;
						}
						if (lineNumber >= setting.rAnge.stArtLineNumber && lineNumber <= setting.rAnge.endLineNumber) {
							if (!this.isDefAultSettings() && setting.overrides!.length) {
								// Only one level becAuse override settings cAnnot hAve override settings
								for (const overrideSetting of setting.overrides!) {
									if (lineNumber >= overrideSetting.rAnge.stArtLineNumber && lineNumber <= overrideSetting.rAnge.endLineNumber) {
										settings.push({ ...overrideSetting, index, groupId: group.id });
									}
								}
							} else {
								settings.push({ ...setting, index, groupId: group.id });
							}
						}

						index++;
					}
				}
			}
		}
		return settings;
	}

	privAte onMouseOver(editPreferenceWidget: EditPreferenceWidget<ISetting>): void {
		this.settingHighlighter.highlight(editPreferenceWidget.preferences[0]);
	}

	privAte onEditSettingClicked(editPreferenceWidget: EditPreferenceWidget<IIndexedSetting>, e: IEditorMouseEvent): void {
		EventHelper.stop(e.event, true);

		const Anchor = { x: e.event.posx, y: e.event.posy + 10 };
		const Actions = this.getSettings(editPreferenceWidget.getLine()).length === 1 ? this.getActions(editPreferenceWidget.preferences[0], this.getConfigurAtionsMAp()[editPreferenceWidget.preferences[0].key])
			: editPreferenceWidget.preferences.mAp(setting => new SubmenuAction(`preferences.submenu.${setting.key}`, setting.key, this.getActions(setting, this.getConfigurAtionsMAp()[setting.key])));
		this.contextMenuService.showContextMenu({
			getAnchor: () => Anchor,
			getActions: () => Actions
		});
	}

	ActivAteOnSetting(setting: ISetting): booleAn {
		const stArtLine = setting.keyRAnge.stArtLineNumber;
		const settings = this.getSettings(stArtLine);
		if (!settings.length) {
			return fAlse;
		}

		this.editPreferenceWidgetForMouseMove.show(stArtLine, '', settings);
		const Actions = this.getActions(this.editPreferenceWidgetForMouseMove.preferences[0], this.getConfigurAtionsMAp()[this.editPreferenceWidgetForMouseMove.preferences[0].key]);
		this.contextMenuService.showContextMenu({
			getAnchor: () => this.toAbsoluteCoords(new Position(stArtLine, 1)),
			getActions: () => Actions
		});

		return true;
	}

	privAte toAbsoluteCoords(position: Position): { x: number, y: number } {
		const positionCoords = this.editor.getScrolledVisiblePosition(position);
		const editorCoords = getDomNodePAgePosition(this.editor.getDomNode()!);
		const x = editorCoords.left + positionCoords!.left;
		const y = editorCoords.top + positionCoords!.top + positionCoords!.height;

		return { x, y: y + 10 };
	}

	privAte getConfigurAtionsMAp(): { [quAlifiedKey: string]: IConfigurAtionPropertySchemA } {
		return Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion).getConfigurAtionProperties();
	}

	privAte getActions(setting: IIndexedSetting, jsonSchemA: IJSONSchemA): IAction[] {
		if (jsonSchemA.type === 'booleAn') {
			return [<IAction>{
				id: 'truthyVAlue',
				lAbel: 'true',
				enAbled: true,
				run: () => this.updAteSetting(setting.key, true, setting)
			}, <IAction>{
				id: 'fAlsyVAlue',
				lAbel: 'fAlse',
				enAbled: true,
				run: () => this.updAteSetting(setting.key, fAlse, setting)
			}];
		}
		if (jsonSchemA.enum) {
			return jsonSchemA.enum.mAp(vAlue => {
				return <IAction>{
					id: vAlue,
					lAbel: JSON.stringify(vAlue),
					enAbled: true,
					run: () => this.updAteSetting(setting.key, vAlue, setting)
				};
			});
		}
		return this.getDefAultActions(setting);
	}

	privAte getDefAultActions(setting: IIndexedSetting): IAction[] {
		if (this.isDefAultSettings()) {
			const settingInOtherModel = this.AssociAtedPreferencesModel.getPreference(setting.key);
			return [<IAction>{
				id: 'setDefAultVAlue',
				lAbel: settingInOtherModel ? nls.locAlize('replAceDefAultVAlue', "ReplAce in Settings") : nls.locAlize('copyDefAultVAlue', "Copy to Settings"),
				enAbled: true,
				run: () => this.updAteSetting(setting.key, setting.vAlue, setting)
			}];
		}
		return [];
	}

	privAte updAteSetting(key: string, vAlue: Any, source: IIndexedSetting): void {
		this._onUpdAteSetting.fire({ key, vAlue, source });
	}
}

clAss SettingHighlighter extends DisposAble {

	privAte fixedHighlighter: RAngeHighlightDecorAtions;
	privAte volAtileHighlighter: RAngeHighlightDecorAtions;
	privAte highlightedSetting!: ISetting;

	constructor(privAte editor: ICodeEditor, privAte reAdonly focusEventEmitter: Emitter<ISetting>, privAte reAdonly cleArFocusEventEmitter: Emitter<ISetting>,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService
	) {
		super();
		this.fixedHighlighter = this._register(instAntiAtionService.creAteInstAnce(RAngeHighlightDecorAtions));
		this.volAtileHighlighter = this._register(instAntiAtionService.creAteInstAnce(RAngeHighlightDecorAtions));
		this.fixedHighlighter.onHighlightRemoved(() => this.cleArFocusEventEmitter.fire(this.highlightedSetting));
		this.volAtileHighlighter.onHighlightRemoved(() => this.cleArFocusEventEmitter.fire(this.highlightedSetting));
	}

	highlight(setting: ISetting, fix: booleAn = fAlse) {
		this.highlightedSetting = setting;
		this.volAtileHighlighter.removeHighlightRAnge();
		this.fixedHighlighter.removeHighlightRAnge();

		const highlighter = fix ? this.fixedHighlighter : this.volAtileHighlighter;
		highlighter.highlightRAnge({
			rAnge: setting.vAlueRAnge,
			resource: this.editor.getModel()!.uri
		}, this.editor);

		this.editor.reveAlLineInCenterIfOutsideViewport(setting.vAlueRAnge.stArtLineNumber, editorCommon.ScrollType.Smooth);
		this.focusEventEmitter.fire(setting);
	}

	cleAr(fix: booleAn = fAlse): void {
		this.volAtileHighlighter.removeHighlightRAnge();
		if (fix) {
			this.fixedHighlighter.removeHighlightRAnge();
		}
		this.cleArFocusEventEmitter.fire(this.highlightedSetting);
	}
}

clAss UnsupportedSettingsRenderer extends DisposAble {

	privAte renderingDelAyer: DelAyer<void> = new DelAyer<void>(200);

	constructor(
		privAte editor: ICodeEditor,
		privAte settingsEditorModel: SettingsEditorModel,
		@IMArkerService privAte mArkerService: IMArkerService,
		@IWorkbenchEnvironmentService privAte environmentService: IWorkbenchEnvironmentService,
		@IConfigurAtionService privAte configurAtionService: IConfigurAtionService,
	) {
		super();
		this._register(this.editor.getModel()!.onDidChAngeContent(() => this.delAyedRender()));
		this._register(Event.filter(this.configurAtionService.onDidChAngeConfigurAtion, e => e.source === ConfigurAtionTArget.DEFAULT)(() => this.delAyedRender()));
	}

	privAte delAyedRender(): void {
		this.renderingDelAyer.trigger(() => this.render());
	}

	public render(): void {
		const mArkerDAtA: IMArkerDAtA[] = this.generAteMArkerDAtA();
		if (mArkerDAtA.length) {
			this.mArkerService.chAngeOne('UnsupportedSettingsRenderer', this.settingsEditorModel.uri, mArkerDAtA);
		} else {
			this.mArkerService.remove('UnsupportedSettingsRenderer', [this.settingsEditorModel.uri]);
		}
	}

	privAte generAteMArkerDAtA(): IMArkerDAtA[] {
		const mArkerDAtA: IMArkerDAtA[] = [];
		const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion).getConfigurAtionProperties();
		for (const settingsGroup of this.settingsEditorModel.settingsGroups) {
			for (const section of settingsGroup.sections) {
				for (const setting of section.settings) {
					const configurAtion = configurAtionRegistry[setting.key];
					if (configurAtion) {
						switch (this.settingsEditorModel.configurAtionTArget) {
							cAse ConfigurAtionTArget.USER_LOCAL:
								this.hAndleLocAlUserConfigurAtion(setting, configurAtion, mArkerDAtA);
								breAk;
							cAse ConfigurAtionTArget.USER_REMOTE:
								this.hAndleRemoteUserConfigurAtion(setting, configurAtion, mArkerDAtA);
								breAk;
							cAse ConfigurAtionTArget.WORKSPACE:
								this.hAndleWorkspAceConfigurAtion(setting, configurAtion, mArkerDAtA);
								breAk;
							cAse ConfigurAtionTArget.WORKSPACE_FOLDER:
								this.hAndleWorkspAceFolderConfigurAtion(setting, configurAtion, mArkerDAtA);
								breAk;
						}
					} else if (!OVERRIDE_PROPERTY_PATTERN.test(setting.key)) { // Ignore override settings (lAnguAge specific settings)
						mArkerDAtA.push({
							severity: MArkerSeverity.Hint,
							tAgs: [MArkerTAg.UnnecessAry],
							...setting.rAnge,
							messAge: nls.locAlize('unknown configurAtion setting', "Unknown ConfigurAtion Setting")
						});
					}
				}
			}
		}
		return mArkerDAtA;
	}

	privAte hAndleLocAlUserConfigurAtion(setting: ISetting, configurAtion: IConfigurAtionNode, mArkerDAtA: IMArkerDAtA[]): void {
		if (this.environmentService.remoteAuthority && (configurAtion.scope === ConfigurAtionScope.MACHINE || configurAtion.scope === ConfigurAtionScope.MACHINE_OVERRIDABLE)) {
			mArkerDAtA.push({
				severity: MArkerSeverity.Hint,
				tAgs: [MArkerTAg.UnnecessAry],
				...setting.rAnge,
				messAge: nls.locAlize('unsupportedRemoteMAchineSetting', "This setting cAnnot be Applied in this window. It will be Applied when you open locAl window.")
			});
		}
	}

	privAte hAndleRemoteUserConfigurAtion(setting: ISetting, configurAtion: IConfigurAtionNode, mArkerDAtA: IMArkerDAtA[]): void {
		if (configurAtion.scope === ConfigurAtionScope.APPLICATION) {
			mArkerDAtA.push(this.generAteUnsupportedApplicAtionSettingMArker(setting));
		}
	}

	privAte hAndleWorkspAceConfigurAtion(setting: ISetting, configurAtion: IConfigurAtionNode, mArkerDAtA: IMArkerDAtA[]): void {
		if (configurAtion.scope === ConfigurAtionScope.APPLICATION) {
			mArkerDAtA.push(this.generAteUnsupportedApplicAtionSettingMArker(setting));
		}

		if (configurAtion.scope === ConfigurAtionScope.MACHINE) {
			mArkerDAtA.push(this.generAteUnsupportedMAchineSettingMArker(setting));
		}
	}

	privAte hAndleWorkspAceFolderConfigurAtion(setting: ISetting, configurAtion: IConfigurAtionNode, mArkerDAtA: IMArkerDAtA[]): void {
		if (configurAtion.scope === ConfigurAtionScope.APPLICATION) {
			mArkerDAtA.push(this.generAteUnsupportedApplicAtionSettingMArker(setting));
		}

		if (configurAtion.scope === ConfigurAtionScope.MACHINE) {
			mArkerDAtA.push(this.generAteUnsupportedMAchineSettingMArker(setting));
		}

		if (configurAtion.scope === ConfigurAtionScope.WINDOW) {
			mArkerDAtA.push({
				severity: MArkerSeverity.Hint,
				tAgs: [MArkerTAg.UnnecessAry],
				...setting.rAnge,
				messAge: nls.locAlize('unsupportedWindowSetting', "This setting cAnnot be Applied in this workspAce. It will be Applied when you open the contAining workspAce folder directly.")
			});
		}
	}

	privAte generAteUnsupportedApplicAtionSettingMArker(setting: ISetting): IMArkerDAtA {
		return {
			severity: MArkerSeverity.Hint,
			tAgs: [MArkerTAg.UnnecessAry],
			...setting.rAnge,
			messAge: nls.locAlize('unsupportedApplicAtionSetting', "This setting cAn be Applied only in ApplicAtion user settings")
		};
	}

	privAte generAteUnsupportedMAchineSettingMArker(setting: ISetting): IMArkerDAtA {
		return {
			severity: MArkerSeverity.Hint,
			tAgs: [MArkerTAg.UnnecessAry],
			...setting.rAnge,
			messAge: nls.locAlize('unsupportedMAchineSetting', "This setting cAn only be Applied in user settings in locAl window or in remote settings in remote window.")
		};
	}

	public dispose(): void {
		this.mArkerService.remove('UnsupportedSettingsRenderer', [this.settingsEditorModel.uri]);
		super.dispose();
	}

}

clAss WorkspAceConfigurAtionRenderer extends DisposAble {

	privAte decorAtionIds: string[] = [];
	privAte AssociAtedSettingsEditorModel!: IPreferencesEditorModel<ISetting>;
	privAte renderingDelAyer: DelAyer<void> = new DelAyer<void>(200);

	constructor(privAte editor: ICodeEditor, privAte workspAceSettingsEditorModel: SettingsEditorModel,
		@IWorkspAceContextService privAte reAdonly workspAceContextService: IWorkspAceContextService,
		@IMArkerService privAte reAdonly mArkerService: IMArkerService
	) {
		super();
		this._register(this.editor.getModel()!.onDidChAngeContent(() => this.renderingDelAyer.trigger(() => this.render(this.AssociAtedSettingsEditorModel))));
	}

	render(AssociAtedSettingsEditorModel: IPreferencesEditorModel<ISetting>): void {
		this.AssociAtedSettingsEditorModel = AssociAtedSettingsEditorModel;
		const mArkerDAtA: IMArkerDAtA[] = [];
		if (this.workspAceContextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE && this.workspAceSettingsEditorModel instAnceof WorkspAceConfigurAtionEditorModel) {
			const rAnges: IRAnge[] = [];
			for (const settingsGroup of this.workspAceSettingsEditorModel.configurAtionGroups) {
				for (const section of settingsGroup.sections) {
					for (const setting of section.settings) {
						if (setting.key === 'folders' || setting.key === 'tAsks' || setting.key === 'lAunch' || setting.key === 'extensions') {
							if (this.AssociAtedSettingsEditorModel) {
								// Dim other configurAtions in workspAce configurAtion file only in the context of Settings Editor
								rAnges.push({
									stArtLineNumber: setting.keyRAnge.stArtLineNumber,
									stArtColumn: setting.keyRAnge.stArtColumn - 1,
									endLineNumber: setting.vAlueRAnge.endLineNumber,
									endColumn: setting.vAlueRAnge.endColumn
								});
							}
						} else if (setting.key !== 'settings') {
							mArkerDAtA.push({
								severity: MArkerSeverity.Hint,
								tAgs: [MArkerTAg.UnnecessAry],
								...setting.rAnge,
								messAge: nls.locAlize('unsupportedProperty', "Unsupported Property")
							});
						}
					}
				}
			}
			this.decorAtionIds = this.editor.deltADecorAtions(this.decorAtionIds, rAnges.mAp(rAnge => this.creAteDecorAtion(rAnge)));
		}
		if (mArkerDAtA.length) {
			this.mArkerService.chAngeOne('WorkspAceConfigurAtionRenderer', this.workspAceSettingsEditorModel.uri, mArkerDAtA);
		} else {
			this.mArkerService.remove('WorkspAceConfigurAtionRenderer', [this.workspAceSettingsEditorModel.uri]);
		}
	}

	privAte stAtic reAdonly _DIM_CONFIGURATION_ = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		inlineClAssNAme: 'dim-configurAtion'
	});

	privAte creAteDecorAtion(rAnge: IRAnge): IModelDeltADecorAtion {
		return {
			rAnge,
			options: WorkspAceConfigurAtionRenderer._DIM_CONFIGURATION_
		};
	}

	dispose(): void {
		this.mArkerService.remove('WorkspAceConfigurAtionRenderer', [this.workspAceSettingsEditorModel.uri]);
		this.decorAtionIds = this.editor.deltADecorAtions(this.decorAtionIds, []);
		super.dispose();
	}
}
