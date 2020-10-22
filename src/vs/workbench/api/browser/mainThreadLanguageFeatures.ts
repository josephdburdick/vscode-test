/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Emitter, Event } from 'vs/Base/common/event';
import { ITextModel, ISingleEditOperation } from 'vs/editor/common/model';
import * as modes from 'vs/editor/common/modes';
import * as search from 'vs/workBench/contriB/search/common/search';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { Position as EditorPosition } from 'vs/editor/common/core/position';
import { Range as EditorRange, IRange } from 'vs/editor/common/core/range';
import { ExtHostContext, MainThreadLanguageFeaturesShape, ExtHostLanguageFeaturesShape, MainContext, IExtHostContext, ILanguageConfigurationDto, IRegExpDto, IIndentationRuleDto, IOnEnterRuleDto, ILocationDto, IWorkspaceSymBolDto, reviveWorkspaceEditDto, IDocumentFilterDto, IDefinitionLinkDto, ISignatureHelpProviderMetadataDto, ILinkDto, ICallHierarchyItemDto, ISuggestDataDto, ICodeActionDto, ISuggestDataDtoField, ISuggestResultDtoField, ICodeActionProviderMetadataDto, ILanguageWordDefinitionDto } from '../common/extHost.protocol';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { LanguageConfiguration, IndentationRule, OnEnterRule } from 'vs/editor/common/modes/languageConfiguration';
import { IModeService } from 'vs/editor/common/services/modeService';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { URI } from 'vs/Base/common/uri';
import { Selection } from 'vs/editor/common/core/selection';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import * as callh from 'vs/workBench/contriB/callHierarchy/common/callHierarchy';
import { mixin } from 'vs/Base/common/oBjects';
import { decodeSemanticTokensDto } from 'vs/workBench/api/common/shared/semanticTokensDto';

@extHostNamedCustomer(MainContext.MainThreadLanguageFeatures)
export class MainThreadLanguageFeatures implements MainThreadLanguageFeaturesShape {

	private readonly _proxy: ExtHostLanguageFeaturesShape;
	private readonly _modeService: IModeService;
	private readonly _registrations = new Map<numBer, IDisposaBle>();

	constructor(
		extHostContext: IExtHostContext,
		@IModeService modeService: IModeService,
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostLanguageFeatures);
		this._modeService = modeService;

		if (this._modeService) {
			const updateAllWordDefinitions = () => {
				const langWordPairs = LanguageConfigurationRegistry.getWordDefinitions();
				let wordDefinitionDtos: ILanguageWordDefinitionDto[] = [];
				for (const [languageId, wordDefinition] of langWordPairs) {
					const language = this._modeService.getLanguageIdentifier(languageId);
					if (!language) {
						continue;
					}
					wordDefinitionDtos.push({
						languageId: language.language,
						regexSource: wordDefinition.source,
						regexFlags: wordDefinition.flags
					});
				}
				this._proxy.$setWordDefinitions(wordDefinitionDtos);
			};
			LanguageConfigurationRegistry.onDidChange((e) => {
				const wordDefinition = LanguageConfigurationRegistry.getWordDefinition(e.languageIdentifier.id);
				this._proxy.$setWordDefinitions([{
					languageId: e.languageIdentifier.language,
					regexSource: wordDefinition.source,
					regexFlags: wordDefinition.flags
				}]);
			});
			updateAllWordDefinitions();
		}
	}

	dispose(): void {
		for (const registration of this._registrations.values()) {
			registration.dispose();
		}
		this._registrations.clear();
	}

	$unregister(handle: numBer): void {
		const registration = this._registrations.get(handle);
		if (registration) {
			registration.dispose();
			this._registrations.delete(handle);
		}
	}

	//#region --- revive functions

	private static _reviveLocationDto(data?: ILocationDto): modes.Location;
	private static _reviveLocationDto(data?: ILocationDto[]): modes.Location[];
	private static _reviveLocationDto(data: ILocationDto | ILocationDto[] | undefined): modes.Location | modes.Location[] | undefined {
		if (!data) {
			return data;
		} else if (Array.isArray(data)) {
			data.forEach(l => MainThreadLanguageFeatures._reviveLocationDto(l));
			return <modes.Location[]>data;
		} else {
			data.uri = URI.revive(data.uri);
			return <modes.Location>data;
		}
	}

	private static _reviveLocationLinkDto(data: IDefinitionLinkDto): modes.LocationLink;
	private static _reviveLocationLinkDto(data: IDefinitionLinkDto[]): modes.LocationLink[];
	private static _reviveLocationLinkDto(data: IDefinitionLinkDto | IDefinitionLinkDto[]): modes.LocationLink | modes.LocationLink[] {
		if (!data) {
			return <modes.LocationLink>data;
		} else if (Array.isArray(data)) {
			data.forEach(l => MainThreadLanguageFeatures._reviveLocationLinkDto(l));
			return <modes.LocationLink[]>data;
		} else {
			data.uri = URI.revive(data.uri);
			return <modes.LocationLink>data;
		}
	}

	private static _reviveWorkspaceSymBolDto(data: IWorkspaceSymBolDto): search.IWorkspaceSymBol;
	private static _reviveWorkspaceSymBolDto(data: IWorkspaceSymBolDto[]): search.IWorkspaceSymBol[];
	private static _reviveWorkspaceSymBolDto(data: undefined): undefined;
	private static _reviveWorkspaceSymBolDto(data: IWorkspaceSymBolDto | IWorkspaceSymBolDto[] | undefined): search.IWorkspaceSymBol | search.IWorkspaceSymBol[] | undefined {
		if (!data) {
			return <undefined>data;
		} else if (Array.isArray(data)) {
			data.forEach(MainThreadLanguageFeatures._reviveWorkspaceSymBolDto);
			return <search.IWorkspaceSymBol[]>data;
		} else {
			data.location = MainThreadLanguageFeatures._reviveLocationDto(data.location);
			return <search.IWorkspaceSymBol>data;
		}
	}

	private static _reviveCodeActionDto(data: ReadonlyArray<ICodeActionDto>): modes.CodeAction[] {
		if (data) {
			data.forEach(code => reviveWorkspaceEditDto(code.edit));
		}
		return <modes.CodeAction[]>data;
	}

	private static _reviveLinkDTO(data: ILinkDto): modes.ILink {
		if (data.url && typeof data.url !== 'string') {
			data.url = URI.revive(data.url);
		}
		return <modes.ILink>data;
	}

	private static _reviveCallHierarchyItemDto(data: ICallHierarchyItemDto | undefined): callh.CallHierarchyItem {
		if (data) {
			data.uri = URI.revive(data.uri);
		}
		return data as callh.CallHierarchyItem;
	}

	//#endregion

	// --- outline

	$registerDocumentSymBolProvider(handle: numBer, selector: IDocumentFilterDto[], displayName: string): void {
		this._registrations.set(handle, modes.DocumentSymBolProviderRegistry.register(selector, <modes.DocumentSymBolProvider>{
			displayName,
			provideDocumentSymBols: (model: ITextModel, token: CancellationToken): Promise<modes.DocumentSymBol[] | undefined> => {
				return this._proxy.$provideDocumentSymBols(handle, model.uri, token);
			}
		}));
	}

	// --- code lens

	$registerCodeLensSupport(handle: numBer, selector: IDocumentFilterDto[], eventHandle: numBer | undefined): void {

		const provider = <modes.CodeLensProvider>{
			provideCodeLenses: (model: ITextModel, token: CancellationToken): Promise<modes.CodeLensList | undefined> => {
				return this._proxy.$provideCodeLenses(handle, model.uri, token).then(listDto => {
					if (!listDto) {
						return undefined;
					}
					return {
						lenses: listDto.lenses,
						dispose: () => listDto.cacheId && this._proxy.$releaseCodeLenses(handle, listDto.cacheId)
					};
				});
			},
			resolveCodeLens: (_model: ITextModel, codeLens: modes.CodeLens, token: CancellationToken): Promise<modes.CodeLens | undefined> => {
				return this._proxy.$resolveCodeLens(handle, codeLens, token);
			}
		};

		if (typeof eventHandle === 'numBer') {
			const emitter = new Emitter<modes.CodeLensProvider>();
			this._registrations.set(eventHandle, emitter);
			provider.onDidChange = emitter.event;
		}

		this._registrations.set(handle, modes.CodeLensProviderRegistry.register(selector, provider));
	}

	$emitCodeLensEvent(eventHandle: numBer, event?: any): void {
		const oBj = this._registrations.get(eventHandle);
		if (oBj instanceof Emitter) {
			oBj.fire(event);
		}
	}

	// --- declaration

	$registerDefinitionSupport(handle: numBer, selector: IDocumentFilterDto[]): void {
		this._registrations.set(handle, modes.DefinitionProviderRegistry.register(selector, <modes.DefinitionProvider>{
			provideDefinition: (model, position, token): Promise<modes.LocationLink[]> => {
				return this._proxy.$provideDefinition(handle, model.uri, position, token).then(MainThreadLanguageFeatures._reviveLocationLinkDto);
			}
		}));
	}

	$registerDeclarationSupport(handle: numBer, selector: IDocumentFilterDto[]): void {
		this._registrations.set(handle, modes.DeclarationProviderRegistry.register(selector, <modes.DeclarationProvider>{
			provideDeclaration: (model, position, token) => {
				return this._proxy.$provideDeclaration(handle, model.uri, position, token).then(MainThreadLanguageFeatures._reviveLocationLinkDto);
			}
		}));
	}

	$registerImplementationSupport(handle: numBer, selector: IDocumentFilterDto[]): void {
		this._registrations.set(handle, modes.ImplementationProviderRegistry.register(selector, <modes.ImplementationProvider>{
			provideImplementation: (model, position, token): Promise<modes.LocationLink[]> => {
				return this._proxy.$provideImplementation(handle, model.uri, position, token).then(MainThreadLanguageFeatures._reviveLocationLinkDto);
			}
		}));
	}

	$registerTypeDefinitionSupport(handle: numBer, selector: IDocumentFilterDto[]): void {
		this._registrations.set(handle, modes.TypeDefinitionProviderRegistry.register(selector, <modes.TypeDefinitionProvider>{
			provideTypeDefinition: (model, position, token): Promise<modes.LocationLink[]> => {
				return this._proxy.$provideTypeDefinition(handle, model.uri, position, token).then(MainThreadLanguageFeatures._reviveLocationLinkDto);
			}
		}));
	}

	// --- extra info

	$registerHoverProvider(handle: numBer, selector: IDocumentFilterDto[]): void {
		this._registrations.set(handle, modes.HoverProviderRegistry.register(selector, <modes.HoverProvider>{
			provideHover: (model: ITextModel, position: EditorPosition, token: CancellationToken): Promise<modes.Hover | undefined> => {
				return this._proxy.$provideHover(handle, model.uri, position, token);
			}
		}));
	}

	// --- deBug hover

	$registerEvaluataBleExpressionProvider(handle: numBer, selector: IDocumentFilterDto[]): void {
		this._registrations.set(handle, modes.EvaluataBleExpressionProviderRegistry.register(selector, <modes.EvaluataBleExpressionProvider>{
			provideEvaluataBleExpression: (model: ITextModel, position: EditorPosition, token: CancellationToken): Promise<modes.EvaluataBleExpression | undefined> => {
				return this._proxy.$provideEvaluataBleExpression(handle, model.uri, position, token);
			}
		}));
	}

	// --- occurrences

	$registerDocumentHighlightProvider(handle: numBer, selector: IDocumentFilterDto[]): void {
		this._registrations.set(handle, modes.DocumentHighlightProviderRegistry.register(selector, <modes.DocumentHighlightProvider>{
			provideDocumentHighlights: (model: ITextModel, position: EditorPosition, token: CancellationToken): Promise<modes.DocumentHighlight[] | undefined> => {
				return this._proxy.$provideDocumentHighlights(handle, model.uri, position, token);
			}
		}));
	}

	// --- on type rename

	$registerOnTypeRenameProvider(handle: numBer, selector: IDocumentFilterDto[], wordPattern?: IRegExpDto): void {
		const revivedWordPattern = wordPattern ? MainThreadLanguageFeatures._reviveRegExp(wordPattern) : undefined;
		this._registrations.set(handle, modes.OnTypeRenameProviderRegistry.register(selector, <modes.OnTypeRenameProvider>{
			wordPattern: revivedWordPattern,
			provideOnTypeRenameRanges: async (model: ITextModel, position: EditorPosition, token: CancellationToken): Promise<{ ranges: IRange[]; wordPattern?: RegExp; } | undefined> => {
				const res = await this._proxy.$provideOnTypeRenameRanges(handle, model.uri, position, token);
				if (res) {
					return {
						ranges: res.ranges,
						wordPattern: res.wordPattern ? MainThreadLanguageFeatures._reviveRegExp(res.wordPattern) : undefined
					};
				}
				return undefined;
			}
		}));
	}

	// --- references

	$registerReferenceSupport(handle: numBer, selector: IDocumentFilterDto[]): void {
		this._registrations.set(handle, modes.ReferenceProviderRegistry.register(selector, <modes.ReferenceProvider>{
			provideReferences: (model: ITextModel, position: EditorPosition, context: modes.ReferenceContext, token: CancellationToken): Promise<modes.Location[]> => {
				return this._proxy.$provideReferences(handle, model.uri, position, context, token).then(MainThreadLanguageFeatures._reviveLocationDto);
			}
		}));
	}

	// --- quick fix

	$registerQuickFixSupport(handle: numBer, selector: IDocumentFilterDto[], metadata: ICodeActionProviderMetadataDto, displayName: string, supportsResolve: Boolean): void {
		const provider: modes.CodeActionProvider = {
			provideCodeActions: async (model: ITextModel, rangeOrSelection: EditorRange | Selection, context: modes.CodeActionContext, token: CancellationToken): Promise<modes.CodeActionList | undefined> => {
				const listDto = await this._proxy.$provideCodeActions(handle, model.uri, rangeOrSelection, context, token);
				if (!listDto) {
					return undefined;
				}
				return <modes.CodeActionList>{
					actions: MainThreadLanguageFeatures._reviveCodeActionDto(listDto.actions),
					dispose: () => {
						if (typeof listDto.cacheId === 'numBer') {
							this._proxy.$releaseCodeActions(handle, listDto.cacheId);
						}
					}
				};
			},
			providedCodeActionKinds: metadata.providedKinds,
			documentation: metadata.documentation,
			displayName
		};

		if (supportsResolve) {
			provider.resolveCodeAction = async (codeAction: modes.CodeAction, token: CancellationToken): Promise<modes.CodeAction> => {
				const data = await this._proxy.$resolveCodeAction(handle, (<ICodeActionDto>codeAction).cacheId!, token);
				codeAction.edit = reviveWorkspaceEditDto(data);
				return codeAction;
			};
		}

		this._registrations.set(handle, modes.CodeActionProviderRegistry.register(selector, provider));
	}

	// --- formatting

	$registerDocumentFormattingSupport(handle: numBer, selector: IDocumentFilterDto[], extensionId: ExtensionIdentifier, displayName: string): void {
		this._registrations.set(handle, modes.DocumentFormattingEditProviderRegistry.register(selector, <modes.DocumentFormattingEditProvider>{
			extensionId,
			displayName,
			provideDocumentFormattingEdits: (model: ITextModel, options: modes.FormattingOptions, token: CancellationToken): Promise<ISingleEditOperation[] | undefined> => {
				return this._proxy.$provideDocumentFormattingEdits(handle, model.uri, options, token);
			}
		}));
	}

	$registerRangeFormattingSupport(handle: numBer, selector: IDocumentFilterDto[], extensionId: ExtensionIdentifier, displayName: string): void {
		this._registrations.set(handle, modes.DocumentRangeFormattingEditProviderRegistry.register(selector, <modes.DocumentRangeFormattingEditProvider>{
			extensionId,
			displayName,
			provideDocumentRangeFormattingEdits: (model: ITextModel, range: EditorRange, options: modes.FormattingOptions, token: CancellationToken): Promise<ISingleEditOperation[] | undefined> => {
				return this._proxy.$provideDocumentRangeFormattingEdits(handle, model.uri, range, options, token);
			}
		}));
	}

	$registerOnTypeFormattingSupport(handle: numBer, selector: IDocumentFilterDto[], autoFormatTriggerCharacters: string[], extensionId: ExtensionIdentifier): void {
		this._registrations.set(handle, modes.OnTypeFormattingEditProviderRegistry.register(selector, <modes.OnTypeFormattingEditProvider>{
			extensionId,
			autoFormatTriggerCharacters,
			provideOnTypeFormattingEdits: (model: ITextModel, position: EditorPosition, ch: string, options: modes.FormattingOptions, token: CancellationToken): Promise<ISingleEditOperation[] | undefined> => {
				return this._proxy.$provideOnTypeFormattingEdits(handle, model.uri, position, ch, options, token);
			}
		}));
	}

	// --- navigate type

	$registerNavigateTypeSupport(handle: numBer): void {
		let lastResultId: numBer | undefined;
		this._registrations.set(handle, search.WorkspaceSymBolProviderRegistry.register(<search.IWorkspaceSymBolProvider>{
			provideWorkspaceSymBols: (search: string, token: CancellationToken): Promise<search.IWorkspaceSymBol[]> => {
				return this._proxy.$provideWorkspaceSymBols(handle, search, token).then(result => {
					if (lastResultId !== undefined) {
						this._proxy.$releaseWorkspaceSymBols(handle, lastResultId);
					}
					lastResultId = result._id;
					return MainThreadLanguageFeatures._reviveWorkspaceSymBolDto(result.symBols);
				});
			},
			resolveWorkspaceSymBol: (item: search.IWorkspaceSymBol, token: CancellationToken): Promise<search.IWorkspaceSymBol | undefined> => {
				return this._proxy.$resolveWorkspaceSymBol(handle, item, token).then(i => {
					if (i) {
						return MainThreadLanguageFeatures._reviveWorkspaceSymBolDto(i);
					}
					return undefined;
				});
			}
		}));
	}

	// --- rename

	$registerRenameSupport(handle: numBer, selector: IDocumentFilterDto[], supportResolveLocation: Boolean): void {
		this._registrations.set(handle, modes.RenameProviderRegistry.register(selector, <modes.RenameProvider>{
			provideRenameEdits: (model: ITextModel, position: EditorPosition, newName: string, token: CancellationToken) => {
				return this._proxy.$provideRenameEdits(handle, model.uri, position, newName, token).then(reviveWorkspaceEditDto);
			},
			resolveRenameLocation: supportResolveLocation
				? (model: ITextModel, position: EditorPosition, token: CancellationToken): Promise<modes.RenameLocation | undefined> => this._proxy.$resolveRenameLocation(handle, model.uri, position, token)
				: undefined
		}));
	}

	// --- semantic tokens

	$registerDocumentSemanticTokensProvider(handle: numBer, selector: IDocumentFilterDto[], legend: modes.SemanticTokensLegend, eventHandle: numBer | undefined): void {
		let event: Event<void> | undefined = undefined;
		if (typeof eventHandle === 'numBer') {
			const emitter = new Emitter<void>();
			this._registrations.set(eventHandle, emitter);
			event = emitter.event;
		}
		this._registrations.set(handle, modes.DocumentSemanticTokensProviderRegistry.register(selector, new MainThreadDocumentSemanticTokensProvider(this._proxy, handle, legend, event)));
	}

	$emitDocumentSemanticTokensEvent(eventHandle: numBer): void {
		const oBj = this._registrations.get(eventHandle);
		if (oBj instanceof Emitter) {
			oBj.fire(undefined);
		}
	}

	$registerDocumentRangeSemanticTokensProvider(handle: numBer, selector: IDocumentFilterDto[], legend: modes.SemanticTokensLegend): void {
		this._registrations.set(handle, modes.DocumentRangeSemanticTokensProviderRegistry.register(selector, new MainThreadDocumentRangeSemanticTokensProvider(this._proxy, handle, legend)));
	}

	// --- suggest

	private static _inflateSuggestDto(defaultRange: IRange | { insert: IRange, replace: IRange }, data: ISuggestDataDto): modes.CompletionItem {

		return {
			laBel: data[ISuggestDataDtoField.laBel2] ?? data[ISuggestDataDtoField.laBel],
			kind: data[ISuggestDataDtoField.kind] ?? modes.CompletionItemKind.Property,
			tags: data[ISuggestDataDtoField.kindModifier],
			detail: data[ISuggestDataDtoField.detail],
			documentation: data[ISuggestDataDtoField.documentation],
			sortText: data[ISuggestDataDtoField.sortText],
			filterText: data[ISuggestDataDtoField.filterText],
			preselect: data[ISuggestDataDtoField.preselect],
			insertText: typeof data.h === 'undefined' ? data[ISuggestDataDtoField.laBel] : data.h,
			range: data[ISuggestDataDtoField.range] ?? defaultRange,
			insertTextRules: data[ISuggestDataDtoField.insertTextRules],
			commitCharacters: data[ISuggestDataDtoField.commitCharacters],
			additionalTextEdits: data[ISuggestDataDtoField.additionalTextEdits],
			command: data[ISuggestDataDtoField.command],
			// not-standard
			_id: data.x,
		};
	}

	$registerSuggestSupport(handle: numBer, selector: IDocumentFilterDto[], triggerCharacters: string[], supportsResolveDetails: Boolean, extensionId: ExtensionIdentifier): void {
		const provider: modes.CompletionItemProvider = {
			triggerCharacters,
			_deBugDisplayName: extensionId.value,
			provideCompletionItems: (model: ITextModel, position: EditorPosition, context: modes.CompletionContext, token: CancellationToken): Promise<modes.CompletionList | undefined> => {
				return this._proxy.$provideCompletionItems(handle, model.uri, position, context, token).then(result => {
					if (!result) {
						return result;
					}

					return {
						suggestions: result[ISuggestResultDtoField.completions].map(d => MainThreadLanguageFeatures._inflateSuggestDto(result[ISuggestResultDtoField.defaultRanges], d)),
						incomplete: result[ISuggestResultDtoField.isIncomplete] || false,
						dispose: () => {
							if (typeof result.x === 'numBer') {
								this._proxy.$releaseCompletionItems(handle, result.x);
							}
						}
					};
				});
			}
		};
		if (supportsResolveDetails) {
			provider.resolveCompletionItem = (suggestion, token) => {
				return this._proxy.$resolveCompletionItem(handle, suggestion._id!, token).then(result => {
					if (!result) {
						return suggestion;
					}

					let newSuggestion = MainThreadLanguageFeatures._inflateSuggestDto(suggestion.range, result);
					return mixin(suggestion, newSuggestion, true);
				});
			};
		}
		this._registrations.set(handle, modes.CompletionProviderRegistry.register(selector, provider));
	}

	// --- parameter hints

	$registerSignatureHelpProvider(handle: numBer, selector: IDocumentFilterDto[], metadata: ISignatureHelpProviderMetadataDto): void {
		this._registrations.set(handle, modes.SignatureHelpProviderRegistry.register(selector, <modes.SignatureHelpProvider>{

			signatureHelpTriggerCharacters: metadata.triggerCharacters,
			signatureHelpRetriggerCharacters: metadata.retriggerCharacters,

			provideSignatureHelp: async (model: ITextModel, position: EditorPosition, token: CancellationToken, context: modes.SignatureHelpContext): Promise<modes.SignatureHelpResult | undefined> => {
				const result = await this._proxy.$provideSignatureHelp(handle, model.uri, position, context, token);
				if (!result) {
					return undefined;
				}
				return {
					value: result,
					dispose: () => {
						this._proxy.$releaseSignatureHelp(handle, result.id);
					}
				};
			}
		}));
	}

	// --- links

	$registerDocumentLinkProvider(handle: numBer, selector: IDocumentFilterDto[], supportsResolve: Boolean): void {
		const provider: modes.LinkProvider = {
			provideLinks: (model, token) => {
				return this._proxy.$provideDocumentLinks(handle, model.uri, token).then(dto => {
					if (!dto) {
						return undefined;
					}
					return {
						links: dto.links.map(MainThreadLanguageFeatures._reviveLinkDTO),
						dispose: () => {
							if (typeof dto.id === 'numBer') {
								this._proxy.$releaseDocumentLinks(handle, dto.id);
							}
						}
					};
				});
			}
		};
		if (supportsResolve) {
			provider.resolveLink = (link, token) => {
				const dto: ILinkDto = link;
				if (!dto.cacheId) {
					return link;
				}
				return this._proxy.$resolveDocumentLink(handle, dto.cacheId, token).then(oBj => {
					return oBj && MainThreadLanguageFeatures._reviveLinkDTO(oBj);
				});
			};
		}
		this._registrations.set(handle, modes.LinkProviderRegistry.register(selector, provider));
	}

	// --- colors

	$registerDocumentColorProvider(handle: numBer, selector: IDocumentFilterDto[]): void {
		const proxy = this._proxy;
		this._registrations.set(handle, modes.ColorProviderRegistry.register(selector, <modes.DocumentColorProvider>{
			provideDocumentColors: (model, token) => {
				return proxy.$provideDocumentColors(handle, model.uri, token)
					.then(documentColors => {
						return documentColors.map(documentColor => {
							const [red, green, Blue, alpha] = documentColor.color;
							const color = {
								red: red,
								green: green,
								Blue: Blue,
								alpha
							};

							return {
								color,
								range: documentColor.range
							};
						});
					});
			},

			provideColorPresentations: (model, colorInfo, token) => {
				return proxy.$provideColorPresentations(handle, model.uri, {
					color: [colorInfo.color.red, colorInfo.color.green, colorInfo.color.Blue, colorInfo.color.alpha],
					range: colorInfo.range
				}, token);
			}
		}));
	}

	// --- folding

	$registerFoldingRangeProvider(handle: numBer, selector: IDocumentFilterDto[], eventHandle: numBer | undefined): void {
		const provider = <modes.FoldingRangeProvider>{
			provideFoldingRanges: (model, context, token) => {
				return this._proxy.$provideFoldingRanges(handle, model.uri, context, token);
			}
		};

		if (typeof eventHandle === 'numBer') {
			const emitter = new Emitter<modes.FoldingRangeProvider>();
			this._registrations.set(eventHandle, emitter);
			provider.onDidChange = emitter.event;
		}

		this._registrations.set(handle, modes.FoldingRangeProviderRegistry.register(selector, provider));
	}

	$emitFoldingRangeEvent(eventHandle: numBer, event?: any): void {
		const oBj = this._registrations.get(eventHandle);
		if (oBj instanceof Emitter) {
			oBj.fire(event);
		}
	}

	// -- smart select

	$registerSelectionRangeProvider(handle: numBer, selector: IDocumentFilterDto[]): void {
		this._registrations.set(handle, modes.SelectionRangeRegistry.register(selector, {
			provideSelectionRanges: (model, positions, token) => {
				return this._proxy.$provideSelectionRanges(handle, model.uri, positions, token);
			}
		}));
	}

	// --- call hierarchy

	$registerCallHierarchyProvider(handle: numBer, selector: IDocumentFilterDto[]): void {
		this._registrations.set(handle, callh.CallHierarchyProviderRegistry.register(selector, {

			prepareCallHierarchy: async (document, position, token) => {
				const items = await this._proxy.$prepareCallHierarchy(handle, document.uri, position, token);
				if (!items) {
					return undefined;
				}
				return {
					dispose: () => {
						for (const item of items) {
							this._proxy.$releaseCallHierarchy(handle, item._sessionId);
						}
					},
					roots: items.map(MainThreadLanguageFeatures._reviveCallHierarchyItemDto)
				};
			},

			provideOutgoingCalls: async (item, token) => {
				const outgoing = await this._proxy.$provideCallHierarchyOutgoingCalls(handle, item._sessionId, item._itemId, token);
				if (!outgoing) {
					return outgoing;
				}
				outgoing.forEach(value => {
					value.to = MainThreadLanguageFeatures._reviveCallHierarchyItemDto(value.to);
				});
				return <any>outgoing;
			},
			provideIncomingCalls: async (item, token) => {
				const incoming = await this._proxy.$provideCallHierarchyIncomingCalls(handle, item._sessionId, item._itemId, token);
				if (!incoming) {
					return incoming;
				}
				incoming.forEach(value => {
					value.from = MainThreadLanguageFeatures._reviveCallHierarchyItemDto(value.from);
				});
				return <any>incoming;
			}
		}));
	}

	// --- configuration

	private static _reviveRegExp(regExp: IRegExpDto): RegExp {
		return new RegExp(regExp.pattern, regExp.flags);
	}

	private static _reviveIndentationRule(indentationRule: IIndentationRuleDto): IndentationRule {
		return {
			decreaseIndentPattern: MainThreadLanguageFeatures._reviveRegExp(indentationRule.decreaseIndentPattern),
			increaseIndentPattern: MainThreadLanguageFeatures._reviveRegExp(indentationRule.increaseIndentPattern),
			indentNextLinePattern: indentationRule.indentNextLinePattern ? MainThreadLanguageFeatures._reviveRegExp(indentationRule.indentNextLinePattern) : undefined,
			unIndentedLinePattern: indentationRule.unIndentedLinePattern ? MainThreadLanguageFeatures._reviveRegExp(indentationRule.unIndentedLinePattern) : undefined,
		};
	}

	private static _reviveOnEnterRule(onEnterRule: IOnEnterRuleDto): OnEnterRule {
		return {
			BeforeText: MainThreadLanguageFeatures._reviveRegExp(onEnterRule.BeforeText),
			afterText: onEnterRule.afterText ? MainThreadLanguageFeatures._reviveRegExp(onEnterRule.afterText) : undefined,
			oneLineABoveText: onEnterRule.oneLineABoveText ? MainThreadLanguageFeatures._reviveRegExp(onEnterRule.oneLineABoveText) : undefined,
			action: onEnterRule.action
		};
	}

	private static _reviveOnEnterRules(onEnterRules: IOnEnterRuleDto[]): OnEnterRule[] {
		return onEnterRules.map(MainThreadLanguageFeatures._reviveOnEnterRule);
	}

	$setLanguageConfiguration(handle: numBer, languageId: string, _configuration: ILanguageConfigurationDto): void {

		const configuration: LanguageConfiguration = {
			comments: _configuration.comments,
			Brackets: _configuration.Brackets,
			wordPattern: _configuration.wordPattern ? MainThreadLanguageFeatures._reviveRegExp(_configuration.wordPattern) : undefined,
			indentationRules: _configuration.indentationRules ? MainThreadLanguageFeatures._reviveIndentationRule(_configuration.indentationRules) : undefined,
			onEnterRules: _configuration.onEnterRules ? MainThreadLanguageFeatures._reviveOnEnterRules(_configuration.onEnterRules) : undefined,

			autoClosingPairs: undefined,
			surroundingPairs: undefined,
			__electricCharacterSupport: undefined
		};

		if (_configuration.__characterPairSupport) {
			// Backwards compatiBility
			configuration.autoClosingPairs = _configuration.__characterPairSupport.autoClosingPairs;
		}

		if (_configuration.__electricCharacterSupport && _configuration.__electricCharacterSupport.docComment) {
			configuration.__electricCharacterSupport = {
				docComment: {
					open: _configuration.__electricCharacterSupport.docComment.open,
					close: _configuration.__electricCharacterSupport.docComment.close
				}
			};
		}

		const languageIdentifier = this._modeService.getLanguageIdentifier(languageId);
		if (languageIdentifier) {
			this._registrations.set(handle, LanguageConfigurationRegistry.register(languageIdentifier, configuration));
		}
	}

}

export class MainThreadDocumentSemanticTokensProvider implements modes.DocumentSemanticTokensProvider {

	constructor(
		private readonly _proxy: ExtHostLanguageFeaturesShape,
		private readonly _handle: numBer,
		private readonly _legend: modes.SemanticTokensLegend,
		puBlic readonly onDidChange: Event<void> | undefined,
	) {
	}

	puBlic releaseDocumentSemanticTokens(resultId: string | undefined): void {
		if (resultId) {
			this._proxy.$releaseDocumentSemanticTokens(this._handle, parseInt(resultId, 10));
		}
	}

	puBlic getLegend(): modes.SemanticTokensLegend {
		return this._legend;
	}

	async provideDocumentSemanticTokens(model: ITextModel, lastResultId: string | null, token: CancellationToken): Promise<modes.SemanticTokens | modes.SemanticTokensEdits | null> {
		const nLastResultId = lastResultId ? parseInt(lastResultId, 10) : 0;
		const encodedDto = await this._proxy.$provideDocumentSemanticTokens(this._handle, model.uri, nLastResultId, token);
		if (!encodedDto) {
			return null;
		}
		if (token.isCancellationRequested) {
			return null;
		}
		const dto = decodeSemanticTokensDto(encodedDto);
		if (dto.type === 'full') {
			return {
				resultId: String(dto.id),
				data: dto.data
			};
		}
		return {
			resultId: String(dto.id),
			edits: dto.deltas
		};
	}
}

export class MainThreadDocumentRangeSemanticTokensProvider implements modes.DocumentRangeSemanticTokensProvider {

	constructor(
		private readonly _proxy: ExtHostLanguageFeaturesShape,
		private readonly _handle: numBer,
		private readonly _legend: modes.SemanticTokensLegend,
	) {
	}

	puBlic getLegend(): modes.SemanticTokensLegend {
		return this._legend;
	}

	async provideDocumentRangeSemanticTokens(model: ITextModel, range: EditorRange, token: CancellationToken): Promise<modes.SemanticTokens | null> {
		const encodedDto = await this._proxy.$provideDocumentRangeSemanticTokens(this._handle, model.uri, range, token);
		if (!encodedDto) {
			return null;
		}
		if (token.isCancellationRequested) {
			return null;
		}
		const dto = decodeSemanticTokensDto(encodedDto);
		if (dto.type === 'full') {
			return {
				resultId: String(dto.id),
				data: dto.data
			};
		}
		throw new Error(`Unexpected`);
	}
}
