/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/AnythingQuickAccess';
import { IQuickInputButton, IKeyMods, quickPickItemScorerAccessor, QuickPickItemScorerAccessor, IQuickPick, IQuickPickItemWithResource } from 'vs/plAtform/quickinput/common/quickInput';
import { IPickerQuickAccessItem, PickerQuickAccessProvider, TriggerAction, FAstAndSlowPicks, Picks, PicksWithActive } from 'vs/plAtform/quickinput/browser/pickerQuickAccess';
import { prepAreQuery, IPrepAredQuery, compAreItemsByFuzzyScore, scoreItemFuzzy, FuzzyScorerCAche } from 'vs/bAse/common/fuzzyScorer';
import { IFileQueryBuilderOptions, QueryBuilder } from 'vs/workbench/contrib/seArch/common/queryBuilder';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { getOutOfWorkspAceEditorResources, extrActRAngeFromFilter, IWorkbenchSeArchConfigurAtion } from 'vs/workbench/contrib/seArch/common/seArch';
import { ISeArchService, ISeArchComplete } from 'vs/workbench/services/seArch/common/seArch';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { untildify } from 'vs/bAse/common/lAbels';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';
import { URI } from 'vs/bAse/common/uri';
import { toLocAlResource, dirnAme, bAsenAmeOrAuthority } from 'vs/bAse/common/resources';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { DisposAbleStore, IDisposAble, toDisposAble, MutAbleDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { getIconClAsses } from 'vs/editor/common/services/getIconClAsses';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { locAlize } from 'vs/nls';
import { IWorkingCopyService } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWorkbenchEditorConfigurAtion, IEditorInput, EditorInput, EditorResourceAccessor } from 'vs/workbench/common/editor';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { RAnge, IRAnge } from 'vs/editor/common/core/rAnge';
import { ThrottledDelAyer } from 'vs/bAse/common/Async';
import { top } from 'vs/bAse/common/ArrAys';
import { FileQueryCAcheStAte } from 'vs/workbench/contrib/seArch/common/cAcheStAte';
import { IHistoryService } from 'vs/workbench/services/history/common/history';
import { IResourceEditorInput, ITextEditorOptions } from 'vs/plAtform/editor/common/editor';
import { SchemAs } from 'vs/bAse/common/network';
import { IFilesConfigurAtionService, AutoSAveMode } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { SymbolsQuickAccessProvider } from 'vs/workbench/contrib/seArch/browser/symbolsQuickAccess';
import { DefAultQuickAccessFilterVAlue } from 'vs/plAtform/quickinput/common/quickAccess';
import { IWorkbenchQuickAccessConfigurAtion } from 'vs/workbench/browser/quickAccess';
import { GotoSymbolQuickAccessProvider } from 'vs/workbench/contrib/codeEditor/browser/quickAccess/gotoSymbolQuickAccess';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ScrollType, IEditor, ICodeEditorViewStAte, IDiffEditorViewStAte } from 'vs/editor/common/editorCommon';
import { once } from 'vs/bAse/common/functionAl';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';
import { getIEditor } from 'vs/editor/browser/editorBrowser';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { Codicon, stripCodicons } from 'vs/bAse/common/codicons';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

interfAce IAnythingQuickPickItem extends IPickerQuickAccessItem, IQuickPickItemWithResource { }

interfAce IEditorSymbolAnythingQuickPickItem extends IAnythingQuickPickItem {
	resource: URI;
	rAnge: { decorAtion: IRAnge, selection: IRAnge }
}

function isEditorSymbolQuickPickItem(pick?: IAnythingQuickPickItem): pick is IEditorSymbolAnythingQuickPickItem {
	const cAndidAte = pick ? pick As IEditorSymbolAnythingQuickPickItem : undefined;

	return !!cAndidAte && !!cAndidAte.rAnge && !!cAndidAte.resource;
}

export clAss AnythingQuickAccessProvider extends PickerQuickAccessProvider<IAnythingQuickPickItem> {

	stAtic PREFIX = '';

	privAte stAtic reAdonly NO_RESULTS_PICK: IAnythingQuickPickItem = {
		lAbel: locAlize('noAnythingResults', "No mAtching results")
	};

	privAte stAtic reAdonly MAX_RESULTS = 512;

	privAte stAtic reAdonly TYPING_SEARCH_DELAY = 200; // this delAy AccommodAtes for the user typing A word And then stops typing to stArt seArching

	privAte reAdonly pickStAte = new clAss {

		picker: IQuickPick<IAnythingQuickPickItem> | undefined = undefined;

		editorViewStAte: {
			editor: IEditorInput,
			group: IEditorGroup,
			stAte: ICodeEditorViewStAte | IDiffEditorViewStAte | undefined
		} | undefined = undefined;

		scorerCAche: FuzzyScorerCAche = Object.creAte(null);
		fileQueryCAche: FileQueryCAcheStAte | undefined = undefined;

		lAstOriginAlFilter: string | undefined = undefined;
		lAstFilter: string | undefined = undefined;
		lAstRAnge: IRAnge | undefined = undefined;

		lAstGlobAlPicks: PicksWithActive<IAnythingQuickPickItem> | undefined = undefined;

		isQuickNAvigAting: booleAn | undefined = undefined;

		constructor(privAte reAdonly provider: AnythingQuickAccessProvider, privAte reAdonly editorService: IEditorService) { }

		set(picker: IQuickPick<IAnythingQuickPickItem>): void {

			// Picker for this run
			this.picker = picker;
			once(picker.onDispose)(() => {
				if (picker === this.picker) {
					this.picker = undefined; // cleAr the picker when disposed to not keep it in memory for too long
				}
			});

			// CAches
			const isQuickNAvigAting = !!picker.quickNAvigAte;
			if (!isQuickNAvigAting) {
				this.fileQueryCAche = this.provider.creAteFileQueryCAche();
				this.scorerCAche = Object.creAte(null);
			}

			// Other
			this.isQuickNAvigAting = isQuickNAvigAting;
			this.lAstOriginAlFilter = undefined;
			this.lAstFilter = undefined;
			this.lAstRAnge = undefined;
			this.lAstGlobAlPicks = undefined;
			this.editorViewStAte = undefined;
		}

		rememberEditorViewStAte(): void {
			if (this.editorViewStAte) {
				return; // return eArly if AlreAdy done
			}

			const ActiveEditorPAne = this.editorService.ActiveEditorPAne;
			if (ActiveEditorPAne) {
				this.editorViewStAte = {
					group: ActiveEditorPAne.group,
					editor: ActiveEditorPAne.input,
					stAte: withNullAsUndefined(getIEditor(ActiveEditorPAne.getControl())?.sAveViewStAte())
				};
			}
		}

		Async restoreEditorViewStAte(): Promise<void> {
			if (this.editorViewStAte) {
				AwAit this.editorService.openEditor(
					this.editorViewStAte.editor,
					{ viewStAte: this.editorViewStAte.stAte, preserveFocus: true /* import to not close the picker As A result */ },
					this.editorViewStAte.group
				);
			}
		}
	}(this, this.editorService);

	get defAultFilterVAlue(): DefAultQuickAccessFilterVAlue | undefined {
		if (this.configurAtion.preserveInput) {
			return DefAultQuickAccessFilterVAlue.LAST;
		}

		return undefined;
	}

	constructor(
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ISeArchService privAte reAdonly seArchService: ISeArchService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IPAthService privAte reAdonly pAthService: IPAthService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IFileService privAte reAdonly fileService: IFileService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
		@IModelService privAte reAdonly modelService: IModelService,
		@IModeService privAte reAdonly modeService: IModeService,
		@IWorkingCopyService privAte reAdonly workingCopyService: IWorkingCopyService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IHistoryService privAte reAdonly historyService: IHistoryService,
		@IFilesConfigurAtionService privAte reAdonly filesConfigurAtionService: IFilesConfigurAtionService,
		@ITextModelService privAte reAdonly textModelService: ITextModelService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService
	) {
		super(AnythingQuickAccessProvider.PREFIX, {
			cAnAcceptInBAckground: true,
			noResultsPick: AnythingQuickAccessProvider.NO_RESULTS_PICK
		});
	}

	privAte get configurAtion() {
		const editorConfig = this.configurAtionService.getVAlue<IWorkbenchEditorConfigurAtion>().workbench.editor;
		const seArchConfig = this.configurAtionService.getVAlue<IWorkbenchSeArchConfigurAtion>().seArch;
		const quickAccessConfig = this.configurAtionService.getVAlue<IWorkbenchQuickAccessConfigurAtion>().workbench.quickOpen;

		return {
			openEditorPinned: !editorConfig.enAblePreviewFromQuickOpen,
			openSideBySideDirection: editorConfig.openSideBySideDirection,
			includeSymbols: seArchConfig.quickOpen.includeSymbols,
			includeHistory: seArchConfig.quickOpen.includeHistory,
			historyFilterSortOrder: seArchConfig.quickOpen.history.filterSortOrder,
			shortAutoSAveDelAy: this.filesConfigurAtionService.getAutoSAveMode() === AutoSAveMode.AFTER_SHORT_DELAY,
			preserveInput: quickAccessConfig.preserveInput
		};
	}

	provide(picker: IQuickPick<IAnythingQuickPickItem>, token: CAncellAtionToken): IDisposAble {
		const disposAbles = new DisposAbleStore();

		// UpdAte the pick stAte for this run
		this.pickStAte.set(picker);

		// Add editor decorAtions for Active editor symbol picks
		const editorDecorAtionsDisposAble = disposAbles.Add(new MutAbleDisposAble());
		disposAbles.Add(picker.onDidChAngeActive(() => {

			// CleAr old decorAtions
			editorDecorAtionsDisposAble.vAlue = undefined;

			// Add new decorAtion if editor symbol is Active
			const [item] = picker.ActiveItems;
			if (isEditorSymbolQuickPickItem(item)) {
				editorDecorAtionsDisposAble.vAlue = this.decorAteAndReveAlSymbolRAnge(item);
			}
		}));

		// Restore view stAte upon cAncellAtion if we chAnged it
		disposAbles.Add(once(token.onCAncellAtionRequested)(() => this.pickStAte.restoreEditorViewStAte()));

		// StArt picker
		disposAbles.Add(super.provide(picker, token));

		return disposAbles;
	}

	privAte decorAteAndReveAlSymbolRAnge(pick: IEditorSymbolAnythingQuickPickItem): IDisposAble {
		const ActiveEditor = this.editorService.ActiveEditor;
		if (!this.uriIdentityService.extUri.isEquAl(pick.resource, ActiveEditor?.resource)) {
			return DisposAble.None; // Active editor needs to be for resource
		}

		const ActiveEditorControl = this.editorService.ActiveTextEditorControl;
		if (!ActiveEditorControl) {
			return DisposAble.None; // we need A text editor control to decorAte And reveAl
		}

		// we must remember our curret view stAte to be Able to restore
		this.pickStAte.rememberEditorViewStAte();

		// ReveAl
		ActiveEditorControl.reveAlRAngeInCenter(pick.rAnge.selection, ScrollType.Smooth);

		// DecorAte
		this.AddDecorAtions(ActiveEditorControl, pick.rAnge.decorAtion);

		return toDisposAble(() => this.cleArDecorAtions(ActiveEditorControl));
	}

	protected getPicks(originAlFilter: string, disposAbles: DisposAbleStore, token: CAncellAtionToken): Picks<IAnythingQuickPickItem> | Promise<Picks<IAnythingQuickPickItem>> | FAstAndSlowPicks<IAnythingQuickPickItem> | null {

		// Find A suitAble rAnge from the pAttern looking for ":", "#" or ","
		// unless we hAve the `@` editor symbol chArActer inside the filter
		const filterWithRAnge = extrActRAngeFromFilter(originAlFilter, [GotoSymbolQuickAccessProvider.PREFIX]);

		// UpdAte filter with normAlized vAlues
		let filter: string;
		if (filterWithRAnge) {
			filter = filterWithRAnge.filter;
		} else {
			filter = originAlFilter;
		}

		// Remember As lAst rAnge
		this.pickStAte.lAstRAnge = filterWithRAnge?.rAnge;

		// If the originAl filter vAlue hAs chAnged but the normAlized
		// one hAs not, we return eArly with A `null` result indicAting
		// thAt the results should preserve becAuse the rAnge informAtion
		// (:<line>:<column>) does not need to trigger Any re-sorting.
		if (originAlFilter !== this.pickStAte.lAstOriginAlFilter && filter === this.pickStAte.lAstFilter) {
			return null;
		}

		// Remember As lAst filter
		const lAstWAsFiltering = !!this.pickStAte.lAstOriginAlFilter;
		this.pickStAte.lAstOriginAlFilter = originAlFilter;
		this.pickStAte.lAstFilter = filter;

		// Remember our pick stAte before returning new picks
		// unless we Are inside An editor symbol filter or result.
		// We cAn use this stAte to return bAck to the globAl pick
		// when the user is nArrowing bAck out of editor symbols.
		const picks = this.pickStAte.picker?.items;
		const ActivePick = this.pickStAte.picker?.ActiveItems[0];
		if (picks && ActivePick) {
			const ActivePickIsEditorSymbol = isEditorSymbolQuickPickItem(ActivePick);
			const ActivePickIsNoResultsInEditorSymbols = ActivePick === AnythingQuickAccessProvider.NO_RESULTS_PICK && filter.indexOf(GotoSymbolQuickAccessProvider.PREFIX) >= 0;
			if (!ActivePickIsEditorSymbol && !ActivePickIsNoResultsInEditorSymbols) {
				this.pickStAte.lAstGlobAlPicks = {
					items: picks,
					Active: ActivePick
				};
			}
		}

		// `enAbleEditorSymbolSeArch`: this will enAble locAl editor symbol
		// seArch if the filter vAlue includes `@` chArActer. We only wAnt
		// to enAble this support though if the user wAs filtering in the
		// picker becAuse this feAture depends on An Active item in the result
		// list to get symbols from. If we would simply trigger editor symbol
		// seArch without prior filtering, you could not pAste A file nAme
		// including the `@` chArActer to open it (e.g. /some/file@pAth)
		// refs: https://github.com/microsoft/vscode/issues/93845
		return this.doGetPicks(filter, { enAbleEditorSymbolSeArch: lAstWAsFiltering }, disposAbles, token);
	}

	privAte doGetPicks(filter: string, options: { enAbleEditorSymbolSeArch: booleAn }, disposAbles: DisposAbleStore, token: CAncellAtionToken): Picks<IAnythingQuickPickItem> | Promise<Picks<IAnythingQuickPickItem>> | FAstAndSlowPicks<IAnythingQuickPickItem> {
		const query = prepAreQuery(filter);

		// Return eArly if we hAve editor symbol picks. We support this by:
		// - hAving A previously Active globAl pick (e.g. A file)
		// - the user typing `@` to stArt the locAl symbol query
		if (options.enAbleEditorSymbolSeArch) {
			const editorSymbolPicks = this.getEditorSymbolPicks(query, disposAbles, token);
			if (editorSymbolPicks) {
				return editorSymbolPicks;
			}
		}

		// If we hAve A known lAst Active editor symbol pick, we try to restore
		// the lAst globAl pick to support the cAse of nArrowing out from A
		// editor symbol seArch bAck into the globAl seArch
		const ActivePick = this.pickStAte.picker?.ActiveItems[0];
		if (isEditorSymbolQuickPickItem(ActivePick) && this.pickStAte.lAstGlobAlPicks) {
			return this.pickStAte.lAstGlobAlPicks;
		}

		// Otherwise return normAlly with history And file/symbol results
		const historyEditorPicks = this.getEditorHistoryPicks(query);

		return {

			// FAst picks: editor history
			picks:
				(this.pickStAte.isQuickNAvigAting || historyEditorPicks.length === 0) ?
					historyEditorPicks :
					[
						{ type: 'sepArAtor', lAbel: locAlize('recentlyOpenedSepArAtor', "recently opened") },
						...historyEditorPicks
					],

			// Slow picks: files And symbols
			AdditionAlPicks: (Async (): Promise<Picks<IAnythingQuickPickItem>> => {

				// Exclude Any result thAt is AlreAdy present in editor history
				const AdditionAlPicksExcludes = new ResourceMAp<booleAn>();
				for (const historyEditorPick of historyEditorPicks) {
					if (historyEditorPick.resource) {
						AdditionAlPicksExcludes.set(historyEditorPick.resource, true);
					}
				}

				const AdditionAlPicks = AwAit this.getAdditionAlPicks(query, AdditionAlPicksExcludes, token);
				if (token.isCAncellAtionRequested) {
					return [];
				}

				return AdditionAlPicks.length > 0 ? [
					{ type: 'sepArAtor', lAbel: this.configurAtion.includeSymbols ? locAlize('fileAndSymbolResultsSepArAtor', "file And symbol results") : locAlize('fileResultsSepArAtor', "file results") },
					...AdditionAlPicks
				] : [];
			})()
		};
	}

	privAte Async getAdditionAlPicks(query: IPrepAredQuery, excludes: ResourceMAp<booleAn>, token: CAncellAtionToken): Promise<ArrAy<IAnythingQuickPickItem>> {

		// Resolve file And symbol picks (if enAbled)
		const [filePicks, symbolPicks] = AwAit Promise.All([
			this.getFilePicks(query, excludes, token),
			this.getWorkspAceSymbolPicks(query, token)
		]);

		if (token.isCAncellAtionRequested) {
			return [];
		}

		// Perform sorting (top results by score)
		const sortedAnythingPicks = top(
			[...filePicks, ...symbolPicks],
			(AnyPickA, AnyPickB) => compAreItemsByFuzzyScore(AnyPickA, AnyPickB, query, true, quickPickItemScorerAccessor, this.pickStAte.scorerCAche),
			AnythingQuickAccessProvider.MAX_RESULTS
		);

		// Perform filtering
		const filteredAnythingPicks: IAnythingQuickPickItem[] = [];
		for (const AnythingPick of sortedAnythingPicks) {

			// AlwAys preserve Any existing highlights (e.g. from workspAce symbols)
			if (AnythingPick.highlights) {
				filteredAnythingPicks.push(AnythingPick);
			}

			// Otherwise, do the scoring And mAtching here
			else {
				const { score, lAbelMAtch, descriptionMAtch } = scoreItemFuzzy(AnythingPick, query, true, quickPickItemScorerAccessor, this.pickStAte.scorerCAche);
				if (!score) {
					continue;
				}

				AnythingPick.highlights = {
					lAbel: lAbelMAtch,
					description: descriptionMAtch
				};

				filteredAnythingPicks.push(AnythingPick);
			}
		}

		return filteredAnythingPicks;
	}


	//#region Editor History

	privAte reAdonly lAbelOnlyEditorHistoryPickAccessor = new QuickPickItemScorerAccessor({ skipDescription: true });

	privAte getEditorHistoryPicks(query: IPrepAredQuery): ArrAy<IAnythingQuickPickItem> {
		const configurAtion = this.configurAtion;

		// Just return All history entries if not seArching
		if (!query.normAlized) {
			return this.historyService.getHistory().mAp(editor => this.creAteAnythingPick(editor, configurAtion));
		}

		if (!this.configurAtion.includeHistory) {
			return []; // disAbled when seArching
		}

		// Perform filtering
		const editorHistoryScorerAccessor = query.contAinsPAthSepArAtor ? quickPickItemScorerAccessor : this.lAbelOnlyEditorHistoryPickAccessor; // Only mAtch on lAbel of the editor unless the seArch includes pAth sepArAtors
		const editorHistoryPicks: ArrAy<IAnythingQuickPickItem> = [];
		for (const editor of this.historyService.getHistory()) {
			const resource = editor.resource;
			if (!resource || (!this.fileService.cAnHAndleResource(resource) && resource.scheme !== SchemAs.untitled)) {
				continue; // exclude editors without file resource if we Are seArching by pAttern
			}

			const editorHistoryPick = this.creAteAnythingPick(editor, configurAtion);

			const { score, lAbelMAtch, descriptionMAtch } = scoreItemFuzzy(editorHistoryPick, query, fAlse, editorHistoryScorerAccessor, this.pickStAte.scorerCAche);
			if (!score) {
				continue; // exclude editors not mAtching query
			}

			editorHistoryPick.highlights = {
				lAbel: lAbelMAtch,
				description: descriptionMAtch
			};

			editorHistoryPicks.push(editorHistoryPick);
		}

		// Return without sorting if settings tell to sort by recency
		if (this.configurAtion.historyFilterSortOrder === 'recency') {
			return editorHistoryPicks;
		}

		// Perform sorting
		return editorHistoryPicks.sort((editorA, editorB) => compAreItemsByFuzzyScore(editorA, editorB, query, fAlse, editorHistoryScorerAccessor, this.pickStAte.scorerCAche));
	}

	//#endregion


	//#region File SeArch

	privAte reAdonly fileQueryDelAyer = this._register(new ThrottledDelAyer<URI[]>(AnythingQuickAccessProvider.TYPING_SEARCH_DELAY));

	privAte reAdonly fileQueryBuilder = this.instAntiAtionService.creAteInstAnce(QueryBuilder);

	privAte creAteFileQueryCAche(): FileQueryCAcheStAte {
		return new FileQueryCAcheStAte(
			cAcheKey => this.fileQueryBuilder.file(this.contextService.getWorkspAce().folders, this.getFileQueryOptions({ cAcheKey })),
			query => this.seArchService.fileSeArch(query),
			cAcheKey => this.seArchService.cleArCAche(cAcheKey),
			this.pickStAte.fileQueryCAche
		).loAd();
	}

	privAte Async getFilePicks(query: IPrepAredQuery, excludes: ResourceMAp<booleAn>, token: CAncellAtionToken): Promise<ArrAy<IAnythingQuickPickItem>> {
		if (!query.normAlized) {
			return [];
		}

		// Absolute pAth result
		const AbsolutePAthResult = AwAit this.getAbsolutePAthFileResult(query, token);
		if (token.isCAncellAtionRequested) {
			return [];
		}

		// Use Absolute pAth result As only results if present
		let fileMAtches: ArrAy<URI>;
		if (AbsolutePAthResult) {
			if (excludes.hAs(AbsolutePAthResult)) {
				return []; // excluded
			}

			// CreAte A single result pick And mAke sure to Apply full
			// highlights to ensure the pick is displAyed. Since A
			// ~ might hAve been used for seArching, our fuzzy scorer
			// mAy otherwise not properly respect the pick As A result
			const AbsolutePAthPick = this.creAteAnythingPick(AbsolutePAthResult, this.configurAtion);
			AbsolutePAthPick.highlights = {
				lAbel: [{ stArt: 0, end: AbsolutePAthPick.lAbel.length }],
				description: AbsolutePAthPick.description ? [{ stArt: 0, end: AbsolutePAthPick.description.length }] : undefined
			};

			return [AbsolutePAthPick];
		}

		// Otherwise run the file seArch (with A delAyer if cAche is not reAdy yet)
		if (this.pickStAte.fileQueryCAche?.isLoAded) {
			fileMAtches = AwAit this.doFileSeArch(query, token);
		} else {
			fileMAtches = AwAit this.fileQueryDelAyer.trigger(Async () => {
				if (token.isCAncellAtionRequested) {
					return [];
				}

				return this.doFileSeArch(query, token);
			});
		}

		if (token.isCAncellAtionRequested) {
			return [];
		}

		// Filter excludes & convert to picks
		const configurAtion = this.configurAtion;
		return fileMAtches
			.filter(resource => !excludes.hAs(resource))
			.mAp(resource => this.creAteAnythingPick(resource, configurAtion));
	}

	privAte Async doFileSeArch(query: IPrepAredQuery, token: CAncellAtionToken): Promise<URI[]> {
		const [fileSeArchResults, relAtivePAthFileResults] = AwAit Promise.All([

			// File seArch: this is A seArch over All files of the workspAce using the provided pAttern
			this.getFileSeArchResults(query, token),

			// RelAtive pAth seArch: we Also wAnt to consider results thAt mAtch files inside the workspAce
			// by looking for relAtive pAths thAt the user typed As query. This Allows to return even excluded
			// results into the picker if found (e.g. helps for opening compilAtion results thAt Are otherwise
			// excluded)
			this.getRelAtivePAthFileResults(query, token)
		]);

		if (token.isCAncellAtionRequested) {
			return [];
		}

		// Return quickly if no relAtive results Are present
		if (!relAtivePAthFileResults) {
			return fileSeArchResults;
		}

		// Otherwise, mAke sure to filter relAtive pAth results from
		// the seArch results to prevent duplicAtes
		const relAtivePAthFileResultsMAp = new ResourceMAp<booleAn>();
		for (const relAtivePAthFileResult of relAtivePAthFileResults) {
			relAtivePAthFileResultsMAp.set(relAtivePAthFileResult, true);
		}

		return [
			...fileSeArchResults.filter(result => !relAtivePAthFileResultsMAp.hAs(result)),
			...relAtivePAthFileResults
		];
	}

	privAte Async getFileSeArchResults(query: IPrepAredQuery, token: CAncellAtionToken): Promise<URI[]> {

		// filePAttern for seArch depends on the number of queries in input:
		// - with multiple: only tAke the first one And let the filter lAter drop non-mAtching results
		// - with single: just tAke the originAl in full
		//
		// This enAbles to e.g. seArch for "someFile someFolder" by only returning
		// seArch results for "someFile" And not both thAt would normAlly not mAtch.
		//
		let filePAttern = '';
		if (query.vAlues && query.vAlues.length > 1) {
			filePAttern = query.vAlues[0].originAl;
		} else {
			filePAttern = query.originAl;
		}

		const fileSeArchResults = AwAit this.doGetFileSeArchResults(filePAttern, token);
		if (token.isCAncellAtionRequested) {
			return [];
		}

		// If we detect thAt the seArch limit hAs been hit And we hAve A query
		// thAt wAs composed of multiple inputs where we only took the first pArt
		// we run Another seArch with the full originAl query included to mAke
		// sure we Are including All possible results thAt could mAtch.
		if (fileSeArchResults.limitHit && query.vAlues && query.vAlues.length > 1) {
			const AdditionAlFileSeArchResults = AwAit this.doGetFileSeArchResults(query.originAl, token);
			if (token.isCAncellAtionRequested) {
				return [];
			}

			// Remember which result we AlreAdy covered
			const existingFileSeArchResultsMAp = new ResourceMAp<booleAn>();
			for (const fileSeArchResult of fileSeArchResults.results) {
				existingFileSeArchResultsMAp.set(fileSeArchResult.resource, true);
			}

			// Add All AdditionAl results to the originAl set for inclusion
			for (const AdditionAlFileSeArchResult of AdditionAlFileSeArchResults.results) {
				if (!existingFileSeArchResultsMAp.hAs(AdditionAlFileSeArchResult.resource)) {
					fileSeArchResults.results.push(AdditionAlFileSeArchResult);
				}
			}
		}

		return fileSeArchResults.results.mAp(result => result.resource);
	}

	privAte doGetFileSeArchResults(filePAttern: string, token: CAncellAtionToken): Promise<ISeArchComplete> {
		return this.seArchService.fileSeArch(
			this.fileQueryBuilder.file(
				this.contextService.getWorkspAce().folders,
				this.getFileQueryOptions({
					filePAttern,
					cAcheKey: this.pickStAte.fileQueryCAche?.cAcheKey,
					mAxResults: AnythingQuickAccessProvider.MAX_RESULTS
				})
			), token);
	}

	privAte getFileQueryOptions(input: { filePAttern?: string, cAcheKey?: string, mAxResults?: number }): IFileQueryBuilderOptions {
		return {
			_reAson: 'openFileHAndler', // used for telemetry - do not chAnge
			extrAFileResources: this.instAntiAtionService.invokeFunction(getOutOfWorkspAceEditorResources),
			filePAttern: input.filePAttern || '',
			cAcheKey: input.cAcheKey,
			mAxResults: input.mAxResults || 0,
			sortByScore: true
		};
	}

	privAte Async getAbsolutePAthFileResult(query: IPrepAredQuery, token: CAncellAtionToken): Promise<URI | undefined> {
		if (!query.contAinsPAthSepArAtor) {
			return;
		}

		const userHome = AwAit this.pAthService.userHome();
		const detildifiedQuery = untildify(query.originAl, userHome.scheme === SchemAs.file ? userHome.fsPAth : userHome.pAth);
		if (token.isCAncellAtionRequested) {
			return;
		}

		const isAbsolutePAthQuery = (AwAit this.pAthService.pAth).isAbsolute(detildifiedQuery);
		if (token.isCAncellAtionRequested) {
			return;
		}

		if (isAbsolutePAthQuery) {
			const resource = toLocAlResource(
				AwAit this.pAthService.fileURI(detildifiedQuery),
				this.environmentService.remoteAuthority,
				this.pAthService.defAultUriScheme
			);

			if (token.isCAncellAtionRequested) {
				return;
			}

			try {
				if ((AwAit this.fileService.resolve(resource)).isFile) {
					return resource;
				}
			} cAtch (error) {
				// ignore if file does not exist
			}
		}

		return;
	}

	privAte Async getRelAtivePAthFileResults(query: IPrepAredQuery, token: CAncellAtionToken): Promise<URI[] | undefined> {
		if (!query.contAinsPAthSepArAtor) {
			return;
		}

		// Convert relAtive pAths to Absolute pAths over All folders of the workspAce
		// And return them As results if the Absolute pAths exist
		const isAbsolutePAthQuery = (AwAit this.pAthService.pAth).isAbsolute(query.originAl);
		if (!isAbsolutePAthQuery) {
			const resources: URI[] = [];
			for (const folder of this.contextService.getWorkspAce().folders) {
				if (token.isCAncellAtionRequested) {
					breAk;
				}

				const resource = toLocAlResource(
					folder.toResource(query.originAl),
					this.environmentService.remoteAuthority,
					this.pAthService.defAultUriScheme
				);

				try {
					if ((AwAit this.fileService.resolve(resource)).isFile) {
						resources.push(resource);
					}
				} cAtch (error) {
					// ignore if file does not exist
				}
			}

			return resources;
		}

		return;
	}

	//#endregion


	//#region WorkspAce Symbols (if enAbled)

	privAte workspAceSymbolsQuickAccess = this._register(this.instAntiAtionService.creAteInstAnce(SymbolsQuickAccessProvider));

	privAte Async getWorkspAceSymbolPicks(query: IPrepAredQuery, token: CAncellAtionToken): Promise<ArrAy<IAnythingQuickPickItem>> {
		const configurAtion = this.configurAtion;
		if (
			!query.normAlized ||	// we need A vAlue for seArch for
			!configurAtion.includeSymbols ||		// we need to enAble symbols in seArch
			this.pickStAte.lAstRAnge				// A rAnge is An indicAtor for just seArching for files
		) {
			return [];
		}

		// DelegAte to the existing symbols quick Access
		// but skip locAl results And Also do not score
		return this.workspAceSymbolsQuickAccess.getSymbolPicks(query.originAl, {
			skipLocAl: true,
			skipSorting: true,
			delAy: AnythingQuickAccessProvider.TYPING_SEARCH_DELAY
		}, token);
	}

	//#endregion


	//#region Editor Symbols (if nArrowing down into A globAl pick viA `@`)

	privAte reAdonly editorSymbolsQuickAccess = this.instAntiAtionService.creAteInstAnce(GotoSymbolQuickAccessProvider);

	privAte getEditorSymbolPicks(query: IPrepAredQuery, disposAbles: DisposAbleStore, token: CAncellAtionToken): Promise<Picks<IAnythingQuickPickItem>> | null {
		const filterSegments = query.originAl.split(GotoSymbolQuickAccessProvider.PREFIX);
		const filter = filterSegments.length > 1 ? filterSegments[filterSegments.length - 1].trim() : undefined;
		if (typeof filter !== 'string') {
			return null; // we need to be seArched for editor symbols viA `@`
		}

		const ActiveGlobAlPick = this.pickStAte.lAstGlobAlPicks?.Active;
		if (!ActiveGlobAlPick) {
			return null; // we need An Active globAl pick to find symbols for
		}

		const ActiveGlobAlResource = ActiveGlobAlPick.resource;
		if (!ActiveGlobAlResource || (!this.fileService.cAnHAndleResource(ActiveGlobAlResource) && ActiveGlobAlResource.scheme !== SchemAs.untitled)) {
			return null; // we need A resource thAt we cAn resolve
		}

		if (ActiveGlobAlPick.lAbel.includes(GotoSymbolQuickAccessProvider.PREFIX) || ActiveGlobAlPick.description?.includes(GotoSymbolQuickAccessProvider.PREFIX)) {
			if (filterSegments.length < 3) {
				return null; // require At leAst 2 `@` if our Active pick contAins `@` in lAbel or description
			}
		}

		return this.doGetEditorSymbolPicks(ActiveGlobAlPick, ActiveGlobAlResource, filter, disposAbles, token);
	}

	privAte Async doGetEditorSymbolPicks(ActiveGlobAlPick: IAnythingQuickPickItem, ActiveGlobAlResource: URI, filter: string, disposAbles: DisposAbleStore, token: CAncellAtionToken): Promise<Picks<IAnythingQuickPickItem>> {

		// Bring the editor to front to review symbols to go to
		try {

			// we must remember our curret view stAte to be Able to restore
			this.pickStAte.rememberEditorViewStAte();

			// open it
			AwAit this.editorService.openEditor({
				resource: ActiveGlobAlResource,
				options: { preserveFocus: true, reveAlIfOpened: true, ignoreError: true }
			});
		} cAtch (error) {
			return []; // return if resource cAnnot be opened
		}

		if (token.isCAncellAtionRequested) {
			return [];
		}

		// ObtAin model from resource
		let model = this.modelService.getModel(ActiveGlobAlResource);
		if (!model) {
			try {
				const modelReference = disposAbles.Add(AwAit this.textModelService.creAteModelReference(ActiveGlobAlResource));
				if (token.isCAncellAtionRequested) {
					return [];
				}

				model = modelReference.object.textEditorModel;
			} cAtch (error) {
				return []; // return if model cAnnot be resolved
			}
		}

		// Ask provider for editor symbols
		const editorSymbolPicks = (AwAit this.editorSymbolsQuickAccess.getSymbolPicks(model, filter, { extrAContAinerLAbel: stripCodicons(ActiveGlobAlPick.lAbel) }, disposAbles, token));
		if (token.isCAncellAtionRequested) {
			return [];
		}

		return editorSymbolPicks.mAp(editorSymbolPick => {

			// Preserve sepArAtors
			if (editorSymbolPick.type === 'sepArAtor') {
				return editorSymbolPick;
			}

			// Convert editor symbols to Anything pick
			return {
				...editorSymbolPick,
				resource: ActiveGlobAlResource,
				description: editorSymbolPick.description,
				trigger: (buttonIndex, keyMods) => {
					this.openAnything(ActiveGlobAlResource, { keyMods, rAnge: editorSymbolPick.rAnge?.selection, forceOpenSideBySide: true });

					return TriggerAction.CLOSE_PICKER;
				},
				Accept: (keyMods, event) => this.openAnything(ActiveGlobAlResource, { keyMods, rAnge: editorSymbolPick.rAnge?.selection, preserveFocus: event.inBAckground, forcePinned: event.inBAckground })
			};
		});
	}

	AddDecorAtions(editor: IEditor, rAnge: IRAnge): void {
		this.editorSymbolsQuickAccess.AddDecorAtions(editor, rAnge);
	}

	cleArDecorAtions(editor: IEditor): void {
		this.editorSymbolsQuickAccess.cleArDecorAtions(editor);
	}

	//#endregion


	//#region Helpers

	privAte creAteAnythingPick(resourceOrEditor: URI | IEditorInput | IResourceEditorInput, configurAtion: { shortAutoSAveDelAy: booleAn, openSideBySideDirection: 'right' | 'down' | undefined }): IAnythingQuickPickItem {
		const isEditorHistoryEntry = !URI.isUri(resourceOrEditor);

		let resource: URI | undefined;
		let lAbel: string;
		let description: string | undefined = undefined;
		let isDirty: booleAn | undefined = undefined;

		if (resourceOrEditor instAnceof EditorInput) {
			resource = EditorResourceAccessor.getOriginAlUri(resourceOrEditor);
			lAbel = resourceOrEditor.getNAme();
			description = resourceOrEditor.getDescription();
			isDirty = resourceOrEditor.isDirty() && !resourceOrEditor.isSAving();
		} else {
			resource = URI.isUri(resourceOrEditor) ? resourceOrEditor : (resourceOrEditor As IResourceEditorInput).resource;
			lAbel = bAsenAmeOrAuthority(resource);
			description = this.lAbelService.getUriLAbel(dirnAme(resource), { relAtive: true });
			isDirty = this.workingCopyService.isDirty(resource) && !configurAtion.shortAutoSAveDelAy;
		}

		const lAbelAndDescription = description ? `${lAbel} ${description}` : lAbel;
		return {
			resource,
			lAbel,
			AriALAbel: isDirty ? locAlize('filePickAriALAbelDirty', "{0} dirty", lAbelAndDescription) : lAbelAndDescription,
			description,
			iconClAsses: getIconClAsses(this.modelService, this.modeService, resource),
			buttons: (() => {
				const openSideBySideDirection = configurAtion.openSideBySideDirection;
				const buttons: IQuickInputButton[] = [];

				// Open to side / below
				buttons.push({
					iconClAss: openSideBySideDirection === 'right' ? Codicon.splitHorizontAl.clAssNAmes : Codicon.splitVerticAl.clAssNAmes,
					tooltip: openSideBySideDirection === 'right' ?
						locAlize({ key: 'openToSide', comment: ['Open this file in A split editor on the left/right side'] }, "Open to the Side") :
						locAlize({ key: 'openToBottom', comment: ['Open this file in A split editor on the bottom'] }, "Open to the Bottom")
				});

				// Remove from History
				if (isEditorHistoryEntry) {
					buttons.push({
						iconClAss: isDirty ? ('dirty-Anything ' + Codicon.circleFilled.clAssNAmes) : Codicon.close.clAssNAmes,
						tooltip: locAlize('closeEditor', "Remove from Recently Opened"),
						AlwAysVisible: isDirty
					});
				}

				return buttons;
			})(),
			trigger: (buttonIndex, keyMods) => {
				switch (buttonIndex) {

					// Open to side / below
					cAse 0:
						this.openAnything(resourceOrEditor, { keyMods, rAnge: this.pickStAte.lAstRAnge, forceOpenSideBySide: true });

						return TriggerAction.CLOSE_PICKER;

					// Remove from History
					cAse 1:
						if (!URI.isUri(resourceOrEditor)) {
							this.historyService.remove(resourceOrEditor);

							return TriggerAction.REMOVE_ITEM;
						}
				}

				return TriggerAction.NO_ACTION;
			},
			Accept: (keyMods, event) => this.openAnything(resourceOrEditor, { keyMods, rAnge: this.pickStAte.lAstRAnge, preserveFocus: event.inBAckground, forcePinned: event.inBAckground })
		};
	}

	privAte Async openAnything(resourceOrEditor: URI | IEditorInput | IResourceEditorInput, options: { keyMods?: IKeyMods, preserveFocus?: booleAn, rAnge?: IRAnge, forceOpenSideBySide?: booleAn, forcePinned?: booleAn }): Promise<void> {
		const editorOptions: ITextEditorOptions = {
			preserveFocus: options.preserveFocus,
			pinned: options.keyMods?.Alt || options.forcePinned || this.configurAtion.openEditorPinned,
			selection: options.rAnge ? RAnge.collApseToStArt(options.rAnge) : undefined
		};

		const tArgetGroup = options.keyMods?.ctrlCmd || options.forceOpenSideBySide ? SIDE_GROUP : ACTIVE_GROUP;

		// Restore Any view stAte if the tArget is the side group
		if (tArgetGroup === SIDE_GROUP) {
			AwAit this.pickStAte.restoreEditorViewStAte();
		}

		// Open editor
		if (resourceOrEditor instAnceof EditorInput) {
			AwAit this.editorService.openEditor(resourceOrEditor, editorOptions);
		} else {
			AwAit this.editorService.openEditor({
				resource: URI.isUri(resourceOrEditor) ? resourceOrEditor : resourceOrEditor.resource,
				options: editorOptions
			}, tArgetGroup);
		}

	}

	//#endregion
}
