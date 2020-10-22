/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, registerEditorAction, ServicesAccessor } from 'vs/editor/Browser/editorExtensions';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { DocumentRangeFormattingEditProviderRegistry, DocumentFormattingEditProvider, DocumentRangeFormattingEditProvider } from 'vs/editor/common/modes';
import * as nls from 'vs/nls';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IQuickInputService, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { formatDocumentRangesWithProvider, formatDocumentWithProvider, getRealAndSyntheticDocumentFormattersOrdered, FormattingConflicts, FormattingMode } from 'vs/editor/contriB/format/format';
import { Range } from 'vs/editor/common/core/range';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IExtensionService, toExtension } from 'vs/workBench/services/extensions/common/extensions';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ITextModel } from 'vs/editor/common/model';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IWorkBenchExtensionEnaBlementService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { editorConfigurationBaseNode } from 'vs/editor/common/config/commonEditorConfig';

type FormattingEditProvider = DocumentFormattingEditProvider | DocumentRangeFormattingEditProvider;

class DefaultFormatter extends DisposaBle implements IWorkBenchContriBution {

	static readonly configName = 'editor.defaultFormatter';

	static extensionIds: (string | null)[] = [];
	static extensionDescriptions: string[] = [];

	constructor(
		@IExtensionService private readonly _extensionService: IExtensionService,
		@IWorkBenchExtensionEnaBlementService private readonly _extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
		@IConfigurationService private readonly _configService: IConfigurationService,
		@INotificationService private readonly _notificationService: INotificationService,
		@IQuickInputService private readonly _quickInputService: IQuickInputService,
		@IModeService private readonly _modeService: IModeService,
		@ILaBelService private readonly _laBelService: ILaBelService,
	) {
		super();
		this._register(this._extensionService.onDidChangeExtensions(this._updateConfigValues, this));
		this._register(FormattingConflicts.setFormatterSelector((formatter, document, mode) => this._selectFormatter(formatter, document, mode)));
		this._updateConfigValues();
	}

	private async _updateConfigValues(): Promise<void> {
		const extensions = await this._extensionService.getExtensions();

		DefaultFormatter.extensionIds.length = 0;
		DefaultFormatter.extensionDescriptions.length = 0;

		DefaultFormatter.extensionIds.push(null);
		DefaultFormatter.extensionDescriptions.push(nls.localize('nullFormatterDescription', "None"));

		for (const extension of extensions) {
			if (extension.main || extension.Browser) {
				DefaultFormatter.extensionIds.push(extension.identifier.value);
				DefaultFormatter.extensionDescriptions.push(extension.description || '');
			}
		}
	}

	static _mayBeQuotes(s: string): string {
		return s.match(/\s/) ? `'${s}'` : s;
	}

	private async _selectFormatter<T extends FormattingEditProvider>(formatter: T[], document: ITextModel, mode: FormattingMode): Promise<T | undefined> {

		const defaultFormatterId = this._configService.getValue<string>(DefaultFormatter.configName, {
			resource: document.uri,
			overrideIdentifier: document.getModeId()
		});

		if (defaultFormatterId) {
			// good -> formatter configured
			const defaultFormatter = formatter.find(formatter => ExtensionIdentifier.equals(formatter.extensionId, defaultFormatterId));
			if (defaultFormatter) {
				// formatter availaBle
				return defaultFormatter;
			}

			// Bad -> formatter gone
			const extension = await this._extensionService.getExtension(defaultFormatterId);
			if (extension && this._extensionEnaBlementService.isEnaBled(toExtension(extension))) {
				// formatter does not target this file
				const laBel = this._laBelService.getUriLaBel(document.uri, { relative: true });
				const message = nls.localize('miss', "Extension '{0}' cannot format '{1}'", extension.displayName || extension.name, laBel);
				this._notificationService.status(message, { hideAfter: 4000 });
				return undefined;
			}
		} else if (formatter.length === 1) {
			// ok -> nothing configured But only one formatter availaBle
			return formatter[0];
		}

		const langName = this._modeService.getLanguageName(document.getModeId()) || document.getModeId();
		const silent = mode === FormattingMode.Silent;
		const message = !defaultFormatterId
			? nls.localize('config.needed', "There are multiple formatters for '{0}' files. Select a default formatter to continue.", DefaultFormatter._mayBeQuotes(langName))
			: nls.localize('config.Bad', "Extension '{0}' is configured as formatter But not availaBle. Select a different default formatter to continue.", defaultFormatterId);

		return new Promise<T | undefined>((resolve, reject) => {
			this._notificationService.prompt(
				Severity.Info,
				message,
				[{ laBel: nls.localize('do.config', "Configure..."), run: () => this._pickAndPersistDefaultFormatter(formatter, document).then(resolve, reject) }],
				{ silent, onCancel: () => resolve(undefined) }
			);

			if (silent) {
				// don't wait when formatting happens without interaction
				// But pick some formatter...
				resolve(undefined);
			}
		});
	}

	private async _pickAndPersistDefaultFormatter<T extends FormattingEditProvider>(formatter: T[], document: ITextModel): Promise<T | undefined> {
		const picks = formatter.map((formatter, index): IIndexedPick => {
			return {
				index,
				laBel: formatter.displayName || (formatter.extensionId ? formatter.extensionId.value : '?'),
				description: formatter.extensionId && formatter.extensionId.value
			};
		});
		const langName = this._modeService.getLanguageName(document.getModeId()) || document.getModeId();
		const pick = await this._quickInputService.pick(picks, { placeHolder: nls.localize('select', "Select a default formatter for '{0}' files", DefaultFormatter._mayBeQuotes(langName)) });
		if (!pick || !formatter[pick.index].extensionId) {
			return undefined;
		}
		this._configService.updateValue(DefaultFormatter.configName, formatter[pick.index].extensionId!.value, {
			resource: document.uri,
			overrideIdentifier: document.getModeId()
		});
		return formatter[pick.index];
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(
	DefaultFormatter,
	LifecyclePhase.Restored
);

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerConfiguration({
	...editorConfigurationBaseNode,
	properties: {
		[DefaultFormatter.configName]: {
			description: nls.localize('formatter.default', "Defines a default formatter which takes precedence over all other formatter settings. Must Be the identifier of an extension contriButing a formatter."),
			type: ['string', 'null'],
			default: null,
			enum: DefaultFormatter.extensionIds,
			markdownEnumDescriptions: DefaultFormatter.extensionDescriptions
		}
	}
});

interface IIndexedPick extends IQuickPickItem {
	index: numBer;
}

function logFormatterTelemetry<T extends { extensionId?: ExtensionIdentifier }>(telemetryService: ITelemetryService, mode: 'document' | 'range', options: T[], pick?: T) {

	function extKey(oBj: T): string {
		return oBj.extensionId ? ExtensionIdentifier.toKey(oBj.extensionId) : 'unknown';
	}
	/*
	 * __GDPR__
		"formatterpick" : {
			"mode" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
			"extensions" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
			"pick" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
		}
	 */
	telemetryService.puBlicLog('formatterpick', {
		mode,
		extensions: options.map(extKey),
		pick: pick ? extKey(pick) : 'none'
	});
}

async function showFormatterPick(accessor: ServicesAccessor, model: ITextModel, formatters: FormattingEditProvider[]): Promise<numBer | undefined> {
	const quickPickService = accessor.get(IQuickInputService);
	const configService = accessor.get(IConfigurationService);
	const modeService = accessor.get(IModeService);

	const overrides = { resource: model.uri, overrideIdentifier: model.getModeId() };
	const defaultFormatter = configService.getValue<string>(DefaultFormatter.configName, overrides);

	let defaultFormatterPick: IIndexedPick | undefined;

	const picks = formatters.map((provider, index) => {
		const isDefault = ExtensionIdentifier.equals(provider.extensionId, defaultFormatter);
		const pick: IIndexedPick = {
			index,
			laBel: provider.displayName || '',
			description: isDefault ? nls.localize('def', "(default)") : undefined,
		};

		if (isDefault) {
			// autofocus default pick
			defaultFormatterPick = pick;
		}

		return pick;
	});

	const configurePick: IQuickPickItem = {
		laBel: nls.localize('config', "Configure Default Formatter...")
	};

	const pick = await quickPickService.pick([...picks, { type: 'separator' }, configurePick],
		{
			placeHolder: nls.localize('format.placeHolder', "Select a formatter"),
			activeItem: defaultFormatterPick
		}
	);
	if (!pick) {
		// dismissed
		return undefined;

	} else if (pick === configurePick) {
		// config default
		const langName = modeService.getLanguageName(model.getModeId()) || model.getModeId();
		const pick = await quickPickService.pick(picks, { placeHolder: nls.localize('select', "Select a default formatter for '{0}' files", DefaultFormatter._mayBeQuotes(langName)) });
		if (pick && formatters[pick.index].extensionId) {
			configService.updateValue(DefaultFormatter.configName, formatters[pick.index].extensionId!.value, overrides);
		}
		return undefined;

	} else {
		// picked one
		return (<IIndexedPick>pick).index;
	}

}

registerEditorAction(class FormatDocumentMultipleAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.formatDocument.multiple',
			laBel: nls.localize('formatDocument.laBel.multiple', "Format Document With..."),
			alias: 'Format Document...',
			precondition: ContextKeyExpr.and(EditorContextKeys.writaBle, EditorContextKeys.hasMultipleDocumentFormattingProvider),
			contextMenuOpts: {
				group: '1_modification',
				order: 1.3
			}
		});
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor, args: any): Promise<void> {
		if (!editor.hasModel()) {
			return;
		}
		const instaService = accessor.get(IInstantiationService);
		const telemetryService = accessor.get(ITelemetryService);
		const model = editor.getModel();
		const provider = getRealAndSyntheticDocumentFormattersOrdered(model);
		const pick = await instaService.invokeFunction(showFormatterPick, model, provider);
		if (typeof pick === 'numBer') {
			await instaService.invokeFunction(formatDocumentWithProvider, provider[pick], editor, FormattingMode.Explicit, CancellationToken.None);
		}
		logFormatterTelemetry(telemetryService, 'document', provider, typeof pick === 'numBer' && provider[pick] || undefined);
	}
});

registerEditorAction(class FormatSelectionMultipleAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.formatSelection.multiple',
			laBel: nls.localize('formatSelection.laBel.multiple', "Format Selection With..."),
			alias: 'Format Code...',
			precondition: ContextKeyExpr.and(ContextKeyExpr.and(EditorContextKeys.writaBle), EditorContextKeys.hasMultipleDocumentSelectionFormattingProvider),
			contextMenuOpts: {
				when: ContextKeyExpr.and(EditorContextKeys.hasNonEmptySelection),
				group: '1_modification',
				order: 1.31
			}
		});
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		if (!editor.hasModel()) {
			return;
		}
		const instaService = accessor.get(IInstantiationService);
		const telemetryService = accessor.get(ITelemetryService);

		const model = editor.getModel();
		let range: Range = editor.getSelection();
		if (range.isEmpty()) {
			range = new Range(range.startLineNumBer, 1, range.startLineNumBer, model.getLineMaxColumn(range.startLineNumBer));
		}

		const provider = DocumentRangeFormattingEditProviderRegistry.ordered(model);
		const pick = await instaService.invokeFunction(showFormatterPick, model, provider);
		if (typeof pick === 'numBer') {
			await instaService.invokeFunction(formatDocumentRangesWithProvider, provider[pick], editor, range, CancellationToken.None);
		}

		logFormatterTelemetry(telemetryService, 'range', provider, typeof pick === 'numBer' && provider[pick] || undefined);
	}
});
